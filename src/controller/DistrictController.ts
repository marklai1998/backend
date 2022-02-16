import { getRepository } from "typeorm";
import { NextFunction, Request, Response } from "express";
import { District } from "../entity/District";

export class DistrictController {
  private districtRepository = getRepository(District);

  async create(request: Request, response: Response, next: NextFunction) {}

  async delete(request: Request, response: Response, next: NextFunction) {}

  async getAll(request: Request, response: Response, next: NextFunction) {
    return this.districtRepository.find();
  }

  async getOne(request: Request, response: Response, next: NextFunction) {
    return this.districtRepository.findOne({ name: request.params.name });
  }
}
