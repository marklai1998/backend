import { BaseEntity, Column, Entity, PrimaryColumn } from "typeorm";

import { IsJSON } from "class-validator";
import Logger from "../utils/Logger";

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

export async function createMissingDayEntries() {
  const allEntries = await PlayerStat.find({
    order: { date: "ASC" },
  });
  const lastEntry = allEntries[allEntries.length - 1];
  const missingDays = Math.floor(
    (new Date().getTime() - new Date(lastEntry.date).getTime()) /
    (1000 * 3600 * 24)
  );

  for (let i = 0; i < missingDays; i++) {
    Logger.info(`Creating missing day entry for ${new Date(
      new Date(lastEntry.date).getTime() + 86400000 * (i + 1)
    ).toISOString().split("T")[0]}`);
    const stat = new PlayerStat();
    stat.date = new Date(
      new Date(lastEntry.date).getTime() + 86400000 * (i + 1)
    );
    stat.max = JSON.stringify({
      total: 0,
      lobby: 0,
      building: 0,
      buildteams: 0,
      other: 0,
    });
    stat.avg = JSON.stringify({
      total: 0,
      lobby: 0,
      building: 0,
      buildteams: 0,
      other: 0,
      counter: 0,
    });
    await stat.save();
  }
}
