import { Request, Response } from "express";

import { Block, setStatus, update } from "../../../entity/Block";
import { log } from "../../../entity/Log";

import * as dbCache from "../../../utils/cache/DatabaseCache";
import { Permissions } from "../../../routes";
import { allowed } from "../../../middleware/auth";
import Logger from "../../../utils/Logger";
import { validate } from "../../../utils/Validation";
import {
  recalculateAll,
  recalculateDistrictProgress,
} from "../../../utils/ProgressCalculation";

export const get = async (req: Request, res: Response) => {
  allowed(Permissions.default, req, res, () => {
    const blocksRaw = dbCache.find("blocks");

    const blocks = [];
    for (const block of blocksRaw) {
      block["center"] = block.getLocationCenter();
      block.area = JSON.parse(block.area);
      blocks.push(block);
    }
    return res.send(blocks);
  });
};

export const post = (req: Request, res: Response) => {
  allowed(Permissions.admin, req, res, async () => {
    const districtID = req.body.district;

    if (!districtID) {
      return res.status(400).send({ error: "Specify a district" });
    }
    if (typeof districtID !== "number") {
      return res.status(400).send({ error: "The district must be a number" });
    }

    const district = dbCache.findOne("districts", { id: districtID });
    if (!district) {
      return res.status(404).send({ error: "District not found" });
    }

    const blocks = dbCache.find("blocks", { district: districtID });

    const block = new Block();
    block.id = Math.max(...blocks.map((block: Block) => block.id)) + 1;
    block.district = district.id;

    return validate(res, block, {
      successMessage: "Block created successfully",
      successData: block,
      updateCache: true,
      onSuccess: async () => {
        await recalculateAll(block.district);
        Logger.info(
          `Created block #${block.uid} (${district.name} #${block.id})`
        );
      },
    });
  });
};

export const put = (req: Request, res: Response) => {
  allowed(Permissions.builder, req, res, async () => {
    if (!req.body.id) {
      return res.status(400).send({ error: "Specify an id" });
    }

    const block = dbCache.findOne("blocks", { uid: req.body.id });
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
    if (oldStatus !== newStatus) {
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
          edited: req.body.id,
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

    res.send(ret);
  });
};
