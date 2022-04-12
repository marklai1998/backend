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

export async function createMissingProjectEntries() {
  const allEntries = await ProjectCount.find({
    order: { date: "ASC" },
  });
  const lastEntry = allEntries[allEntries.length - 1];
  const missingDays = Math.floor(
    (new Date().getTime() - new Date(lastEntry.date).getTime()) /
      (1000 * 3600 * 24)
  );

  for (let i = 0; i < missingDays; i++) {
    const count = new ProjectCount();
    count.date = new Date(
      new Date(lastEntry.date).getTime() + 86400000 * (i + 1)
    );
    count.projects = lastEntry.projects;
    await count.save();
  }
}
