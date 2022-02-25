import { getRepository } from "typeorm";
import { NextFunction, Request, Response } from "express";
import * as google from "../utils/SheetUtils";
import { Block } from "../entity/Block";
import { District } from "../entity/District";
import * as index from "../index";
import * as date from "../utils/TimeUtils";

export class BlockController {
  private blockRepository = getRepository(Block);
  private districtRepository = getRepository(District);

  async create(request: Request, response: Response, next: NextFunction) {
    if (request.body.district === undefined) {
      return index.generateError("Specify a district");
    }
    if (request.body.blockID === undefined) {
      return index.generateError("Specify a blockID");
    }

    let district = await District.findOne({ name: request.body.district });
    if (district === undefined) {
      return index.generateError("District not found");
    }

    let block = await this.blockRepository.findOne({
      id: request.body.blockID,
      district: district.id,
    });
    if (block !== undefined) {
      return index.generateError("Block already exists");
    }

    block = new Block();
    block.id = request.body.blockID;
    block.district = district.id;

    return index.getValidation(block, this.blockRepository, "Block created");
  }

  async createMultiple(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    if (!request.body.district) {
      return index.generateError("Specify a district");
    }
    if (!request.body.number) {
      return index.generateError("Specify the number of blocks to create");
    }
    if (typeof request.body.number !== "number") {
      return index.generateError("Invalid number");
    }

    let district = await District.findOne({ name: request.body.district });
    if (district === undefined) {
      return index.generateError("District not found");
    }

    let blocks = await this.blockRepository.find({
      where: { district: district.id },
      order: { id: "ASC" },
    });
    const lastID = blocks.length === 0 ? 0 : blocks[blocks.length - 1].id;

    var counter = 0;
    for (var i = lastID + 1; i <= lastID + request.body.number; i++) {
      const block = new Block();
      block.id = i;
      block.district = district.id;

      if (request.body.done) {
        block.status = 4;
        block.progress = 100;
        block.details = true;
      }

      await this.blockRepository.save(block);
      counter++;
    }

    return index.generateSuccess(`${counter} Blocks created`);
  }

  async delete(request: Request, response: Response, next: NextFunction) {
    if (request.body.district === undefined) {
      return index.generateError("Specify a District Name");
    }
    if (request.body.blockID === undefined) {
      return index.generateError("Specify a BlockID");
    }

    let district = await District.findOne({ name: request.body.district });
    if (district === undefined) {
      return index.generateError("District not found");
    }
    let block = await this.blockRepository.findOne({
      id: request.body.blockID,
      district: district.id,
    });

    if (block === undefined) {
      return index.generateError("Block not found");
    }

    await this.blockRepository.remove(block);
    return index.generateSuccess("Block deleted");
  }

  async getOne(request: Request, response: Response, next: NextFunction) {
    let block = await getBlock(request.params.district, request.params.blockID);

    if (block === null) {
      return index.generateError("Block not found");
    }

    return {
      uid: block.uid,
      id: block.id,
      location: block.location,
      district: block.district,
      status: block.status,
      progress: block.progress,
      details: block.details,
      builder: block.builder,
      completionDate: date.parseDate(block.completionDate),
    };
  }

  async setLocation(request: Request, response: Response, next: NextFunction) {
    // TODO
  }

  async setProgress(request: Request, response: Response, next: NextFunction) {
    let block = await getBlock(request.body.district, request.body.blockID);

    if (block === null) {
      return index.generateError("Block not found");
    }

    block.progress = request.body.progress;
    setStatus(block);

    return index.getValidation(block, this.blockRepository, "Progress updated");
  }

  async setDetails(request: Request, response: Response, next: NextFunction) {
    let block = await getBlock(request.body.district, request.body.blockID);

    if (block === null) {
      return index.generateError("Block not found");
    }

    block.details = request.body.details;
    setStatus(block);

    return index.getValidation(block, this.blockRepository, "Details updated");
  }

