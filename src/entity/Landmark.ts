import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { IsBoolean, IsInt, IsOptional, Matches } from "class-validator";

import * as dbCache from "../utils/cache/DatabaseCache";
import Logger from "../utils/Logger";
import { User } from "./User";
import { log } from "./Log";
import responses from "../responses";
import { Block } from "./Block";

@Entity({ name: "landmarks" })
export class Landmark extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  @IsInt({ message: "Invalid Block ID" })
  blockID: number;

  // @Column()
  // @IsInt({ message: "Invalid District ID" })
  // district: number;

  // @Column()
  // @IsInt({ message: "Invalid Block ID" })
  // block: number;

  @Column({ default: 0 })
  enabled: boolean;

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

  @Column("simple-json", { default: "[]" })
  @IsOptional()
  location: number[];

  toJson({ newVersion = false }: { newVersion?: boolean } = {}): object {
    const block = dbCache.findOne(Block, { uid: this.blockID });

    if (newVersion) {
      return {
        id: this.id,
        name: this.name,
        block: {
          uid: block.uid,
          district: block.district,
          id: block.id,
        },
        enabled: this.enabled,
        completed: this.done,
        requests: this.requests ? JSON.parse(this.requests) : [],
        builder: this.builder ? JSON.parse(this.builder) : [],
        completionDate: this.completionDate,
        location: this.location,
      };
    }

    return {
      id: this.id,
      name: this.name,
      block: this.blockID,
      district: block.district,
      blockID: block.id,
      enabled: this.enabled,
      completed: this.done,
      requests: this.requests ? JSON.parse(this.requests) : [],
      builder: this.builder ? JSON.parse(this.builder) : [],
      completionDate: this.completionDate,
      location: this.location,
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
      if (key.toLowerCase() === "enabled" && typeof value === "boolean") {
        this.enabled = value;
      } else if (key.toLowerCase() === "done" && typeof value === "boolean") {
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
    return responses.validate(this, `${counter} columns updated`);
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
    if (!this.enabled) {
      return responses.error({
        message: "This landmark is currently not available to claim",
        code: 400,
      });
    }
    const requests = JSON.parse(this.requests);
    if (requests.some((e: any) => e.user === userID)) {
      return responses.error({ message: "Requester already added", code: 400 });
    }

    requests.push({
      user: userID,
      priority: 3,
    });
    this.requests = JSON.stringify(requests);
    return responses.success({ message: "Requester added" });
  }

  removeRequester(userID: number) {
    const requests = JSON.parse(this.requests);
    const index = requests.findIndex((e: any) => e.user === userID);
    if (index === -1) {
      return responses.error({
        message: "Requester not found for this landmark",
        code: 404,
      });
    }

    requests.splice(index, 1);
    this.requests = JSON.stringify(requests);
    return responses.success({ message: "Requester removed" });
  }

  addBuilder(userID: number) {
    const builder = JSON.parse(this.builder);
    const requests = JSON.parse(this.requests);
    if (builder.some((e: any) => e.user === userID)) {
      return responses.error({ message: "Builder already added", code: 400 });
    }
    const indexRequest = requests.findIndex((e: any) => e.user === userID);
    if (indexRequest === -1) {
      return responses.error({
        message: "The user has not applied for this block",
        code: 400,
      });
    }

    builder.push(requests[indexRequest]);
    requests.splice(indexRequest, 1);
    this.builder = JSON.stringify(builder);
    this.requests = JSON.stringify(requests);
    return responses.success({ message: "Builder added" });
  }

  removeBuilder(userID: number) {
    const builder = JSON.parse(this.builder);
    const requests = JSON.parse(this.requests);
    const index = builder.findIndex((e: any) => e.user === userID);
    if (index === -1) {
      return responses.error({
        message: "Builder not found for this landmark",
        code: 404,
      });
    }

    if (!requests.some((e: any) => e.user === userID)) {
      requests.push(builder[index]);
    }
    builder.splice(index, 1);
    this.builder = JSON.stringify(builder);
    this.requests = JSON.stringify(requests);
    return responses.success({ message: "Builder removed" });
  }

  setPriority(user: number, priority: number) {
    const requests = JSON.parse(this.requests);
    const index = requests.findIndex((e: any) => e.user === user);
    if (index === -1) {
      return responses.error({
        message: "Requester not found for this landmark",
        code: 404,
      });
    }
    if (requests[index].priority === priority) {
      return responses.error({ message: "Nothing changed", code: 400 });
    }

    requests[index].priority = priority;
    this.requests = JSON.stringify(requests);
    return responses.success({ message: "Priority updated" });
  }
}
