import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Block } from "./Block";
import { User } from "./User";

@Entity({ name: "claims" })
export class Claim extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Block, (block: Block) => block.uid, { eager: true })
  block: Block;

  @ManyToOne(() => User, (user: User) => user.uid, { eager: true })
  user: User;

  @Column({ nullable: true })
  special: string;

  @CreateDateColumn()
  claimDate: Date;
}
