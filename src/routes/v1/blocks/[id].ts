import * as dbCache from "../../../utils/cache/DatabaseCache";

import { Block, setStatus, update } from "../../../entity/Block";
import { Request, Response } from "express";
import {
  recalculateAll,
  recalculateDistrictProgress,
} from "../../../utils/ProgressCalculation";

import Logger from "../../../utils/Logger";
import { Permissions } from "../../../routes";
import { allowed } from "../../../middleware/auth";
import { log } from "../../../entity/Log";
import { sendDistrictChange2 } from "../../../utils/DiscordMessageSender";

export const get = async (req: Request, res: Response) => {
  allowed({
    permission: Permissions.default,
    req,
    res,
    callback: () => {
      const block = dbCache.findOne("blocks", { uid: req.params.id });

      if (!block) {
        return res.status(404).send({ error: "Block not found" });
      }

      return res.send(block.toJson());
    },
  });
};

export const put = (req: Request, res: Response) => {
  allowed({
    permission: Permissions.event,
    req,
    res,
    callback: async () => {
      const id = req.params.id;
      const block = dbCache.findOne("blocks", { uid: id });
      if (!block) {
        return res.status(404).send({ error: "Block not found" });
      }

      if (
        // @ts-ignore
        (req.user.permission || Permissions.default) <= Permissions.event &&
        !block.eventBlock
      ) {
        return res
          .status(403)
          .send({ error: "You are only allowed to update event blocks" });
      }

      const oldStatus = block.status;

      const ret = await dbCache.update(block, req.body);

      if (ret.error) {
        return res.status(400).send({ error: ret.error });
      }

      // Update Status
      const newStatus = await setStatus(block, true);
      if (newStatus >= 0 && oldStatus !== newStatus) {
        ret.changedValues["status"] = {
          oldValue: oldStatus,
          newValue: newStatus,
        };
      }

      // Logging
      for (const [type, data] of Object.entries(ret.changedValues)) {
        if (["progress", "details", "builder"].includes(type.toLowerCase())) {
          log({
            //@ts-ignore
            user: req.user,
            type: `BLOCK_${type.toUpperCase()}`,
            edited: parseInt(id),
            oldValue: data["oldValue"],
            newValue: data["newValue"],
          });
        }
      }

      sendDistrictChange2({
        block,
        changedValues: ret.changedValues,
        // @ts-ignore
        user: req.user,
      });

      // Update districts
      if (ret.changedValues["progress"]) {
        recalculateDistrictProgress(block.district);
      }

      return res.send(ret);
    },
  });
};

export const del = (req: Request, res: Response) => {
  allowed({
    permission: Permissions.admin,
    req,
    res,
    callback: async () => {
      const block = dbCache.findOne("blocks", { uid: req.params.id });
      if (!block) {
        return res.status(404).send({ error: "Block not found" });
      }

      await block.remove();
      await Block.query(
        `UPDATE blocks SET id = id-1 WHERE id > ${block.id} AND district = ${block.district}`
      );

      Logger.warn(
        `Deleted block ${block.uid} (ID: ${block.id}, District: ${block.district})`
      );

      dbCache.reload("blocks");
      recalculateAll(block.district);

      return res.send({
        message: "Block deleted successfully",
        data: block.toJson(),
      });
    },
  });
};
