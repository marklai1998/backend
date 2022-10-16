import { NextFunction, Request, Response } from "express";
import { Map } from "../entity/Map";
import { User } from "../entity/User";
import { generateError, generateUUID, getValidation } from "../index";

export class MapController {
  async create(request: Request, response: Response, next: NextFunction) {
    if (!request.body.name) {
      return generateError("Specify a name");
    }

    const user = await User.findOne({
      apikey: request.body.key || request.query.key,
    });

    const map = new Map();
    map.uuid = generateUUID();
    map.name = request.body.name;
    map.owner = user.uid;

    return getValidation(map, "Map created successfully");
  }
  async getAll(request: Request, response: Response, next: NextFunction) {
    const maps = await Map.find();
    return maps.map((map: Map) => map.toJson({ showDetails: false }));
  }
  async getOne(request: Request, response: Response, next: NextFunction) {
    const id = request.params.id;
    if (!id) {
      return generateError("Specify id or uuid");
    }
    const maps = await Map.find();
    const map = maps.find((m: Map) => m.id == id || m.uuid === id);

    if (!map) {
      return generateError("No map found");
    }

    return map.toJson();
  }
}
