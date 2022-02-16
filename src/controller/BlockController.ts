import { getRepository } from "typeorm";
import { NextFunction, Request, Response } from "express";
import { Block } from "../entity/Block";

export class BlockController {
  private blockRepository = getRepository(Block);

  async create(request: Request, response: Response, next: NextFunction) {}

  async delete(request: Request, response: Response, next: NextFunction) {}

  async setLocation(request: Request, response: Response, next: NextFunction) {}

  async setProgress(request: Request, response: Response, next: NextFunction) {
    let block = await this.blockRepository.findOne({});
  }

  async setDetails(request: Request, response: Response, next: NextFunction) {}

  async addBuilder(request: Request, response: Response, next: NextFunction) {}

  async removeBuilder(
    request: Request,
    response: Response,
    next: NextFunction
  ) {}
}
