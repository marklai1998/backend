import * as dbCache from "../../../utils/cache/DatabaseCache";

import { Request, Response } from "express";

import { Permissions } from "../../../routes";
import { User } from "../../../entity/User";
import { allowed } from "../../../middleware/auth";
import { generateUUID } from "../../..";
import { hash } from "../../../utils/encryption/bcrypt";
import { validate } from "../../../utils/Validation";

export const get = (req: Request, res: Response) => {
  allowed(Permissions.default, req, res, () => {
    const users = dbCache.find("users");

    return res.send(
      users.map((user: User) =>
        user.toJson({
          // @ts-ignore
          hasPermission: req.user.permission >= Permissions.moderator,
        })
      )
    );
  });
};

export const post = (req: Request, res: Response) => {
  allowed(Permissions.default, req, res, async () => {
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
    });
  });
};
