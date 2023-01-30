import { Request, Response } from "express";

import { Block } from "../../../entity/Block";

import * as dbCache from "../../../utils/cache/DatabaseCache";
import { Permissions } from "../../../routes";
import { allowed } from "../../../middleware/auth";
import Logger from "../../../utils/Logger";
import { validate } from "../../../utils/Validation";
import { recalculateAll } from "../../../utils/ProgressCalculation";

export const get = async (req: Request, res: Response) => {
  allowed({
    permission: Permissions.default,
    req,
    res,
    callback: () => {
      const blocksRaw = dbCache.find("blocks");

      const blocks = [];
      for (const block of blocksRaw) {
        blocks.push(block.toJson());
      }
      return res.send(blocks);
    },
  });
};

export const post = (req: Request, res: Response) => {
  allowed({
    permission: Permissions.admin,
    req,
    res,
    callback: async () => {
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
    },
  });
};
