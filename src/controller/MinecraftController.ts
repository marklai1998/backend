import { NextFunction, Request, Response } from "express";

import { MinecraftUser } from "../entity/MinecraftUser";
import responses from "../responses";

export class MinecraftController {
  async create(request: Request, response: Response, next: NextFunction) {
    let user = await MinecraftUser.findOneBy({ uuid: request.body.uuid });

    if (user) {
      return responses.error({ message: "UUID already exists", code: 400 });
    }

    user = new MinecraftUser();
    user.uuid = request.body.uuid;
    user.username = request.body.username;
    user.rank = request.body.rank || "Player";
    user.settings = request.body.settings || "{}";

    return responses.validate(user, "Minecraft User registered");
  }

  async delete(request: Request, response: Response, next: NextFunction) {
    if (!request.body.uuid) {
      return responses.error({ message: "Specify UUID", code: 400 });
    }
    const user = await MinecraftUser.findOneBy({ uuid: request.body.uuid });

    if (!user) {
      return responses.error({ message: "UUID not found", code: 404 });
    }

    await MinecraftUser.remove(user);
    return responses.success({ message: "Minecraft User deleted" });
  }

  async getAll(request: Request, response: Response, next: NextFunction) {
    const players = await MinecraftUser.find();

    const res = [];
    for (const player of players) {
      res.push(player.toJson());
    }

    return res;
  }

  async getOne(request: Request, response: Response, next: NextFunction) {
    const player =
      (await MinecraftUser.findOneBy({ username: request.params.user })) ||
      (await MinecraftUser.findOneBy({ uuid: request.params.user }));

    if (!player) {
      return responses.error({ message: "Player not found", code: 404 });
    }
    return player.toJson();
  }

  async update(request: Request, response: Response, next: NextFunction) {
    if (!request.body.uuid) {
      return responses.error({ message: "Specify UUID", code: 400 });
    }
    if (!request.body.type || !request.body.value) {
      return responses.error({
        message: "Specify a type and a value",
        code: 400,
      });
    }

    const user = await MinecraftUser.findOneBy({ uuid: request.body.uuid });

    if (!user) {
      return responses.error({ message: "UUID not found", code: 404 });
    }

    return user.update(request.body.type, request.body.value);
  }

  async setSettings(request: Request, response: Response, next: NextFunction) {
    if (!request.body.uuid) {
      return responses.error({ message: "Specify UUID", code: 400 });
    }
    if (!request.body.type || !request.body.value) {
      return responses.error({
        message: "Specify a type and a value",
        code: 400,
      });
    }

    const user = await MinecraftUser.findOneBy({ uuid: request.body.uuid });

    if (!user) {
      return responses.error({ message: "UUID not found", code: 404 });
    }

    return user.setSetting(request.body.type, request.body.value);
  }
}
