import * as dbCache from "../../../utils/cache/DatabaseCache";

import { Request, Response } from "express";

import { Block } from "../../../entity/Block";
import { District } from "../../../entity/District";
import { allowed } from "../../../middleware/auth";
import { Permissions } from "../../../routes";
import Logger from "../../../utils/Logger";
import { recalculateAll } from "../../../utils/ProgressCalculation";
import { validate } from "../../../utils/Validation";
import { calculateUnionPolygonForDistrict } from "../../../utils/Polygon";

export const get = async (req: Request, res: Response) => {
  allowed({
    permission: Permissions.default,
    req,
    res,
    callback: () => {
      const blocksRaw = dbCache.find(Block);

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
      const area = req.body.area;

      if (!districtID) {
        return res.status(400).send({ error: "Specify a district" });
      }
      if (typeof districtID !== "number") {
        return res.status(400).send({ error: "The district must be a number" });
      }

      const district = dbCache.findOne(District, { id: districtID });
      if (!district) {
        return res.status(404).send({ error: "District not found" });
      }

      const blocks = dbCache.find(Block, { district: districtID });

      const block = new Block();
      block.id = !blocks.length
        ? 1
        : Math.max(...blocks.map((block: Block) => block.id)) + 1;
      block.district = district.id;
      block.eventBlock = false;
      block.area = JSON.stringify(area[0].map((a: any) => [a[1], a[0]]));
      block.comment = "";

      // Recalculate district area
      const union = calculateUnionPolygonForDistrict(district.id);
      if (typeof union !== "number") {
        dbCache.update(district, { area: JSON.stringify(union) });
      }

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
