import { Entity, PrimaryColumn, Column } from "typeorm";
import { Permissions } from "../utils/Permissions";

@Entity({ name: "adminsettings" })
export class AdminSetting {
  @PrimaryColumn()
  key: string;

  @Column("text", { default: "{}" })
  value: string;

  @Column({ default: Permissions.admin })
  permission: number;
}
