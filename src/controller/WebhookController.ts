import { NextFunction, Request, Response } from "express";

import * as index from "../index";

import { User } from "../entity/User";
import { Webhook } from "../entity/Webhook";

export class WebhookController {
  async create(request: Request, response: Response, next: NextFunction) {
    if (!request.body.name || !request.body.link) {
      return index.generateError("Specify name and link");
    }
    let webhook = await Webhook.findOne({
      name: request.body.name,
    });

    if (webhook) {
      return index.generateError("Webhook with this name already exists");
    }

    webhook = new Webhook();
    webhook.name = request.body.name;
    webhook.link = request.body.link;
    webhook.message = request.body.message || null;
    webhook.enabled = request.body.enabled || false;

    return index.getValidation(webhook, "Webhook created");
  }

  async delete(request: Request, response: Response, next: NextFunction) {
    if (!request.body.name) {
      return index.generateError("Specify the name of the webhook to delete");
    }

    const webhook = await Webhook.findOne({
      name: request.body.name,
    });

    if (!webhook) {
      return index.generateError("No webhook found with this name");
    }

    await webhook.remove();
    return index.generateSuccess("Webhook deleted");
  }

  async getOne(request: Request, response: Response, next: NextFunction) {
    const webhook = await Webhook.findOne({
      name: request.params.name,
    });

    if (!webhook) {
      return index.generateError("Webhook not found");
    }
    return webhook;
  }

  async getAll(request: Request, response: Response, next: NextFunction) {
    return await Webhook.find();
  }

  async update(request: Request, response: Response, next: NextFunction) {
    if (!request.body.name || !request.body.type || !request.body.value) {
      return index.generateError("Specify name, type and value");
    }

    const webhook = await Webhook.findOne({
      name: request.body.name,
    });

    if (!webhook) {
      return index.generateError("Webhook not found");
    }

    if (webhook[request.body.type] === undefined) {
      return index.generateError("Invalid type");
    }

    webhook[request.body.type] = request.body.value;

    return index.getValidation(webhook, "Webhook updated");
  }

  async send(request: Request, response: Response, next: NextFunction) {
    if (!request.body.name) {
      return index.generateError("Specify the webhook name");
    }
    if (typeof request.body.body !== "object") {
      return index.generateError("Invalid body");
    }

    const webhook = await Webhook.findOne({
      name: request.body.name,
    });

    if (!webhook) {
      return index.generateError("No webhook found with this name");
    }

    if (webhook.permission > 0) {
      const user = await User.findOne({
        apikey: request.body.key || request.query.key,
      });
      if (!user) {
        return index.generateError("Invalid or missing API-Key");
      }
      if (user.permission < webhook.permission) {
        return index.generateError("No permission");
      }
    }

    return await webhook.send(request.body);
  }
}
