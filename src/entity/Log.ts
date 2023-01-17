import { BaseEntity, Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import { productionMode } from "..";
import responses from "../responses";

import { User } from "./User";

@Entity({ name: "logs" })
export class Log extends BaseEntity {
  @PrimaryColumn({ type: "datetime" })
  date: Date;

  @ManyToOne(() => User, (user: User) => user.uid, {
    nullable: false,
    eager: true,
  })
  user: User;

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
  if (!productionMode) return;

  const log = new Log();

  log.date = new Date();
  log.user = user;
  log.type = type;
  log.edited = edited;
  log.old = typeof oldValue === "object" ? JSON.stringify(oldValue) : oldValue;
  log.new = typeof newValue === "object" ? JSON.stringify(newValue) : newValue;

  responses.validate(log, "Log created");
}
