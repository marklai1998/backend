import { NextFunction, Request, Response } from "express";
import jwt, { AUTH_SECRET } from "../utils/encryption/jwt";

import { User } from "../entity/User";
import { check } from "../utils/encryption/bcrypt";
import responses from "../responses";

export async function loginUser(username: string, password: string) {
  const user = await User.findOneBy({
    username: username,
  });

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
        ...user,
      },
    });
  }
  return responses.error({
    message: "Invalid username or password",
    code: 401,
  });
}

async function auth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization;

  if (token === null) {
    res
      .status(401)
      .send(responses.error({ message: "Unauthorized", code: 401 }));
    return;
  }

  jwt.verify(token, AUTH_SECRET, async (err: any, auth: any) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        res
          .status(403)
          .send(responses.error({ message: "Token expired", code: 403 }));
        return;
      }
      res
        .status(403)
        .send(responses.error({ message: "Forbidden", code: 403 }));
      return;
    }
    const user = await User.findOneBy({ uid: auth.uid });

    // @ts-ignore
    req.user = user;
    // @ts-ignore
    req.token = { raw: token, ...auth };
    return next();
  });
}

export default auth;
