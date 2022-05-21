import * as index from "../index";
import * as jwt from "../utils/JsonWebToken";

import { NextFunction, Request, Response } from "express";

import { User } from "../entity/User";

export class UserController {
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

  async create(request: Request, response: Response, next: NextFunction) {
    if (!request.body.username || !request.body.email) {
      return index.generateError("Specify Email and Username");
    }

    let user =
      (await User.findOne({ email: request.body.email })) ||
      (await User.findOne({ username: request.body.username }));

    if (user) {
      return index.generateError("Email or username already in use");
    }
    const ssoPw =
      generatePassword(8, 16);
    user = new User();
    user.email = request.body.email;
    user.username = request.body.username;
    user.permission = 1;
    user.about = "";
    user.picture = "";
    user.image = "";
    user.settings = "{}";
    user.password = jwt.generateToken(
      ssoPw,
      jwt.secretInternal
    );
    user.apikey = index.generateUUID();

    return await index.getValidation(user, "New user registered", { password: ssoPw, username: user.username });
  }

  async getAll(request: Request, response: Response, next: NextFunction) {
    const userRaw = await User.find();

    const users = [];
    for (const user of userRaw) {
      users.push(await user.toJson({ showAPIKey: true }));
    }
    return users;
  }

  async getOne(request: Request, response: Response, next: NextFunction) {
    const user =
      (await User.findOne({ uid: request.params.user })) ||
      (await User.findOne({ username: request.params.user }));

    if (!user) {
      return index.generateError("User not found");
    }

    return await user.toJson({ showAPIKey: true });
  }

  async update(request: Request, response: Response, next: NextFunction) {
    if (!request.body.uid || !request.body.values) {
      return index.generateError("Specify uid and values");
    }

    const user = await User.findOne({ uid: request.body.uid });

    if (!user) {
      return index.generateError("User not found");
    }

    let counter = 0;
    for (const [key, value] of Object.entries(request.body.values)) {
      if (user[key] !== undefined) {
        user[key] = value;
        counter++;
      }
    }

    return index.getValidation(user, `${counter} columns updated`);
  }
  async delete(request: Request, response: Response, next: NextFunction) {
    const user = await User.findOne({ uid: request.body.uid })
    console.log(request.body.uid)

    if (!user) {
      return index.generateError("User not found");
    }

    return await User.remove(user);
  }
}

function generatePassword(min: number, max: number): string {
  let password = "";
  const length = Math.random() * (max - min) + min;
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?#_-§$%&";

  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }

  return password;
}
