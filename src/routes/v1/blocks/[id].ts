import { Request, Response } from "express";
import { Block, setStatus, update } from "../../../entity/Block";
import { log } from "../../../entity/Log";
import { allowed } from "../../../middleware/auth";
import { Permissions } from "../../../routes";

import * as dbCache from "../../../utils/cache/DatabaseCache";
import Logger from "../../../utils/Logger";
import {
  recalculateAll,
  recalculateDistrictProgress,
} from "../../../utils/ProgressCalculation";

export const get = async (req: Request, res: Response) => {
  allowed(Permissions.default, req, res, () => {
    const block = dbCache.findOne("blocks", { uid: req.params.id });

    if (!block) {
      return res.status(404).send({ error: "Block not found" });
    }

    return res.send(block.toJson());
  });
};

export const put = (req: Request, res: Response) => {
  allowed(Permissions.builder, req, res, async () => {
    const id = req.params.id;
    const block = dbCache.findOne("blocks", { uid: id });
    if (!block) {
      return res.status(404).send({ error: "Block not found" });
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
          user: req.user,
          type: `BLOCK_${type.toUpperCase()}`,
          edited: id,
          oldValue: data["oldValue"],
          newValue: data["newValue"],
        });
        update({
          block: block,
          successMessage: `${type.charAt(0).toUpperCase()}${type.slice(
            1
          )} Updated`,
          oldStatus: oldStatus,
          oldValue: data["oldValue"],
          newValue: data["newValue"],
          user: req.user,
        });
      }
    }

    // Update districts
    if (ret.changedValues["progress"]) {
      recalculateDistrictProgress(block.district);
    }

    return res.send(ret);
  });
};

export const del = (req: Request, res: Response) => {
  allowed(Permissions.admin, req, res, async () => {
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
  });
};
