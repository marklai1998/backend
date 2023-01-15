import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from "class-validator";
import {
  calculateAreaOfLatLong,
  calculateCenterOfLatLong,
} from "../utils/DistrictUtils";
import {
  recalculateDistrictBlocksDoneLeft,
  recalculateDistrictProgress,
  recalculateDistrictStatus,
} from "../utils/ProgressCalculation";
import {
  sendDistrictChange,
  sendOverview,
} from "../utils/DiscordMessageSender";

import * as dbCache from "../utils/cache/DatabaseCache";
import { District } from "./District";
import { Landmark } from "./Landmark";
import Logger from "../utils/Logger";
import { User } from "./User";
import { log } from "./Log";
import responses from "../responses";
import _ = require("lodash");

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

  @Column("simple-json", { default: "[]" })
  @IsOptional()
  builder: string[];

  @Column({ nullable: true })
  @IsOptional()
  completionDate: Date;

  @Column("text", { default: "[]" })
  area: string;

  @Column()
  eventBlock: boolean;

  toJson({ showDistrict = true }: { showDistrict?: boolean } = {}): object {
    return {
      uid: this.uid,
      id: this.id,
      district: showDistrict
        ? {
            id: this.district,
            name: dbCache.findOne("districts", { id: this.district }).name,
          }
        : undefined,
      status: this.status,
      progress: this.progress,
      details: this.details,
      builders: this.builder,
      completionDate: this.completionDate,
      landmarks: dbCache
        .find("landmarks", { blockID: this.uid })
        .map((landmark: Landmark) => landmark.toJson()),
      center: this.getLocationCenter(),
      size: this.getAreaSize(),
      area: JSON.parse(this.area),
      eventBlock: this.eventBlock,
    };
  }

  async setProgress(progress: number, user: User): Promise<object> {
    if (this.progress === progress) {
      return responses.error({ message: "Nothing changed", code: 400 });
    }
    const oldValue = this.progress;

    log({
      user: user,
      type: "BLOCK_PROGRESS",
      edited: this.uid,
      oldValue: oldValue,
      newValue: progress,
    });

    this.progress = progress;
    const oldStatus = await setStatus(this);

    recalculateDistrictProgress(this.district);
    return await update({
      block: this,
      successMessage: "Progress Updated",
      oldStatus: oldStatus,
      oldValue: oldValue,
      newValue: progress,
      user: user,
    });
  }

  async setDetails(details: boolean, user: User): Promise<object> {
    if (this.details === details) {
      return responses.error({ message: "Nothing changed", code: 400 });
    }
    const oldValue = this.details;

    log({
      user: user,
      type: "BLOCK_DETAILS",
      edited: this.uid,
      oldValue: oldValue,
      newValue: details,
    });

    this.details = details;
    const oldStatus = await setStatus(this);

    return await update({
      block: this,
      successMessage: "Details Updated",
      oldStatus: oldStatus,
      oldValue: oldValue,
      newValue: details,
      user: user,
    });
  }

  async setBuilder(builder: string[], user: User) {
    if (_.isEqual(this.builder, builder)) {
      return responses.error({ message: "Nothing changed", code: 400 });
    }
    const oldValue = this.builder;

    log({
      user: user,
      type: "BLOCK_BUILDER",
      edited: this.uid,
      oldValue: oldValue,
      newValue: builder,
    });

    this.builder = builder;
    const oldStatus = await setStatus(this);

    return await update({
      block: this,
      successMessage: "Builder Updated",
      oldStatus: oldStatus,
      oldValue: oldValue.join(","),
      newValue: builder.join(","),
      user: user,
    });
  }

  async addBuilder(builder: string): Promise<object> {
    for (const b of this.builder) {
      if (b.toLowerCase() === builder.toLowerCase()) {
        return responses.error({ message: "Builder already added", code: 400 });
      }
    }

    let oldStatus = -1;
    if (!this.builder.length) {
      this.builder = [builder];
      oldStatus = await setStatus(this);
    } else {
      this.builder.push(builder);
    }

    return await update({
      block: this,
      successMessage: "Builder Added",
      oldStatus: oldStatus,
      newValue: builder,
    });
  }

  async removeBuilder(builder: string): Promise<object> {
    // const builderSplit = this.builder;
    const index = this.builder.findIndex(
      (b) => b.toLowerCase() === builder.toLowerCase()
    );
    if (index === -1) {
      return responses.error({
        message: "Builder not found for this block",
        code: 404,
      });
    }
    let oldStatus = -1;
    if (this.builder.length === 1) {
      oldStatus = await setStatus(this);
    }

    this.builder.splice(index, 1);
    return await update({
      block: this,
      successMessage: "Builder Removed",
      oldStatus: oldStatus,
      newValue: builder,
    });
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

  getAreaSize() {
    return calculateAreaOfLatLong(JSON.parse(this.area));
  }

  private validateCoords(coords: string): boolean {
    if (typeof coords !== "string") return false;

    const array = coords.split(",");
    if (array.length !== 2) return false;

    return true;
  }
}

