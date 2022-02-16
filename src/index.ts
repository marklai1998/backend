import "reflect-metadata";
import { createConnection } from "typeorm";
import * as express from "express";
import * as bodyParser from "body-parser";
import * as jwt from "jsonwebtoken";
import { Request, Response } from "express";
import { Routes } from "./routes";
import { District } from "./entity/District";

const port = 8080;

createConnection()
  .then(async (connection) => {
    // create express app
    const app = express();
    app.use(bodyParser.json());

    // register express routes from defined application routes
    Routes.forEach((route) => {
      (app as any)[route.method](
        route.route,
        (req: Request, res: Response, next: Function) => {
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

    // setup express app here
    // ...

    // start express server
    app.listen(port);

    // insert new users for test
    /*await connection.manager.save(connection.manager.create(District, {
        name: "SoHo",
        parent: 0
    }));
    await connection.manager.save(connection.manager.create(User, {
        firstName: "Phantom",
        lastName: "Assassin",
        age: 24
    }));*/

    console.log(`Progress API running on port ${port}.`);
  })
  .catch((error) => console.log(error));

function generatePasswordToken(pw) {
  return jwt.sign(
    {
      data: pw,
    },
    "progress"
  );
}

function generateSuccess(message: string) {
  return { success: true, message: message };
}

function generateError(message: string) {
  return { success: false, message: message };
}

export { jwt, generatePasswordToken, generateSuccess, generateError };
