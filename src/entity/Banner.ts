import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./User";
import { IsNotEmpty } from "class-validator";

@Entity({ name: "banners" })
export class Banner extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column("text")
  @IsNotEmpty({ message: "Banner data cannot be empty" })
  data: string;

  @Column()
  name: string;

  @ManyToOne(() => User, (user: User) => user.uid, { eager: true })
  user: User;

  @CreateDateColumn()
  created: Date;

  toJson() {
    return {
      id: this.id,
      data: this.data,
      name: this.name,
      user: this.user.uid,
      created: this.created,
    };
  }
}
