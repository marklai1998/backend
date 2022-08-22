import * as jwt from "../utils/JsonWebToken";

import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { IsEmail, IsJSON, IsOptional, IsUUID, Matches } from "class-validator";

import { MinecraftUser } from "./MinecraftUser";

@Entity({ name: "users" })
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  uid: number;

  @Column({ unique: true })
  @IsEmail({}, { message: "Invalid email address" })
  email: string;

  @Column({ unique: true })
  username: string;

  @Column({ default: 0 })
  permission: number;

  @Column({ nullable: true })
  @IsOptional()
  //@Matches(/^.{3,32}#[0-9]{4}$/, { message: "Invalid Discord Tag" })
  discord: string;

  @ManyToOne(() => MinecraftUser, (user) => user.uid, {
    nullable: true,
    eager: true,
  })
  minecraft: MinecraftUser;

  @Column("text", { nullable: true })
  rank: string;

  @Column("text")
  about: string;

  @Column("text")
  image: string;

  @Column("text")
  picture: string;

  @Column("text" /*{ default: "{}" }*/)
  @IsJSON({ message: "Settings must be a valid JSON-String" })
  @IsOptional()
  settings: string;

  @Column("text")
  password: string;

  @Column({ nullable: true, unique: true, length: 36 })
  @IsOptional()
  @IsUUID("4", { message: "Invalid API Key set for user" })
  apikey: string;

  @CreateDateColumn()
  created: Date;

  async toJson({
    showAPIKey = false,
    showPassword = false,
    hasPermission = false,
  }: {
    showAPIKey?: boolean;
    showPassword?: boolean;
    hasPermission?: boolean;
  } = {}): Promise<object> {
    return {
      uid: this.uid,
      email: hasPermission ? this.email : undefined,
      username: this.username,
      permission: this.permission,
      rank: this.rank,
      discord: this.discord,
      about: this.about,
      image: this.image,
      picture: this.picture,
      settings: hasPermission ? JSON.parse(this.settings) : undefined,
      minecraft: !this.minecraft ? null : this.minecraft.toJson(),
      password: showPassword ? this.password : undefined,
      apikey:
        showAPIKey && hasPermission
          ? jwt.generateToken(this.apikey, jwt.secretUserData)
          : undefined,
      created: this.created,
    };
  }
}
