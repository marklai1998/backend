import { getRepository } from "typeorm";
import { NextFunction, Request, Response } from "express";
import * as google from "../utils/SheetUtils";
import { District } from "../entity/District";
import { Block } from "../entity/Block";
import * as index from "../index";

export class DistrictController {
  private districtRepository = getRepository(District);

  async create(request: Request, response: Response, next: NextFunction) {
    if (request.body.name === undefined) {
      return index.generateError("Specify a name");
    }
    if (request.body.parent === undefined) {
      return index.generateError("Specify a parent");
    }

    let district = await this.districtRepository.findOne({
      name: request.body.name,
    });
    if (district !== undefined) {
      return index.generateError("District already exists");
    }

    let parent = await this.districtRepository.findOne({
      name: request.body.parent,
    });
    if (parent === undefined) {
      return index.generateError("Parent District not found");
    }

    district = new District();
    district.name = request.body.name;
    district.parent = parent.id;

    return index.getValidation(
      district,
      this.districtRepository,
      "District created"
    );
  }

  async delete(request: Request, response: Response, next: NextFunction) {
    if (request.body.name === undefined) {
      return index.generateError("Specify a name");
    }
    if (request.body.name.toLowerCase() === "new york city") {
      return index.generateError("You cannot delete initial district");
    }
    let district = await this.districtRepository.findOne({
      name: request.body.name,
    });
    if (district === undefined) {
      return index.generateError("District not found");
    }

    let blocks = await Block.find({ district: district.id });

    if (blocks.length > 0) {
      return index.generateError("Cannot delete district with existing blocks");
    }

    await this.districtRepository.remove(district);
    return index.generateSuccess("District deleted");
  }

  async getAll(request: Request, response: Response, next: NextFunction) {
    return this.districtRepository.find();
  }

  async getOne(request: Request, response: Response, next: NextFunction) {
    let district = await this.districtRepository.findOne({
      name: request.params.name,
    });

    if (district === undefined) {
      return index.generateError("District not found");
    }

    let blocks = await Block.find({
      order: { id: "ASC" },
      where: { district: district.id },
    });

    const blocksJson = {
      total: blocks.length,
      done: 0,
      detailing: 0,
      building: 0,
      reserved: 0,
      not_started: 0,
      blocks: [],
    };
    const builders = [];
    var progress = 0;

    for (const b of blocks) {
      switch (b.status) {
        case 4:
          blocksJson.done++;
          break;
        case 3:
          blocksJson.detailing++;
          break;
        case 2:
          blocksJson.building++;
          break;
        case 1:
          blocksJson.reserved++;
          break;
        default:
          blocksJson.not_started++;
          break;
      }

      const buildersSplit =
        b.builder === "" || b.builder === null ? [] : b.builder.split(",");

      blocksJson.blocks.push({
        uid: b.uid,
        id: b.id,
        location: b.location,
        district: b.district,
        status: b.status,
        progress: b.progress,
        details: b.details,
        builders: buildersSplit,
        completionDate:
          b.completionDate === null
            ? null
            : b.completionDate.toLocaleDateString(),
      });

      for (var i = 0; i < buildersSplit.length; i++) {
        if (builders.some((e) => e.name === buildersSplit[i])) {
          builders.some((e) => {
            if (e.name === buildersSplit[i]) {
              e.blocks++;
            }
          });
        } else {
          builders.push({ name: buildersSplit[i], blocks: 1 });
        }
      }

      progress += b.progress;
    }
    progress /= blocks.length;
    builders.sort(dynamicSort("blocks"));

    var status = 0;
    if (blocksJson.done === blocks.length) {
      status = 4;
    } else if (progress === 100) {
      status = 3;
    } else if (progress > 0) {
      status = 2;
    }

    return {
      id: district.id,
      name: district.name,
      status: status,
      progress: progress,
      completionDate:
        district.completionDate === null
          ? null
          : new Date(district.completionDate).toLocaleDateString(),
      builders: builders,
      blocks: blocksJson,
      image: district.image,
      map: district.map,
      about: district.about,
      area: district.area,
    };
  }

  async import(request: Request, response: Response, next: NextFunction) {
    const blocks = request.query.blocks;
    const getData = await google.googleSheets.spreadsheets.values.get({
      auth: google.authGoogle,
      spreadsheetId: google.sheetID,
      range: `New York City (Overview)!A5:H`,
    });
    const data = getData.data.values;
    var districtCounter = 0;
    var blocksCounter = 0;

    this.districtRepository.clear();
    this.districtRepository.query("ALTER TABLE districts AUTO_INCREMENT = 1");

    const boroughs = [];
    var isBorough = true;
    var currentParent = null;
    var boroughCounter = -1;
    for (const d of data) {
      if (d[1] === undefined || d[1] === null || d[1] === "") {
        isBorough = false;
        boroughCounter++;
        continue;
      }

      let district = new District();
      district.name = d[1];

      if (isBorough) {
        district.parent = currentParent;
      } else {
        if (d[0] === "P") {
          district.parent = boroughs[boroughCounter];
        } else {
          district.parent = currentParent;
        }
      }

      const dateSplit = d[6].split(".");
      if (dateSplit.length === 3) {
        district.completionDate = new Date(
          `${dateSplit[2]}-${dateSplit[1]}-${dateSplit[0]}`
        );
      } else {
        district.completionDate = null;
      }

      let parent = await this.districtRepository.save(district);

      if (d[0] === "P") {
        currentParent = parent.id;
      } else {
        if (isBorough) {
          boroughs.push(parent.id);
        } else {
          if (blocks && d[7] === "Click") {
            await index.axios
              .get(`http://localhost:8080/api/import/blocks/${d[1]}`)
              .then((res) => {
                if (res.data.success) {
                  blocksCounter += parseInt(
                    res.data.message.replace(" Blocks imported", "")
                  );
                  console.log(`Blocks of ${d[1]} imported`);
                } else {
                  console.log(`No data found for ${d[1]}`);
                }
              })
              .catch((error) => {
                console.log(`Error occured for district ${d[1]}`, error);
              });
          }
        }
      }
      districtCounter++;
    }

    return index.generateSuccess(
      `${districtCounter} Districts and ${blocksCounter} Blocks imported`
    );
  }
}

function dynamicSort(property: string) {
  var sortOrder = 1;
  if (property[0] === "-") {
    sortOrder = -1;
    property = property.substr(1);
  }
  return function (a, b) {
    /* next line works with strings and numbers,
     * and you may want to customize it to your needs
     */
    var result =
      a[property] > b[property] ? -1 : a[property] < b[property] ? 1 : 0;
    return result * sortOrder;
  };
}
