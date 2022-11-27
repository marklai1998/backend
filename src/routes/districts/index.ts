import { Request, Response } from "express";

import { District } from "../../entity/District";
import { DistrictController } from "../../controller/DistrictController";

export const get = async (req: Request, res: Response) => {
  const result = await District.find();
  return res.send(result);
};
