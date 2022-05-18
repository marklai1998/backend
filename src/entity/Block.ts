import * as index from "../index";

import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  Matches,
  Max,
  Min,
} from "class-validator";
import { generateError, getValidation } from "../index";
import {
  recalculateDistrictBlocksDoneLeft,
  recalculateDistrictProgress,
  recalculateDistrictStatus,
} from "../utils/ProgressCalculation";

import { District } from "./District";
import { districtIdToName } from "../utils/DistrictUtils";
import { parseDate } from "../utils/TimeUtils";
import { sendDiscordChange } from "../utils/DiscordMessageSender";

@Entity({ name: "blocks" })
export class Block extends BaseEntity {
  @PrimaryGeneratedColumn()
  uid: number;

  @Column()
  @IsInt({ message: "Invalid ID" })
  id: number;

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
  /*@Matches(/^$|^(([a-zA-Z0-9_]{3,16}[,]?){1,})|Building Session$/, {
    message: "Invalid Minecraft-Name found or not separated with a comma",
  })*/
  @IsOptional()
  builder: string;

  @Column({ nullable: true })
  @IsOptional()
  completionDate: Date;

  @Column("text" /*{ default: "[]" }*/)
  area: string;

  async toJson({
    showDistrict = true,
  }: { showDistrict?: boolean } = {}): Promise<object> {
    return {
      uid: this.uid,
      id: this.id,
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
      completionDate: this.completionDate,
      center: this.getLocationCenter(),
      area: JSON.parse(this.area),
    };
  }

  async setProgress(progress: number): Promise<object> {
    if (this.progress === progress) {
      return index.generateError("Nothing changed");
    }
    const oldValue = this.progress;

    this.progress = progress;
    const oldStatus = await setStatus(this);

    recalculateDistrictProgress(this.district);
    return await update({
      block: this,
      successMessage: "Progress Updated",
      oldStatus: oldStatus,
      oldValue: oldValue,
      newValue: progress,
    });
  }

  async setDetails(details: boolean): Promise<object> {
    if (this.details === details) {
      return index.generateError("Nothing changed");
    }
    const oldValue = this.details;

    this.details = details;
    const oldStatus = await setStatus(this);

    return await update({
      block: this,
      successMessage: "Details Updated",
      oldStatus: oldStatus,
      oldValue: oldValue,
      newValue: details,
    });
  }

  async setBuilder(builder: string) {
    if (this.builder === builder) {
      return index.generateError("Nothing changed");
    }
    const oldValue = this.builder;

    this.builder = builder;
    const oldStatus = await setStatus(this);

    return await update({
      block: this,
      successMessage: "Builder Updated",
      oldStatus: oldStatus,
      oldValue: oldValue,
      newValue: builder,
    });
  }

  async addBuilder(builder: string): Promise<object> {
    const builderSplit = this.builder === null ? [] : this.builder.split(",");
    for (const b of builderSplit) {
      if (b.toLowerCase() === builder.toLowerCase()) {
        return index.generateError("Builder already added");
      }
    }

    let oldStatus = -1;
    if (this.builder === "" || this.builder === null) {
      this.builder = builder;
      oldStatus = await setStatus(this);
    } else {
      this.builder += `,${builder}`;
    }

    return await update({
      block: this,
      successMessage: "Builder Added",
      oldStatus: oldStatus,
      newValue: builder,
    });
  }

  async removeBuilder(builder: string): Promise<object> {
    const builderSplit = this.builder === null ? [] : this.builder.split(",");
    for (const b of builderSplit) {
      if (b.toLowerCase() === builder.toLowerCase()) {
        let oldStatus = -1;
        if (builderSplit.length === 1) {
          this.builder = null;
          oldStatus = await setStatus(this);
        } else {
          if (builderSplit[0].toLowerCase() === builder.toLowerCase()) {
            this.builder.replace(`${builder},`, "");
          } else {
            this.builder.replace(`,${builder}`, "");
          }
        }
        return await update({
          block: this,
          successMessage: "Builder Removed",
          oldStatus: oldStatus,
          newValue: builder,
        });
      }
    }
    return index.generateError("Builder not found for this block");
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
    return index.getValidation(this, "Location added");
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

  getLocationCenter() {
    const locations = JSON.parse(this.area);
    const length = locations.length;

    if (length === 0) {
      return [];
    }

    let x = 0,
      y = 0,
      z = 0;

    for (const loc of locations) {
      const lat = (loc[0] * Math.PI) / 180;
      const lon = (loc[1] * Math.PI) / 180;

      x += Math.cos(lat) * Math.cos(lon);
      y += Math.cos(lat) * Math.sin(lon);
      z += Math.sin(lat);
    }

    x /= length;
    y /= length;
    z /= length;

    const lon = Math.atan2(y, x);
    const hyp = Math.sqrt(x * x + y * y);
    const lat = Math.atan2(z, hyp);

    return [(lat * 180) / Math.PI, (lon * 180) / Math.PI];
  }

  private validateCoords(coords: string): boolean {
    if (typeof coords !== "string") return false;

    const array = coords.split(",");
    if (array.length !== 2) return false;

    return true;
  }
}

async function setStatus(block: Block): Promise<number> {
  const oldStatus = block.status;
  let changed = false;
  if (oldStatus !== 4 && block.progress === 100 && block.details) {
    block.status = 4;
    block.completionDate = new Date();

    changed = true;

    // Update Block Counts & District Status
    recalculateDistrictBlocksDoneLeft(block.district);
  } else if (oldStatus !== 3 && block.progress === 100 && !block.details) {
    block.status = 3;
    block.completionDate = null;

    changed = true;

    // Update Block Counts & District Status
    if (oldStatus === 4) {
      recalculateDistrictBlocksDoneLeft(block.district);
      recalculateDistrictStatus(block.status);
    }
  } else if (oldStatus !== 2 && (block.progress > 0 || block.details)) {
    block.status = 2;
    block.completionDate = null;

    changed = true;

    // Update Block Counts & District Status
    if (oldStatus === 4) {
      recalculateDistrictBlocksDoneLeft(block.district);
      recalculateDistrictStatus(block.status);
    }
  } else if (
    oldStatus !== 1 &&
    block.progress === 0 &&
    !block.details &&
    block.builder !== "" &&
    block.builder !== null
  ) {
    block.status = 1;
    block.completionDate = null;

    changed = true;

    // Update Block Counts & District Status
    if (oldStatus === 4) {
      recalculateDistrictBlocksDoneLeft(block.district);
      recalculateDistrictStatus(block.status);
    }
  } else if (oldStatus !== 0 && block.progress === 0 && !block.details) {
    block.status = 0;
    block.completionDate = null;

    changed = true;

    // Update Block Counts & District Status
    if (oldStatus === 4) {
      recalculateDistrictBlocksDoneLeft(block.district);
      recalculateDistrictStatus(block.status);
    }
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
  return changed ? oldStatus : -1;
}

async function update({
  block = null,
  successMessage = null,
  oldStatus = -1,
  oldValue = null,
  newValue = null,
}: {
  block?: Block;
  successMessage?: string;
  oldStatus?: number;
  oldValue?: string | number | boolean;
  newValue?: string | number | boolean;
} = {}): Promise<object> {
  if (block === null || successMessage === null) return;

  const result = await index.getValidation(block, successMessage);

  if (!result["error"]) {
    // Send Webhook
    sendDiscordChange({
      block,
      title: successMessage,
      statusChanged: oldStatus !== -1,
      oldStatus: oldStatus,
      oldValue: oldValue,
      newValue: newValue,
    });
  }

  return result;
}
