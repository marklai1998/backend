import { IsDate, IsString, MaxLength, Min } from "class-validator";
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Block } from "../Block";
import { EventTeam } from "./EventTeam";

@Entity({ name: "events" })
export class Event extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  uuid: string;

  @Column({ length: 64, default: "Unnamed Event" })
  @IsString({ message: "Eventname must be a string" })
  @MaxLength(64, { message: "Eventname cannot be longer than 64 characters" })
  name: string;

  @Column("text", { nullable: true })
  description: string;

  @Column({ default: 0 })
  @Min(0, { message: "Claims per player cannot be negative" })
  claimsPerPlayer: number;

  @Column({ nullable: true })
  @IsDate({ message: "Invalid start date" })
  start: Date;

  @Column({ nullable: true })
  @IsDate({ message: "Invalid end date" })
  end: Date;

  @OneToMany(() => EventTeam, (eventteam) => eventteam.uuid)
  eventTeams: EventTeam[];

  @ManyToMany(() => Block, { eager: true, cascade: true })
  @JoinTable({ name: "events_blocks" })
  blocks: Block[];

  @CreateDateColumn()
  created: Date;

  @UpdateDateColumn()
  updated: Date;

  toJson(): object {
    return {
      uuid: this.uuid,
      name: this.name,
      description: this.description,
      claimsPerPlayer: this.claimsPerPlayer,
      start: this.start,
      end: this.end,
      created: this.created,
      updated: this.updated,
      blocks: this.blocks.map((block: Block) => block.toJson()),
    };
  }
}
