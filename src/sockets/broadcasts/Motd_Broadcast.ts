import { AdminSetting } from "../../entity/AdminSetting";
import { replacePlaceholders } from "../Placeholders";
import { Broadcast } from "./Broadcast";

const cache = require("../../cache");

export class Motd_Broadcast extends Broadcast {
  private index: number;
  private motds: string[];

  constructor() {
    super();
    this.index = 0;
    this.motds = [];

    // Load Motds from database
    this.loadMotds();
    setInterval(async () => this.loadMotds(), 5 * 60 * 1000);
  }

  public eventName(): string {
    return "motd";
  }
  public interval(): number {
    return 10;
  }
  public message(): string {
    if (this.motds.length === 0) {
      return "";
    }
    return replacePlaceholders(this.motds[this.index]);
  }
  public onMessageSend(): void {
    this.refreshMotd();
  }

  private async loadMotds() {
    this.motds = JSON.parse(
      (await AdminSetting.findOneBy({ key: "motd" })).value
    );
    cache.set("current_motd", this.message());
  }
  private refreshMotd() {
    if (++this.index >= this.motds.length) {
      this.index = 0;
    }
    cache.set("current_motd", this.message());
  }
}
