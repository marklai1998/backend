import * as jwt from "../utils/JsonWebToken";

import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";
import { IsOptional, IsUUID } from "class-validator";

@Entity({ name: "users" })
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  uid: number;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true, nullable: true, length: 36 })
  @IsUUID("4", { message: "Invalid UUID" })
  @IsOptional()
  uuid: string;

  @Column({ default: 0 })
  permission: number;

  @Column({ nullable: true })
  discord: string;

  @Column("text", { nullable: true })
  rank: string;

  @Column("text")
  about: string;

  @Column("text")
  image: string;

  @Column("text")
  picture: string;

  @Column("text", {
    default: JSON.stringify({
      rank_history: [],
    }),
  })
  stats: string;

  @Column("simple-json", { default: "{}" })
  settings: {};

  @Column()
  online: boolean;

  @Column({ nullable: true })
  last_online: Date;

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
    return {
      uid: this.uid,
      username: this.username,
      uuid: this.uuid,
      permission: this.permission,
      rank: this.rank,
      discord: this.discord,
      about: this.about,
      image: this.image,
      picture: this.picture,
      stats: JSON.parse(this.stats),
      settings: hasPermission ? this.settings : undefined,
      online: this.online,
      last_online: this.last_online,
      password: showPassword ? this.password : undefined,
      apikey:
        showAPIKey && hasPermission
          ? jwt.generateToken(this.apikey, jwt.secretUserData)
          : undefined,
      created: this.created,
    };
  }
}
