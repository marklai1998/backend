import { getRepository } from "typeorm";
import { NextFunction, Request, Response } from "express";

import * as index from "../index";
import * as jwt from "../utils/JsonWebToken";

import { User } from "../entity/User";

export class UserController {
  private userRepository = getRepository(User);

  async register(request: Request, response: Response, next: NextFunction) {
    if (
      request.body.username === undefined ||
      request.body.password === undefined ||
      request.body.email === undefined
    ) {
      return index.generateError("Specify E-Mail, Username and Password");
    }

    let user = await this.userRepository.findOne({
      username: request.body.username,
    });

    if (user !== undefined) {
      return index.generateError("Username already exists");
    }

    user = new User();
    user.username = request.body.username;
    user.email = request.body.email;
    user.password = jwt.generateToken(
      request.body.password,
      jwt.secretInternal
    );

    this.userRepository.save(user);
    return index.generateSuccess("User registered", {
      user: jwt.generateToken(JSON.stringify(user), jwt.secretUserData),
    });
  }

  async login(request: Request, response: Response, next: NextFunction) {
    let user = await this.userRepository.findOne({
      username: request.body.username,
    });

    if (user === undefined) {
      return index.generateError("There is no user matching this username");
    }

    return jwt.jwt.verify(
      user.password,
      jwt.secretInternal,
      function (err, decoded) {
        if (err) {
          return index.generateError("Invalid Password");
        } else {
          if (decoded.data === request.body.password) {
            return index.generateSuccess("Login successful", {
              user: jwt.generateToken(JSON.stringify(user), jwt.secretUserData),
            });
          } else {
            return index.generateError("Invalid Password");
          }
        }
      }
    );
  }

  async generateAPIKey(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    if (request.body.uid === undefined) {
      return index.generateError("Specify the UID of the User");
    }

    let user = await this.userRepository.findOne({ uid: request.body.uid });

    if (user === undefined) {
      return index.generateError("User not found");
    }

    const key = index.generateUUID();
    user.apikey = key;

    this.userRepository.save(user);

    return index.generateSuccess("API Key created", {
      uid: user.uid,
      apikey: jwt.generateToken(key, jwt.secretInternal),
    });
  }

  async update(request: Request, response: Response, next: NextFunction) {
    if (
      request.body.uid === undefined ||
      request.body.type === undefined ||
      request.body.value === undefined
    ) {
      return index.generateError("Specify uid, type and value");
    }

    let user = await this.userRepository.findOne({ uid: request.body.uid });

    if (user === undefined) {
      return index.generateError("User not found");
    }

    user[request.body.type] = request.body.value;

    return index.getValidation(user, "User updated");
  }
}
