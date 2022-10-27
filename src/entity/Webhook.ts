import { BaseEntity, Column, Entity, PrimaryColumn } from "typeorm";
import { fetch } from "..";

import { IsUrl } from "class-validator";
import { Permissions } from "../utils/Permissions";
import Logger from "../utils/Logger";
import responses from "../responses";

@Entity({ name: "webhooks" })
export class Webhook extends BaseEntity {
  @PrimaryColumn()
  name: string;

  @Column("text")
  @IsUrl({}, { message: "Invalid URL" })
  link: string;

  @Column({ nullable: true })
  message: string;

  @Column({ default: false })
  enabled: boolean;

  @Column({ default: Permissions.admin })
  permission: number;

  async send(body: object): Promise<object> {
    if (!this.enabled) {
      return responses.error({ message: "Webhook disabled", code: 400 });
    }

    const link =
      this.link + (this.message !== null ? `/messages/${this.message}` : "");
    await fetch(link, {
      method: this.message !== null ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }).catch((error) => {
      Logger.error(`Error occurred while sending the webhook ${this.name}`);
      return responses.error({
        message: "Error occurred while sending the message",
        code: 500,
      });
    });
    return responses.success({ message: "Message sent" });
  }
}
