import * as dbCache from "../../../utils/cache/DatabaseCache";

import { Request, Response } from "express";

import { Permissions } from "../../../routes";
import { allowed } from "../../../middleware/auth";
import { Block } from "../../../entity/Block";

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

      // Calculate Claim stats
      const blocks = dbCache.find("blocks");
      const blocksOfUser = blocks.filter((b: Block) => {
        for (const builder of b.builder) {
          if (builder.toLowerCase() === user.username.toLowerCase()) {
            return true;
          }
        }
        return false;
      });

      return res.status(200).send({
        ...user.toJson(),
        claims: {
          total: blocksOfUser.length,
          done: blocksOfUser.filter((b: Block) => b.status === 4).length,
          detailing: blocksOfUser.filter((b: Block) => b.status === 3).length,
          building: blocksOfUser.filter((b: Block) => b.status === 2).length,
          reserved: blocksOfUser.filter((b: Block) => b.status === 1).length,
          blocks: blocksOfUser.map((b: Block) => b.toJson()),
        },
      });
    },
  });
};

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
