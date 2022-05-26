import { BaseEntity, Column, Entity, PrimaryColumn } from "typeorm";
import { IsInt, IsString } from "class-validator";

import { Permissions } from "../utils/Permissions";

@Entity({ name: "adminsettings" })
export class AdminSetting extends BaseEntity {
  @PrimaryColumn()
  @IsString({ message: "Invalid Key" })
  key: string;

  @Column("text" /*{ default: "{}" }*/)
  value: string;

  @Column({ default: Permissions.admin })
  @IsInt({ message: "Permission must be a number" })
  permission: number;

  toJson({ showPermission = true }: { showPermission?: boolean } = {}): object {
    return {
      key: this.key,
      value: JSON.parse(this.value),
      permission: showPermission ? this.permission : undefined,
    };
  }
}
