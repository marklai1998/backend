import { Request, Response } from "express";
import { allowed } from "../../../../middleware/auth";
import { Permissions } from "../../../../routes";
import { proxyStatus } from "../../../../utils/ServerStatusTracker";

export const get = (req: Request, res: Response) => {
  allowed({
    permission: Permissions.default,
    req,
    res,
    callback: () => {
      res.status(200).send({
        java: proxyStatus.java,
        bedrock: proxyStatus.bedrock,
      });
    },
  });
};
