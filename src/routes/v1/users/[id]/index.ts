import * as dbCache from "../../../../utils/cache/DatabaseCache";

import { Request, Response } from "express";

import { Permissions } from "../../../../routes";
import { allowed } from "../../../../middleware/auth";
import { Block } from "../../../../entity/Block";
import { User } from "../../../../entity/User";
import { sendWebhook } from "../../../../utils/DiscordMessageSender";
import { mcRankToColor } from "../../../../utils/Permissions";

export const get = (req: Request, res: Response) => {
  allowed({
    permission: Permissions.default,
    req,
    res,
    callback: async () => {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid id" });
      }

      const user = dbCache.findOne(User, { uid: id });

      // Calculate Claim stats
      const blocks = dbCache.find(Block);
      const blocksOfUser = blocks.filter((b: Block) => {
        for (const builder of b.builder) {
          if (builder.toLowerCase() === user.username.toLowerCase()) {
            return true;
          }
        }
        return false;
      });

      return res.status(200).send({
        ...user.toJson({
          hasPermission:
            user.permission >= Permissions.moderator ||
            user.uid === req.user.uid,
        }),
        claims: {
          total: blocksOfUser.length,
          done: blocksOfUser.filter((b: Block) => b.status === 4).length,
          detailing: blocksOfUser.filter((b: Block) => b.status === 3).length,
          building: blocksOfUser.filter((b: Block) => b.status === 2).length,
          reserved: blocksOfUser.filter((b: Block) => b.status === 1).length,
          blocks: blocksOfUser.map((b: Block) => b.toJson()),
        },
      });
    },
  });
};

export const put = (req: Request, res: Response) => {
  allowed({
    permission: Permissions.event,
    req,
    res,
    callback: async () => {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid id" });
      }

      if (req.user.permission < Permissions.moderator && req.user.uid !== id) {
        return res
          .status(403)
          .json({ error: "You are not allowed to update other users" });
      }

      const userToEdit = dbCache.findOne(User, { uid: id });
      const oldRank = userToEdit.rank;

      const ret = await dbCache.update(userToEdit, req.body);

      if (ret.error) {
        return res.status(400).send(ret);
      }

      // Update rank log
      if (req.body.rank && ret.changedValues?.rank) {
        sendWebhook("user_log", {
          content: "",
          embeds: [
            {
              title: "User Rank Updated",
              description: "",
              color: mcRankToColor(userToEdit.rank),
              timestamp: new Date().toISOString(),
              footer: {
                text: "BTE NewYorkCity",
                icon_url:
                  "https://cdn.discordapp.com/attachments/519576567718871053/1035577973467779223/BTE_NYC_Logo.png",
              },
              thumbnail: {
                url: "https://mc-heads.net/avatar" + userToEdit.username,
              },
              fields: [
                {
                  name: "Username",
                  value: userToEdit.username,
                  inline: true,
                },
                {
                  name: "Rank",
                  value: `${oldRank} → ${userToEdit.rank}`,
                  inline: true,
                },
              ],
            },
          ],
        });
      }

      return res.status(200).send(ret);
    },
  });
};
