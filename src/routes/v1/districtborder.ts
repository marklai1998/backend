import { Request, Response } from "express";
import { allowed } from "../../middleware/auth";
import { Permissions } from "../../routes";
import * as dbCache from "../../utils/cache/DatabaseCache";
import { District } from "../../entity/District";
import { Block } from "../../entity/Block";
import { calculateUnionPolygonForDistrict } from "../../utils/Polygon";

export const post = async (req: Request, res: Response) => {
  allowed({
    permission: Permissions.default,
    req,
    res,
    callback: async () => {
      const district = dbCache.findOne(District, { id: req.body.district });

      if (!district) {
        return res.status(404).send({
          error: "District not found",
        });
      }

      const blocks = dbCache.find(Block, { district: district.id });
      if (!blocks.length) {
        return res.status(400).send({
          error: "No blocks found for this district",
        });
      }

      const union = calculateUnionPolygonForDistrict(district.id);

      const ret = await dbCache.update(district, { area: union });

      if (ret.error) {
        return res.status(400).send({ error: ret.error });
      }

      res.send({
        success: true,
        message: "Successfully updated area",
      });
    },
  });
};
