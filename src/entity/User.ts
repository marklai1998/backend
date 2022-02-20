import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from "typeorm";
import { IsEmail, IsUUID } from "class-validator";

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

  @Column()
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
  settings: string;

  @Column("text")
  password: string;

  @Column("text", { nullable: true, unique: true })
  @IsUUID("4", { message: "Invalid API Key" })
  apikey: string;
}
