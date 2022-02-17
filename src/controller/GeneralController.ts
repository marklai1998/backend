import { getRepository } from "typeorm";
import { NextFunction, Request, Response } from "express";
import * as minecraftUtil from "minecraft-server-util";
import * as index from "../index";
import { AdminSetting } from "../entity/AdminSetting";

export class GeneralController {
  private configRepository = getRepository(AdminSetting);

  async pingNetwork(request: Request, response: Response, next: NextFunction) {
    const java = await minecraftUtil
      .status("buildtheearth.net", 25565, {
        timeout: 1000 * 20,
        enableSRV: true,
      })
      .then((result) => {
        const groups = {};
        var counter = 0;
        for (const line of result.players.sample) {
          if (
            line.name.includes("§8[§b") &&
            line.name.includes("§8]§7 are in ")
          ) {
            const split = line.name
              .replace("§8[§b", "")
              .replace("§8]§7 are in", "")
              .split(" §");
            const players = parseInt(split[0]);
            const type = split[1].substring(1).replace(" ", "").toLowerCase();

            groups[type] = players;
            counter += players;
          }
        }
        groups["other"] = Math.max(result.players.online - counter, 0);

        return {
          online: true,
          ip: {
            default: "buildtheearth.net:25565",
            fallback: "network.buildtheearth.net:25565",
          },
          version: {
            fullName: result.version.name,
            name: result.version.name.split(" ")[1],
            protocol: result.version.protocol,
            support: result.motd.clean
              .split("\n")[0]
              .split("|  ")[1]
              .replace("[", "")
              .replace("]", ""),
          },
          players: {
            total: result.players.online,
            max: result.players.max,
            groups: groups,
          },
          motd: {
            raw: result.motd.raw,
            clean: result.motd.clean,
            html: result.motd.html,
            serverNews: result.motd.clean
              .split("\n")[1]
              .replace("|||  ", "")
              .replace("  |||", ""),
            rows: [
              result.motd.clean.split("\n")[0],
              result.motd.clean.split("\n")[1],
            ],
          },
          favicon: result.favicon,
          srvRecord: result.srvRecord,
        };
      })
      .catch((error) => {
        if (error.toString().includes("Timed out")) {
          return {
            online: false,
            error: "Timed out",
          };
        } else {
          return {
            online: false,
            error: "Unexpected error",
          };
        }
      });

    const bedrock = await minecraftUtil
      .statusBedrock("bedrock.buildtheearth.net", 19132, {
        timeout: 1000 * 20,
        enableSRV: true,
      })
      .then((result) => {
        return {
          online: true,
          ip: "bedrock.buildtheearth.net:19132",
          edition: result.edition,
          version: {
            name: result.version.name,
            protocol: result.version.protocol,
          },
          players: {
            online: result.players.online,
            max: result.players.max,
          },
          motd: {
            raw: result.motd.raw,
            clean: result.motd.clean,
            html: result.motd.html,
          },
          srvRecord: result.srvRecord,
        };
      })
      .catch((error) => {
        if (error.toString().includes("Timed out")) {
          return {
            online: false,
            error: "Timed out",
          };
        } else {
          return {
            online: false,
            error: "Unexpected error",
          };
        }
      });
    return { java: java, bedrock: bedrock };
  }

  async pingServer(request: Request, response: Response, next: NextFunction) {
    const ips = JSON.parse(
      (await this.configRepository.findOne({ key: "ips" })).value
    );

    if (ips === undefined) {
      return index.generateError("Ips not set in Admin Settings");
    }

    const serverName = request.params.server;
    const server =
      ips[
        Object.keys(ips).find(
          (key) => key.toLowerCase() === serverName.toLowerCase()
        )
      ];

    if (server === undefined) {
      return index.generateError("Invalid Server");
    }

    const serverIp = server.split(":")[0];
    const serverPort = parseInt(server.split(":")[1]);
    return minecraftUtil
      .status(serverIp, serverPort, {
        timeout: 1000 * 20,
        enableSRV: true,
      })
      .then((result) => {
        return {
          online: true,
          ip: server,
          version: {
            name: result.version.name,
            protocol: result.version.protocol,
          },
          players: {
            online: result.players.online,
            max: result.players.max,
            sample: result.players.sample === null ? [] : result.players.sample,
          },
          motd: {
            raw: result.motd.raw,
            clean: result.motd.clean,
            html: result.motd.html,
          },
          favicon: result.favicon,
          srvRecord: result.srvRecord,
        };
      })
      .catch((error) => {
        if (error.toString().includes("Timed out")) {
          return {
            error: "Timed out",
            online: false,
          };
        } else {
          return {
            error: "Unexpected error",
            online: false,
          };
        }
      });
  }
}
