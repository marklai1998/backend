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
    onSuccess = undefined,
  }: {
    successMessage?: string;
    successData?: any;
    updateCache?: boolean;
    onSuccess?: Function;
  }
) {
  const errors = await val(object, { skipMissingProperties: true });

  if (errors.length > 0) {
    return res.status(400).send({
      error: Object.values(errors[0].constraints)[0],
    });
  }

  const newObject = await object.save();

  if (onSuccess) {
    await onSuccess();
  }

  if (updateCache) {
    dbCache.reload(object);
  }

  return res.send({
    message: successMessage,
    data: successData
      ? successData
      : newObject["toJson"]
      ? newObject["toJson"]()
      : newObject,
  });
}