export async function setStatus(
  block: Block,
  returnNewStatus?: boolean
): Promise<number> {
  const oldStatus = block.status;
  let changed = false;
  if (oldStatus !== 4 && block.progress === 100 && block.details) {
    // Status --> Done
    Logger.info(
      `[${new Date().toLocaleString()}] Block Status changed - District: ${
        block.district
      }, Block: ${block.id}, Status: ${oldStatus} -> 4, Progress: ${
        block.progress
      }, Details: ${block.details}`
    );
    block.status = 4;
    block.completionDate = new Date();

    changed = true;
  } else if (oldStatus !== 3 && block.progress === 100 && !block.details) {
    // Status --> Detailing
    Logger.info(
      `[${new Date().toLocaleString()}] Block Status changed - District: ${
        block.district
      }, Block: ${block.id}, Status: ${oldStatus} -> 3, Progress: ${
        block.progress
      }, Details: ${block.details}`
    );
    block.status = 3;
    block.completionDate = null;

    changed = true;
  } else if (
    oldStatus !== 2 &&
    ((block.progress > 0 && block.progress < 100) ||
      (block.progress === 0 && block.details))
  ) {
    // Status --> Building
    Logger.info(
      `[${new Date().toLocaleString()}] Block Status changed - District: ${
        block.district
      }, Block: ${block.id}, Status: ${oldStatus} -> 2, Progress: ${
        block.progress
      }, Details: ${block.details}`
    );
    block.status = 2;
    block.completionDate = null;

    changed = true;
  } else if (
    oldStatus !== 1 &&
    block.progress === 0 &&
    !block.details &&
    block.builder.length
  ) {
    // Status --> Reserved
    Logger.info(
      `[${new Date().toLocaleString()}] Block Status changed - District: ${
        block.district
      }, Block: ${block.id}, Status: ${oldStatus} -> 1, Progress: ${
        block.progress
      }, Details: ${block.details}`
    );
    block.status = 1;
    block.completionDate = null;

    changed = true;
  } else if (
    oldStatus !== 0 &&
    block.progress === 0 &&
    !block.details &&
    !block.builder
  ) {
    // Status --> Not Started
    Logger.info(
      `[${new Date().toLocaleString()}] Block Status changed - District: ${
        block.district
      }, Block: ${block.id}, Status: ${oldStatus} -> 0, Progress: ${
        block.progress
      }, Details: ${block.details}`
    );
    block.status = 0;
    block.completionDate = null;

    changed = true;
  }

  // Update on change
  if (oldStatus !== block.status) {
    await Block.save(block);

    // Update Block Counts & District Status
    if (oldStatus === 4 || block.status === 4) {
      await recalculateDistrictBlocksDoneLeft(block.district);
      recalculateDistrictStatus(block.district);
    }

    if (block.status === 4) {
      let blocks = await Block.findBy({ district: block.district });
      var done = 0;
      for (const b of blocks) {
        if (b.status === 4) {
          done++;
        }
      }

      if (done === blocks.length) {
        // District completed
        let district = await District.findOneBy({ id: block.district });
        district.completionDate = new Date();
        await district.save();
      }
    } else {
      let district = await District.findOneBy({ id: block.district });
      if (district.completionDate !== null) {
        district.completionDate = null;
        await district.save();
      }
    }
  }
  return changed ? (returnNewStatus ? block.status : oldStatus) : -1;
}

export async function update({
  block = null,
  successMessage = null,
  oldStatus = -1,
  oldValue = null,
  newValue = null,
  user = null,
}: {
  block?: Block;
  successMessage?: string;
  oldStatus?: number;
  oldValue?: string | number | boolean;
  newValue?: string | number | boolean;
  user?: User;
} = {}): Promise<object> {
  if (block === null || successMessage === null) return;

  const result = await responses.validate(block, successMessage);

  if (!result["error"]) {
    // Send Webhook
    sendDistrictChange({
      block,
      title: successMessage,
      statusChanged: oldStatus !== -1,
      oldStatus: oldStatus,
      oldValue: oldValue,
      newValue: newValue,
      user: user,
    });
    sendOverview();
  }

  return result;
}
