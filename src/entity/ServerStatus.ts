import { BaseEntity, Column, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "serverstatus" })
export class ServerStatus extends BaseEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  address: string;

  @Column({ default: false })
  online: boolean;

  @Column("simple-json", {
    default: JSON.stringify({
      name: "Unknown",
      protocol: -1,
    }),
  })
  version: {
    name: string;
    protocol: number;
  };

  @Column("simple-json", {
    default: JSON.stringify({
      online: 0,
      max: 0,
      sample: [],
    }),
  })
  players: {
    online: number;
    max: number;
    sample: { id: string; name: string }[];
  };

  @Column("simple-json", {
    default: JSON.stringify({
      raw: null,
      clean: null,
      html: null,
    }),
  })
  motd: {
    raw: string | null;
    clean: string | null;
    html: string | null;
  };

  @Column("text", { nullable: true })
  favicon: string | null;

  @Column({ nullable: true })
  srvRecord: string | null;
}
