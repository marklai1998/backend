import { Request, Response } from "express";
import { Event } from "../../../entity/events/Event";
import { allowed } from "../../../middleware/auth";
import { Permissions } from "../../../routes";
import * as dbCache from "../../../utils/cache/DatabaseCache";
import Logger from "../../../utils/Logger";
import { validate } from "../../../utils/Validation";

export const get = (req: Request, res: Response) => {
  allowed({
    permission: Permissions.moderator,
    req,
    res,
    callback: () => {
      const events = dbCache.find("events");
      return res.send(events);
    },
  });
};

export const post = (req: Request, res: Response) => {
  allowed({
    permission: Permissions.moderator,
    req,
    res,
    requiredArgs: { name: "string" },
    callback: () => {
      const event = Event.create({
        name: req.body.name,
      });

      return validate(res, event, {
        successMessage: "Event created successfully",
        updateCache: true,
        onSuccess: () => {
          Logger.info(`Event '${event.name}' created by ${req.user.username}`);
        },
      });
    },
  });
};
