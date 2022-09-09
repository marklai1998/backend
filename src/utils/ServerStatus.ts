import { fetch } from "..";
import { AdminSetting } from "../entity/AdminSetting";
import { Colors, sendWebhook } from "./DiscordMessageSender";
import Logger from "./Logger";

const serversToPingRole = ["NewYorkCity", "BuildingServer1"];
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

  let update = Object.keys(status).length === 0;
  for (let i = 0; i < keys.length; i++) {
    const res = responses[i];

    if (res.status === "rejected") {
      Logger.error(
        `Error occurred while requesting server status of ${keys[i]}! Reason: ${res.reason}`
      );
      continue;
    }

    const oldValue = status[keys[i]];
    const newValue = res.value.error
      ? !oldValue || !oldValue.online
        ? { online: false, timeout: false, last_updated: new Date() }
        : { online: false, timeout: true, last_updated: new Date() }
      : {
          online: true,
          version: res.value.version,
          players: {
            online: res.value.players.online,
            max: res.value.players.max,
            list: res.value.players.sample,
          },
          last_updated: new Date(),
        };

    if (oldValue) {
      // Compare Server Status
      if (
        newValue.online !== oldValue.online ||
        newValue.timeout !== oldValue.timeout
      ) {
        // Status changed
        update = true;
        Logger.info(
          `Server status of ${keys[i]} changed (${statusToString(
            oldValue
          )} --> ${statusToString(newValue)})`
        );

        // Send network log
        if (newValue.online && !oldValue.online) {
          // Status switched from offline to online
          sendWebhook("network_log", generateNetworkLogEmbed(keys[i], true));
        } else if (!newValue.online && oldValue.timeout) {
          // Status switched from timeout to offline
          sendWebhook("network_log", generateNetworkLogEmbed(keys[i], false));
        }
      }
      // Compare Server Version
      if (
        newValue.version &&
        oldValue.version &&
        newValue.version.name !== oldValue.version.name
      ) {
        // Version changed
        update = true;
        Logger.info(
          `Server version of ${keys[i]} changed (${oldValue.version.name} --> ${newValue.version.name})`
        );
      }
    }

    status[keys[i]] = newValue;
  }

  if (update && Object.keys(status).length > 0) {
    // Update server status embed
    Logger.info("Updating Server Status Embed");
    const body = {
      content: "",
      embeds: [
        {
          title: "Server Status",
          description: serverDataToString(),
          color: Colors.MineFact_Green,
          footer: {
            text: "MineFact Network",
            icon_url:
              "https://cdn.discordapp.com/avatars/422633274918174721/7e875a4ccb7e52097b571af1925b2dc1.png",
          },
        },
      ],
    };

    sendWebhook("network_status", body);
  }
}

export function serverDataToString() {
  let result = "";

  for (const server of Object.entries(status)) {
    const serverName: string = server[0];
    const serverStatus: any = server[1];
    result += `${
      serverStatus.online
        ? ":green_circle: "
        : serverStatus.timeout
        ? ":yellow_circle: "
        : ":red_circle: "
    }**${serverName}** ${
      serverStatus.version ? `(${serverStatus.version.name.split(" ")[1]})` : ""
    }\n`;
  }

  return result;
}

function statusToString(status: any) {
  if (status.online) {
    return "Online";
  }
  if (status.timeout) {
    return "Timeout";
  }
  return "Offline";
}

function generateNetworkLogEmbed(server: string, online: boolean) {
  return {
    content: serversToPingRole.includes(server) ? "<@&976842481884864623>" : "",
    embeds: [
      {
        title: `${online ? ":recycle:" : ":warning:"} Server ${
          online ? "Online" : "Offline"
        }`,
        description: `The server **${server}** is ${
          online ? "online again" : "offline"
        }`,
        color: online ? Colors.Green : Colors.Error,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
