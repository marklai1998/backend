import { Request, Response } from "express";
import { allowed } from "../../../middleware/auth";
import { Permissions } from "../../../routes";
import { Request as RequestStat } from "../../../entity/statistics/Request";
import { Statistic } from "../../../entity/statistics/Statistic";

export const get = (req: Request, res: Response) => {
  allowed({
    permission: Permissions.moderator,
    req,
    res,
    async callback() {
      res.status(200).send({
        today: await RequestStat.find(),
        count: (await Statistic.find()).reduce((acc, cur) => {
          acc[new Date(cur.date).toISOString().split("T")[0]] = cur.count;
          return acc;
        }, {}),
      });
    },
  });
};
