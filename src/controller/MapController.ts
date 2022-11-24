import { NextFunction, Request, Response } from "express";

import Logger from "../utils/Logger";
import { Map } from "../entity/Map";
import { User } from "../entity/User";
import { generateUUID } from "../index";
import responses from "../responses";
import { updateJson } from "../utils/JsonUtils";

export class MapController {
  async create(request: Request, response: Response, next: NextFunction) {
    if (!request.body.name) {
      return responses.error({ message: "Specify a name", code: 400 });
    }

    const user = await User.findOneBy({
      apikey: request.body.key || request.query.key,
    });

    const map = new Map();
    map.uuid = generateUUID();
    map.name = request.body.name;
    map.owner = user.uid;

    return responses.validate(map, "Map created successfully");
  }
  async getAll(request: Request, response: Response, next: NextFunction) {
    const maps = await Map.find();
    return maps.map((map: Map) => map.toJson({ showDetails: false }));
  }
  async getOne(request: Request, response: Response, next: NextFunction) {
    const id = request.params.id;
    if (!id) {
      return responses.error({ message: "Specify id or uuid", code: 400 });
    }
    const maps = await Map.find();
    const map = maps.find((m: Map) => m.id == parseInt(id) || m.uuid === id);

    if (!map) {
      return responses.error({ message: "No map found", code: 404 });
    }

    return map.toJson();
  }
  async update(request: Request, response: Response, next: NextFunction) {
    const id = request.body.id || request.body.uuid;
    if (!id) {
      return responses.error({ message: "Specify id or uuid", code: 400 });
    }

    const map =
      (await Map.findOneBy({ id: id })) || (await Map.findOneBy({ uuid: id }));

    if (!map) {
      return responses.error({ message: "No map found", code: 404 });
    }

    updateJson(map, request.body);
    Logger.info(`Updating map ${map.uuid}`);
    return responses.validate(map, "Map updated successfully");
  }
}
