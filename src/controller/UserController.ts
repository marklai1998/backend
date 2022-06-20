import * as index from "../index";
import * as jwt from "../utils/JsonWebToken";

import { NextFunction, Request, Response } from "express";

import Logger from "../utils/Logger";
import { Permissions } from "../utils/Permissions";
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
        Logger.warn("Login error: ");
        Logger.warn(err)
        if (err) {
          return index.generateError("Invalid Password");
        } else {
          if (decoded.data === request.body.password) {
            Logger.info(`User logged in (${user.username})`)
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
    const ssoPw = generatePassword(8, 16);
    user = new User();
    user.email = request.body.email;
    user.username = request.body.username;
    user.permission = request.body.permission ?? 1;
    user.rank = request.body.rank || null;
    user.discord = request.body.discord || null;
    user.about = "";
    user.picture = "";
    user.image = "";
    user.settings = "{}";
    user.password = jwt.generateToken(ssoPw, jwt.secretInternal);
    user.apikey = index.generateUUID();
    Logger.info(`User created (${user.username}, Permission: ${user.permission})`)

    return await index.getValidation(user, "New user registered", {
      password: ssoPw,
      username: user.username,
    });
  }

  async getAll(request: Request, response: Response, next: NextFunction) {
    const userRaw = await User.find();

    const requester = await User.findOne({
      apikey: request.body.key || request.query.key,
    });

    const users = [];
    for (const user of userRaw) {
      users.push(
        await user.toJson({
          showAPIKey: true,
          hasPermission: !requester ? false : requester.permission >= Permissions.moderator,
        })
      );
    }
    return users;
  }

  async getOne(request: Request, response: Response, next: NextFunction) {
    const user =
      (await User.findOne({ uid: request.params.user })) ||
      (await User.findOne({ username: request.params.user }));

    const requester = await User.findOne({
      apikey: request.body.key || request.query.key,
    });

    if (!user) {
      return index.generateError("User not found");
    }

    return await user.toJson({
      showAPIKey: true,
      hasPermission: !requester ? false : requester.permission >= Permissions.moderator,
    });
  }

  async update(request: Request, response: Response, next: NextFunction) {
    if (!request.body.uid || !request.body.values) {
      return index.generateError("Specify uid and values");
    }

    const key = request.body.key || request.query.key;
    const requester = await User.findOne({ apikey: key });
    const user = await User.findOne({ uid: request.body.uid });
    
    if (
      requester.permission < Permissions.admin &&
      requester.apikey !== user.apikey
    ) {
      return index.generateError("No permission");
    }

    if (!user) {
      return index.generateError("User not found");
    }

    let counter = 0;
    for (const [key, value] of Object.entries(request.body.values)) {

      if (user[key] !== undefined) {
        Logger.info("Editing user " + user.username + " (" + key.toLocaleUpperCase()+": "+user[key]+" -> "+value+")");
        user[key] = value;
        counter++;
      }
    }

    return index.getValidation(user, `${counter} columns updated`);
  }
  async delete(request: Request, response: Response, next: NextFunction) {
    const user = await User.findOne({ uid: request.body.uid });
    
    if (!user) {
      return index.generateError("User not found");
    }
    Logger.warn("Deleting user " + user.username);
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
