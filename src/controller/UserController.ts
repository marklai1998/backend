import * as index from "../index";
import * as jwt from "../utils/JsonWebToken";

import { NextFunction, Request, Response } from "express";

import Logger from "../utils/Logger";
import { mcRankToPermission, Permissions } from "../utils/Permissions";
import { User } from "../entity/User";
import { Colors, sendWebhook } from "../utils/DiscordMessageSender";
import { Registration } from "../entity/Registration";
import * as dbCache from "../utils/cache/DatabaseCache";

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
        Logger.warn(err);
        if (err) {
          return index.generateError("Invalid Password");
        } else {
          if (decoded.data === request.body.password) {
            Logger.info(`User logged in (${user.username})`);
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

  async register(request: Request, response: Response, next: NextFunction) {
    if (
      !request.body.username ||
      !request.body.password ||
      !request.body.discord
    ) {
      return index.generateError("Specify username, password and discord");
    }

    let registration = await Registration.findOne({
      username: request.body.username,
    });

    if (registration) {
      return index.generateError("Registration already running");
    }

    registration = new Registration();
    registration.username = request.body.username;
    registration.discord = request.body.discord;
    registration.password = jwt.jwt.sign(
      {
        data: jwt.jwt.verify(request.body.password, jwt.secretUserData),
      },
      jwt.secretInternal
    );
    registration.verification = generateVerificationKey();

    const res = await index.getValidation(
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
      return index.generateError("Missing verification key");
    }
    if (!request.body.uuid || !request.body.username || !request.body.rank) {
      return index.generateError("Specify UUID, username and rank");
    }

    const registration = await Registration.findOne({
      username: request.body.username,
    });

    if (!registration) {
      return index.generateError("No ongoing registration found");
    }
    if (registration.verification !== request.body.verification) {
      return index.generateError("Invalid verification key");
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
    user.apikey = index.generateUUID();
    Logger.info(
      `User created (${user.username}, Permission: ${user.permission})`
    );

    const res = await index.getValidation(user, "New user registered");

    if (!res.error) {
      registration.remove();

      const accepter = await User.findOne({
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
      return index.generateError("Accept value must be a boolean");
    }
    const reviewer = dbCache.findOne("users", {
      apikey: request.body.key || request.query.key,
    });
    if (!request.body.id && !(reviewer?.permission >= Permissions.moderator)) {
      return index.generateError("Specify registration id");
    }
    if (request.body.accept && !request.body.rank) {
      return index.generateError("Specify rank of player");
    }

    const registration = await Registration.findOne({ id: request.body.id });

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
      user.apikey = index.generateUUID();
      Logger.info(
        `User created (${user.username}, Permission: ${user.permission})`
      );

      const res = await index.getValidation(user, "Registration accepted");

      if (!res.error) {
        registration.remove();
      }

      return res;
    } else {
      registration.remove();
      return index.generateSuccess("Registration denied");
    }
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

    return await index.getValidation(user, "New user registered", {
      password: ssoPw,
      username: user.username,
    });
  }

  async getAll(request: Request, response: Response, next: NextFunction) {
    const userRaw = dbCache.find("users");
    const requester = dbCache.findOne("users", {
      apikey: request.body.key || request.query.key,
    });

    const users = [];
    for (const user of userRaw) {
      users.push(
        await user.toJson({
          showAPIKey: true,
          hasPermission: !requester
            ? false
            : requester.permission >= Permissions.moderator,
        })
      );
    }
    return users;
  }

  async getOne(request: Request, response: Response, next: NextFunction) {
    const user =
      dbCache.findOne("users", { uid: request.params.user }) ||
      dbCache.findOne("users", { username: request.params.user });
    const requester = dbCache.findOne("users", {
      apikey: request.body.key || request.query.key,
    });

    if (!user) {
      return index.generateError("User not found");
    }

    return await user.toJson({
      showAPIKey: true,
      hasPermission: !requester
        ? false
        : requester.permission >= Permissions.moderator,
    });
  }

  async update(request: Request, response: Response, next: NextFunction) {
    if (!request.body.uid || !request.body.values) {
      return index.generateError("Specify uid and values");
    }

    const key = request.body.key || request.query.key;
    const requester = dbCache.findOne("users", { apikey: key });
    const user = dbCache.findOne("users", { uid: request.body.uid });

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
          user[key] = jwt.jwt.sign(
            {
              data: jwt.jwt.verify(value, jwt.secretUserData),
            },
            jwt.secretInternal
          );
        }
        counter++;
        user.save();
      }
    }
    return index.generateSuccess(`Updated ${counter} columns`, {
      user: jwt.generateToken(JSON.stringify(user), jwt.secretUserData),
    });
  }
  async delete(request: Request, response: Response, next: NextFunction) {
    const user = await User.findOne({ uid: request.body.uid });

    if (!user) {
      return index.generateError("User not found");
    }
    Logger.warn("Deleting user " + user.username);
    await User.remove(user);
    dbCache.reload(user);
    return index.generateError("User deleted");
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
