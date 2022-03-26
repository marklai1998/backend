import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from "typeorm";
import {
  IsInt,
  IsNumber,
  Min,
  Max,
  IsBoolean,
  Matches,
  IsLatLong,
  IsOptional,
} from "class-validator";

import * as index from "../index";

import { districtIdToName } from "../utils/DistrictUtils";
import { parseDate } from "../utils/TimeUtils";

import { District } from "./District";

@Entity({ name: "blocks" })
export class Block extends BaseEntity {
  @PrimaryGeneratedColumn()
  uid: number;

  @Column()
  @IsInt({ message: "Invalid ID" })
  id: number;

  @Column("text", { nullable: true })
  @IsLatLong({ message: "Invalid location (latitude,longitude)" })
  @IsOptional()
  location: string;

  @Column()
  @IsInt({ message: "Invalid District ID" })
  district: number;

  @Column("tinyint", { default: 0 })
  @Min(0, { message: "Status must be between 0 and 4" })
  @Max(4, { message: "Status must be between 0 and 4" })
  @IsInt({ message: "Invalid Status" })
  @IsOptional()
  status: number;

  @Column("double", { default: 0.0 })
  @Min(0.0, { message: "Progress must be between 0 and 100" })
  @Max(100.0, { message: "Progress must be between 0 and 100" })
  @IsNumber({}, { message: "Progress must be a number" })
  @IsOptional()
  progress: number;

  @Column({ default: false })
  @IsBoolean({ message: "Details must be a boolean" })
  @IsOptional()
  details: boolean;

  @Column("text", { nullable: true })
  @Matches(/^([a-zA-Z0-9_]{3,16}[,]?){1,}$/, {
    message: "Invalid Minecraft-Name found or not separated with a comma",
  })
  @IsOptional()
  builder: string;

  @Column({ nullable: true })
  @IsOptional()
  completionDate: Date;

  async toJson({
    showDistrict = true,
  }: { showDistrict?: boolean } = {}): Promise<object> {
    return {
      uid: this.uid,
      id: this.id,
      location: this.location,
      district: showDistrict
        ? {
            id: this.district,
            name: await districtIdToName(this.district),
          }
        : undefined,
      status: this.status,
      progress: this.progress,
      details: this.details,
      builders: this.builder ? this.builder.split(",") : [],
      completionDate: parseDate(this.completionDate),
    };
  }

  setLocation(location: string): object {
    this.location = location;
    return index.getValidation(this, "Location updated");
  }

  setProgress(progress: number): object {
    this.progress = progress;
    setStatus(this);
    return index.getValidation(this, "Progress updated");
  }

  setDetails(details: boolean): object {
    this.details = details;
    setStatus(this);
    return index.getValidation(this, "Details updated");
  }

  addBuilder(builder: string): object {
    const builderSplit = this.builder === null ? [] : this.builder.split(",");
    for (const b of builderSplit) {
      if (b.toLowerCase() === builder.toLowerCase()) {
        return index.generateError("Builder already added");
      }
    }

    if (this.builder === "" || this.builder === null) {
      this.builder = builder;
      setStatus(this);
    } else {
      this.builder += `,${builder}`;
    }

    return index.getValidation(this, "Builder added");
  }

  removeBuilder(builder: string): object {
    const builderSplit = this.builder === null ? [] : this.builder.split(",");
    for (const b of builderSplit) {
      if (b.toLowerCase() === builder.toLowerCase()) {
        if (builderSplit.length === 1) {
          this.builder = null;
          setStatus(this);
        } else {
          if (builderSplit[0].toLowerCase() === builder.toLowerCase()) {
            this.builder.replace(`${builder},`, "");
          } else {
            this.builder.replace(`,${builder}`, "");
          }
        }
        return index.getValidation(this, "Builder removed");
      }
    }
    return index.generateError("Builder not found for this block");
  }
}

async function setStatus(block: Block) {
  const oldStatus = block.status;
  if (oldStatus !== 4 && block.progress === 100 && block.details) {
    block.status = 4;
    block.completionDate = new Date();
  } else if (oldStatus !== 3 && block.progress === 100 && !block.details) {
    block.status = 3;
    block.completionDate = null;
  } else if (oldStatus !== 2 && (block.progress > 0 || block.details)) {
    block.status = 2;
    block.completionDate = null;
  } else if (
    oldStatus !== 1 &&
    block.progress === 0 &&
    !block.details &&
    block.builder !== "" &&
    block.builder !== null
  ) {
    block.status = 1;
    block.completionDate = null;
  } else if (oldStatus !== 0) {
    block.status = 0;
    block.completionDate = null;
  }

  // Update on change
  if (oldStatus !== block.status) {
    await Block.save(block);

    if (block.status === 4) {
      let blocks = await Block.find({ district: block.district });
      var done = 0;
      for (const b of blocks) {
        if (b.status === 4) {
          done++;
        }
      }

      if (done === blocks.length) {
        // District completed
        let district = await District.findOne({ id: block.district });
        district.completionDate = new Date();
        await district.save();
      }
    } else {
      let district = await District.findOne({ id: block.district });
      if (district.completionDate !== null) {
        district.completionDate = null;
        await district.save();
      }
    }
  }
}
