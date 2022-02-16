import { getRepository } from "typeorm";
import { NextFunction, Request, Response } from "express";
import { User } from "../entity/User";
import * as index from "../index";

export class UserController {
  private userRepository = getRepository(User);

  async register(request: Request, response: Response, next: NextFunction) {
    if (
      request.body.username === undefined ||
      request.body.password === undefined
    ) {
      return index.generateError("Specify Username and Password");
    }

    let user = await this.userRepository.findOne({
      username: request.body.username,
    });

    if (user !== undefined) {
      return index.generateError("Username already exists");
    }

    user = new User();
    user.username = request.body.username;
    user.password = index.generatePasswordToken(request.body.password);

    this.userRepository.save(user);
    return index.generateSuccess("User registered");
  }

  async login(request: Request, response: Response, next: NextFunction) {
    let user = await this.userRepository.findOne({
      username: request.body.username,
    });

    if (user === undefined) {
      return index.generateError("There is no user matching this username");
    }

    return index.jwt.verify(user.password, "progress", function (err, decoded) {
      if (err) {
        return index.generateError("Invalid Password");
      } else {
        if (decoded.data === request.body.password) {
          return index.generateSuccess("Login successful");
        } else {
          return index.generateError("Invalid Password");
        }
      }
    });
  }
}
