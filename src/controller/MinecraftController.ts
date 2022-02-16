import { getRepository } from "typeorm";
import { NextFunction, Request, Response } from "express";
import { MinecraftUser } from "../entity/MinecraftUser";

export class MinecraftController {
  private mcRepository = getRepository(MinecraftUser);

  async create(request: Request, response: Response, next: NextFunction) {
    let user = new MinecraftUser();
    user.uuid = request.body.uuid;
    user.username = request.body.username;
    user.rank = request.body.rank;
    user.settings = request.body.settings;

    return this.mcRepository.save(user);
  }

  async delete(request: Request, response: Response, next: NextFunction) {}

  async getAll(request: Request, response: Response, next: NextFunction) {
    return this.mcRepository.find();
  }

  async getOne(request: Request, response: Response, next: NextFunction) {
    var res = this.mcRepository.find({ username: request.params.user });

    if ((await res).length === 0) {
      res = this.mcRepository.find({ uuid: request.params.user });
    }
    return res;
  }
}
