import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { Length, IsJSON, IsUUID, Matches } from "class-validator";

@Entity({ name: "minecraft" })
export class MinecraftUser {
  @PrimaryGeneratedColumn()
  rid: number;

  @Column({ length: 36 })
  @IsUUID("4", { message: "Invalid UUID" })
  uuid: string;

  @Column({ length: 16 })
  @Length(3, 16, {
    message: "Username must be between 3 and 16 characters",
  })
  @Matches(/^([a-zA-Z0-9_]{3,16}[,]?){1,}$/, {
    message: "Invalid Username",
  })
  username: string;

  @Column({ default: "Player" })
  rank: string;

  @Column("text")
  @IsJSON({ message: "Settings must be a valid JSON-String" })
  settings: string;
}
