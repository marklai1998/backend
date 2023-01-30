import { Request, Response } from "express";

import * as dbCache from "../../../utils/cache/DatabaseCache";
import { Permissions } from "../../../routes";
import { allowed } from "../../../middleware/auth";
import { District } from "../../../entity/District";
import Logger from "../../../utils/Logger";
import { validate } from "../../../utils/Validation";

export const get = (req: Request, res: Response) => {
  allowed({
    permission: Permissions.default,
    req,
    res,
    callback: async () => {
      const result = dbCache.find("districts");

      const districts = [];
      for (const district of result) {
        districts.push(
          district.toJson({ onlyProgress: false, showDetails: false })
        );
      }

      return res.send(await Promise.all(districts));
    },
  });
};

export const post = (req: Request, res: Response) => {
  allowed({
    permission: Permissions.moderator,
    req,
    res,
    callback: async () => {
      if (!req.body.name) {
        return res.status(400).send({ error: "Specify a name" });
      }
      if (!req.body.parent) {
        return res.status(400).send({ error: "Specify a parent" });
      }

      const parent = dbCache.findOne("districts", { id: req.body.parent });
      if (!parent) {
        return res.status(400).send({ error: "Parent District not found" });
      }

      const district = new District();
      district.name = req.body.name;
      district.parent = req.body.parent;
      district.status = 0;
      district.blocksDone = 0;
      district.blocksLeft = 0;
      district.progress = 0;

      Logger.info(`Creating new district ${district.name}`);

      return validate(res, district, {
        successMessage: "District created successfully",
        successData: district,
        updateCache: true,
      });
    },
  });
};
