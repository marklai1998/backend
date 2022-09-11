import { Schematic } from "./Schematic";
import Logger from "../Logger";

import fs = require("fs");
import zlib = require("zlib");
import { SchematicBlock } from "./SchematicBlock";
import { SchematicVector } from "./SchematicVector";

const NbtWriter = require("node-nbt").NbtWriter;
const TAG = require("node-nbt").TAG;

interface BlockMapping {
  name: string;
  id: number;
}

let ID_COUNTER = 1;
let BLOCK_ID_MAPPING: BlockMapping[] = [
  {
    name: "minecraft:air",
    id: 0,
  },
];

export function save(fileName: string): void {
  // TODO: Load data from database
  fs.readFile(
    __dirname.replace("\\src\\utils\\schematic", "") + "/" + fileName + ".txt",
    "utf-8",
    (err, data) => {
      if (err) {
        console.log(err);
      } else {
        const dataSplit = data.split("|");
        const blocks = [];
        for (const blockData of dataSplit) {
          const block = blockData.split("/");
          blocks.push(
            new SchematicBlock(
              new SchematicVector(
                parseInt(block[0]),
                parseInt(block[1]),
                parseInt(block[2])
              ),
              block[3]
            )
          );
        }

        const schematic = new Schematic(blocks);

        const width = schematic.getWidth();
        const height = schematic.getHeight();
        const length = schematic.getLength();

        const blockArray = [];
        for (const block of schematic.getBlocks()) {
          const pos = block.getPosition();
          let blockID = BLOCK_ID_MAPPING.find(
            (b) => b.name === block.getData()
          );
          if (!blockID) {
            blockID = {
              name: block.getData(),
              id: ID_COUNTER++,
            };
            BLOCK_ID_MAPPING.push(blockID);
          }

          blockArray[
            pos.getX() + pos.getZ() * width + pos.getY() * width * length
          ] = blockID.id;
        }

        const palette = [];
        for (const id of BLOCK_ID_MAPPING) {
          palette.push({
            name: id.name,
            type: TAG.INT,
            val: id.id,
          });
        }

        const nbt = {
          type: TAG.COMPOUND,
          name: "Schematic",
          val: [
            {
              name: "DataVersion",
              type: TAG.INT,
              val: 2730,
            },
            {
              name: "Version",
              type: TAG.INT,
              val: 2,
            },
            {
              name: "Width",
              type: TAG.SHORT,
              val: width,
            },
            {
              name: "Height",
              type: TAG.SHORT,
              val: height,
            },
            {
              name: "Length",
              type: TAG.SHORT,
              val: length,
            },
            {
              name: "BlockData",
              type: TAG.BYTEARRAY,
              val: blockArray,
            },
            {
              name: "Palette",
              type: TAG.COMPOUND,
              val: palette,
            },
          ],
        };

        const nbtData = NbtWriter.writeTag(nbt);

        zlib.gzip(nbtData, function (err, data) {
          if (err) {
            Logger.error("Error occurred while compressing schematic");
            return;
          }

          console.log(data.toString("base64"));

          fs.appendFile(
            __dirname.replace("\\src\\utils\\schematic", "") +
              "/" +
              fileName +
              ".schem",
            data,
            (err) => {
              if (err) {
                console.log("Error occurred while saving schematic");
              } else {
                console.log("Saved File " + fileName + ".schem");
              }
            }
          );
        });
      }
    }
  );
}
