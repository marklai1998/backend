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
  districtIdToName,
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

import { District } from "./District";
import { Landmark } from "./Landmark";
import Logger from "../utils/Logger";
import { User } from "./User";
import { log } from "./Log";
import responses from "../responses";

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
      landmarks: await this.getLandmarks(),
      center: this.getLocationCenter(),
      size: this.getAreaSize(),
      area: JSON.parse(this.area),
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

  async setBuilder(builder: string, user: User) {
    if (this.builder === builder) {
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
      oldValue: oldValue,
      newValue: builder,
      user: user,
    });
  }

  async addBuilder(builder: string): Promise<object> {
    const builderSplit = this.builder === null ? [] : this.builder.split(",");
    for (const b of builderSplit) {
      if (b.toLowerCase() === builder.toLowerCase()) {
        return responses.error({ message: "Builder already added", code: 400 });
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
    return responses.error({
      message: "Builder not found for this block",
      code: 404,
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

  async getLandmarks() {
    const landmarksRaw = await Landmark.findBy({ blockID: this.uid });

    return landmarksRaw.map((l: any) => l.toJson());
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

async function setStatus(block: Block): Promise<number> {
  const oldStatus = block.status;
  let changed = false;
  if (oldStatus !== 4 && block.progress === 100 && block.details) {
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

    // Update Block Counts & District Status
    recalculateDistrictBlocksDoneLeft(block.district);
  } else if (oldStatus !== 3 && block.progress === 100 && !block.details) {
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
    block.builder !== "" &&
    block.builder !== null
  ) {
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
    if (oldStatus === 4) {
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
  return changed ? oldStatus : -1;
}

async function update({
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
