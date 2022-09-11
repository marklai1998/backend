export class SchematicVector {
  private x: number;
  private y: number;
  private z: number;

  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  public getX(): number {
    return this.x;
  }

  public getY(): number {
    return this.y;
  }

  public getZ(): number {
    return this.z;
  }

  public toString(): string {
    return "(" + this.x + "," + this.y + "," + this.z + ")";
  }
}
