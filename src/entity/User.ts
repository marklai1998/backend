import * as jwt from "../utils/JsonWebToken";

import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";
import { DEFAULT_SETTINGS, UserSettings } from "./UserSettings";
import * as dbCache from "../utils/cache/DatabaseCache";

@Entity({ name: "users" })
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  uid: number;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true, nullable: true, length: 36 })
  @IsUUID("4", { message: "Invalid UUID" })
  @IsOptional()
  mc_uuid: string;

  @Column({ default: 0 })
  permission: number;

  @Column({ nullable: true })
  discord: string;

  @Column("text", { nullable: true })
  rank: string;

  @Column("text", { nullable: true })
  about: string;

  @Column("text", { nullable: true })
  image: string;

  @Column("text", { nullable: true })
  picture: string;

  @Column("text", {
    default: JSON.stringify({
      rank_history: [],
    }),
  })
  stats: string;

  @OneToMany(
    () => UserSettings,
    (userSettings: UserSettings) => userSettings.user
  )
  settings: UserSettings[];

  @Column({ default: false })
  online: boolean;

  @Column({ nullable: true })
  last_online: Date;

  @Column({ nullable: true, length: 16 })
  @IsString({ message: "Old username must be a string" })
  @MinLength(3, { message: "Old username cannot be shorter than 3 characters" })
  @MaxLength(16, {
    message: "Old username cannot be longer than 16 characters",
  })
  old_username: string;

  @Column("text")
  password: string;

  @Column({ nullable: true, unique: true, length: 36 })
  @IsOptional()
  @IsUUID("4", { message: "Invalid API Key set for user" })
  apikey: string;

  @CreateDateColumn()
  created: Date;

  toJson({
    showAPIKey = false,
    showPassword = false,
    hasPermission = false,
  }: {
    showAPIKey?: boolean;
    showPassword?: boolean;
    hasPermission?: boolean;
  } = {}): object {
    function parseToPrimitive(value: any) {
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    }

    const userSettings = dbCache.find("usersettings", { user: this });

    const settingsWithDefaults = [];
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      settingsWithDefaults.push({
        key,
        value:
          parseToPrimitive(
            userSettings.find((setting: UserSettings) => setting.key === key)
              ?.value
          ) ?? value,
      });
    }

    return {
      uid: this.uid,
      username: this.username,
      mc_uuid: this.mc_uuid,
      permission: this.permission,
      rank: this.rank,
      discord: this.discord,
      about: this.about,
      image: this.image,
      picture: this.picture,
      stats: JSON.parse(this.stats),
      settings: hasPermission ? settingsWithDefaults : undefined,
      online: this.online,
      last_online: this.last_online,
      old_username: this.old_username,
      password: showPassword ? this.password : undefined,
      apikey:
        showAPIKey && hasPermission
          ? jwt.generateToken(this.apikey, jwt.secretUserData)
          : undefined,
      created: this.created,
    };
  }
}
