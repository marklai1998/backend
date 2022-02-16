import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({ name: "minecraft" })
export class MinecraftUser {
  @PrimaryGeneratedColumn()
  rid: number;

  @Column({ length: 36 })
  uuid: string;

  @Column({ length: 16 })
  username: string;

  @Column()
  rank: string;

  @Column("text")
  settings: string;
}
