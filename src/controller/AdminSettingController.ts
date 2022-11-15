import { NextFunction, Request, Response } from "express";

import { AdminSetting } from "../entity/AdminSetting";
import Logger from "../utils/Logger";
import { User } from "../entity/User";
import responses from "../responses";

export class AdminSettingController {
  async getOne(request: Request, response: Response, next: NextFunction) {
    const setting = await AdminSetting.findOneBy({
      key: request.params.setting,
    });

    if (!setting) {
      return responses.error({ message: "Admin Setting not found", code: 404 });
    }
    if (setting.permission > 0) {
      const user = await User.findOneBy({
        apikey: request.body.key || request.query.key,
      });
      if (!user) {
        return responses.error({
          message: "Invalid or missing API-Key",
          code: 401,
        });
      }
      if (user.permission < setting.permission) {
        return responses.error({ message: "No Permission", code: 403 });
      }
    }

    return setting.toJson({ showPermission: false });
  }

  async getAll(request: Request, response: Response, next: NextFunction) {
    const settings = await AdminSetting.find();

    const res = [];
    for (var i = 0; i < settings.length; i++) {
      res.push(settings[i].toJson());
    }
    return res;
  }

  async set(request: Request, response: Response, next: NextFunction) {
    let config = await AdminSetting.findOneBy({
      key: request.body.name,
    });

    if (!config) {
      Logger.info("Creating new setting " + request.body.name);
      config = new AdminSetting();
      config.key = request.body.name;
      config.permission = request.body.permission || 4;
    }

    if (typeof request.body.value !== "object") {
      Logger.info(
        "Set setting " +
          request.body.name +
          " from " +
          config.value +
          " to " +
          request.body.value
      );
      config.value = request.body.value;
    } else {
      Logger.info(
        "Set setting " +
          request.body.name +
          " from " +
          config.value +
          " to " +
          JSON.stringify(request.body.value)
      );
      config.value = JSON.stringify(request.body.value);
    }

    return responses.validate(config, "Setting updated");
  }

  async getRandomImage(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    const data = await AdminSetting.findOneBy({ key: "image_links" });

    if (!data) {
      return responses.error({ message: "No images found", code: 404 });
    }

    const links = JSON.parse(data.value);

    if (links.length === 0) {
      return responses.error({ message: "No images found", code: 404 });
    }

    const rand = Math.floor(Math.random() * links.length);
    response.send({ error: false, link: links[rand] });
  }
}