  async addBuilder(request: Request, response: Response, next: NextFunction) {
    let block = await getBlock(request.body.district, request.body.blockID);

    if (block === null) {
      return index.generateError("Block not found");
    }
    if (block.builder.includes(request.body.builder)) {
      return index.generateError("Builder already added");
    }

    if (block.builder === "" || block.builder === null) {
      block.builder = request.body.builder;
      setStatus(block);
    } else {
      block.builder += `,${request.body.builder}`;
    }

    return index.getValidation(block, this.blockRepository, "Builder added");
  }

  async removeBuilder(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    let block = await getBlock(request.body.district, request.body.blockID);

    if (block === null) {
      return index.generateError("Block not found");
    }
    if (!block.builder.includes(request.body.builder)) {
      return index.generateError("Builder not found for this block");
    }

    const builderSplit = block.builder.split(",");
    if (builderSplit[0].toLowerCase() === request.body.builder) {
      block.builder.replace(`${request.body.builder},`, "");
    } else {
      block.builder.replace(`,${request.body.builder}`, "");
    }

    return index.getValidation(block, this.blockRepository, "Builder removed");
  }

  async import(request: Request, response: Response, next: NextFunction) {
    let district = await this.districtRepository.findOne({
      name: request.params.district,
    });

    if (district === undefined) {
      return index.generateError("District not found in database");
    }

    var counter = 0;
    try {
      const getData = await google.googleSheets.spreadsheets.values.get({
        auth: google.authGoogle,
        spreadsheetId: google.sheetID,
        range: `${district.name.replace("'", "´")}!B6:G`,
      });
      const data = getData.data.values;

      for (const d of data) {
        if (d[0] === undefined || d[0] === null || d[0] === "") break;

        let block = new Block();
        block.id = parseInt(d[0]);
        block.district = district.id;
        block.status = statusToNumber(d[1]);
        block.progress =
          d[2] === undefined || d[2] === null || d[2] === ""
            ? 0.0
            : parseFloat(d[2].replace(",", "."));
        block.details = d[3] === "TRUE" ? true : false;
        block.builder = d[4] === undefined || d[4] === null ? "" : d[4];

        if (d[5] === undefined || d[5] === null) {
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
      return index.generateError("No data found for this district");
    }
    return index.generateSuccess(`${counter} Blocks imported`);
  }
}

async function getBlock(districtName: string, blockID: number) {
  let district = await District.findOne({ name: districtName });
  if (district === undefined) {
    return null;
  }

  let block = await Block.findOne({ id: blockID, district: district.id });
  if (block === undefined) {
    return null;
  }
  return block;
}

async function setStatus(block: Block) {
  const oldStatus = block.status;
  if (oldStatus !== 4 && block.progress === 100 && block.details) {
    block.status = 4;
    block.completionDate = new Date();
  } else if (oldStatus !== 3 && block.progress === 100 && !block.details) {
    block.status = 3;
    block.completionDate = null;
  } else if (oldStatus !== 2 && (block.progress > 0 || block.details)) {
    block.status = 2;
    block.completionDate = null;
  } else if (
    oldStatus !== 1 &&
    block.progress === 0 &&
    !block.details &&
    block.builder !== "" &&
    block.builder !== null
  ) {
    block.status = 1;
    block.completionDate = null;
  } else if (oldStatus !== 0) {
    block.status = 0;
    block.completionDate = null;
  }

  // Update on change
  if (oldStatus !== block.status) {
    await Block.save(block);

    if (block.status === 4) {
      let blocks = await Block.find({ district: block.district });
      var done = 0;
      for (const b of blocks) {
        if (b.status === 4) {
          done++;
        }
      }

      if (done === blocks.length) {
        // District completed
        let district = await District.findOne({ id: block.district });
        district.completionDate = new Date();
        await district.save();
      }
    } else {
      let district = await District.findOne({ id: block.district });
      if (district.completionDate !== null) {
        district.completionDate = null;
        await district.save();
      }
    }
  }
}

function statusToNumber(status: string) {
  switch (status) {
    case "Done":
      return 4;
    case "Detailing":
      return 3;
    case "Building":
      return 2;
    case "Reserved":
      return 1;
    default:
      return 0;
  }
}
