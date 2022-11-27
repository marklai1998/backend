import { Request, Response } from "express";

import { District } from "../../../entity/District";
import { Permissions } from "../../../routes";
import { allowed } from "../../../middleware/auth";

export const get = [
  async (req: Request, res: Response) => {
    //@ts-ignore
    allowed(Permissions.default, req, res, async () => {
      const result = await District.find();
      return res.send(result);
    });
  },
];
