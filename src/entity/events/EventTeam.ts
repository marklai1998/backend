import { IsHexColor, IsString, MaxLength } from "class-validator";
import {
  BaseEntity,
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "../User";
import { Event } from "./Event";

@Entity({ name: "eventteams" })
export class EventTeam extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  uuid: string;

  @Column({ length: 64, default: "Unnamed Team" })
  @IsString({ message: "Team name must be a string" })
  @MaxLength(64, { message: "Team name cannot be longer than 64 characters" })
  name: string;

  @Column({
    length: 7,
    default: "#FFFFFF",
    transformer: {
      to(value) {
        if (value.startsWith("#")) return value;
        return `#${value}`;
      },
      from(value) {
        return value;
      },
    },
  })
  @IsHexColor({ message: "Team color must be a valid hex color" })
  color: string;

  @ManyToOne(() => Event, (event) => event.uuid)
  event: Event;

  @ManyToMany(() => User, { eager: true, cascade: true })
  @JoinTable({ name: "eventteams_users" })
  members: User[];
}
