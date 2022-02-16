import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({ name: "distrcts" })
export class District {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column("text")
  area: string;

  @Column("bigint")
  completionDate: number;

  @Column("text")
  image: string;

  @Column("text")
  map: string;

  @Column()
  parent: number;

  @Column("text")
  about: string;
}
