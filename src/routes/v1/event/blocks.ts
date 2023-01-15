import { Request, Response } from "express";
import { allowed } from "../../../middleware/auth";
import { Permissions } from "../../../routes";

import * as dbCache from "../../../utils/cache/DatabaseCache";

export const get = (req: Request, res: Response) => {
  allowed(Permissions.default, req, res, () => {
    const blocksRaw = dbCache.find("blocks", { eventBlock: true });

    const blocks = [];
    for (const block of blocksRaw) {
      blocks.push(block.toJson({ showLandmarks: false }));
    }
    res.send(blocks);
  });
};
