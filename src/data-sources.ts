import "reflect-metadata";
import { DataSource } from "typeorm";

const ormconfig = require("../ormconfig.json");

export const AppDataSource = new DataSource({
  type: "mysql",
  host: ormconfig.host,
  port: ormconfig.port,
  username: ormconfig.username,
  password: ormconfig.password,
  database: ormconfig.database,
  synchronize: true,
  logging: false,
  entities: ["src/entity/**/*.ts"],
  migrations: [],
  subscribers: [],
});

export const LocalAppDataSource = new DataSource({
  type: "mysql",
  host: "127.0.0.1",
  port: ormconfig.port,
  username: ormconfig.username,
  password: ormconfig.password,
  database: ormconfig.database,
  synchronize: true,
  logging: false,
  entities: ["src/entity/**/*.ts"],
  migrations: [],
  subscribers: [],
});
