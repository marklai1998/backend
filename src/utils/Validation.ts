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
    onCacheReload = undefined,
  }: {
    successMessage?: string;
    successData?: any;
    updateCache?: boolean;
    onSuccess?: Function;
    onCacheReload?: Function;
  }
) {
  const errors = await val(object, {
    skipMissingProperties: true,
    forbidUnknownValues: false,
  });

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
    dbCache.reload(object).then(() => onCacheReload?.());
  }

  let data = {};
  if (Array.isArray(successData)) {
    for (const d of successData) {
      data[d] = newObject[d];
    }
  } else {
    data = successData
      ? successData
      : newObject["toJson"]
      ? newObject["toJson"]()
      : newObject;
  }

  return res.send({
    message: successMessage,
    data,
  });
}
