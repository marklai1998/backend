import { Colors, sendWebhook } from "./DiscordMessageSender";
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

  DATABASES[db].on("error", (err) => {
    this.core.getLogger().error(`MySQL error: ${err}`);
    sendWebhook("error_log", {
      content: "",
      embeds: [
        {
          title: "Database Error Occurred",
          description: "",
          color: Colors.Error,
          timestamp: new Date().toISOString(),
          footer: {
            text: "MineFact Network",
            icon_url:
              "https://cdn.discordapp.com/avatars/422633274918174721/7e875a4ccb7e52097b571af1925b2dc1.png",
          },
          fields: [
            {
              name: "Name",
              value: err.code,
              inline: true,
            },
            {
              name: "Message",
              value: "Please verify if the automatic reconnect was successful!",
              inline: true,
            },
          ],
        },
      ],
    });

    if (err.code === "ECONNRESET") {
      // Reconnect if the connection is lost
      DATABASES[db].connect();
    } else {
      throw err;
    }
  });

  Logger.debug(`Connected to ${db} Database`);
}

export { DATABASES, DATABASE_NAMES, connectToDatabase, connectToDatabases };
