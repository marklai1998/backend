import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from "typeorm";
import { IsString, IsInt, IsNumber, Min, Max } from "class-validator";

import { parseDate } from "../utils/TimeUtils";
import { dynamicSort } from "../utils/JsonUtils";
import { calculateProgressForDistrict } from "../utils/DistrictUtils";

import { Block } from "./Block";

@Entity({ name: "districts" })
export class District extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @IsString({ message: "Invalid Name" })
  name: string;

  @Column("text")
  area: string;

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

  @Column({ nullable: true })
  @IsInt({ message: "Invalid Parent" })
  parent: number;

  @Column("text")
  about: string;

  toJson({ onlyProgress = true }: { onlyProgress?: boolean } = {}): object {
    //const data = await this.getData();
    return {
      id: this.id,
      name: this.name,
      completionDate: parseDate(this.completionDate),
      status: this.status,
      progress: this.progress,
      builders: [],
      blocks: {
        total: this.blocksDone + this.blocksLeft,
        done: this.blocksDone,
        left: this.blocksLeft,
        blocks: [],
      },
      image: onlyProgress ? undefined : this.image,
      map: onlyProgress ? undefined : this.map,
      about: onlyProgress ? undefined : this.about,
      area: onlyProgress ? undefined : this.area,
    };
  }

  async getData({
    blocks = true,
    builders = true,
    progress = true,
    status = true,
  }: {
    blocks?: boolean;
    builders?: boolean;
    progress?: boolean;
    status?: boolean;
  } = {}): Promise<any> {
    const children = await District.find({ where: { parent: this.id } });
    if (children.length === 0) {
      return await this.getDataDirectly({
        blocks: blocks,
        builders: builders,
        progress: progress,
        status: status,
      });
    } else {
      // TODO
      return { status: await calculateProgressForDistrict(this) };
    }
  }

  private async getDataDirectly({
    blocks = true,
    builders = true,
    progress = true,
    status = true,
  }: {
    blocks?: boolean;
    builders?: boolean;
    progress?: boolean;
    status?: boolean;
  } = {}): Promise<any> {
    const blocksRaw = await Block.find({
      order: { id: "ASC" },
      where: { district: this.id },
    });
    const blocksJson = {
      total: blocksRaw.length,
      done: 0,
      detailing: 0,
      building: 0,
      reserved: 0,
      not_started: 0,
      blocks: [],
    };
    const buildersJson = [];
    let calculatedStatus = 0;
    let calculatedProgress = 0;

    for (const block of blocksRaw) {
      if (blocks) {
        switch (block.status) {
          case 4:
            blocksJson.done++;
            break;
          case 3:
            blocksJson.detailing++;
            break;
          case 2:
            blocksJson.building++;
            break;
          case 1:
            blocksJson.reserved++;
            break;
          default:
            blocksJson.not_started++;
            break;
        }
        blocksJson.blocks.push(await block.toJson({ showDistrict: false }));
      }
      if (builders) {
        const buildersSplit = block.builder ? block.builder.split(",") : [];

        for (var i = 0; i < buildersSplit.length; i++) {
          if (buildersJson.some((e) => e.name === buildersSplit[i])) {
            buildersJson.some((e) => {
              if (e.name === buildersSplit[i]) {
                e.blocks++;
              }
            });
          } else {
            buildersJson.push({ name: buildersSplit[i], blocks: 1 });
          }
        }
      }
      if (progress) {
        calculatedProgress += block.progress;
      }
    }
    if (builders) {
      buildersJson.sort(dynamicSort("blocks"));
    }
    if (status) {
      if (blocksJson.done === blocksRaw.length) {
        calculatedStatus = 4;
      } else if (calculatedProgress === 100) {
        calculatedStatus = 3;
      } else if (calculatedProgress > 0) {
        calculatedStatus = 2;
      }
    }

    return {
      status: status ? calculatedStatus : undefined,
      progress: progress ? calculatedProgress / blocksRaw.length : undefined,
      builders: builders ? buildersJson : undefined,
      blocks: blocks ? blocksJson : undefined,
    };
  }
}
