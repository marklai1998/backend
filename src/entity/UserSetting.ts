import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./User";

@Entity()
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
    function parseToPrimitive(value: any) {
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    }

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
