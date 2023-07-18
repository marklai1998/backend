import { permissionToName } from "../../utils/Permissions";
import { broadcast, sendToRoom } from "../SocketManager";

export abstract class Broadcast {
  constructor() {
    this.start();
  }

  private start() {
    setInterval(() => {
      this.onMessageSend();
      if (this.permission() >= 0) {
        sendToRoom(
          permissionToName(this.permission()),
          this.eventName(),
          this.message()
        );
      } else {
        broadcast(this.eventName(), this.message());
      }
    }, this.interval() * 1000);
  }

  public permission(): number {
    return -1;
  }

  public abstract eventName(): string;
  public abstract interval(): number;
  public abstract message(): any;
  public abstract onMessageSend(): void;
}
