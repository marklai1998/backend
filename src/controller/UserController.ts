import { NextFunction, Request, Response } from "express";

import * as index from "../index";
import * as jwt from "../utils/JsonWebToken";

import { User } from "../entity/User";
import { MinecraftUser } from "../entity/MinecraftUser";

export class UserController {
  async register(request: Request, response: Response, next: NextFunction) {
    if (
      !request.body.username ||
      !request.body.password ||
      !request.body.email
    ) {
      return index.generateError("Specify E-Mail, Username and Password");
    }

    let user = await User.findOne({
      username: request.body.username,
    });

    if (user) {
      return index.generateError("Username already exists");
    }

    user = new User();
    user.username = request.body.username;
    user.email = request.body.email;
    user.password = jwt.generateToken(
      request.body.password,
      jwt.secretInternal
    );

    user.save();
    return index.generateSuccess("User registered", {
      user: jwt.generateToken(JSON.stringify(user), jwt.secretUserData),
    });
  }

  async login(request: Request, response: Response, next: NextFunction) {
    const user = await User.findOne({
      username: request.body.username,
    });

    if (!user) {
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

  async getAll(request: Request, response: Response, next: NextFunction) {
    const userRaw = await User.find();

    const users = [];
    for (const user of userRaw) {
      users.push(await user.toJson({ showAPIKey: true }));
    }
    return index.generateSuccess(undefined, users);
  }

  async getOne(request: Request, response: Response, next: NextFunction) {
    const user =
      (await User.findOne({ uid: request.params.user })) ||
      (await User.findOne({ username: request.params.user }));

    if (!user) {
      return index.generateError("User not found");
    }

    return index.generateSuccess(
      undefined,
      await user.toJson({ showAPIKey: true })
    );
  }

  async generateAPIKey(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    if (!request.body.uid) {
      return index.generateError("Specify the UID of the User");
    }

    const user = await User.findOne({ uid: request.body.uid });

    if (!user) {
      return index.generateError("User not found");
    }

    const key = index.generateUUID();
    user.apikey = key;

    user.save();

    return index.generateSuccess("API Key created", {
      uid: user.uid,
      apikey: jwt.generateToken(key, jwt.secretInternal),
    });
  }

  async update(request: Request, response: Response, next: NextFunction) {
    if (!request.body.uid || !request.body.type || !request.body.value) {
      return index.generateError("Specify uid, type and value");
    }

    const user = await User.findOne({ uid: request.body.uid });

    if (!user) {
      return index.generateError("User not found");
    }

    if (user[request.body.type] === undefined) {
      return index.generateError("Invalid type");
    }

    user[request.body.type] = request.body.value;

    return index.getValidation(user, "User updated");
  }
}
