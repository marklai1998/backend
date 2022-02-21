import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from "typeorm";
import { IsEmail, IsUUID, IsJSON, Matches, IsOptional } from "class-validator";

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
}
