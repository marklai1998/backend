import { getRepository } from "typeorm";
import { NextFunction, Request, Response } from "express";
import { Webhook } from "../entity/Webhook";
import * as index from "../index";

export class WebhookController {
  private webhookRepository = getRepository(Webhook);

  async create(request: Request, response: Response, next: NextFunction) {
    if (!request.body.name || !request.body.link) {
      return index.generateError("Specify name and link");
    }
    let webhook = await this.webhookRepository.findOne({
      name: request.body.name,
    });

    if (webhook !== undefined) {
      return index.generateError("Webhook with this name already exists");
    }

    webhook = new Webhook();
    webhook.name = request.body.name;
    webhook.link = request.body.link;
    webhook.message = request.body.message;
    webhook.enabled = request.body.enabled;

    return index.getValidation(
      webhook,
      this.webhookRepository,
      "Webhook created"
    );
  }

  async delete(request: Request, response: Response, next: NextFunction) {
    if (!request.body.name) {
      return index.generateError("Specify the name of the webhook to delete");
    }

    let webhook = await this.webhookRepository.findOne({
      name: request.body.name,
    });

    if (webhook === undefined) {
      return index.generateError("No webhook found with this name");
    }

    this.webhookRepository.delete(webhook);
    return index.generateSuccess("Webhook deleted");
  }

  async getOne(request: Request, response: Response, next: NextFunction) {
    let webhook = await this.webhookRepository.findOne({
      name: request.params.name,
    });

    if (webhook === undefined) {
      return index.generateError("Webhook not found");
    }
    return index.generateSuccess(undefined, webhook);
  }

  async getAll(request: Request, response: Response, next: NextFunction) {
    return await this.webhookRepository.find();
  }

  async update(request: Request, response: Response, next: NextFunction) {
    if (
      request.body.name === undefined ||
      request.body.type === undefined ||
      request.body.value === undefined
    ) {
      return index.generateError("Specify name, type and value");
    }

    let webhook = await this.webhookRepository.findOne({
      name: request.body.name,
    });

    if (webhook === undefined) {
      return index.generateError("Webhook not found");
    }

    if (webhook[request.body.type] === undefined) {
      return index.generateError("Invalid type");
    }

    webhook[request.body.type] = request.body.value;

    return index.getValidation(
      webhook,
      this.webhookRepository,
      "Webhook updated"
    );
  }

  async send(request: Request, response: Response, next: NextFunction) {
    if (!request.body.name || !request.body.method) {
      return index.generateError("Specify a name and a method");
    }
    if (
      typeof request.body.method !== "string" ||
      (request.body.method.toLowerCase() !== "post" &&
        request.body.method.toLowerCase() !== "patch")
    ) {
      return index.generateError("Invalid method");
    }
    if (typeof request.body.body !== "object") {
      return index.generateError("Invalid body");
    }

    let webhook = await this.webhookRepository.findOne({
      name: request.body.name,
    });
    if (webhook === undefined) {
      return index.generateError("No webhook found with this name");
    }

    if (
      request.body.method.toLowerCase() === "patch" &&
      webhook.message === null
    ) {
      return index.generateError("No messageID set for this webhook");
    }

    const link =
      webhook.link +
      (request.body.method.toLowerCase() === "patch"
        ? `/messages/${webhook.message}`
        : "");
    await index
      .fetch(link, {
        method: request.body.method.toUpperCase(),
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request.body.body),
      })
      .catch((error) => {
        return index.generateError("Error occurred sending the message", error);
      });
    return index.generateSuccess("Message sent");
  }
}
