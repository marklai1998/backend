import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { IsJSON, IsUUID, Length, Matches } from "class-validator";

import { setAttributeJson } from "../utils/JsonUtils";
import responses from "../responses";

@Entity({ name: "minecraft" })
export class MinecraftUser extends BaseEntity {
  @PrimaryGeneratedColumn()
  uid: number;

  @Column({ length: 36 })
  @IsUUID("4", { message: "Invalid UUID" })
  uuid: string;

  @Column({ length: 16 })
  @Length(3, 16, {
    message: "Username must be between 3 and 16 characters",
  })
  @Matches(/^[a-zA-Z0-9_]{3,16}$/, {
    message: "Invalid Username",
  })
  username: string;

  @Column({ length: 32, default: "Player" })
  rank: string;

  @Column("text" /*{ default: "{}" }*/)
  @IsJSON({ message: "Settings must be a valid JSON-String" })
  settings: string;

  toJson(): object {
    return {
      uid: this.uid,
      uuid: this.uuid,
      username: this.username,
      rank: this.rank,
      settings: JSON.parse(this.settings),
    };
  }

  update(type: string, value: string): object {
    if (typeof type === "string") {
      if (type.toLowerCase() === "name") {
        this.username = value;
        return responses.validate(this, "Minecraft Username updated");
      } else if (type.toLowerCase() === "rank") {
        this.rank = value;
        return responses.validate(this, "Minecraft Rank updated");
      }
    }
    return responses.error({
      message: "Invalid type. Available types: 'name', 'rank'",
      code: 400,
    });
  }

  setSetting(type: string, value: string): object {
    const settings = JSON.parse(this.settings);
    setAttributeJson(settings, type, value);
    this.settings = JSON.stringify(settings);

    return responses.validate(this, "Minecraft Settings updated");
  }
}
