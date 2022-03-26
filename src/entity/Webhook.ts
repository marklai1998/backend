import { Entity, PrimaryColumn, Column, BaseEntity } from "typeorm";
import { IsUrl } from "class-validator";

import { fetch, generateError, generateSuccess } from "../index";

import { Permissions } from "../utils/Permissions";

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

  async send(body: { method: string; body: object }): Promise<object> {
    if (!this.enabled) {
      return generateError("Webhook disabled");
    }
    if (body.method.toLowerCase() === "patch" && !this.message) {
      return generateError("No messageID set for this webhook");
    }

    const link =
      this.link +
      (body.method.toLowerCase() === "patch"
        ? `/messages/${this.message}`
        : "");
    await fetch(link, {
      method: body.method.toUpperCase(),
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body.body),
    }).catch((error) => {
      return generateError("Error occurred while sending the message", error);
    });
    return generateSuccess("Message sent");
  }
}
