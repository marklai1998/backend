import { Entity, PrimaryColumn, Column } from "typeorm";
import { IsInt } from "class-validator";

@Entity({ name: "projects" })
export class ProjectCount {
  @PrimaryColumn({ type: "date" })
  date: Date;

  @Column()
  @IsInt({ message: "Invalid Projects" })
  projects: number;
}
