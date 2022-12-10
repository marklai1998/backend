import { Request, Response } from "express";

import * as dbCache from "../../../utils/cache/DatabaseCache";
import { Permissions } from "../../../routes";
import { allowed } from "../../../middleware/auth";
import Logger from "../../../utils/Logger";

export const get = (req: Request, res: Response) => {
  allowed(Permissions.default, req, res, () => {
    const landmark = dbCache.findOne("landmarks", { id: req.params.id });

    if (!landmark) {
      return res.status(404).send({ error: "Landmark not found" });
    }

    return res.send(landmark.toJson({ newVersion: true }));
  });
};

export const put = (req: Request, res: Response) => {
  allowed(Permissions.builder, req, res, async () => {
    const landmark = dbCache.findOne("landmarks", { id: req.params.id });

    if (!landmark) {
      return res.status(404).send({ error: "Landmark not found" });
    }

    const ret = await dbCache.update(landmark, req.body, { newVersion: true });

    if (ret.error) {
      return res.status(400).send({ error: ret.error });
    }

    return res.send(ret);
  });
};

export const del = (req: Request, res: Response) => {
  allowed(Permissions.moderator, req, res, async () => {
    const landmark = dbCache.findOne("landmarks", { id: req.params.id });
    if (!landmark) {
      return res.status(404).send({ error: "Landmark not found" });
    }

    await landmark.remove();
    Logger.warn(`Deleted landmark #${req.params.id} (${landmark.name})`);

    dbCache.reload("landmarks");
    return res.send({
      message: "Landmark deleted successfully",
      data: landmark.toJson({ newVersion: true }),
    });
  });
};
