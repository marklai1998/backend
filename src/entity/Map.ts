import { IsUUID, MaxLength } from "class-validator";
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import * as dbCache from "../utils/cache/DatabaseCache";

@Entity({ name: "maps" })
export class Map extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 36 })
  @IsUUID("4", { message: "Invalid UUID" })
  uuid: string;

  @Column({ length: 64 })
  @MaxLength(64, { message: "Name cannot be longer than 64 characters" })
  name: string;

  @Column()
  owner: number;

  @Column("simple-json", { default: "[]" })
  users: { uid: number; role: "EDITOR" | "MANAGER" }[];

  // TODO: Add more types
  @Column("simple-json", { default: "[]" })
  elements: {
    id: string;
    type: "MARKER" | "POLYGON";
    color: string;
    coords: [number[]];
  }[];

  // TODO: Add different map types
  @Column("simple-json", {
    default: JSON.stringify({
      visible: false,
      editable: false,
      status: "ACTIVE",
      start_location: { lat: 40.748457795121574, lng: -73.98565062177646 },
      start_zoom: 12,
      map_type: "TODO",
    }),
  })
  settings: {
    visible: boolean;
    editable: boolean;
    status: "ACTIVE" | "ARCHIEVED" | "DELETED";
    start_location: { lat: number; lng: number };
    start_zoom: number;
    map_type: string;
  };

  @CreateDateColumn()
  created: Date;

  @UpdateDateColumn({ nullable: true })
  last_updated: Date;

  toJson({ showDetails = true }: { showDetails?: boolean } = {}) {
    return {
      id: this.id,
      uuid: this.uuid,
      name: this.name,
      owner: dbCache.findOne("users", { uid: this.owner }).toJson(),
      users: showDetails ? this.users : undefined,
      elements: showDetails ? this.elements : undefined,
      settings: this.settings,
      created: this.created,
      last_updated: this.last_updated,
    };
  }
}
