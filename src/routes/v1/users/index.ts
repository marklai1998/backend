import { Request, Response } from "express";

import * as dbCache from "../../../utils/cache/DatabaseCache";
import { allowed } from "../../../middleware/auth";
import { Permissions } from "../../../routes";
import { User } from "../../../entity/User";

export const get = (req: Request, res: Response) => {
  allowed(Permissions.default, req, res, () => {
    const users = dbCache.find("users");

    return res.send(
      users.map((user: User) =>
        user.toJson({
          // @ts-ignore
          hasPermission: req.user.permission >= Permissions.moderator,
        })
      )
    );
  });
};
