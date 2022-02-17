import "reflect-metadata";
import { createConnection, EntityTarget, Repository } from "typeorm";
import { validate } from "class-validator";
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

function generatePasswordToken(pw: string) {
  return jwt.sign(
    {
      data: pw,
    },
    "progress"
  );
}

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

function generateSuccess(message: string) {
  return { success: true, message: message };
}

function generateError(message: string) {
  return { success: false, message: message };
}

export {
  jwt,
  generatePasswordToken,
  getValidation,
  generateSuccess,
  generateError,
};
