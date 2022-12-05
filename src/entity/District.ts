import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { IsInt, IsNumber, IsString, Max, Min } from "class-validator";
import {
  calculateCenterOfLatLong,
  getBlocksOfDistrict,
} from "../utils/DistrictUtils";

import * as dbCache from "../utils/cache/DatabaseCache";
import Logger from "../utils/Logger";
import { dynamicSort } from "../utils/JsonUtils";
import responses from "../responses";

@Entity({ name: "districts" })
export class District extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @IsString({ message: "Invalid Name" })
  name: string;

  @Column({ default: 0 })
  @Min(0, { message: "Status must be between 0 and 4" })
  @Max(4, { message: "Status must be between 0 and 4" })
  @IsInt({ message: "Invalid Status" })
  status: number;

  @Column({ default: 0 })
  @IsInt({ message: "Invalid Blocks Done" })
  blocksDone: number;

  @Column({ default: 0 })
  @IsInt({ message: "Invalid Blocks Left" })
  blocksLeft: number;

  @Column("double", { default: 0.0 })
  @Min(0.0, { message: "Progress must be between 0 and 100" })
  @Max(100.0, { message: "Progress must be between 0 and 100" })
  @IsNumber({}, { message: "Progress must be a number" })
  progress: number;

  @Column({ nullable: true })
  completionDate: Date;

  @Column("text", { default: "[]" })
  image: string;

  @Column("text", { default: "[]" })
  area: string;

  @Column({ nullable: true })
  @IsInt({ message: "Invalid Parent" })
  parent: number;

  // TODO: add blocks and builders for districts with children
  async toJson({
    onlyProgress = true,
    showDetails = true,
  }: { onlyProgress?: boolean; showDetails?: boolean } = {}): Promise<object> {
    let builders = undefined;
    let blocks = undefined;

    if (showDetails) {
      builders = this.getBuilders();
      blocks = this.getBlocks();
    }

    const [res1, res2] = await Promise.all([builders, blocks]);

    return {
      id: this.id,
      name: this.name,
      completionDate: this.completionDate,
      status: this.status,
      progress: this.progress,
      builders: res1,
      blocks: {
        total: this.blocksDone + this.blocksLeft,
        done: this.blocksDone,
        left: this.blocksLeft,
        blocks: res2,
      },
      image: onlyProgress ? undefined : JSON.parse(this.image),
      center: this.getLocationCenter(),
      area: onlyProgress ? undefined : JSON.parse(this.area),
      parent: this.parent,
    };
  }

  async getBuilders(): Promise<object[]> {
    const blocks = await getBlocksOfDistrict(this);

    const builders = [];
    for (const block of blocks) {
      const buildersSplit = block.builder ? block.builder.split(",") : [];

      for (let i = 0; i < buildersSplit.length; i++) {
        if (builders.some((e) => e.name === buildersSplit[i])) {
          builders.some((e) => {
            if (e.name === buildersSplit[i]) {
              e.blocks++;
            }
          });
        } else {
          builders.push({ name: buildersSplit[i], blocks: 1 });
        }
      }
    }
    builders.sort(dynamicSort("blocks"));
    return builders;
  }

  async getBlocks(): Promise<object[]> {
    const blocksRaw = dbCache.find("blocks", { district: this.id });

    const blocks = [];
    for (const block of blocksRaw) {
      blocks.push(block.toJson({ showDistrict: false }));
    }
    return await Promise.all(blocks);
  }

  edit(body: object): object {
    let counter = 0;
    for (const [key, value] of Object.entries(body)) {
      if (key === "id") continue;
      Logger.info(
        "Editing district " +
          this.name +
          " (" +
          key.toLocaleUpperCase() +
          ": " +
          this[key] +
          " -> " +
          value +
          ")"
      );
      if (key.toLowerCase() === "areaadd") {
        this.addLocation(value);
      } else if (key.toLowerCase() === "arearemove") {
        this.removeLocation(value);
      } else if (
        key !== "key" &&
        key !== "district" &&
        this[key] !== undefined
      ) {
        this[key] = value;
      } else {
        continue;
      }
      counter++;
    }
    return responses.validate(this, `${counter} columns updated`);
  }

  addLocation(coords: string): object {
    if (!this.validateCoords(coords))
      return responses.error({ message: "Invalid Coordinates", code: 400 });

    const coordsNew = coords.split(",").map(function (e) {
      return parseFloat(e);
    });
    const coordsArray = JSON.parse(this.area);
    coordsArray.push(coordsNew);

    this.area = JSON.stringify(coordsArray);
    return responses.validate(this, "Location added");
  }

  removeLocation(index: number): object {
    if (typeof index !== "number")
      return responses.error({ message: "Invalid index", code: 400 });

    const coordsArray = JSON.parse(this.area);
    if (index >= coordsArray.length)
      return responses.error({ message: "Index out of bounds", code: 400 });

    coordsArray.splice(index, 1);

    this.area = JSON.stringify(coordsArray);
    return responses.validate(this, "Location removed");
  }

  getLocationCenter() {
    return calculateCenterOfLatLong(JSON.parse(this.area));
  }

  private validateCoords(coords: string): boolean {
    if (typeof coords !== "string") return false;

    const array = coords.split(",");
    if (array.length !== 2) return false;

    return true;
  }
}
