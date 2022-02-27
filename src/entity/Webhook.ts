import { Entity, PrimaryColumn, Column, BaseEntity } from "typeorm";
import { IsUrl } from "class-validator";
import { Permissions } from "../utils/Permissions";

@Entity({ name: "webhooks" })
export class Webhook {
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
}
