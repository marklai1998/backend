import { Request, Response } from "express";
import { allowed } from "../../middleware/auth";
import { Permissions } from "../../routes";
import * as dbCache from "../../utils/cache/DatabaseCache";
import { insidePolygon } from "../../utils/Polygon";

export const get = (req: Request, res: Response) => {
  allowed({
    permission: Permissions.default,
    req,
    res,
    requiredArgs: {
      data: "string",
    },
    callback: async () => {
      const data = req.body.data;

      if (
        data.match(
          /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/
        )
      ) {
        // Latitude Longitude
        const point = data.split(",").map((d: string) => parseFloat(d));

        const districts = dbCache.find("districts");
        for (const district of districts) {
          const areaD = JSON.parse(district.area);

          if (areaD.length <= 0 || district.id === 1) continue;

          if (insidePolygon(point, areaD)) {
            // District found
            const blocks = dbCache.find("blocks", { district: district.id });

            for (const block of blocks) {
              const areaB = JSON.parse(block.area);

              if (areaB.length <= 0) continue;

              if (insidePolygon(point, areaB)) {
                // Block found
                return res.send({
                  district: await district.toJson({ showDetails: false }),
                  block: block.toJson({
                    showDistrict: false,
                    showLandmarks: false,
                  }),
                });
              }
            }
            return res.send({
              district: await district.toJson({ showDetails: false }),
              block: null,
            });
          }
        }
        return res.send({ district: null, block: null });
      }
      return res.status(404).send({ error: "Not found" });
    },
  });
};
