import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from "typeorm";
import { IsEmail, IsUUID, IsJSON, Matches, IsOptional } from "class-validator";

import * as jwt from "../utils/JsonWebToken";

import { MinecraftUser } from "./MinecraftUser";

@Entity({ name: "users" })
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  uid: number;

  @Column({ unique: true })
  @IsEmail()
  email: string;

  @Column({ unique: true })
  username: string;

  @Column({ default: 0 })
  permission: number;

  @Column({ nullable: true })
  @IsOptional()
  @Matches(/^.{3,32}#[0-9]{4}$/, { message: "Invalid Discord Tag" })
  discord: string;

  @Column({ nullable: true })
  minecraft: number;

  @Column("text")
  about: string;

  @Column("text")
  image: string;

  @Column("text")
  picture: string;

  @Column("text", { default: "{}" })
  @IsJSON({ message: "Settings must be a valid JSON-String" })
  settings: string;

  @Column("text")
  password: string;

  @Column("text", { nullable: true, unique: true })
  @IsOptional()
  @IsUUID("4", { message: "Invalid API Key set for user" })
  apikey: string;

  async toJson({
    showAPIKey = false,
    showPassword = false,
  }: { showAPIKey?: boolean; showPassword?: boolean } = {}): Promise<object> {
    let minecraft = null;
    if (this.minecraft) {
      const minecraftUser = await MinecraftUser.findOne({
        uid: this.minecraft,
      });

      if (minecraftUser) {
        minecraft = {
          uuid: minecraftUser.uuid,
          username: minecraftUser.username,
          rank: minecraftUser.rank,
          settings: JSON.parse(minecraftUser.settings),
        };
      }
    }

    return {
      uid: this.uid,
      email: this.email,
      username: this.username,
      permission: this.permission,
      discord: this.discord,
      about: this.about,
      image: this.image,
      picture: this.picture,
      settings: JSON.parse(this.settings),
      minecraft: minecraft,
      password: showPassword ? this.password : undefined,
      apikey: showAPIKey
        ? jwt.generateToken(this.apikey, jwt.secretUserData)
        : undefined,
    };
  }
}
