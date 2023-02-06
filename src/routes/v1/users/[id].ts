import * as dbCache from "../../../utils/cache/DatabaseCache";

import { Request, Response } from "express";

import { Permissions } from "../../../routes";
import { allowed } from "../../../middleware/auth";

export const put = (req: Request, res: Response) => {
  allowed({
    permission: Permissions.event,
    req,
    res,
    callback: async () => {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid id" });
      }

      if (req.user.permission < Permissions.moderator && req.user.uid !== id) {
        return res
          .status(403)
          .json({ error: "You are not allowed to update other users" });
      }

      const userToEdit = dbCache.findOne("users", { uid: id });

      const ret = await dbCache.update(userToEdit, req.body);

      return res.status(200).send(ret);
    },
  });
};

export const get = (req: Request, res: Response) => {
  allowed({
    permission: Permissions.default,
    req,
    res,
    callback: async () => {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid id" });
      }

      const user = dbCache.findOne("users", { uid: id });

      return res.status(200).send(user);
    },
  });
};
