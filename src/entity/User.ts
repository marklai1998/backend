import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Generated,
  OneToOne,
  JoinColumn,
} from "typeorm";
import { MinecraftUser } from "./MinecraftUser";

@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn()
  uid: number;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  username: string;

  @Column()
  rank: string;

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
}
