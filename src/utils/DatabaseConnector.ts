import Logger from "./Logger";

const mysql = require("mysql");
const ormconfig = require("../../ormconfig.json");

const DATABASE_NAMES = {
  terrabungee: "terrabungee",
  minefact: "MineFactServernetzwerk",
};

const DATABASES: any = {};

function connectToDatabases() {
  Logger.debug("Connecting to BuildTheEarth Databases...");
  Object.values(DATABASE_NAMES).forEach((db) => connectToDatabase(db));
}

function connectToDatabase(db: string) {
  if (DATABASES[db]) {
    Logger.warn(`Reconnecting to ${db} Database`);
  }
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

export { DATABASES, DATABASE_NAMES, connectToDatabase, connectToDatabases };
