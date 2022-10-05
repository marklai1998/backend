import { sendToRoom } from "../SocketManager";

export abstract class Broadcast {
  constructor() {
    this.start();
  }

  private start() {
    setInterval(() => {
      sendToRoom("motd", this.eventName(), this.message());
    }, this.interval() * 1000);
  }

  public abstract eventName(): string;
  public abstract interval(): number;
  public abstract message(): string;
}
