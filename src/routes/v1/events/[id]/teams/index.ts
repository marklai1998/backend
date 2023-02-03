import { Request, Response } from "express";
import { EventTeam } from "../../../../../entity/events/EventTeam";
import { allowed } from "../../../../../middleware/auth";
import { Permissions } from "../../../../../routes";
import Logger from "../../../../../utils/Logger";
import { validate } from "../../../../../utils/Validation";

export const post = (req: Request, res: Response) => {
  allowed({
    permission: Permissions.moderator,
    req,
    res,
    requiredArgs: { name: "string" },
    optionalArgs: { color: "string" },
    callback: () => {
      const team = EventTeam.create({
        name: req.body.name,
        color: req.body.color,
        event: {
          uuid: req.params.id,
        },
      });

      return validate(res, team, {
        successMessage: "Team created successfully",
        updateCache: true,
        onSuccess: () => {
          Logger.info(
            `Event Team '${team.name}' created by ${req.user.username}`
          );
        },
      });
    },
  });
};
