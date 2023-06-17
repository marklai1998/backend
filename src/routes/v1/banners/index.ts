import { Request, Response } from "express";
import { allowed } from "../../../middleware/auth";
import { Permissions } from "../../../routes";

import * as dbCache from "../../../utils/cache/DatabaseCache";
import { User } from "../../../entity/User";
import { Banner } from "../../../entity/Banner";
import { validate } from "../../../utils/Validation";
import Logger from "../../../utils/Logger";

export const get = (req: Request, res: Response) => {
  allowed({
    permission: Permissions.admin,
    req,
    res,
    callback() {
      const banners = dbCache.find(Banner);
      res.status(200).send(banners.map((b) => b.toJson()));
    },
  });
};

export const post = (req: Request, res: Response) => {
  allowed({
    permission: Permissions.admin,
    req,
    res,
    requiredArgs: {
      name: "string",
      data: "string",
      user: "number",
    },
    callback() {
      const userId = parseInt(req.body.user);
      const user = dbCache.findOne(User, { uid: userId });

      if (!user) {
        return res.status(400).send({ error: "No user found with this id" });
      }

      const banner = Banner.create({
        data: req.body.data,
        name: req.body.name,
        user,
      });

      return validate(res, banner, {
        successMessage: "Banner saved successfully",
        successData: banner,
        updateCache: true,
        onSuccess: () => {
          Logger.info(
            `Created banner '${banner.name}' by ${banner.user.username}`
          );
        },
      });
    },
  });
};
