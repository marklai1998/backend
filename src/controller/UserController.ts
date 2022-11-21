import { generateUUID } from "../index";
import * as jwt from "../utils/JsonWebToken";

import { NextFunction, Request, Response } from "express";

import Logger from "../utils/Logger";
import { mcRankToPermission, Permissions } from "../utils/Permissions";
import { User } from "../entity/User";
import { Colors, sendWebhook } from "../utils/DiscordMessageSender";
import { Registration } from "../entity/Registration";
import * as dbCache from "../utils/cache/DatabaseCache";
import responses from "../responses";
import { check, hash } from "../utils/encryption/bcrypt";

export class UserController {
  async login(request: Request, response: Response, next: NextFunction) {
    if (!request.body.username || !request.body.password) {
      return responses.error({
        message: "Specify username and password",
        code: 400,
      });
    }
    const user = await User.findOneBy({
      username: request.body.username,
    });

    if (!user) {
      return responses.error({
        message: "Invalid username or password",
        code: 404,
      });
    }

    if (await check(request.body.password, user.password)) {
      return responses.success({
        message: "Login successful",
        data: {
          user: jwt.generateToken(JSON.stringify(user), jwt.secretUserData),
        },
      });
    }
    return responses.error({
      message: "Invalid username or password",
      code: 404,
    });
  }

  async register(request: Request, response: Response, next: NextFunction) {
    if (
      !request.body.username ||
      !request.body.password ||
      !request.body.discord
    ) {
      return responses.error({
        message: "Specify username, password and discord",
        code: 400,
      });
    }

    let registration = await Registration.findOneBy({
      username: request.body.username,
    });

    if (registration) {
      return responses.error({
        message: "Registration already running",
        code: 400,
      });
    }

    registration = new Registration();
    registration.username = request.body.username;
    registration.discord = request.body.discord;
    registration.password = await hash(request.body.password);
    registration.verification = generateVerificationKey();

    const res = await responses.validate(
      registration,
      "New Registration started",
      {
        key: jwt.generateToken(registration.verification, jwt.secretUserData),
      }
    );

    if (!res.error) {
      sendWebhook("user_log", {
        content: "",
        embeds: [
          {
            title: "New Account requested",
            description: "",
            color: Colors.Yellow,
            timestamp: new Date().toISOString(),
            footer: {
              text: "MineFact Network",
              icon_url:
                "https://cdn.discordapp.com/avatars/422633274918174721/7e875a4ccb7e52097b571af1925b2dc1.png",
            },
            thumbnail: {
              url: "https://mc-heads.net/avatar/" + registration.username,
            },
            fields: [
              {
                name: "Username",
                value: registration.username || "---",
                inline: true,
              },
              {
                name: "Discord",
                value: registration.discord || "---",
                inline: true,
              },
            ],
          },
        ],
      });
    }

    return res;
  }

  async verifyRegistration(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    if (!request.body.verification) {
      return responses.error({
        message: "Missing verification key",
        code: 400,
      });
    }
    if (!request.body.uuid || !request.body.username || !request.body.rank) {
      return responses.error({
        message: "Specify UUID, username and rank",
        code: 400,
      });
    }

    const registration = await Registration.findOneBy({
      username: request.body.username,
    });

    if (!registration) {
      return responses.error({
        message: "No ongoing registration found",
        code: 404,
      });
    }
    if (registration.verification !== request.body.verification) {
      return responses.error({
        message: "Invalid verification key",
        code: 400,
      });
    }

    // TODO: enable again if plugin is ready

    // const minecraft = await MinecraftUser.findOne({ uuid: request.body.uuid });

    // if (!minecraft) {
    //   return index.generateError("Minecraft user not found");
    // }

    const user = new User();
    user.email = `${request.body.username}@gmail.com`;
    user.username = request.body.username;
    user.permission = mcRankToPermission(request.body.rank);
    user.rank = request.body.rank;
    user.discord = registration.discord;
    //user.minecraft = minecraft;
    user.about = "";
    user.picture = "";
    user.image = "";
    user.settings = "{}";
    user.password = registration.password;
    user.apikey = generateUUID();
    Logger.info(
      `User created (${user.username}, Permission: ${user.permission})`
    );

    const res = await responses.validate(user, "New user registered");

    if (!res.error) {
      registration.remove();

      const accepter = await User.findOneBy({
        apikey: request.body.apikey || request.params.apikey,
      });

      sendWebhook("user_log", {
        content: "",
        embeds: [
          {
            title: "Account accepted",
            description: "",
            color: Colors.Green,
            timestamp: new Date().toISOString(),
            footer: {
              text: "MineFact Network",
              icon_url:
                "https://cdn.discordapp.com/avatars/422633274918174721/7e875a4ccb7e52097b571af1925b2dc1.png",
            },
            thumbnail: {
              url: "https://mc-heads.net/avatar/" + registration.username,
            },
            fields: [
              {
                name: "Username",
                value: registration.username || "---",
                inline: true,
              },
              {
                name: "Discord",
                value: registration.discord || "---",
                inline: true,
              },
              {
                name: "Rank",
                value: request.body.rank || "---",
                inline: true,
              },
              {
                name: "Accepted by",
                value: accepter.username || "---",
                inline: true,
              },
            ],
          },
        ],
      });
    }

    return res;
  }

  async getRegistrations(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    const registrationsRaw = await Registration.find();

    const registrations = [];
    for (const registration of registrationsRaw) {
      registrations.push(registration.toJson());
    }

    return registrations;
  }

