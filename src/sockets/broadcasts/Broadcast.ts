import { Server } from "http";

export abstract class Broadcast {
  private io: Server;

  constructor(io: Server) {
    this.io = io;

    this.start();
  }

  private start() {
    setInterval(() => {
      this.io.emit(this.eventName(), this.message());
    }, this.interval() * 1000);
  }

  public abstract eventName(): string;
  public abstract interval(): number;
  public abstract message(): string;
}
