import "reflect-metadata";

import * as bodyParser from "body-parser";
import * as date from "./utils/TimeUtils";
import * as dbCache from "./utils/cache/DatabaseCache";
import * as express from "express";
import * as sockets from "./sockets/SocketManager";

import { AppDataSource, LocalAppDataSource } from "./data-sources";
import { Colors, sendWebhook } from "./utils/DiscordMessageSender";
import { Request, Response } from "express";
import createRouter, { router } from "express-file-routing";

import { AdminSetting } from "./entity/AdminSetting";
import { AdminSettings } from "./adminsettings";
import Logger from "./utils/Logger";
import { Routes } from "./routes";
import { User } from "./entity/User";
import auth from "./middleware/auth";
import { connectToDatabases } from "./utils/DatabaseConnector";
import { createServer } from "http";
import { hash } from "./utils/encryption/bcrypt";
import response from "./middleware/response";
import responses from "./responses";
import { v4 as uuidv4 } from "uuid";

// Increase EventEmitter limit
require("events").EventEmitter.prototype._maxListeners = 20;

var cors = require("cors");
var helmet = require("helmet");
var fetch = require("node-fetch");
const port = process.env.PORT || 8080;
const productionMode = process.argv.slice(2)[0] === "--i";
const localDatabase = process.argv.slice(2)[0] === "--local";
const cache = require("./cache");

Logger.debug(`Connecting to ${localDatabase ? "local" : "main"} database...`);
(localDatabase ? LocalAppDataSource : AppDataSource)
  .initialize()
  .then(async (connection) => {
    Logger.debug(`Connected to ${localDatabase ? "local" : "main"} database`);

    if (!localDatabase) {
      connectToDatabases();
    }

    // create express app
    const app = express();
    app.use(bodyParser.json());
    app.use(helmet());
    app.use(cors());
    app.use("/v1/", auth);
    app.use("/", (req, res, next) => {
      Logger.http(
        // @ts-ignore
        `${req.method} ${req.path}${req.user ? ` (${req.user.username})` : ""}`
      );
      next();
    });
    app.use("/v1/", response); // Format Response, TODO: enable for all routes if frontend is updated
    app.use("/", router());

    createRouter(app);

    const httpServer = createServer(app);

    Logger.debug("Loading cache...");
    cache.loadDefaults();
    await dbCache.loadAll();
    setInterval(dbCache.loadAll, 60000 * 15);

    sockets.init(httpServer);

    Logger.debug("Loaded middlewares");
    process.on("uncaughtException", (error) => handleException(error));

    // register express routes from defined application routes
    Logger.debug("Registering routes...");
    // Routes.forEach((route) => {
    //   (app as any)[route.method](
    //     route.route,
    //     async (req: Request, res: Response, next: Function) => {
    //       const time = new Date().getTime();
    //       let user = dbCache.findOne(User, {
    //         apikey: req.body.key || req.query.key,
    //       });
    //       try {
    //         cache.inc("total_requests");
    //         Logger.http(
    //           `${req.method} ${req.path}${user ? ` (${user.username})` : ""}`
    //         );
    //         if (route.permission > 0) {
    //           if (user === undefined) {
    //             handleResponse(
    //               responses.error({
    //                 message: "Invalid or missing API-Key",
    //                 code: 401,
    //               }),
    //               req,
    //               res
    //             );
    //             Logger.info("Requested with invalid API-Key");
    //             return;
    //           }
    //           if (user.permission < route.permission) {
    //             handleResponse(
    //               responses.error({
    //                 message: "No Permission",
    //                 code: 403,
    //               }),
    //               req,
    //               res
    //             );
    //             Logger.info("Requested without Permission");
    //             return;
    //           }
    //         }
    //         const result = new (route.controller as any)()[route.action](
    //           req,
    //           res,
    //           next
    //         );
    //         handleResponse(result, req, res, time);
    //         cache.inc("successful_requests");
    //       } catch (err) {
    //         cache.inc("errors");
    //         Logger.error(err);
    //       }
    //     }
    //   );
    // });
    app.get("*", (req: Request, res: Response) => {
      handleResponse(
        responses.error({ message: `Cannot GET ${req.path}`, code: 404 }),
        req,
        res
      );
    });
    Logger.debug("Registered routes");

    // Create root user
    let root = await User.findOneBy({ username: "root" });
    if (root === undefined) {
      Logger.debug("Creating root user...");
      await connection.manager.save(
        connection.manager.create(User, {
          username: "root",
          permission: 4,
          discord: "Root#1234",
          about:
            "The Root user of the Website, only for development use. Please always use your right user.",
          image:
            "https://cdn.discordapp.com/attachments/714797791913705472/831352332163350603/2021-04-12_19.11.21.png",
          picture:
            "https://i.picsum.photos/id/568/200/300.jpg?hmac=vQmkZRQt1uS-LMo2VtIQ7fn08mmx8Fz3Yy3lql5wkzM",
          password: await hash("Progress2022"),
          apikey: generateUUID(),
        })
      );
      Logger.debug("Created root user");
    }

    // Set default admin settings
    let settings = await AdminSetting.find();
    AdminSettings.forEach(async (setting) => {
      if (!settings.some((e) => e.key === setting.key)) {
        Logger.debug(`Creating default setting ${setting.key}`);
        const adminSetting = new AdminSetting();
        adminSetting.key = setting.key;
        adminSetting.value = JSON.stringify(setting.value);
        adminSetting.permission = setting.permission;
        await adminSetting.save();
      }
    });
    if (productionMode) {
      Logger.info("Running with Intervalls");
      date.startIntervals();
    } else {
      Logger.info("Running without Intervalls");
    }
    // start express server
    httpServer.listen(port);
    Logger.info(`Server started on port ${port}`);
  })
  .catch((error) => {
    // create express app
    const app = express();
    app.use(bodyParser.json());
    app.use(helmet());
    app.use(cors());

    const httpServer = createServer(app);

    sockets.init(httpServer);

    Logger.debug("Loaded middleware");

    // register express routes from defined application routes
    Logger.debug("Registering routes...");
    app.use("*", (req: Request, res: Response) => {
      handleResponse(
        responses.error({
          message: "Database is offline. Try again later",
          code: 500,
        }),
        req,
        res
      );
    });
    Logger.debug("Registered routes");
    Logger.error(error);
    // start express server
    httpServer.listen(port);
    Logger.info("Running without Intervalls");
    Logger.info(`Server started on port ${port}`);
  });

