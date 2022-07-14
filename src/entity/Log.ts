import { BaseEntity, Column, Entity, PrimaryColumn } from "typeorm";
import { IsInt } from "class-validator";

import { getValidation } from "../index";
import { User } from "./User";

@Entity({ name: "logs" })
export class Log extends BaseEntity {
  @PrimaryColumn({ type: "datetime" })
  date: Date;

  @Column()
  @IsInt({ message: "Invalid User ID" })
  user: number;

  @Column()
  type: string;

  @Column()
  edited: number;

  @Column("text", { nullable: true })
  old: string;

  @Column("text", { nullable: true })
  new: string;
}

export function log({
  user,
  type,
  edited,
  oldValue,
  newValue,
}: {
  user: User;
  type: string;
  edited: number;
  oldValue: any;
  newValue: any;
}) {
  const log = new Log();

  log.date = new Date();
  log.user = user.uid;
  log.type = type;
  log.edited = edited;
  log.old = oldValue;
  log.new = newValue;

  getValidation(log, "Log created");
}
