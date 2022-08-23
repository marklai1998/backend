import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "registrations" })
export class Registration extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 5 })
  verification: string;

  @Column()
  username: string;

  @Column()
  discord: string;

  @Column("text")
  password: string;

  @CreateDateColumn()
  createdAt: Date;

  toJson(): object {
    return {
      id: this.id,
      username: this.username,
      discord: this.discord,
      createdAt: this.createdAt,
    };
  }
}
