import { NextFunction, Request, Response } from "express";

import * as index from "../index";
import * as google from "../utils/SheetUtils";

import { PlayerStat } from "../entity/PlayerStat";

export class PlayerStatController {
  async getPlayerStat(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    if (!request.params.date) {
      return index.generateError("Specify date");
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
      return index.generateError("No entry found for this date");
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
      date: date,
      peaks: JSON.parse(playerStat.max),
      averages: avg,
    };
  }

  async import(request: Request, response: Response, next: NextFunction) {
    const getData = await google.googleSheets.spreadsheets.values.get({
      auth: google.authGoogle,
      spreadsheetId: google.sheetID,
      range: `ServerData!A2:M`,
    });
    const playerStats = getData.data.values;
    let counter = 0;

    await PlayerStat.clear();
    for (const s of playerStats) {
      if (!s[1]) break;

      const dateSplit = s[0].split(".");
      const isoDate = `${dateSplit[2]}-${dateSplit[1]}-${dateSplit[0]}`;

      const stat = new PlayerStat();
      stat.date = new Date(isoDate);
      stat.max = JSON.stringify({
        total: parseInt(s[1]),
        lobby: parseInt(s[2]),
        building: parseInt(s[3]),
        buildteams: parseInt(s[4]),
        other: parseInt(s[5]),
      });
      stat.avg = JSON.stringify({
        total: parseInt(s[7]),
        lobby: parseInt(s[8]),
        building: parseInt(s[9]),
        buildteams: parseInt(s[10]),
        other: parseInt(s[11]),
        counter: parseInt(s[12]),
      });

      await stat.save();
      counter++;
    }

    return index.generateSuccess(`Player Stats of ${counter} days imported`);
  }
}
