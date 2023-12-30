import * as dbCache from "../../../utils/cache/DatabaseCache";

import { Block, setStatus } from "../../../entity/Block";
import { Request, Response } from "express";
import {
  recalculateAll,
  recalculateDistrictBlocksDoneLeft,
  recalculateDistrictProgress,
  recalculateDistrictStatus,
} from "../../../utils/ProgressCalculation";

import Logger from "../../../utils/Logger";
import { Permissions } from "../../../routes";
import { allowed } from "../../../middleware/auth";
import { log } from "../../../entity/Log";
import { sendDistrictChange2 } from "../../../utils/DiscordMessageSender";
import { broadcast, sendToRoom } from "../../../sockets/SocketManager";
import { District } from "../../../entity/District";
import { Landmark } from "../../../entity/Landmark";
import { Claim } from "../../../entity/Claim";
import { User } from "../../../entity/User";

export const get = async (req: Request, res: Response) => {
  allowed({
    permission: Permissions.default,
    req,
    res,
    callback: () => {
      const block = dbCache.findOne(Block, { uid: req.params.id });

      if (!block) {
        return res.status(404).send({ error: "Block not found" });
      }

      return res.send(block.toJson());
    },
  });
};

export const put = (req: Request, res: Response) => {
  allowed({
    permission: Permissions.builder,
    req,
    res,
    callback: async () => {
      const id = req.params.id;
      const block = dbCache.findOne(Block, { uid: id });
      if (!block) {
        return res.status(404).send({ error: "Block not found" });
      }

      const district = dbCache.findOne(District, { id: block.district });

      if (
        // @ts-ignore
        (req.user.permission || Permissions.default) <= Permissions.event &&
        !block.eventBlock
      ) {
        return res
          .status(403)
          .send({ error: "You are only allowed to update event blocks" });
      }

      const oldStatus = block.status;

      const ret = await dbCache.update(block, req.body);

      if (ret.error) {
        return res.status(400).send({ error: ret.error });
      }

      // Update Claims
      if (req.body.builder) {
        const claims = dbCache
          .find(Claim)
          .filter((claim) => claim.block.uid === block.uid);

        const operations = [];

        // Remove
        for (const claim of claims) {
          if (
            !req.body.builder.some(
              (id: number | string) =>
                id ===
                  claim.user?.[typeof id === "number" ? "uid" : "username"] ||
                id === claim.special
            )
          ) {
            operations.push(Claim.remove(claim));
          }
        }
        // Add
        for (const builderID of req.body.builder) {
          if (builderID === "") continue;
          if (
            !claims.some(
              (claim: Claim) =>
                builderID ===
                  claim.user?.[
                    typeof builderID === "number" ? "uid" : "username"
                  ] || builderID === claim.special
            )
          ) {
            const user = dbCache.findOne(User, {
              [typeof builderID === "number" ? "uid" : "username"]: builderID,
            });
            const claim = Claim.create({
              block,
              user: user || null,
              special: !user ? builderID : null,
            });
            operations.push(claim.save());
          }
        }
        if (operations.length > 0) {
          await Promise.allSettled(operations);
          dbCache.reload("claims");
        }
      }

      // Update Status
      const newStatus = await setStatus(block, true);
      if (newStatus >= 0 && oldStatus !== newStatus) {
        ret.changedValues["status"] = {
          oldValue: oldStatus,
          newValue: newStatus,
        };

        // Complete landmarks if block is done
        if (newStatus === 4) {
          const landmarkSaves = [];
          for (const landmark of dbCache.find(Landmark, {
            blockID: block.uid,
          })) {
            landmark.done = true;
            landmarkSaves.push(landmark.save());
          }
          await Promise.allSettled(landmarkSaves);
        }
      }

      const user =
        req.user.uid === 1
          ? dbCache.findOne(User, { uid: req.body.editor })
          : req.user;

      if (Object.keys(ret.changedValues).length > 0) {
        broadcast("block_updates", {
          user: {
            id: user.uid,
            username: user.username,
          },
          block: {
            uid: block.uid,
            district: {
              id: district.id,
              name: district.name,
            },
            id: block.id,
          },
          changedValues: ret.changedValues,
        });
      }

      // Logging
      for (const [type, data] of Object.entries(ret.changedValues)) {
        if (["progress", "details", "builder"].includes(type.toLowerCase())) {
          log({
            user,
            type: `BLOCK_${type.toUpperCase()}`,
            edited: parseInt(id),
            oldValue: data["oldValue"],
            newValue: data["newValue"],
          });
        }
      }

      sendDistrictChange2({
        block,
        changedValues: ret.changedValues,
        user: req.user,
      });

      // Update districts
      if (ret.changedValues["progress"]) {
        recalculateDistrictProgress(block.district);
      }
      if (ret.changedValues["status"]) {
        recalculateDistrictStatus(block.district);
        recalculateDistrictBlocksDoneLeft(block.district);
      }

      return res.send(ret);
    },
  });
};

export const del = (req: Request, res: Response) => {
  allowed({
    permission: Permissions.admin,
    req,
    res,
    callback: async () => {
      const block = dbCache.findOne(Block, { uid: req.params.id });
      if (!block) {
        return res.status(404).send({ error: "Block not found" });
      }

      await block.remove();
      await Block.query(
        `UPDATE blocks SET id = id-1 WHERE id > ${block.id} AND district = ${block.district}`
      );

      Logger.warn(
        `Deleted block ${block.uid} (ID: ${block.id}, District: ${block.district})`
      );

      dbCache.reload("blocks");
      recalculateAll(block.district);

      return res.send({
        message: "Block deleted successfully",
        data: block.toJson(),
      });
    },
  });
};
