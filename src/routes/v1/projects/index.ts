import * as dbCache from "../../../utils/cache/DatabaseCache";

import { Request, Response } from "express";

import Logger from "../../../utils/Logger";
import { Permissions } from "../../../routes";
import { ProjectCount } from "../../../entity/ProjectCount";
import { User } from "../../../entity/User";
import { allowed } from "../../../middleware/auth";
import { validate } from "../../../utils/Validation";

export const get = (req: Request, res: Response) => {
  allowed({
    permission: Permissions.default,
    req,
    res,
    callback() {
      const projects = dbCache.find(ProjectCount);
      res.status(200).send(projects);
    },
  });
};