  async handleRegistration(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    if (typeof request.body.accept !== "boolean") {
      return responses.error({
        message: "Accept value must be a boolean",
        code: 400,
      });
    }
    const reviewer = dbCache.findOne("users", {
      apikey: request.body.key || request.query.key,
    });
    if (!request.body.id && !(reviewer?.permission >= Permissions.moderator)) {
      return responses.error({ message: "Specify registration id", code: 400 });
    }
    if (request.body.accept && !request.body.rank) {
      return responses.error({ message: "Specify rank of player", code: 400 });
    }

    const registration = await Registration.findOneBy({ id: request.body.id });

    if (!registration) {
      return responses.error({
        message: "No registration found with the specified ID",
        code: 404,
      });
    }

    if (request.body.accept) {
      // Create new user
      const user = new User();
      user.email = `${registration.username}@gmail.com`;
      user.username = registration.username;

      user.permission = mcRankToPermission(request.body.rank);
      user.rank = request.body.rank;
      user.discord = registration.discord;
      //user.minecraft = minecraft;
      user.about = "";
      user.picture = "";
      user.image = "";
      user.settings = "{}";
      user.password = registration.password;
      user.apikey = generateUUID();
      Logger.info(
        `User created (${user.username}, Permission: ${user.permission})`
      );

      const res = await responses.validate(user, "Registration accepted");

      if (!res.error) {
        registration.remove();
      }

      return res;
    } else {
      registration.remove();
      return responses.success({ message: "Registration denied" });
    }
  }

  async create(request: Request, response: Response, next: NextFunction) {
    if (!request.body.username || !request.body.email) {
      return responses.error({
        message: "Specify Email and Username",
        code: 400,
      });
    }

    let user =
      (await User.findOneBy({ email: request.body.email })) ||
      (await User.findOneBy({ username: request.body.username }));

    if (user) {
      return responses.error({
        message: "Email or username already in use",
        code: 400,
      });
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
    user.password = await hash(ssoPw);
    user.apikey = generateUUID();
    Logger.info(
      `User created (${user.username}, Permission: ${user.permission})`
    );

    sendWebhook("user_log", {
      content: "",
      embeds: [
        {
          title: "New User created",
          description: "",
          color: Colors.Green,
          timestamp: new Date().toISOString(),
          footer: {
            text: "MineFact Network",
            icon_url:
              "https://cdn.discordapp.com/avatars/422633274918174721/7e875a4ccb7e52097b571af1925b2dc1.png",
          },
          thumbnail: {
            url: "https://mc-heads.net/avatar/" + user.username,
          },
          fields: [
            {
              name: "Username",
              value: user.username || "---",
              inline: true,
            },
            {
              name: "Discord",
              value: user.discord || "---",
              inline: true,
            },
            {
              name: "Rank",
              value: user.rank || "---",
              inline: true,
            },
            {
              name: "Initial Password",
              value: ssoPw || "---",
              inline: true,
            },
          ],
        },
      ],
    });

    return await responses.validate(user, "New user registered", {
      password: ssoPw,
      username: user.username,
    });
  }

  async getAll(request: Request, response: Response, next: NextFunction) {
    const userRaw = dbCache.find("users");
    const requester = dbCache.findOne("users", {
      apikey: request.body.key || request.query.key,
    });

    return userRaw.map((user: any) =>
      user.toJson({
        showAPIKey: true,
        hasPermission: !requester
          ? false
          : requester.permission >= Permissions.moderator,
      })
    );
  }

  async getOne(request: Request, response: Response, next: NextFunction) {
    const user =
      dbCache.findOne("users", { uid: request.params.user }) ||
      dbCache.findOne("users", { username: request.params.user });
    const requester = dbCache.findOne("users", {
      apikey: request.body.key || request.query.key,
    });

    if (!user) {
      return responses.error({ message: "User not found", code: 404 });
    }

    return user.toJson({
      showAPIKey: true,
      hasPermission: !requester
        ? false
        : requester.permission >= Permissions.moderator,
    });
  }

  async update(request: Request, response: Response, next: NextFunction) {
    if (!request.body.uid || !request.body.values) {
      return responses.error({ message: "Specify uid and values", code: 400 });
    }

    const key = request.body.key || request.query.key;
    const requester = dbCache.findOne("users", { apikey: key });
    const user = dbCache.findOne("users", { uid: request.body.uid });

    if (
      requester.permission < Permissions.admin &&
      requester.apikey !== user.apikey
    ) {
      return responses.error({ message: "No Permission", code: 403 });
    }

    if (!user) {
      return responses.error({ message: "User not found", code: 404 });
    }

    let counter = 0;
    for (const [key, value] of Object.entries(request.body.values)) {
      if (user[key] !== undefined) {
        if (key != "password") {
          Logger.info(
            "Editing user " +
              user.username +
              " (" +
              key.toLocaleUpperCase() +
              ": " +
              user[key] +
              " -> " +
              value +
              ")"
          );
          user[key] = value;
          user.save();
          Logger.debug("changed to " + user[key]);
        } else {
          Logger.info(
            "Editing user " +
              user.username +
              " (" +
              key.toLocaleUpperCase() +
              ")"
          );
          user[key] = await hash(value as string);
        }
        counter++;
        user.save();
      }
    }
    return responses.success({
      message: `Updated ${counter} columns`,
      data: {
        user: jwt.generateToken(JSON.stringify(user), jwt.secretUserData),
      },
    });
  }
  async delete(request: Request, response: Response, next: NextFunction) {
    const user = await User.findOneBy({ uid: request.body.uid });

    if (!user) {
      return responses.error({ message: "User not found", code: 404 });
    }
    Logger.warn("Deleting user " + user.username);
    await User.remove(user);
    dbCache.reload(user);
    return responses.success({ message: "User deleted" });
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

function generateVerificationKey(): string {
  let key = "";
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

  for (let i = 0; i < 5; i++) {
    key += charset.charAt(Math.floor(Math.random() * charset.length));
  }

  return key;
}
