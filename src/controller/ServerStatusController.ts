import { NextFunction, Request, Response } from "express";
import { generateError } from "..";
import { ServerStatus } from "../entity/ServerStatus";

export class ServerStatusController {
  async getOne(request: Request, response: Response, next: NextFunction) {
    const server = await ServerStatus.findOne({ id: request.params.server });

    if (!server) {
      return generateError("No server found");
    }

    return server;
  }
  async getAll(request: Request, response: Response, next: NextFunction) {
    return await ServerStatus.find();
  }
}
