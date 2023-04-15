import { NextFunction, Request, Response } from "express";
import jwt, { AUTH_SECRET } from "../utils/encryption/jwt";

import * as dbCache from "../utils/cache/DatabaseCache";
import { check } from "../utils/encryption/bcrypt";
import responses from "../responses";
import { User } from "../entity/User";

export async function loginUser(username: string, password: string) {
  let user = await User.findOneBy({ username: username });
  let old = false;

  if (!user) {
    user = await User.findOneBy({ old_username: username });

  if (!user) {
    return responses.error({
      message: "Invalid username or password",
      code: 401,
    });
  }
    old = true;
  }

  if (await check(password, user.password)) {
    if (old) {
      return responses.error({
        message:
          "It looks like your username has changed. Try your new Minecraft username!",
        code: 401,
      });
    }
    return responses.success({
      message: "Login successful",
      code: 200,
      data: {
        token: jwt.sign({ uid: user.uid }, AUTH_SECRET),
        user: user.toJson({ hasPermission: true }),
      },
    });
  }
  return responses.error({
    message: "Invalid username or password",
    code: 401,
  });
}

async function auth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ");

  if (!token || token[0] != "Bearer") {
    // @ts-ignore
    req.user = {};
    return next();
  }

  req.token = token[1];

  jwt.verify(token[1], AUTH_SECRET, async (err: any, auth: any) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        res
          .status(403)
          .send(responses.error({ message: "Token expired", code: 403 }));
        return next();
      }
      // @ts-ignore
      req.user = {};
      return next();
    }
    const user = dbCache.findOne(User, { uid: auth.uid });

    req.user = user;
    return next();
  });
}

export function allowed({
  permission = 0,
  requiredArgs,
  optionalArgs,
  req,
  res,
  callback,
}: {
  permission?: number;
  requiredArgs?: object;
  optionalArgs?: object;
  req: Request;
  res: Response;
  callback: () => void;
}): void {
  if (permission <= 0) {
    callback();
    return;
  }

  const user = req.user;
  if (!user) {
    res.status(401).send({ error: "Unauthorized" });
    return;
  }

  if (permission <= user.permission) {
    checkArgs(req.body, res, requiredArgs, optionalArgs, callback);
    return;
  }
  res.status(403).send({ error: "Forbidden" });
}

function checkArgs(
  body: object,
  res: Response,
  required: object,
  optional: object,
  callback: () => void
): void {
  // Check required arguments
  if (required) {
    for (const [key, value] of Object.entries(required)) {
      if (body[key] === undefined || body[key] === null) {
        res
          .status(400)
          .send({ error: `Required body key '${key}' is missing` });
        return;
      }
      if (value !== "any" && typeof body[key] !== value) {
        res
          .status(400)
          .send({ error: `The body key '${key}' must be of type '${value}'` });
        return;
      }
    }
  }
  // Check optional arguments
  if (optional) {
    for (const [key, value] of Object.entries(optional)) {
      if (!body[key]) {
        continue;
      }
      if (typeof body[key] !== value) {
        res
          .status(400)
          .send({ error: `The body key '${key}' must be of type '${value}'` });
      }
    }
  }
  callback();
}

export default auth;
