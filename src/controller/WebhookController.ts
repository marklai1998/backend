import { NextFunction, Request, Response } from "express";

import Logger from "../utils/Logger";
import { User } from "../entity/User";
import { Webhook } from "../entity/Webhook";
import responses from "../responses";

export class WebhookController {
  async create(request: Request, response: Response, next: NextFunction) {
    if (!request.body.name || !request.body.link) {
      return responses.error({ message: "Specify name and link", code: 400 });
    }
    let webhook = await Webhook.findOne({
      name: request.body.name,
    });

    if (webhook) {
      return responses.error({
        message: "Webhook with this name already exists",
        code: 400,
      });
    }

    webhook = new Webhook();
    webhook.name = request.body.name;
    webhook.link = request.body.link;
    webhook.message = request.body.message || null;
    webhook.enabled = request.body.enabled || false;
    Logger.info(`Created webhook ${webhook.name}`);

    return responses.validate(webhook, "Webhook created");
  }

  async delete(request: Request, response: Response, next: NextFunction) {
    if (!request.body.name) {
      return responses.error({
        message: "Specify the name of the webhook to delete",
        code: 400,
      });
    }

    const webhook = await Webhook.findOne({
      name: request.body.name,
    });

    if (!webhook) {
      return responses.error({
        message: "No webhook found with this name",
        code: 404,
      });
    }
    Logger.warn(`Deleted webhook ${webhook.name}`);
    await webhook.remove();
    return responses.success({ message: "Webhook deleted" });
  }

  async getOne(request: Request, response: Response, next: NextFunction) {
    const webhook = await Webhook.findOne({
      name: request.params.name,
    });

    if (!webhook) {
      return responses.error({ message: "Webhook not found", code: 404 });
    }
    return webhook;
  }

  async getAll(request: Request, response: Response, next: NextFunction) {
    return await Webhook.find();
  }

  async update(request: Request, response: Response, next: NextFunction) {
    if (!request.body.name || !request.body.type || !request.body.value) {
      return responses.error({
        message: "Specify name, type and value",
        code: 400,
      });
    }

    const webhook = await Webhook.findOne({
      name: request.body.name,
    });

    if (!webhook) {
      return responses.error({ message: "Webhook not found", code: 404 });
    }

    if (webhook[request.body.type] === undefined) {
      return responses.error({ message: "Invalid type", code: 400 });
    }

    Logger.info(
      "Editing webhook " +
        webhook.name +
        " (" +
        request.body.type.toLocaleUpperCase() +
        ": " +
        webhook[request.body.type] +
        " -> " +
        request.body.valu +
        ")"
    );
    webhook[request.body.type] = request.body.value;

    return responses.validate(webhook, "Webhook updated");
  }

  async send(request: Request, response: Response, next: NextFunction) {
    if (!request.body.name) {
      return responses.error({
        message: "Specify the webhook name",
        code: 400,
      });
    }
    if (typeof request.body.body !== "object") {
      return responses.error({ message: "Invalid body", code: 400 });
    }

    const webhook = await Webhook.findOne({
      name: request.body.name,
    });

    if (!webhook) {
      return responses.error({
        message: "No webhook found with this name",
        code: 404,
      });
    }

    if (webhook.permission > 0) {
      const user = await User.findOne({
        apikey: request.body.key || request.query.key,
      });
      if (!user) {
        return responses.error({
          message: "Invalid or missing API-Key",
          code: 401,
        });
      }
      if (user.permission < webhook.permission) {
        return responses.error({ message: "No Permission", code: 403 });
      }
    }

    return await webhook.send(request.body);
  }
}
