import { fetch } from "..";
import { AdminSetting } from "../entity/AdminSetting";
import Logger from "./Logger";

export const status = {};

export async function checkServerStatus() {
  Logger.info("Requesting server status...");
  const servers = JSON.parse(
    (await AdminSetting.findOne({ key: "ips" })).value
  );

  const keys = Object.keys(servers);
  const promises = [];
  for (const server of Object.values(servers)) {
    const ip = (server as string).replace(":", "/");

    promises.push(
      fetch(`https://api.minetools.eu/ping/${ip}`).then((res: any) =>
        res.json()
      )
    );
  }
  const responses = await Promise.all(promises);

  for (let i = 0; i < keys.length; i++) {
    const res = responses[i];

    if (res.error) {
      status[keys[i]] = {
        online: false,
      };
      continue;
    }

    status[keys[i]] = {
      online: true,
      version: res.version,
      players: {
        online: res.players.online,
        max: res.players.max,
        list: res.players.sample,
      },
    };
  }
  Logger.info("Requested server status");
}
