import { Response } from "express";
import { validate as val } from "class-validator";
import { BaseEntity } from "typeorm";

import * as dbCache from "../utils/cache/DatabaseCache";

export async function validate(
  res: Response,
  object: BaseEntity,
  {
    successMessage = undefined,
    successData = undefined,
    updateCache = false,
  }: { successMessage?: string; successData?: any; updateCache?: boolean }
) {
  const errors = await val(object);

  if (errors.length > 0) {
    return res.status(400).send({
      error: Object.values(errors[0].constraints)[0],
    });
  }

  await object.save();

  if (updateCache) {
    dbCache.reload(object);
  }

  return res.send({
    message: successMessage,
    data: successData,
  });
}
