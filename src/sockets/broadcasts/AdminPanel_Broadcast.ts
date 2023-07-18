import { Permissions } from "../../routes";
import { Broadcast } from "./Broadcast";

const cache = require("../../cache");

export class AdminPanel_Broadcast extends Broadcast {
  constructor() {
    super();
  }

  public permission(): number {
    return Permissions.moderator;
  }
  public eventName(): string {
    return "adminpanel";
  }
  public interval(): number {
    return 1;
  }
  public message(): any {
    return { connected_clients: cache.get("connected_clients") };
  }
  public onMessageSend(): void {}
}
