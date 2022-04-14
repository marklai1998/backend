import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from "typeorm";
import { IsString, IsInt, IsNumber, Min, Max } from "class-validator";

import { parseDate } from "../utils/TimeUtils";
import { dynamicSort } from "../utils/JsonUtils";
import { getBlocksOfDistrict } from "../utils/DistrictUtils";

import { generateError, getValidation } from "../index";

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

  @Column("text")
  image: string;

  @Column("text")
  map: string;

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
    return {
      id: this.id,
      name: this.name,
      completionDate: parseDate(this.completionDate),
      status: this.status,
      progress: this.progress,
      builders:
        showDetails && (await this.getBuilders()).length > 0
          ? await this.getBuilders()
          : undefined,
      blocks: {
        total: this.blocksDone + this.blocksLeft,
        done: this.blocksDone,
        left: this.blocksLeft,
        blocks:
          showDetails && (await this.getBlocks()).length > 0
            ? await this.getBlocks()
            : undefined,
      },
      image: onlyProgress ? undefined : this.image,
      map: onlyProgress ? undefined : this.map,
      area: onlyProgress ? undefined : JSON.parse(this.area),
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
    const blocksRaw = await getBlocksOfDistrict(this);

    const blocks = [];
    for (const block of blocksRaw) {
      blocks.push(await block.toJson({ showDistrict: false }));
    }
    return blocks;
  }

  edit(body: object): object {
    let counter = 0;
    for (const [key, value] of Object.entries(body)) {
      if (key.toLowerCase() === "areaadd") {
        this.addLocation(value);
      } else if (key.toLowerCase() === "arearemove") {
        this.removeLocation(value);
      } else if (key !== "key" && key !== "name" && this[key] !== undefined) {
        this[key] = value;
      } else {
        continue;
      }
      counter++;
    }
    return getValidation(this, `${counter} columns updated`);
  }

  addLocation(coords: string): object {
    if (!this.validateCoords(coords))
      return generateError("Invalid Coordinates");

    const coordsNew = coords.split(",").map(function (e) {
      return parseFloat(e);
    });
    const coordsArray = JSON.parse(this.area);
    coordsArray.push(coordsNew);

    this.area = JSON.stringify(coordsArray);
    return getValidation(this, "Location added");
  }

  removeLocation(index: number): object {
    if (typeof index !== "number") return generateError("Invalid index");

    const coordsArray = JSON.parse(this.area);
    if (index >= coordsArray.length)
      return generateError("Index out of bounds");

    coordsArray.splice(index, 1);

    this.area = JSON.stringify(coordsArray);
    return getValidation(this, "Location removed");
  }

  private validateCoords(coords: string): boolean {
    if (typeof coords !== "string") return false;

    const array = coords.split(",");
    if (array.length !== 2) return false;

    return true;
  }
}
