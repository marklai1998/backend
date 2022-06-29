import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
} from "class-validator";
import { generateError, getValidation } from "../index";

import Logger from "../utils/Logger";

@Entity({ name: "landmarks" })
export class Landmark extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  @IsInt({ message: "Invalid Block ID" })
  blockID: number;

  @Column()
  @IsInt({ message: "Invalid District ID" })
  district: number;

  @Column()
  @IsInt({ message: "Invalid Block ID" })
  block: number;

  @Column({ default: false })
  @IsBoolean({ message: "Completion must be a boolean" })
  @IsOptional()
  done: boolean;

  @Column("text", { default: "[]" })
  requests: string;

  @Column("text", { default: "[]" })
  builder: string;

  @Column({ nullable: true })
  @IsOptional()
  completionDate: Date;

  @Column("text", { nullable: true })
  @Matches(/^((\-?|\+?)?\d+(\.\d+)?),\s*((\-?|\+?)?\d+(\.\d+)?)$/, {
    message: "Invalid Latitude/Longitude or not separated by a comma",
  })
  @IsOptional()
  location: string;

  toJson(): object {
    return {
      id: this.id,
      name: this.name,
      block: this.blockID,
      district: this.district,
      blockID: this.block,
      completed: this.done,
      requests: JSON.parse(this.requests),
      builder: JSON.parse(this.builder),
      completionDate: this.completionDate,
      location: this.location?.split(", ") || null,
    };
  }

  edit(body: object): object {
    let counter = 0;
    for (const [key, value] of Object.entries(body)) {
      Logger.info(
        "Editing landmark " +
          this.name +
          " (" +
          key.toLocaleUpperCase() +
          ": " +
          this[key] +
          " -> " +
          value +
          ")"
      );
      if (key.toLowerCase() === "done" && typeof value === "boolean") {
        this.setDone(value);
      } else if (
        key.toLowerCase() === "priority" &&
        typeof value === "object" &&
        value.user &&
        value.priority
      ) {
        this.setPriority(value.user, value.priority);
      } else if (
        key.toLowerCase() === "requestsadd" &&
        typeof value === "number"
      ) {
        this.addRequester(value);
      } else if (
        key.toLowerCase() === "requestsremove" &&
        typeof value === "number"
      ) {
        this.removeRequester(value);
      } else if (
        key.toLowerCase() === "builderadd" &&
        typeof value === "number"
      ) {
        this.addBuilder(value);
      } else if (
        key.toLowerCase() === "builderremove" &&
        typeof value === "number"
      ) {
        this.removeBuilder(value);
      } else if (key.toLowerCase() !== "id" && this[key] !== undefined) {
        this[key] = value;
      } else {
        continue;
      }
      counter++;
    }
    return getValidation(this, `${counter} columns updated`);
  }

  setDone(done: boolean) {
    if (this.done !== done) {
      if (done) {
        this.completionDate = new Date();
      } else {
        this.completionDate = null;
      }
      this.done = done;
    }
  }

  addRequester(userID: number) {
    const requests = JSON.parse(this.requests);
    if (requests.some((e: any) => e.user === userID)) {
      return generateError("Requester already added");
    }

    requests.push({
      user: userID,
      priority: 3,
    });
    this.requests = JSON.stringify(requests);
  }

  removeRequester(userID: number) {
    const requests = JSON.parse(this.requests);
    const index = requests.findIndex((e: any) => e.user === userID);
    if (index === -1) {
      return generateError("Requester not found for this landmark");
    }

    requests.splice(index, 1);
    this.requests = JSON.stringify(requests);
  }

  addBuilder(userID: number) {
    const builder = JSON.parse(this.builder);
    if (builder.includes(userID)) {
      return generateError("Builder already added");
    }

    builder.push(userID);
    this.builder = JSON.stringify(builder);
  }

  removeBuilder(userID: number) {
    const builder = JSON.parse(this.builder);
    const index = builder.indexOf(userID);
    if (index === -1) {
      return generateError("Builder not found for this landmark");
    }

    builder.splice(index, 1);
    this.builder = JSON.stringify(builder);
  }

  setPriority(user: number, priority: number) {
    const requests = JSON.parse(this.requests);
    const index = requests.findIndex((e: any) => e.user === user);
    if (index === -1) {
      return generateError("Requester not found for this landmark");
    }

    requests[index].priority = priority;
    this.requests = JSON.stringify(requests);
  }
}
