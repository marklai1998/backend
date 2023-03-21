import {
  BaseEntity,
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./User";

@Entity({ name: "verifications" })
export class Verification extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, (user: User) => user.uid, { eager: true })
  user: User;

  @Column({ length: 5 })
  code: string;

  @CreateDateColumn()
  createdAt: Date;

  @BeforeInsert()
  generateVerificationCode() {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

    let key = "";
    for (let i = 0; i < 5; i++) {
      key += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    this.code = key;
  }
}
