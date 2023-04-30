import { IsInt } from "class-validator";
import { BaseEntity, Column, Entity, PrimaryColumn } from "typeorm";
import Logger from "../../utils/Logger";

@Entity({ name: "statistics_requestcount" })
export class Statistic extends BaseEntity {
  @PrimaryColumn({ type: "date" })
  date: Date;

  @Column()
  @IsInt({ message: "Invalid Count" })
  count: number;
}

export async function createMissingDays() {
  const allEntries = await Statistic.find({
    order: { date: "ASC" },
  });
  const lastEntry = allEntries.length > 0 ? allEntries.at(-1) : null;
  const missingDays = lastEntry
    ? Math.floor(
        (new Date().getTime() - new Date(lastEntry.date).getTime()) /
          (1000 * 3600 * 24)
      )
    : 1;

  for (let i = 0; i < missingDays; i++) {
    const newDate = lastEntry
      ? new Date(new Date(lastEntry.date).getTime() + 86400000 * (i + 1))
      : new Date();
    Logger.debug(
      `Creating missing request count entry for ${
        newDate.toISOString().split("T")[0]
      }`
    );
    const stat = Statistic.create({ date: newDate, count: 0 });
    await stat.save();
  }
}
