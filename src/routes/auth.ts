import { Request, Response } from "express";
import { loginUser } from "../middleware/auth";

export const post = async (req: Request, res: Response) => {
  const result = await loginUser(req.body.username, req.body.password);
  if (result.error) {
    return res.status(400).send(result);
  }
  return res.send(result);
};
