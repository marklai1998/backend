import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
} from "class-validator";
import { generateError, generateSuccess, getValidation } from "../index";

import Logger from "../utils/Logger";
import { User } from "./User";
import { log } from "./Log";

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

  edit(body: object, user: User): object {
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
          (typeof value === "object" ? JSON.stringify(value) : value) +
          ")"
      );
      if (key.toLowerCase() === "done" && typeof value === "boolean") {
        log({
          user: user,
          type: "LANDMARK_DONE",
          edited: this.id,
          oldValue: this.done,
          newValue: value,
        });

        this.setDone(value);
      } else if (
        key.toLowerCase() === "priority" &&
        typeof value === "object" &&
        value.user &&
        value.priority
      ) {
        const requests_old = this.requests;
        const res = this.setPriority(value.user, value.priority);
        if (!res.error) {
          log({
            user: user,
            type: "LANDMARK_PRIORITY",
            edited: this.id,
            oldValue: JSON.stringify(
              JSON.parse(requests_old).find((r: any) => r.user === value.user)
            ),
            newValue: JSON.stringify(value),
          });
        }
      } else if (
        key.toLowerCase() === "requestsadd" &&
        typeof value === "number"
      ) {
        const res = this.addRequester(value);
        if (!res.error) {
          log({
            user: user,
            type: "LANDMARK_APPLY",
            edited: this.id,
            oldValue: null,
            newValue: value,
          });
        }
      } else if (
        key.toLowerCase() === "requestsremove" &&
        typeof value === "number"
      ) {
        const res = this.removeRequester(value);
        if (!res.error) {
          log({
            user: user,
            type: "LANDMARK_UNAPPLY",
            edited: this.id,
            oldValue: value,
            newValue: null,
          });
        }
      } else if (
        key.toLowerCase() === "builderadd" &&
        typeof value === "number"
      ) {
        const res = this.addBuilder(value);
        if (!res.error) {
          log({
            user: user,
            type: "LANDMARK_ADD_BUILDER",
            edited: this.id,
            oldValue: null,
            newValue: value,
          });
        }
      } else if (
        key.toLowerCase() === "builderremove" &&
        typeof value === "number"
      ) {
        const res = this.removeBuilder(value);
        if (!res.error) {
          log({
            user: user,
            type: "LANDMARK_REMOVE_BUILDER",
            edited: this.id,
            oldValue: value,
            newValue: null,
          });
        }
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
    return generateSuccess("Requester added");
  }

  removeRequester(userID: number) {
    const requests = JSON.parse(this.requests);
    const index = requests.findIndex((e: any) => e.user === userID);
    if (index === -1) {
      return generateError("Requester not found for this landmark");
    }

    requests.splice(index, 1);
    this.requests = JSON.stringify(requests);
    return generateSuccess("Requester removed");
  }

  addBuilder(userID: number) {
    const builder = JSON.parse(this.builder);
    const requests = JSON.parse(this.requests);
    if (builder.some((e: any) => e.user === userID)) {
      return generateError("Builder already added");
    }
    const indexRequest = requests.findIndex((e: any) => e.user === userID);
    if (indexRequest === -1) {
      return generateError("The user has not applied for this block");
    }

    builder.push(requests[indexRequest]);
    requests.splice(indexRequest, 1);
    this.builder = JSON.stringify(builder);
    this.requests = JSON.stringify(requests);
    return generateSuccess("Builder added");
  }

  removeBuilder(userID: number) {
    const builder = JSON.parse(this.builder);
    const requests = JSON.parse(this.requests);
    const index = builder.findIndex((e: any) => e.user === userID);
    if (index === -1) {
      return generateError("Builder not found for this landmark");
    }

    if (!requests.some((e: any) => e.user === userID)) {
      requests.push(builder[index]);
    }
    builder.splice(index, 1);
    this.builder = JSON.stringify(builder);
    this.requests = JSON.stringify(requests);
    return generateSuccess("Builder removed");
  }

  setPriority(user: number, priority: number) {
    const requests = JSON.parse(this.requests);
    const index = requests.findIndex((e: any) => e.user === user);
    if (index === -1) {
      return generateError("Requester not found for this landmark");
    }
    if (requests[index].priority === priority) {
      return generateError("Nothing changed");
    }

    requests[index].priority = priority;
    this.requests = JSON.stringify(requests);
    return generateSuccess("Priority updated");
  }
}
