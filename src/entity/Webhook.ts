import { BaseEntity, Column, Entity, PrimaryColumn } from "typeorm";
import { fetch, generateError, generateSuccess } from "../index";

import { IsUrl } from "class-validator";
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

  async send(body: object): Promise<object> {
    if (!this.enabled) {
      return generateError("Webhook disabled");
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
      return generateError("Error occurred while sending the message", error);
    });
    return generateSuccess("Message sent");
  }
}
