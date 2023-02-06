import { Request, Response } from "express";
import { ServerStatus } from "../../../../entity/ServerStatus";
import { allowed } from "../../../../middleware/auth";
import { Permissions } from "../../../../routes";

export const get = (req: Request, res: Response) => {
  allowed({
    permission: Permissions.default,
    req,
    res,
    callback: async () => {
      res.status(200).send(await ServerStatus.find());
    },
  });
};
