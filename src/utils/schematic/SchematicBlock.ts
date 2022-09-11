import { SchematicVector } from "./SchematicVector";

export class SchematicBlock {
  private position: SchematicVector;
  private data: string;

  constructor(position: SchematicVector, data: string) {
    this.position = position;
    this.data = data;
  }

  public getPosition(): SchematicVector {
    return this.position;
  }

  public getData(): string {
    return this.data;
  }
}
