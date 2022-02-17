import { getRepository } from "typeorm";
import { NextFunction, Request, Response } from "express";
import { MinecraftUser } from "../entity/MinecraftUser";
import * as index from "../index";

export class MinecraftController {
  private mcRepository = getRepository(MinecraftUser);

  async create(request: Request, response: Response, next: NextFunction) {
    let user = await this.mcRepository.findOne({ uuid: request.body.uuid });

    if (user !== undefined) {
      return index.generateError("UUID already exists");
    }

    user = new MinecraftUser();
    user.uuid = request.body.uuid;
    user.username = request.body.username;
    user.rank = request.body.rank;
    user.settings = request.body.settings;

    return index.getValidation(
      user,
      this.mcRepository,
      "Minecraft User registered"
    );
  }

  async delete(request: Request, response: Response, next: NextFunction) {
    if (request.body.uuid === undefined) {
      return index.generateError("Specify UUID");
    }
    let user = await this.mcRepository.findOne({ uuid: request.body.uuid });

    if (user === undefined) {
      return index.generateError("UUID not found");
    }

    await this.mcRepository.remove(user);
    return index.generateSuccess("Minecraft User deleted");
  }

  async getAll(request: Request, response: Response, next: NextFunction) {
    return this.mcRepository.find();
  }

  async getOne(request: Request, response: Response, next: NextFunction) {
    let res = this.mcRepository.find({ username: request.params.user });

    if ((await res).length === 0) {
      res = this.mcRepository.find({ uuid: request.params.user });
    }
    return res;
  }

  async update(request: Request, response: Response, next: NextFunction) {
    if (request.body.uuid === undefined) {
      return index.generateError("Specify UUID");
    }
    const type = request.body.type;
    let user = await this.mcRepository.findOne({ uuid: request.body.uuid });

    if (user === undefined) {
      return index.generateError("UUID not found");
    }
    if (request.body.value === undefined) {
      return index.generateError("Specify a value");
    }

    if (typeof type === "string" && type.toLowerCase() === "name") {
      user.username = request.body.value;
      return index.getValidation(
        user,
        this.mcRepository,
        "Minecraft Username updated"
      );
    } else if (typeof type === "string" && type.toLowerCase() === "rank") {
      user.rank = request.body.value;
      return index.getValidation(
        user,
        this.mcRepository,
        "Minecraft Rank updated"
      );
    } else {
      return index.generateError(
        "Invalid type. Available types: 'name', 'rank'"
      );
    }
  }

  async setSettings(request: Request, response: Response, next: NextFunction) {
    if (request.body.uuid === undefined) {
      return index.generateError("Specify UUID");
    }
    let user = await this.mcRepository.findOne({ uuid: request.body.uuid });

    if (user === undefined) {
      return index.generateError("UUID not found");
    }
    if (request.body.type === undefined) {
      return index.generateError("Specify a type");
    }
    if (request.body.value === undefined) {
      return index.generateError("Specify a value");
    }

    const settings = JSON.parse(user.settings);
    setAttributeJson(settings, request.body.type, request.body.value);
    user.settings = JSON.stringify(settings);

    return index.getValidation(
      user,
      this.mcRepository,
      "Minecraft Settings updated"
    );
  }
}

function setAttributeJson(json: object, path: string, value: any) {
  var k = json;
  var steps = path.split(".");
  var last = steps.pop();
  steps.forEach((e) => (k[e] = k[e] || {}) && (k = k[e]));
  k[last] = value;
}
