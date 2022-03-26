import { Entity, PrimaryColumn, Column, BaseEntity } from "typeorm";
import { IsJSON } from "class-validator";

@Entity({ name: "playerstats" })
export class PlayerStat extends BaseEntity {
  @PrimaryColumn({ type: "date" })
  date: Date;

  @Column()
  @IsJSON({ message: "Invalid Max Player Json" })
  max: string;

  @Column()
  @IsJSON({ message: "Invalid Average Player Json" })
  avg: string;
}
