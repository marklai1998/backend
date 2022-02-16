import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({ name: "blocks" })
export class Block {
  @PrimaryGeneratedColumn()
  rid: number;

  @Column()
  id: number;

  @Column("text")
  location: string;

  @Column()
  district: number;

  @Column("tinyint")
  status: number;

  @Column("double")
  progress: number;

  @Column()
  details: boolean;

  @Column("text")
  builder: string;

  @Column("bigint")
  completionDate: number;
}
