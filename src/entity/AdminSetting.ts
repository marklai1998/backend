import { Entity, PrimaryColumn, Column, BaseEntity } from "typeorm";
import { IsString, IsJSON, IsInt } from "class-validator";

import { Permissions } from "../utils/Permissions";

@Entity({ name: "adminsettings" })
export class AdminSetting extends BaseEntity {
  @PrimaryColumn()
  @IsString({ message: "Invalid Key" })
  key: string;

  @Column("text", { default: "{}" })
  @IsJSON({ message: "Invalid Value" })
  value: string;

  @Column({ default: Permissions.admin })
  @IsInt({ message: "Invalid Permission" })
  permission: number;

  toJson({ showPermission }): object {
    return {
      key: this.key,
      value: JSON.parse(this.value),
      permission: showPermission ? this.permission : undefined,
    };
  }
}