export function generateUUID() {
  return uuidv4();
}

export { fetch, port, productionMode };

function trackResponseTime(route: string, time: number) {
  const response_times = cache.get("response_time");
  let route_time = response_times.find((e: any) => e.route === route);
  if (!route_time) {
    response_times.push({
      route: route,
      times: [],
    });
    route_time = response_times.at(-1);
  }
  route_time.times.push(time);
  cache.set("response_time", response_times);
}

function handleException(error) {
  cache.inc("errors");
  Logger.error(error.stack);

  if (productionMode) {
    sendWebhook("error_log", {
      content: "",
      embeds: [
        {
          title: "Backend Error Occurred",
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
              value: error.name,
              inline: true,
            },
            {
              name: "Message",
              value: error.message,
              inline: true,
            },
            {
              name: "‎",
              value: "‎",
              inline: true,
            },
            {
              name: "Stacktrace",
              value: error.stack,
              inline: false,
            },
          ],
        },
      ],
    });
  }
}

function handleResponse(
  result: any,
  req: Request,
  res: Response,
  time?: number
) {
  if (result instanceof Promise) {
    result.then((result) => {
      handleResponse(result, req, res, time);
    });
  } else if (result !== null && result !== undefined) {
    res.status(result.code || 200).json(result);
    if (time) {
      const neededTime = new Date().getTime() - time;
      trackResponseTime(req.route.path, neededTime);
    }
  }
}
