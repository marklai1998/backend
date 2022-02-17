import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity({ name: "adminsettings" })
export class AdminSetting {
  @PrimaryColumn()
  key: string;

  @Column("text", { default: "{}" })
  value: string;
}
