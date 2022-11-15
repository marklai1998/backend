import { NextFunction, Request, Response } from "express";
import { ServerStatus } from "../entity/ServerStatus";
import responses from "../responses";

export class ServerStatusController {
  async getOne(request: Request, response: Response, next: NextFunction) {
    const server = await ServerStatus.findOneBy({ id: request.params.server });

    if (!server) {
      return responses.error({ message: "No server found", code: 404 });
    }

    return server;
  }
  async getAll(request: Request, response: Response, next: NextFunction) {
    return await ServerStatus.find();
  }
}
