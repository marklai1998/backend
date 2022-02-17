import { getRepository } from "typeorm";
import { NextFunction, Request, Response } from "express";
import { AdminSetting } from "../entity/AdminSetting";
import * as index from "../index";

export class AdminSettingController {
  private configRepository = getRepository(AdminSetting);

  async getOne(request: Request, response: Response, next: NextFunction) {
    let res = await this.configRepository.findOne({
      key: request.params.setting,
    });

    if (res === undefined) {
      return index.generateError("Admin Setting not found");
    }

    return {
      key: res.key,
      value: JSON.parse(res.value),
    };
  }

  async getAll(request: Request, response: Response, next: NextFunction) {
    let res = await this.configRepository.find();

    for (var i = 0; i < res.length; i++) {
      res[i] = {
        key: res[i].key,
        value: JSON.parse(res[i].value),
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
