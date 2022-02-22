import { getRepository } from "typeorm";
import { NextFunction, Request, Response } from "express";
import { AdminSetting } from "../entity/AdminSetting";
import * as index from "../index";
import { User } from "../entity/User";

export class AdminSettingController {
  private configRepository = getRepository(AdminSetting);

  async getOne(request: Request, response: Response, next: NextFunction) {
    let setting = await this.configRepository.findOne({
      key: request.params.setting,
    });

    if (setting === undefined) {
      return index.generateError("Admin Setting not found");
    }
    if (setting.permission > 0) {
      let user = await User.findOne({
        apikey: request.body.key || request.query.key,
      });
      if (user === undefined) {
        return index.generateError("Invalid or missing API-Key");
      }
      if (user.permission < setting.permission) {
        return index.generateError("No permission");
      }
    }

    return {
      key: setting.key,
      value: JSON.parse(setting.value),
    };
  }

  async getAll(request: Request, response: Response, next: NextFunction) {
    let res = await this.configRepository.find();

    for (var i = 0; i < res.length; i++) {
      res[i] = {
        key: res[i].key,
        value: JSON.parse(res[i].value),
        permission: res[i].permission,
      };
    }
    return res;
  }

  async set(request: Request, response: Response, next: NextFunction) {
    let config = await this.configRepository.findOne({
      key: request.params.setting,
    });

    if (config === undefined) {
      config = new AdminSetting();
      config.key = request.body.key;
    }

    if (typeof request.body.value === "string") {
      config.value = request.body.value;
    } else {
      config.value = JSON.stringify(request.body.value);
    }

    this.configRepository.save(config);
    return index.generateSuccess("Setting updated");
  }
}
