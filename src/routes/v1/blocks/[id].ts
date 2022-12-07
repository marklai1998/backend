import { Request, Response } from "express";
import { Block } from "../../../entity/Block";
import { allowed } from "../../../middleware/auth";
import { Permissions } from "../../../routes";

import * as dbCache from "../../../utils/cache/DatabaseCache";
import Logger from "../../../utils/Logger";
import { recalculateAll } from "../../../utils/ProgressCalculation";

export const get = async (req: Request, res: Response) => {
  allowed(Permissions.default, req, res, () => {
    const block = dbCache.findOne("blocks", { uid: req.params.id });

    if (!block) {
      return res.status(404).send({ error: "Block not found" });
    }

    return res.send(block.toJson());
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

    return res.send({ message: "Block deleted", block: block.toJson() });
  });
};
