import * as dbCache from "../../utils/cache/DatabaseCache";

import { Request, Response } from "express";

import { Block } from "../../entity/Block";
import { District } from "../../entity/District";
import { Landmark } from "../../entity/Landmark";
import { Permissions } from "../../routes";
import { allowed } from "../../middleware/auth";

export const get = async (req: Request, res: Response) => {
  allowed({
    permission: Permissions.default,
    req,
    res,
    callback: async () => {
      const result = [];
      if (req.query.landmarks) {
        const landmarks = dbCache.find(Landmark);
        if (!landmarks) {
          return res.status(404).send({ error: "No blocks found" });
        }
        for (const landmark of landmarks) {
          result.push({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [landmark.location[1], landmark.location[0]],
            },
            properties: {
              ...landmark,
              status: !landmark.enabled
                ? 0
                : landmark.done
                ? 4
                : landmark.requests != "[]"
                ? landmark.builder != "[]"
                  ? 3
                  : 2
                : 1,
            },
            id: landmark.id,
          });
        }
        return res.json({
          forceNoFormat: true,
          data: {
            type: "FeatureCollection",
            features: result,
          },
        });
      }
      const blocks = dbCache.find(Block);
      if (!blocks) {
        return res.status(404).send({ error: "No blocks found" });
      }

      for (const bl of blocks) {
        if (
          bl.area == null ||
          bl.area.length == 0 ||
          bl.area == undefined ||
          bl.area == "[]"
        )
          continue;

        if (
          req.query.district &&
          bl.district != parseInt(req.query.district.toString() || "")
        )
          continue;
        if (req.query.event) {
          if (!bl.eventBlock) continue;
        }
        // if (bl.uid < parseInt(req.query.min.toString() || "0")) continue;
        //if (bl.uid >= parseInt(req.query.max.toString() || "100")) continue;
        const area = JSON.parse(bl.area).map((a: number[]) => [a[1], a[0]]);
        area.push(area[0]);
        const b: any = { ...bl };
        b.area = undefined;
        b.builder = bl.builder.join(",");

        result.push({
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [area],
          },
          properties: b,
          id: bl.uid,
        });
      }
      // GeoJSON
      return res.json({
        forceNoFormat: true,
        data: {
          type: "FeatureCollection",
          center: req.query.district
            ? (
                await dbCache
                  .findOne(District, { id: req.query.district })
                  .toJson()
              ).center
            : null,
          features: result,
        },
      });
    },
  });
};
