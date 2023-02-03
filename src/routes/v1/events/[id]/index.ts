import { Request, Response } from "express";
import { allowed } from "../../../../middleware/auth";
import * as dbCache from "../../../../utils/cache/DatabaseCache";
import { Permissions } from "../../../../routes";
import Logger from "../../../../utils/Logger";

export const get = (req: Request, res: Response) => {
  allowed({
    permission: Permissions.moderator,
    req,
    res,
    callback: () => {
      const event = dbCache.findOne("events", { uuid: req.params.id });
      if (!event) {
        return res.status(404).send({ error: "Event not found" });
      }

      return res.send(event.toJson());
    },
  });
};

export const put = (req: Request, res: Response) => {
  allowed({
    permission: Permissions.moderator,
    req,
    res,
    callback: async () => {
      const uuid = req.params.id;
      const event = dbCache.findOne("events", { uuid });
      if (!event) {
        return res.status(404).send({ error: "Event not found" });
      }

      const ret = await dbCache.update(event, req.body);
      if (ret.error) {
        return res.status(400).send({ error: ret.error });
      }

      return res.send(ret);
    },
  });
};

export const del = (req: Request, res: Response) => {
  allowed({
    permission: Permissions.moderator,
    req,
    res,
    callback: async () => {
      const event = dbCache.findOne("events", { uuid: req.params.id });
      if (!event) {
        return res.status(404).send({ error: "Event not found" });
      }

      await event.remove();
      Logger.warn(`Event '${event.name}' deleted by ${req.user.username}`);
      dbCache.reload(event);

      return res.send({
        message: "Event deleted successfully",
        data: event,
      });
    },
  });
};
