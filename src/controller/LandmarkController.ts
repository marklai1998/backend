import { NextFunction, Request, Response } from "express";

import { Block } from "../entity/Block";
import { District } from "../entity/District";
import { Landmark } from "../entity/Landmark";
import Logger from "../utils/Logger";
import { User } from "../entity/User";
import responses from "../responses";

export class LandmarkController {
  async create(request: Request, response: Response, next: NextFunction) {
    if (
      !request.body.name ||
      !request.body.district ||
      !request.body.blockID ||
      !request.body.location
    ) {
      return responses.error({
        message: "Specify name, district (ID), blockID and location",
        code: 400,
      });
    }

    const district = await District.findOne({ id: request.body.district });
    const block = await Block.findOne({
      district: district.id,
      id: request.body.blockID,
    });

    if (!block) {
      return responses.error({ message: "Block not found", code: 404 });
    }

    let landmark = await Landmark.findOne({ name: request.body.name });
    if (landmark) {
      return responses.error({
        message: "A Landmark with this name already exists",
        code: 400,
      });
    }

    landmark = new Landmark();
    landmark.name = request.body.name;
    landmark.blockID = block.uid;
    landmark.district = request.body.district;
    landmark.block = request.body.blockID;
    landmark.location = request.body.location;
    Logger.info(`Creating landmark ${landmark.name}`);

    return responses.validate(landmark, "Landmark created", {
      name: landmark.name,
      blockID: landmark.blockID,
      location: landmark.location,
    });
  }

  async delete(request: Request, response: Response, next: NextFunction) {
    if (!request.body.id) {
      return responses.error({ message: "Specify ID", code: 400 });
    }
    const landmark = await Landmark.findOne({ id: request.body.id });

    if (!landmark) {
      return responses.error({ message: "Landmark not found", code: 404 });
    }

    Logger.warn(`Deleting landmark ${landmark.name}`);
    await landmark.remove();
    return responses.success({ message: "Landmark deleted" });
  }

  async getAll(request: Request, response: Response, next: NextFunction) {
    const usersPromise = User.find();
    const landmarksPromise = Landmark.find();
    const [users, landmarksRaw] = await Promise.all([
      usersPromise,
      landmarksPromise,
    ]);

    const landmarks = [];
    for (const landmark of landmarksRaw) {
      const l = landmark.toJson();
      l["requests"] = l["requests"].map((r: any) => {
        const user = users.find((u: User) => u.uid === r.user).username;
        return { user: user, priority: r.priority };
      });
      l["builder"] = l["builder"].map((b: any) => {
        const user = users.find((u: User) => u.uid === b.user).username;
        return { user: user, priority: b.priority };
      });
      landmarks.push(l);
    }
    return landmarks;
  }

  async getOne(request: Request, response: Response, next: NextFunction) {
    const usersPromise = User.find();
    const landmarkPromise = Landmark.findOne({ id: request.params.id });
    const [users, landmark] = await Promise.all([
      usersPromise,
      landmarkPromise,
    ]);

    if (!landmark) {
      return responses.error({ message: "Landmark not found", code: 404 });
    }

    const l = landmark.toJson();
    l["requests"] = l["requests"].map((r: any) => {
      const user = users.find((u: User) => u.uid === r.user).username;
      return { user: user, priority: r.priority };
    });
    l["builder"] = l["builder"].map((b: any) => {
      const user = users.find((u: User) => u.uid === b.user).username;
      return { user: user, priority: b.priority };
    });

    return l;
  }

  async edit(request: Request, response: Response, next: NextFunction) {
    if (!request.body.id) {
      return responses.error({ message: "Specify ID", code: 400 });
    }

    const landmarkPromise = Landmark.findOne({ id: request.body.id });
    const userPromise = User.findOne({
      apikey: request.body.key || request.query.key,
    });

    const [landmark, user] = await Promise.all([landmarkPromise, userPromise]);

    if (!landmark) {
      return responses.error({ message: "Landmark not found", code: 404 });
    }

    return landmark.edit(request.body, user);
  }
}
