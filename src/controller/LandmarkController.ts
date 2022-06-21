import { NextFunction, Request, Response } from "express";
import { generateError, generateSuccess, getValidation } from "../index";

import { Block } from "../entity/Block";
import { District } from "../entity/District";
import { Landmark } from "../entity/Landmark";
import Logger from "../utils/Logger";
import { User } from "../entity/User";

export class LandmarkController {
  async create(request: Request, response: Response, next: NextFunction) {
    if (
      !request.body.name ||
      !request.body.district ||
      !request.body.blockID ||
      !request.body.location
    ) {
      return generateError("Specify name, district (ID), blockID and location");
    }

    const district = await District.findOne({ id: request.body.district });
    const block = await Block.findOne({
      district: district.id,
      id: request.body.blockID,
    });

    if (!block) {
      return generateError("Block not found");
    }

    let landmark = await Landmark.findOne({ name: request.body.name });
    if (landmark) {
      return generateError("A Landmark with this name already exists");
    }

    landmark = new Landmark();
    landmark.name = request.body.name;
    landmark.blockID = block.uid;
    landmark.location = request.body.location;
    Logger.info(`Creating landmark ${landmark.name}`);

    return getValidation(landmark, "Landmark created", {
      name: landmark.name,
      blockID: landmark.blockID,
      location: landmark.location,
    });
  }

  async delete(request: Request, response: Response, next: NextFunction) {
    if (!request.body.id) {
      return generateError("Specify ID");
    }
    const landmark = await Landmark.findOne({ id: request.body.id });

    if (!landmark) {
      return generateError("Landmark not found");
    }

    Logger.warn(`Deleting landmark ${landmark.name}`);
    await landmark.remove();
    return generateSuccess("Landmark deleted");
  }

  async getAll(request: Request, response: Response, next: NextFunction) {
    const users = await User.find();
    const landmarksRaw = await Landmark.find();
    const landmarks = [];

    for (const landmark of landmarksRaw) {
      const l = landmark.toJson();
      l["requests"] = l["requests"].map(
        (r: number) => users.find((u: User) => u.uid === r).username
      );
      l["builder"] = l["builder"].map(
        (b: number) => users.find((u: User) => u.uid === b).username
      );
      landmarks.push(l);
    }
    return landmarks;
  }

  async getOne(request: Request, response: Response, next: NextFunction) {
    const users = await User.find();
    const landmark = await Landmark.findOne({ id: request.params.id });

    if (!landmark) {
      return generateError("Landmark not found");
    }

    const l = landmark.toJson();
    l["requests"] = l["requests"].map(
      (r: number) => users.find((u: User) => u.uid === r).username
    );
    l["builder"] = l["builder"].map(
      (b: number) => users.find((u: User) => u.uid === b).username
    );

    return l;
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
