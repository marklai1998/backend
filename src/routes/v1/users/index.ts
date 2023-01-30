import * as dbCache from "../../../utils/cache/DatabaseCache";

import { Request, Response } from "express";

import { Permissions } from "../../../routes";
import { User } from "../../../entity/User";
import { allowed } from "../../../middleware/auth";
import { generateUUID } from "../../..";
import { hash } from "../../../utils/encryption/bcrypt";
import { validate } from "../../../utils/Validation";
import { Colors, sendWebhook } from "../../../utils/DiscordMessageSender";

export const get = (req: Request, res: Response) => {
  allowed({
    permission: Permissions.default,
    req,
    res,
    callback: () => {
      const users = dbCache.find("users");

      return res.send(
        users.map((user: User) =>
          user.toJson({
            // @ts-ignore
            hasPermission: req.user.permission >= Permissions.moderator,
          })
        )
      );
    },
  });
};

export const post = (req: Request, res: Response) => {
  allowed({
    permission: Permissions.default,
    req,
    res,
    callback: async () => {
      if (!req.body.username || !req.body.password || !req.body.discord) {
        return res
          .status(400)
          .send({ error: "Specify Username, Discord and password" });
      }

      if (dbCache.findOne("users", { username: req.body.username })) {
        return res.status(400).send({
          error:
            "A user with this username already exists. Try to login instead or select another one!",
        });
      }

      const user = User.create({
        username: req.body.username,
        discord: req.body.discord,
        rank: "Player",
        password: await hash(req.body.password),
        apikey: generateUUID(),
        permission: 1,
      });

      return validate(res, user, {
        successMessage: "Account created successfully",
        successData: user,
        updateCache: true,
        onSuccess: () => {
          sendWebhook("user_log", {
            content: "",
            embeds: [
              {
                title: "Account registered",
                description: "",
                color: Colors.Green,
                timestamp: new Date().toISOString(),
                footer: {
                  text: "BTE NewYorkCity",
                  icon_url:
                    "https://cdn.discordapp.com/attachments/519576567718871053/1035577973467779223/BTE_NYC_Logo.png",
                },
                thumbnail: {
                  url: "https://mc-heads.net/avatar/" + user.username,
                },
                fields: [
                  {
                    name: "Username",
                    value: user.username,
                    inline: true,
                  },
                  {
                    name: "Discord",
                    value: user.discord,
                    inline: true,
                  },
                ],
              },
            ],
          });
        },
      });
    },
  });
};
