import * as dbCache from "../../utils/cache/DatabaseCache";

import { Request, Response } from "express";

import Logger from "../../utils/Logger";
import { Permissions } from "../../routes";
import { allowed } from "../../middleware/auth";

export const get = async (req: Request, res: Response) => {
  allowed(Permissions.default, req, res, async () => {
    const blocks = dbCache.find("blocks");

    if (!blocks) {
      return res.status(404).send({ error: "No blocks found" });
    }
    const result = [];

    for (const bl of blocks) {
      if (
        bl.area == null ||
        bl.area.length == 0 ||
        bl.area == undefined ||
        bl.area == "[]"
      )
        continue;
      // if (bl.uid < parseInt(req.query.min.toString() || "0")) continue;
      //if (bl.uid >= parseInt(req.query.max.toString() || "100")) continue;
      const area = JSON.parse(bl.area).map((a: number[]) => [a[1], a[0]]);
      area.push(area[0]);
      const b = { ...bl };
      b.area = undefined;

      result.push({
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [area],
        },
        properties: b,
      });
    }

    // GeoJSON
    return res.json({
      forceNoFormat: true,
      data: {
        type: "FeatureCollection",
        features: result,
      },
    });
  });
};
