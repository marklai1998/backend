import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from "typeorm";
import { IsInt, Min, Max, IsBoolean, Matches } from "class-validator";

@Entity({ name: "blocks" })
export class Block extends BaseEntity {
  @PrimaryGeneratedColumn()
  uid: number;

  @Column()
  @IsInt({ message: "Invalid ID" })
  id: number;

  @Column("text", { nullable: true })
  location: string;

  @Column()
  @IsInt({ message: "Invalid District ID" })
  district: number;

  @Column("tinyint", { default: 0 })
  @Min(0, { message: "Status must be between 0 and 4" })
  @Max(4, { message: "Status must be between 0 and 4" })
  status: number;

  @Column("double", { default: 0.0 })
  @Min(0.0, { message: "Progress must be between 0 and 100" })
  @Max(100.0, { message: "Progress must be between 0 and 100" })
  progress: number;

  @Column({ default: false })
  @IsBoolean({ message: "Details must be a boolean" })
  details: boolean;

  @Column("text", { nullable: true })
  @Matches(/^([a-zA-Z0-9_]{3,16}[,]?){1,}$/, {
    message: "Invalid Minecraft-Name found or not separated with a comma",
  })
  builder: string;

  @Column({ nullable: true })
  completionDate: Date;
}
