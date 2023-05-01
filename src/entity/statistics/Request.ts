import { BaseEntity, Column, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "statistics_requests" })
export class Request extends BaseEntity {
  @PrimaryColumn({ type: "datetime", precision: 6 })
  timestamp: Date;

  @Column({ nullable: true })
  ip: string;

  @Column()
  statusCode: number;

  @Column()
  method: string;

  @Column()
  path: string;

  @Column()
  url: string;
}
