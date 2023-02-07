import { Request, Response } from "express";
import {
  DEFAULT_SETTINGS,
  UserSettings,
} from "../../../../entity/UserSettings";
import { allowed } from "../../../../middleware/auth";
import { Permissions } from "../../../../routes";
import * as dbCache from "../../../../utils/cache/DatabaseCache";

export const post = (req: Request, res: Response) => {
  allowed({
    permission: Permissions.event,
    req,
    res,
    requiredArgs: {
      key: "string",
      value: "any",
    },
    callback: async () => {
      const id = parseInt(req.params.id);
      const user = dbCache.findOne("users", { uid: id });

      if (user.uid !== id && req.user.permission < Permissions.moderator) {
        return res.status(403).json({
          status: 403,
          message: "You may only change your own settings",
        });
      }
      if (!Object.keys(DEFAULT_SETTINGS).includes(req.body.key)) {
        return res.status(400).send({ error: "Invalid key" });
      }

      let setting = dbCache.findOne("usersettings", {
        key: req.body.key,
        user: req.user,
      });

      if (setting) {
        if (DEFAULT_SETTINGS[req.body.key] == req.body.value) {
          await setting.remove();
          res.send(setting.toJson());
        } else {
          const ret = await dbCache.update(setting, {
            key: req.body.key,
            value: req.body.value.toString(),
            user,
          });
          res.send(ret);
        }
      } else {
        setting = UserSettings.create({
          key: req.body.key,
          value: req.body.value.toString(),
          user,
        });

        await setting.save();
        res.send(setting.toJson());
      }
      dbCache.reload(user);
      dbCache.reload(setting);
    },
  });
};
