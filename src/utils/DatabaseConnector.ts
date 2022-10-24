import Logger from "./Logger";

const mysql = require("mysql");
const ormconfig = require("../../ormconfig.json");

const DATABASE_NAMES = ["terrabungee", "MineFactServernetzwerk"];
const DATABASES: any = {};

function connectToDatabases() {
  Logger.debug("Connecting to BuildTheEarth Databases...");
  for (const db of DATABASE_NAMES) {
    DATABASES[db] = mysql.createConnection({
      host: ormconfig.host,
      port: ormconfig.port,
      user: ormconfig.username,
      password: ormconfig.password,
      database: db,
    });
    DATABASES[db].connect();
    Logger.debug(`Connected to ${db} Database`);
  }
}

export { DATABASES, connectToDatabases };
