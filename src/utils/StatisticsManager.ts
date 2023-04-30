import { NextFunction, Request, Response } from "express";
import { Request as ApiRequest } from "../entity/statistics/Request";
import { Statistic, createMissingDays } from "../entity/statistics/Statistic";

export const trackRequestStatistics = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.on("finish", async () => {
    const request = ApiRequest.create({
      timestamp: new Date(),
      statusCode: res.statusCode,
      method: req.method,
      path: req.path,
    });
    request.save();

    const date = new Date();
    let count = await Statistic.findOneBy({
      date: new Date(
        `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
      ),
    });

    if (!count) {
      await createMissingDays();
      count = await Statistic.findOneBy({
        date: new Date(
          `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
        ),
      });
    }

    count.count++;
    count.save();
  });
  next();
};
