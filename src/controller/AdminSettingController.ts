import { NextFunction, Request, Response } from "express";

import * as index from "../index";

import { AdminSetting } from "../entity/AdminSetting";
import { User } from "../entity/User";

export class AdminSettingController {
  async getOne(request: Request, response: Response, next: NextFunction) {
    const setting = await AdminSetting.findOne({
      key: request.params.setting,
    });

    if (!setting) {
      return index.generateError("Admin Setting not found");
    }
    if (setting.permission > 0) {
      const user = await User.findOne({
        apikey: request.body.key || request.query.key,
      });
      if (!user) {
        return index.generateError("Invalid or missing API-Key");
      }
      if (user.permission < setting.permission) {
        return index.generateError("No permission");
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
    let config = await AdminSetting.findOne({
      key: request.body.name,
    });

    if (!config) {
      config = new AdminSetting();
      config.key = request.body.name;
      config.permission = request.body.permission || 4;
    }

    if (typeof request.body.value !== "object") {
      config.value = request.body.value;
    } else {
      config.value = JSON.stringify(request.body.value);
    }

    return index.getValidation(config, "Setting updated");
  }

  async getRandomImage(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    const data = await AdminSetting.findOne({ key: "image_links" });

    if (!data) {
      return index.generateError("No images found");
    }

    const links = JSON.parse(data.value);

    if (links.length === 0) {
      return index.generateError("No images found");
    }

    const rand = Math.floor(Math.random() * links.length);
    response.redirect(links[rand]);
  }
}
