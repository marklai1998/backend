import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { parseToPrimitive } from "../utils/JsonUtils";
import { User } from "./User";

@Entity({ name: "usersettings" })
export class UserSetting extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  uuid: string;

  @ManyToOne(() => User, (user: User) => user.settings, { eager: true })
  user: User;

  @Column()
  key: string;

  @Column()
  value: string;

  toJson(): object {
    return {
      user: this.user.uid,
      key: this.key,
      value: parseToPrimitive(this.value),
    };
  }
}

export const DEFAULT_SETTINGS = {
  MINECRAFT_DISTRICT_BAR: true,
  MINECRAFT_DEBUG_MODE: false,
};
