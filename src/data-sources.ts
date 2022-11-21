import "reflect-metadata";
import { DataSource } from "typeorm";

export const AppDataSource = new DataSource({
  type: "mysql",
  host: "144.217.77.29",
  port: 3306,
  username: "mfprogress",
  password: "M^cB9&u*2dw2",
  database: "mfprogress",
  synchronize: true,
  logging: false,
  entities: ["src/entity/**/*.ts"],
  migrations: [],
  subscribers: [],
});

export const LocalAppDataSource = new DataSource({
  type: "mysql",
  host: "127.0.0.1",
  port: 3306,
  username: "mfprogress",
  password: "M^cB9&u*2dw2",
  database: "mfprogress",
  synchronize: true,
  logging: false,
  entities: ["src/entity/**/*.ts"],
  migrations: [],
  subscribers: [],
});
