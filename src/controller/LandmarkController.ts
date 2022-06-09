import { generateError, generateSuccess, getValidation } from "../index";

import { NextFunction, Request, Response } from "express";

import { Block } from "../entity/Block";
import { Landmark } from "../entity/Landmark";

export class LandmarkController {
  async create(request: Request, response: Response, next: NextFunction) {
    if (
      !request.body.name ||
      !request.body.blockID ||
      !request.body.weight ||
      !request.body.location
    ) {
      return generateError("Specify name, blockID, weight and location");
    }

    const block = await Block.findOne({ uid: request.body.blockID });

    if (!block) {
      return generateError("Block not found");
    }

    let landmark = await Landmark.findOne({ name: request.body.name });
    if (landmark) {
      return generateError("A Landmark with this name already exists");
    }

    landmark = new Landmark();
    landmark.name = request.body.name;
    landmark.blockID = request.body.blockID;
    landmark.weight = request.body.weight;
    landmark.location = request.body.location;

    return getValidation(landmark, "Landmark created");
  }

  async delete(request: Request, response: Response, next: NextFunction) {
    if (!request.body.id) {
      return generateError("Specify ID");
    }
    const landmark = await Landmark.findOne({ id: request.body.id });

    if (!landmark) {
      return generateError("Landmark not found");
    }

    await landmark.remove();
    return generateSuccess("Landmark deleted");
  }

  async getAll(request: Request, response: Response, next: NextFunction) {
    const landmarksRaw = await Landmark.find();
    const landmarks = [];

    for (const landmark of landmarksRaw) {
      landmarks.push(landmark.toJson());
    }
    return landmarks;
  }

  async getOne(request: Request, response: Response, next: NextFunction) {
    const landmark = await Landmark.findOne({ id: request.params.id });

    if (!landmark) {
      return generateError("Landmark not found");
    }

    return landmark.toJson();
  }

  async edit(request: Request, response: Response, next: NextFunction) {
    if (!request.body.id) {
      return generateError("Specify ID");
    }

    const landmark = await Landmark.findOne({ id: request.body.id });

    if (!landmark) {
      return generateError("Landmark not found");
    }

    return landmark.edit(request.body);
  }
}
