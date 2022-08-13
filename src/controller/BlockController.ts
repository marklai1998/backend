import * as google from "../utils/SheetUtils";
import * as index from "../index";

import { NextFunction, Request, Response } from "express";

import { Block } from "../entity/Block";
import { District } from "../entity/District";
import Logger from "../utils/Logger";
import { User } from "../entity/User";
import { getClaims } from "../utils/DistrictUtils";
import { statusToNumber } from "../utils/DistrictUtils";
import * as progress from "../utils/ProgressCalculation";

export class BlockController {
  async create(request: Request, response: Response, next: NextFunction) {
    if (!request.body.district) {
      return index.generateError("Specify a district");
    }
    if (!request.body.blockID) {
      return index.generateError("Specify a blockID");
    }

    const district = await District.findOne({ name: request.body.district });
    if (!district) {
      return index.generateError("District not found");
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

    const res = await index.getValidation(block, "Block created");
    if (!res.error) {
      await progress.recalculateDistrictBlocksDoneLeft(district.id);
      await progress.recalculateDistrictProgress(district.id);
      await progress.recalculateDistrictStatus(district.id);
    }

    return res;
  }

  async createMultiple(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    if (!request.body.district) {
      return index.generateError("Specify a district");
    }
    if (typeof request.body.district !== "number") {
      return index.generateError("The district must be a number");
    }
    if (!request.body.number) {
      return index.generateError("Specify the number of blocks to create");
    }
    if (typeof request.body.number !== "number") {
      return index.generateError("Invalid number");
    }

    const district = await District.findOne({ id: request.body.district });
    if (!district) {
      return index.generateError("District not found");
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

    await progress.recalculateDistrictBlocksDoneLeft(district.id);
    await progress.recalculateDistrictProgress(district.id);
    await progress.recalculateDistrictStatus(district.id);

    return index.generateSuccess(`${counter} Blocks created`);
  }

  async delete(request: Request, response: Response, next: NextFunction) {
    if (!request.body.district) {
      return index.generateError("Specify a District Name");
    }
    if (!request.body.blockID) {
      return index.generateError("Specify a BlockID");
    }

    const district = await District.findOne({ name: request.body.district });
    if (!district) {
      return index.generateError("District not found");
    }
    const block = await Block.findOne({
      id: request.body.blockID,
      district: district.id,
    });

    if (!block) {
      return index.generateError("Block not found");
    }

    await Block.query(
      `UPDATE blocks SET id = id-1 WHERE id > ${block.id} AND district = ${block.district}`
    );
    await block.remove();

    Logger.warn(
      `Deleting block ${block.uid} (ID: ${block.id}, District: ${block.district})`
    );

    await progress.recalculateDistrictBlocksDoneLeft(district.id);
    await progress.recalculateDistrictProgress(district.id);
    await progress.recalculateDistrictStatus(district.id);

    return index.generateSuccess("Block deleted");
  }

  async getOne(request: Request, response: Response, next: NextFunction) {
    const block = await getBlock(
      request.params.district,
      request.params.blockID
    );

    if (!block) {
      return index.generateError("Block not found");
    }

    return block.toJson();
  }

  async getAll(request: Request, response: Response, next: NextFunction) {
    const blocksRaw = await getBlocks(request.params.district);

    if (blocksRaw.length === 0) {
      return index.generateError("No blocks found");
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

      const nextID = blocks.at(-1).id + 1;
      if (nextID !== request.body.blockID) {
        return index.generateError(
          `You skipped a block. Next block should be ${nextID}`
        );
      }

      block = new Block();
      block.id = request.body.blockID;
      block.district = request.body.district;
      block.area = "[]";

      await block.save();
      Logger.info(`Creating block ${block.uid}`);
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
      return index.generateError("Block not found");
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
      return index.generateError("Specify district, blockID and values");
    }

    const values = request.body.values;
    const block = await getBlock(request.body.district, request.body.blockID);

    if (!block) {
      return index.generateError("Block not found");
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
    return index.getValidation(block, `${counter} columns updated`);
  }

  async setProgress(request: Request, response: Response, next: NextFunction) {
    const block = await getBlock(request.body.district, request.body.blockID);

    if (!block) {
      return index.generateError("Block not found");
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
      return index.generateError("Block not found");
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
      return index.generateError("Block not found");
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
      return index.generateError("Block not found");
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
      return index.generateError("Block not found");
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
      return index.generateError("District not found in database");
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
      return index.generateError("No data found for this district");
    }
    return index.generateSuccess(`${counter} Blocks imported`);
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
