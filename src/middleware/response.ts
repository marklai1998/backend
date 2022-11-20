import { Request, Response } from "express";

const mung = require("express-mung");

export function generateResponse(body: any, req: Request, res: Response) {
  const isError = !res.statusCode.toString().startsWith("2");
  body.error = undefined;

  if (isError) {
    body.code = res.statusCode;
  }

  return {
    path: req.path,
    method: req.method,
    result: isError ? undefined : body,
    error: isError ? body : undefined,
  };
}

export default mung.json(generateResponse);
