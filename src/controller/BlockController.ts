import { getRepository } from "typeorm";
import { NextFunction, Request, Response } from "express";
import { Block } from "../entity/Block";
import { District } from "../entity/District";
import * as index from "../index";

export class BlockController {
  private blockRepository = getRepository(Block);

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

    return block;
  }

  async setLocation(request: Request, response: Response, next: NextFunction) {}

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
  if (block.progress === 100 && block.details) {
    block.status = 4;
  } else if (block.progress === 100 && !block.details) {
    block.status = 3;
  } else if (block.progress > 0 || block.details) {
    block.status = 2;
  } else if (
    block.progress === 0 &&
    !block.details &&
    block.builder !== "" &&
    block.builder !== null
  ) {
    block.status = 1;
  } else {
    block.status = 0;
  }
  await Block.save(block);
}
