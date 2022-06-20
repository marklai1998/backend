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

  @Column("double")
  @Min(0.0, { message: "Weight must be between 0 and 1" })
  @Max(1.0, { message: "Weight must be between 0 and 1" })
  weight: number;

  @Column({ default: false })
  @IsBoolean({ message: "Completion must be a boolean" })
  @IsOptional()
  done: boolean;

  @Column({ default: "[]" })
  requests: string;

  @Column({ default: "[]" })
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
      weight: this.weight,
      completed: this.done,
      requests: JSON.parse(this.requests),
      builder: JSON.parse(this.builder),
      completionDate: this.completionDate,
      location: this.location?.split(",") || null,
    };
  }

  edit(body: object): object {
    let counter = 0;
    for (const [key, value] of Object.entries(body)) {
      
      Logger.info("Editing landmark " + this.name + " (" + key.toLocaleUpperCase()+": "+this[key]+" -> "+value+")");
      if (key.toLowerCase() === "done" && typeof value === "boolean") {
        this.setDone(value);
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
    if (requests.includes(userID)) {
      return generateError("Requester already added");
    }

    requests.push(userID);
    this.requests = JSON.stringify(requests);
  }

  removeRequester(userID: number) {
    const requests = JSON.parse(this.requests);
    const index = requests.indexOf(userID);
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
}
