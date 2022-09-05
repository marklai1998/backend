import { fetch } from "..";
import { AdminSetting } from "../entity/AdminSetting";
import Logger from "./Logger";

export const status = {};

export async function checkServerStatus() {
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
  const responses = await Promise.allSettled(promises);

  for (let i = 0; i < keys.length; i++) {
    const res = responses[i];

    if (res.status === "rejected") {
      Logger.error(
        `Error occurred while requesting server status of ${keys[i]}! Reason: ${res.reason}`
      );
      continue;
    }

    if (res.value.error) {
      status[keys[i]] = {
        online: false,
        last_updated: new Date(),
      };
      continue;
    }

    status[keys[i]] = {
      online: true,
      version: res.value.version,
      players: {
        online: res.value.players.online,
        max: res.value.players.max,
        list: res.value.players.sample,
      },
      last_updated: new Date(),
    };
  }
}
