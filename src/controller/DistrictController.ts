import { NextFunction, Request, Response } from "express";

import { Block } from "../entity/Block";
import { District } from "../entity/District";
import Logger from "../utils/Logger";
import { recalculateAll } from "../utils/ProgressCalculation";
import responses from "../responses";

export class DistrictController {
  async create(request: Request, response: Response, next: NextFunction) {
    if (!request.body.name) {
      return responses.error({ message: "Specify a name", code: 400 });
    }
    if (!request.body.parent) {
      return responses.error({ message: "Specify a parent", code: 400 });
    }

    let district = await District.findOneBy({
      name: request.body.name,
    });
    if (district) {
      return responses.error({ message: "District already exists", code: 400 });
    }

    const parent = await District.findOneBy({
      id: request.body.parent,
    });
    if (!parent) {
      return responses.error({
        message: "Parent District not found",
        code: 404,
      });
    }

    district = new District();
    district.name = request.body.name;
    district.parent = parent.id;
    district.status = 0;
    district.blocksDone = 0;
    district.blocksLeft = 0;
    district.progress = 0;
    district.area = "[]";
    district.image = "[]";
    Logger.info(`Creating district ${district.name}`);

    return responses.validate(district, "District created", {
      name: district.name,
      parent: district.parent,
    });
  }

  async delete(request: Request, response: Response, next: NextFunction) {
    if (!request.body.name) {
      return responses.error({ message: "Specify a name", code: 400 });
    }
    if (request.body.name.toLowerCase() === "new york city") {
      return responses.error({
        message: "You cannot delete initial district",
        code: 400,
      });
    }
    const district = await District.findOneBy({
      name: request.body.name,
    });
    if (!district) {
      return responses.error({ message: "District not found", code: 404 });
    }

    const blocks = await Block.findBy({ district: district.id });

    if (blocks.length > 0) {
      return responses.error({
        message: "Cannot delete district with existing blocks",
        code: 400,
      });
    }

    Logger.warn(`Deleting district ${district.name}`);
    await district.remove();
    return responses.success({ message: "District deleted" });
  }

  async getAll(request: Request, response: Response, next: NextFunction) {
    const districtsRaw = await District.find();

    if (districtsRaw.length === 0) {
      return responses.error({ message: "No districts found", code: 400 });
    }

    const districts = [];
    for (const district of districtsRaw) {
      districts.push(
        district.toJson({ onlyProgress: false, showDetails: false })
      );
    }

    return await Promise.all(districts);
  }

  async getOne(request: Request, response: Response, next: NextFunction) {
    const district = await District.findOneBy({
      name: request.params.name,
    });

    if (!district) {
      return responses.error({ message: "District not found", code: 404 });
    }
    return district.toJson({ onlyProgress: false });
  }

  async edit(request: Request, response: Response, next: NextFunction) {
    const district = await District.findOneBy({
      id: request.body.district,
    });

    if (!district) {
      return responses.error({ message: "District not found", code: 404 });
    }

    return district.edit(request.body);
  }

  async sync(request: Request, response: Response, next: NextFunction) {
    await recalculateAll(request.params.district);
    return responses.success({ message: "Done" });
  }
}
