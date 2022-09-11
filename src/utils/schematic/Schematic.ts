import Logger from "../Logger";
import { SchematicBlock } from "./SchematicBlock";
import { SchematicVector } from "./SchematicVector";

export class Schematic {
  private blocks: SchematicBlock[];

  constructor(blocks: SchematicBlock[]) {
    this.blocks = [];

    const corners = Schematic.getCorners(blocks);

    Logger.debug(
      "Corners: " + corners[0].toString() + ", " + corners[1].toString()
    );

    for (let y = corners[0].getY(); y <= corners[1].getY(); y++) {
      for (let z = corners[0].getZ(); z <= corners[1].getZ(); z++) {
        for (let x = corners[0].getX(); x <= corners[1].getX(); x++) {
          const block = blocks.find(
            (block) =>
              block.getPosition().getX() === x &&
              block.getPosition().getY() === y &&
              block.getPosition().getZ() === z
          );
          const vectorOffset = new SchematicVector(
            x - corners[0].getX(),
            y - corners[0].getY(),
            z - corners[0].getZ()
          );

          if (block) {
            this.blocks.push(new SchematicBlock(vectorOffset, block.getData()));
          } else {
            this.blocks.push(new SchematicBlock(vectorOffset, "minecraft:air"));
          }
        }
      }
    }

    Logger.debug("Width: " + this.getWidth());
    Logger.debug("Height: " + this.getHeight());
    Logger.debug("Length: " + this.getLength());
  }

  public getBlocks(): SchematicBlock[] {
    return this.blocks;
  }

  public getWidth(): number {
    let min = Number.MAX_VALUE,
      max = Number.MIN_VALUE;

    for (const block of this.blocks) {
      const x = Math.abs(block.getPosition().getX());
      if (x < min) min = x;
      if (x > max) max = x;
    }

    return Math.abs(max - min) + 1;
  }

  public getHeight(): number {
    let min = Number.MAX_VALUE,
      max = Number.MIN_VALUE;

    for (const block of this.blocks) {
      const y = Math.abs(block.getPosition().getY());
      if (y < min) min = y;
      if (y > max) max = y;
    }

    return Math.abs(max - min) + 1;
  }

  public getLength(): number {
    let min = Number.MAX_VALUE,
      max = Number.MIN_VALUE;

    for (const block of this.blocks) {
      const z = Math.abs(block.getPosition().getZ());
      if (z < min) min = z;
      if (z > max) max = z;
    }

    return Math.abs(max - min) + 1;
  }

  public static getCorners(blocks: SchematicBlock[]): SchematicVector[] {
    let minX = Number.MAX_SAFE_INTEGER,
      minY = Number.MAX_SAFE_INTEGER,
      minZ = Number.MAX_SAFE_INTEGER;
    let maxX = Number.MIN_SAFE_INTEGER,
      maxY = Number.MIN_SAFE_INTEGER,
      maxZ = Number.MIN_SAFE_INTEGER;

    for (const block of blocks) {
      const vec = block.getPosition();
      if (vec.getX() < minX) minX = vec.getX();
      if (vec.getY() < minY) minY = vec.getY();
      if (vec.getZ() < minZ) minZ = vec.getZ();
      if (vec.getX() > maxX) maxX = vec.getX();
      if (vec.getY() > maxY) maxY = vec.getY();
      if (vec.getZ() > maxZ) maxZ = vec.getZ();
    }

    return [
      new SchematicVector(minX, minY, minZ),
      new SchematicVector(maxX, maxY, maxZ),
    ];
  }
}
