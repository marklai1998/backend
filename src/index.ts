import "reflect-metadata";

import * as bodyParser from "body-parser";
import * as express from "express";
import { v4 as uuidv4 } from "uuid";
import * as jwt from "./utils/JsonWebToken";

import { Repository, createConnection } from "typeorm";
import { Request, Response } from "express";

import { User } from "./entity/User";
import { Routes } from "./routes";
import { validate } from "class-validator";

var cors = require("cors");
var helmet = require("helmet");

const port = 8080;

createConnection()
  .then(async (connection) => {
    // create express app
    const app = express();
    app.use(bodyParser.json());
    app.use(helmet());
    app.use(cors());

    // register express routes from defined application routes
    Routes.forEach((route) => {
      (app as any)[route.method](
        route.route,
        async (req: Request, res: Response, next: Function) => {
          if (route.permission > 0) {
            let user = await User.findOne({
              apikey: req.body.key || req.query.key,
            });
            if (user === undefined) {
              res.send(generateError("Invalid or missing API-Key"));
              return;
            }
            if (user.permission < route.permission) {
              res.send(generateError("No permission"));
              return;
            }
          }
          const result = new (route.controller as any)()[route.action](
            req,
            res,
            next
          );
          if (result instanceof Promise) {
            result.then((result) =>
              result !== null && result !== undefined
                ? res.send(result)
                : undefined
            );
          } else if (result !== null && result !== undefined) {
            res.json(result);
          }
        }
      );
    });

    // Create root user
    let root = await User.findOne({ username: "root" });
    if (root === undefined) {
      await connection.manager.save(
        connection.manager.create(User, {
          email: "root@roo.com",
          username: "root",
          permission: 4,
          discord: "Root#1234",
          about:
            "The Root user of the Website, only for development use. Please always use your right user.",
          image:
            "https://cdn.discordapp.com/attachments/714797791913705472/831352332163350603/2021-04-12_19.11.21.png",
          picture:
            "https://i.picsum.photos/id/568/200/300.jpg?hmac=vQmkZRQt1uS-LMo2VtIQ7fn08mmx8Fz3Yy3lql5wkzM",
          password: jwt.generateToken("Progress2022", jwt.secretInternal),
          apikey: generateUUID(),
        })
      );
    }

    // start express server
    app.listen(port);
    console.log(`Progress API running on port ${port}.`);
  })
  .catch((error) => console.log(error));

async function getValidation(
  object: object,
  repo: Repository<any>,
  successMessage: string
) {
  const errors = await validate(object);

  if (errors.length > 0) {
    return generateError(Object.values(errors[0].constraints)[0]);
  }
  repo.save(object);
  return generateSuccess(successMessage);
}

function generateSuccess(message: string, data?: object) {
  return { success: true, message: message, data };
}

function generateError(message: string) {
  return { success: false, message: message };
}

function generateUUID() {
  return uuidv4();
}

export { getValidation, generateSuccess, generateError, generateUUID };
