import * as google from "../utils/SheetUtils";

import { NextFunction, Request, Response } from "express";

import { Block } from "../entity/Block";
import { District } from "../entity/District";
import Logger from "../utils/Logger";
import { User } from "../entity/User";
import { getClaims } from "../utils/DistrictUtils";
import { statusToNumber } from "../utils/DistrictUtils";
import * as progress from "../utils/ProgressCalculation";
import responses from "../responses";

export class BlockController {
  async create(request: Request, response: Response, next: NextFunction) {
    if (!request.body.district) {
      return responses.error({ message: "Specify a district", code: 400 });
    }
    if (!request.body.blockID) {
      return responses.error({ message: "Specify a blockID", code: 400 });
    }

    const district = await District.findOne({ name: request.body.district });
    if (!district) {
      return responses.error({ message: "District not found", code: 404 });
    }

    let block = await Block.findOne({
      id: request.body.blockID,
      district: district.id,
    });
    if (block) {
      await Block.query(
        `UPDATE blocks SET id = id+1 WHERE id >= ${block.id} AND district = ${block.district}`
      );
    }

    block = new Block();
    block.id = request.body.blockID;
    block.district = district.id;
    block.area = "[]";
    Logger.info(`Creating block ${block.uid}`);

    const res = await responses.validate(block, "Block created");
    if (!res.error) {
      progress.recalculateAll(district.id);
    }

    return res;
  }

  async createMultiple(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    if (!request.body.district) {
      return responses.error({ message: "Specify a district", code: 400 });
    }
    if (typeof request.body.district !== "number") {
      return responses.error({
        message: "The district must be a number",
        code: 400,
      });
    }
    if (!request.body.number) {
      return responses.error({
        message: "Specify the number of blocks to create",
        code: 400,
      });
    }
    if (typeof request.body.number !== "number") {
      return responses.error({ message: "Invalid number", code: 400 });
    }

    const district = await District.findOne({ id: request.body.district });
    if (!district) {
      return responses.error({ message: "District not found", code: 404 });
    }

    const blocks = await Block.find({
      where: { district: district.id },
      order: { id: "ASC" },
    });
    const lastID = blocks.length === 0 ? 0 : blocks[blocks.length - 1].id;

    var counter = 0;
    for (var i = lastID + 1; i <= lastID + request.body.number; i++) {
      const block = new Block();
      block.id = i;
      block.district = district.id;
      block.area = "[]";

      if (request.body.done) {
        block.status = 4;
        block.progress = 100;
        block.details = true;
      }

      await block.save();
      counter++;
      Logger.info(`Creating block ${block.uid}`);
    }

    progress.recalculateAll(district.id);

    return responses.success({ message: `${counter} Blocks created` });
  }

  async delete(request: Request, response: Response, next: NextFunction) {
    if (!request.body.district) {
      return responses.error({ message: "Specify a District Name", code: 400 });
    }
    if (!request.body.blockID) {
      return responses.error({ message: "Specify a BlockID", code: 400 });
    }

    const district = await District.findOne({ name: request.body.district });
    if (!district) {
      return responses.error({ message: "District not found", code: 404 });
    }
    const block = await Block.findOne({
      id: request.body.blockID,
      district: district.id,
    });

    if (!block) {
      return responses.error({ message: "Block not found", code: 404 });
    }

    await Block.query(
      `UPDATE blocks SET id = id-1 WHERE id > ${block.id} AND district = ${block.district}`
    );
    await block.remove();

    Logger.warn(
      `Deleting block ${block.uid} (ID: ${block.id}, District: ${block.district})`
    );

    progress.recalculateAll(district.id);

    return responses.success({ message: "Block deleted" });
  }

  async getOne(request: Request, response: Response, next: NextFunction) {
    const block = await getBlock(
      request.params.district,
      request.params.blockID
    );

    if (!block) {
      return responses.error({ message: "Block not found", code: 404 });
    }

    return block.toJson();
  }

  async getAll(request: Request, response: Response, next: NextFunction) {
    const blocksRaw = await getBlocks(request.params.district);

    if (blocksRaw.length === 0) {
      return responses.error({ message: "No blocks found", code: 404 });
    }

    const blocks = [];
    for (const block of blocksRaw) {
      blocks.push(block.toJson());
    }
    return await Promise.all(blocks);
  }

  async getEvery(request: Request, response: Response, next: NextFunction) {
    const blocksAll = await Block.find();

    const blocks = [];
    for (const block of blocksAll) {
      block["center"] = block.getLocationCenter();
      block.area = JSON.parse(block.area);
      blocks.push(block);
    }

    return blocks;
  }
  async getClaims(request: Request, response: Response, next: NextFunction) {
    return getClaims(request.params.name);
  }

  async addLocation(request: Request, response: Response, next: NextFunction) {
    let block = await getBlock(request.body.district, request.body.blockID);

    if (!block) {
      const blocks = await Block.find({
        where: { district: request.body.district },
        order: { id: "ASC" },
      });

      const nextID = blocks.length === 0 ? 1 : blocks.at(-1).id + 1;
      if (nextID !== request.body.blockID) {
        return responses.error({
          message: `You skipped a block. Next block should be ${nextID}`,
          code: 400,
        });
      }

      block = new Block();
      block.id = request.body.blockID;
      block.district = request.body.district;
      block.area = "[]";

      await block.save();
      Logger.info(`Creating block ${block.uid}`);

      progress.recalculateAll(request.body.district);
    }
    Logger.info(`Adding location to block ${block.uid}`);
    return block.addLocation(request.body.location);
  }
  async removeLocation(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    const block = await Block.findOne({ where: { uid: request.body.uid } });

    if (!block) {
      return responses.error({ message: "Block not found", code: 404 });
    }
    Logger.warn(`Removing location from block ${block.uid}`);
    return block.removeLocation(request.body.index);
  }

