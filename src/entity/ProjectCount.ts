import { Entity, PrimaryColumn, Column, BaseEntity } from "typeorm";
import { IsInt } from "class-validator";

@Entity({ name: "projects" })
export class ProjectCount extends BaseEntity {
  @PrimaryColumn({ type: "date" })
  date: Date;

  @Column()
  @IsInt({ message: "Invalid Projects" })
  projects: number;
}
