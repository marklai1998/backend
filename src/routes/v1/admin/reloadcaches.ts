import { Request, Response } from "express";
import { allowed } from "../../../middleware/auth";
import { Permissions } from "../../../routes";
import * as dbCache from "../../../utils/cache/DatabaseCache";

export const post = (req: Request, res: Response) => {
  allowed(Permissions.admin, req, res, async () => {
    const time = await dbCache.loadAll();
    return res.send({
      message: `Caches reloaded successfully in ${time} seconds`,
    });
  });
};
