import { NextFunction, Request, Response } from "express";
import jwt, { AUTH_SECRET } from "../utils/encryption/jwt";

import * as dbCache from "../utils/cache/DatabaseCache";
import { check } from "../utils/encryption/bcrypt";
import responses from "../responses";

export async function loginUser(username: string, password: string) {
  const user = dbCache.findOne("users", { username: username });

  if (!user) {
    return responses.error({
      message: "Invalid username or password",
      code: 401,
    });
  }

  if (await check(password, user.password)) {
    return responses.success({
      message: "Login successful",
      code: 200,
      data: {
        token: jwt.sign({ uid: user.uid }, AUTH_SECRET, { expiresIn: "30d" }),
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
    /*res
      .status(401)
      .send(responses.error({ message: "Unauthorized", code: 401 }));*/
    //@ts-ignore
    req.user = {};
    return next();
  }

  //@ts-ignore
  req.token = token[1];

  jwt.verify(token[1], AUTH_SECRET, async (err: any, auth: any) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        res
          .status(403)
          .send(responses.error({ message: "Token expired", code: 403 }));
        return next();
      }
      /*res
        .status(403)
        .send(responses.error({ message: "Forbidden", code: 403 }));*/
      //@ts-ignore
      req.user = {};
      return next();
    }
    const user = dbCache.findOne("users", { uid: auth.uid });

    // @ts-ignore
    req.user = user;
    return next();
  });
}

export async function allowed(
  permission: number,
  req: Request,
  res: Response,
  callback: () => void
) {
  if (permission <= 0) {
    callback();
    return;
  }
  //@ts-ignore
  const user = req.user;

  if (!user) {
    responses.error({ message: "Unauthorized", code: 401 });
    return;
  }

  if (permission <= user.permission) {
    callback();
    return;
  }
  res.send(responses.error({ message: "Forbidden", code: 403 }));
}

export default auth;
