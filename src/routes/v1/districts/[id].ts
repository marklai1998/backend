import * as dbCache from "../../../utils/cache/DatabaseCache";

import { Request, Response } from "express";

import Logger from "../../../utils/Logger";
import { Permissions } from "../../../routes";
import { allowed } from "../../../middleware/auth";

export const get = async (req: Request, res: Response) => {
  allowed(Permissions.default, req, res, async () => {
    const district = dbCache.findOne("districts", { id: req.params.id });

    if (!district) {
      return res.status(404).send({ error: "No district found" });
    }
    return res.send(await district.toJson({ onlyProgress: false }));
  });
};

export const put = (req: Request, res: Response) => {
  allowed(Permissions.moderator, req, res, async () => {
    const id = req.params.id;

    const district = dbCache.findOne("districts", { id: id });
    if (!district) {
      return res.status(404).send({ error: "District not found" });
    }

    const ret = await dbCache.update(district, req.body, {
      showDetails: false,
    });

    if (ret.error) {
      return res.status(400).send({ error: ret.error });
    }

    return res.send(ret);
  });
};

export const del = async (req: Request, res: Response) => {
  allowed(Permissions.moderator, req, res, async () => {
    if (!req.params.id) {
      return res.status(400).send({ error: "Specify an id" });
    }
    if (req.params.id == "1") {
      return res
        .status(400)
        .send({ error: "You cannot delete initial district" });
    }
    const district = dbCache.findOne("districts", { id: req.params.id });
    if (!district) {
      return res.status(404).send({ error: "District not found" });
    }

    const blocks = dbCache.find("blocks", { district: req.params.id });
    if (blocks.length > 0) {
      return res
        .status(400)
        .send({ error: "Cannot delete district with existing blocks" });
    }

    Logger.warn(`Deleting district #${district.id} (${district.name})`);
    await district.remove();
    return res.send({
      message: "District deleted successfully",
      data: district.toJson({ showDetails: false }),
    });
  });
};
