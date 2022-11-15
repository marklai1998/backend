import { NextFunction, Request, Response } from "express";

import { PlayerStat } from "../entity/PlayerStat";
import responses from "../responses";

export class PlayerStatController {
  async getPlayerStat(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    if (!request.params.date) {
      return responses.error({ message: "Specify date", code: 400 });
    }

    const date = request.params.date;
    const dateSplit = date.split(".");
    var isoDate = null;
    if (dateSplit.length === 3) {
      isoDate = `${dateSplit[2]}-${dateSplit[1]}-${dateSplit[0]}`;
    }

    const playerStat = await PlayerStat.findOne({
      date: isoDate === null ? date : isoDate,
    });

    if (!playerStat) {
      return responses.error({
        message: "No entry found for this date",
        code: 404,
      });
    }

    const avgData = JSON.parse(playerStat.avg);
    const avg = {};
    for (const key in avgData) {
      if (key === "counter") continue;

      if (avgData.counter === 0) {
        avg[key] = 0;
      } else {
        avg[key] = avgData[key] / avgData.counter;
      }
    }

    return {
      date: playerStat.date,
      peaks: JSON.parse(playerStat.max),
      averages: avg,
    };
  }

  async getAllPlayerStats(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    const playerStats = await PlayerStat.find();

    const stats = [];
    for (const s of playerStats) {
      const date = new Date(s.date);
      const dateString = `${date.getDate()}.${
        date.getMonth() + 1
      }.${date.getFullYear()}`;

      const avgData = JSON.parse(s.avg);
      const avg = {};
      for (const key in avgData) {
        if (key === "counter") continue;

        if (avgData.counter === 0) {
          avg[key] = 0;
        } else {
          avg[key] = avgData[key] / avgData.counter;
        }
      }

      stats.push({
        date: s.date,
        peaks: JSON.parse(s.max),
        averages: avg,
      });
    }

    return stats;
  }
}