  async update(request: Request, response: Response, next: NextFunction) {
    if (
      !request.body.district ||
      !request.body.blockID ||
      !request.body.values
    ) {
      return responses.error({
        message: "Specify district, blockID and values",
        code: 400,
      });
    }

    const values = request.body.values;
    const block = await getBlock(request.body.district, request.body.blockID);

    if (!block) {
      return responses.error({ message: "Block not found", code: 404 });
    }

    const user = await User.findOne({
      apikey: request.body.key || request.query.key,
    });

    let counter = 0;
    if (values.progress !== undefined) {
      await block.setProgress(values.progress, user);
      counter++;
    }
    if (values.details !== undefined) {
      await block.setDetails(values.details, user);
      counter++;
    }
    if (values.builder !== undefined) {
      await block.setBuilder(values.builder, user);
      counter++;
    }
    Logger.info(`Updating block ${block.uid} (${counter} columns updated)`);
    return responses.validate(block, `${counter} columns updated`);
  }

  async setProgress(request: Request, response: Response, next: NextFunction) {
    const block = await getBlock(request.body.district, request.body.blockID);

    if (!block) {
      return responses.error({ message: "Block not found", code: 404 });
    }

    const user = await User.findOne({
      apikey: request.body.key || request.query.key,
    });
    Logger.info(
      `Updating block ${block.uid} (Progress: ${block.progress}% -> ${request.body.progress}%)`
    );

    return await block.setProgress(request.body.progress, user);
  }

  async setDetails(request: Request, response: Response, next: NextFunction) {
    const block = await getBlock(request.body.district, request.body.blockID);

    if (!block) {
      return responses.error({ message: "Block not found", code: 404 });
    }

    const user = await User.findOne({
      apikey: request.body.key || request.query.key,
    });
    Logger.info(
      `Updating block ${block.uid} (Details: ${block.details} -> ${request.body.details})`
    );

    return await block.setDetails(request.body.details, user);
  }

  async setBuilder(request: Request, response: Response, next: NextFunction) {
    const block = await getBlock(request.body.district, request.body.blockID);

    if (!block) {
      return responses.error({ message: "Block not found", code: 404 });
    }

    const user = await User.findOne({
      apikey: request.body.key || request.query.key,
    });
    Logger.info(
      `Updating block ${block.uid} (Builder: ${block.builder} -> ${request.body.builder})`
    );

    return await block.setBuilder(request.body.builder, user);
  }

  async addBuilder(request: Request, response: Response, next: NextFunction) {
    const block = await getBlock(request.body.district, request.body.blockID);

    if (!block) {
      return responses.error({ message: "Block not found", code: 404 });
    }
    Logger.info(`Adding builder ${request.body.builder} to block ${block.uid}`);

    return await block.addBuilder(request.body.builder);
  }

  async removeBuilder(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    const block = await getBlock(request.body.district, request.body.blockID);

    if (!block) {
      return responses.error({ message: "Block not found", code: 404 });
    }
    Logger.info(
      `Removing builder ${request.body.builder} from block ${block.uid}`
    );

    return await block.removeBuilder(request.body.builder);
  }

  async import(request: Request, response: Response, next: NextFunction) {
    const district = await District.findOne({
      name: request.params.district,
    });

    if (!district) {
      return responses.error({ message: "District not found", code: 404 });
    }

    var counter = 0;
    try {
      Logger.warn(`Importing blocks from ${request.params.district}`);
      const getData = await google.googleSheets.spreadsheets.values.get({
        auth: google.authGoogle,
        spreadsheetId: google.sheetID,
        range: `${district.name.replace("'", "´")}!B6:G`,
      });
      const data = getData.data.values;

      for (const d of data) {
        if (!d[0]) break;

        const block = new Block();
        block.id = parseInt(d[0]);
        block.district = district.id;
        block.status = statusToNumber(d[1]);
        block.progress = !d[2] ? 0.0 : parseFloat(d[2].replace(",", "."));
        block.details = d[3] === "TRUE" ? true : false;
        block.builder = !d[4] ? "" : d[4];
        block.area = "[]";

        if (!d[5]) {
          block.completionDate = null;
        } else {
          const dateSplit = d[5].split(".");
          if (dateSplit.length !== 3) {
            block.completionDate = null;
          } else {
            const isoDate = `${dateSplit[2]}-${dateSplit[1]}-${dateSplit[0]}`;
            const date = new Date(isoDate);
            block.completionDate =
              date.toString() === "Invalid Date" ? null : date;
          }
        }

        await block.save();
        counter++;
      }
    } catch {
      Logger.error(
        `Error importing blocks from ${request.params.district}: No data found for this district`
      );
      return responses.error({
        message: "No data found for this district",
        code: 404,
      });
    }
    return responses.success({ message: `${counter} Blocks imported` });
  }
}

async function getBlock(districtID: string | number, blockID: number) {
  const district =
    typeof districtID === "string"
      ? await District.findOne({ name: districtID })
      : await District.findOne({ id: districtID });

  if (!district) {
    return null;
  }

  const block = Block.findOne({ id: blockID, district: district.id });
  if (!block) {
    return null;
  }
  return block;
}

async function getBlocks(districtID: string | number) {
  const district =
    typeof districtID === "string"
      ? await District.findOne({ name: districtID })
      : await District.findOne({ id: districtID });

  if (!district) {
    return null;
  }

  return await Block.find({
    where: { district: district.id },
    order: { id: "ASC" },
  });
}
