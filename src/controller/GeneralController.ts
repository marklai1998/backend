import * as date from "../utils/TimeUtils";
import * as index from "../index";
import * as minecraftUtil from "minecraft-server-util";

import { NextFunction, Request, Response } from "express";

import { AdminSetting } from "../entity/AdminSetting";
import { Block } from "../entity/Block";
import { District } from "../entity/District";
import Logger from "../utils/Logger";
import { Stats } from "../stats";
import { getManager } from "typeorm";

const os = require("os");
const ormconfig = require("../../ormconfig.json");

export class GeneralController {
  async pingNetwork(request: Request, response: Response, next: NextFunction) {
    const type = request.query.type;

    if (
      type &&
      (typeof type !== "string" ||
        (type.toLowerCase() !== "java" && type.toLowerCase() !== "bedrock"))
    ) {
      return index.generateError("Invalid type. Select 'Java' or 'Bedrock'");
    }

    let java = undefined;
    let bedrock = undefined;

    if (!type || type.toLowerCase() === "java") {
      java = await minecraftUtil
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
    }

    if (!type || type.toLowerCase() === "bedrock") {
      bedrock = await minecraftUtil
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
    }

    return { java: java, bedrock: bedrock };
  }

  async pingServer(request: Request, response: Response, next: NextFunction) {
    const ips = JSON.parse((await AdminSetting.findOne({ key: "ips" })).value);

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

  async overview(request: Request, response: Response, next: NextFunction) {
    const districts = await District.find({
      order: { parent: "ASC" },
    });
    const blocksAll = await Block.find({
      order: { district: "ASC" },
    });

    const nyc = createDistrictObject(districts[0]);

    // Boroughs
    for (const d of districts) {
      if (d.parent === districts[0].id) {
        nyc.children.push(createDistrictObject(d));
      }
    }
    // Subboroughs
    for (let i = 0; i < districts.length; i++) {
      for (let j = 0; j < nyc.children.length; j++) {
        if (districts[i].parent === nyc.children[j].id) {
          nyc.children[j].children.push(createDistrictObject(districts[i]));
        }
      }
    }
    //Districts & Blocks
    for (let i = 0; i < districts.length; i++) {
      for (let j = 0; j < nyc.children.length; j++) {
        for (let k = 0; k < nyc.children[j].children.length; k++) {
          if (districts[i].parent === nyc.children[j].children[k].id) {
            const blocksRaw = blocksAll.filter(
              (e) => e.district === districts[i].id
            );
            const blocks = blocksRaw.map((b) => {
              return {
                uid: b.uid,
                id: b.id,
                status: b.status,
                progress: b.progress,
                details: b.details,
                builder: b.builder,
                completionDate: b.completionDate,
                center: b.getLocationCenter(),
                area: JSON.parse(b.area),
              };
            });
            nyc.children[j].children[k].children.push(
              createDistrictObject(districts[i], blocks)
            );
          }
        }
      }
    }

    // Builders
    const buildersTotal = [];
    for (const borough of nyc.children) {
      // Boroughs
      const buildersBorough = [];
      for (const subborough of borough.children) {
        // Subboroughs
        const buildersSubborough = [];
        for (const district of subborough.children) {
          // Builder
          for (const b of district.builders) {
            if (buildersSubborough.some((e) => e.name === b.name)) {
              buildersSubborough.some((e) => {
                if (e.name === b.name) {
                  e.blocks += b.blocks;
                }
              });
            } else {
              buildersSubborough.push({ name: b.name, blocks: b.blocks });
            }
          }
        }
        buildersSubborough.sort(dynamicSort("blocks"));
        subborough.builders = buildersSubborough;

        // Builder
        for (const b of subborough.builders) {
          if (buildersBorough.some((e) => e.name === b.name)) {
            buildersBorough.some((e) => {
              if (e.name === b.name) {
                e.blocks += b.blocks;
              }
            });
          } else {
            buildersBorough.push({ name: b.name, blocks: b.blocks });
          }
        }
      }
      buildersBorough.sort(dynamicSort("blocks"));
      borough.builders = buildersBorough;

      // Builder
      for (const b of borough.builders) {
        if (buildersTotal.some((e) => e.name === b.name)) {
          buildersTotal.some((e) => {
            if (e.name === b.name) {
              e.blocks += b.blocks;
            }
          });
        } else {
          buildersTotal.push({ name: b.name, blocks: b.blocks });
        }
      }
    }
    buildersTotal.sort(dynamicSort("blocks"));
    nyc.builders = buildersTotal;
    return nyc;
  }

  async adminOverview(request: Request, respone: Response, next: NextFunction) {
    const backend_version = process.env.npm_package_version;
    const manager = getManager();
    const ram = Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + "MB";
    const maxRam = Math.round(os.totalmem() / 1024 / 1024) + "MB";
    const cpu =
      Math.round(process.cpuUsage().user / 1000 / 1000 / os.cpus().length) +
      "%";
    const uptime = process.uptime();
    const platform = process.platform;
    const arch = process.arch;
    const release = process.release.name;
    const version = process.version;
    const now = new Date();
    const db = {
      version: (await manager.query("SELECT VERSION();"))[0]["VERSION()"],
      status: [manager ? "Connected" : "Disconnected"],
      databases: (await manager.query("SHOW TABLES")).map((e) => {
        return e["Tables_in_" + ormconfig.database];
      }),
      rows: (
        await manager.query(
          "SELECT SUM(TABLE_ROWS) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '" +
            ormconfig.database +
            "'"
        )
      )[0]["SUM(TABLE_ROWS)"],
    };
    return {
      status: date.calculateStatus(ram, cpu, db.status),
      ram: {
        usage: ram,
        max: maxRam,
      },
      cpu,
      history: date.memoryUsage,
      uptime: {
        processStart: new Date(now.getTime() - uptime * 1000).toLocaleString(),
        raw: uptime,
        formatted:
          uptime < 3600
            ? new Date(process.uptime() * 1000).toISOString().substr(14, 5)
            : new Date(process.uptime() * 1000).toISOString().substr(11, 8),
      },
      platform,
      arch,
      release,
      version,
      backend_version,
      database: db,
      stats: {
        total_requests: Stats.total_requests,
        successful_requests: Stats.successful_requests,
        error_requests: Stats.errors,
      },
    };
  }

  async adminQuery(request: Request, respone: Response, next: NextFunction) {
    // make query to typeorm
    const now = new Date().getTime();
    try {
      Logger.info("Executing admin query: " + request.body.query);
      const manager = getManager();
      const query = request.body.query || request.query.query;
      if (
        [
          "ADD",
          "ALTER",
          "COLUMN",
          "DELETE",
          "CREATE",
          "DATABASE",
          "DROP",
          "FOREIGN KEY",
          "INSERT",
          "JOIN",
          "PRIMARY KEY",
          "SET",
          "TRUNCATE",
          "UNION",
          "UPDATE",
          "VIEW",
        ].some((v) => query.toUpperCase().includes(v + " "))
      ) {
        Logger.warn("SQL Injection detected");
        throw new Error("SQL Injection detected");
      }
      var result = await manager.query(query);
      var parsed = result;
      if (query.includes("users")) {
        parsed = result.map((element) => {
          return {
            uid: element.uid,
            username: element.username,
            email: element.email,
            permission: element.permission,
            discord: element.discord,
            minecraft: element.minecraft,
            about: element.about,
            image: element.image,
            picture: element.picture,
          };
        });
      }

      const diff = new Date().getTime() - now;
      return {
        result: parsed,
        time: { diff, start: new Date().toISOString() },
        tables: (await manager.query("SHOW TABLES")).map((e) => {
          return e["Tables_in_" + ormconfig.database];
        }),
      };
    } catch (error) {
      Logger.error("Error executing admin query");
      Logger.error(error);
      return {
        error: error.message,
      };
    }
  }
}

function createDistrictObject(district: District, blocks?: any) {
  const json = {
    id: district.id,
    name: district.name,
    status: district.status,
    progress: district.progress,
    blocksCount: {
      total: district.blocksDone + district.blocksLeft,
      done: district.blocksDone,
      left: district.blocksLeft,
    },
    completionDate: district.completionDate,
    builders: [],
    children: blocks || [],
  };

  if (blocks !== undefined) {
    const builders = [];
    blocks.forEach((e) => {
      const buildersSplit =
        e.builder === "" || e.builder === null ? [] : e.builder.split(",");

      e.builder = buildersSplit;

      // Builders
      for (var i = 0; i < buildersSplit.length; i++) {
        if (builders.some((e) => e.name === buildersSplit[i])) {
          builders.some((e) => {
            if (e.name === buildersSplit[i]) {
              e.blocks++;
            }
          });
        } else {
          builders.push({ name: buildersSplit[i], blocks: 1 });
        }
      }
      builders.sort(dynamicSort("blocks"));
    });
    json.builders = builders;
  }
  return json;
}

function statusToName(status: number) {
  switch (status) {
    case 4:
      return "done";
    case 3:
      return "detailing";
    case 2:
      return "building";
    case 1:
      return "reserved";
    default:
      return "not_started";
  }
}

function dynamicSort(property: string) {
  var sortOrder = 1;
  if (property[0] === "-") {
    sortOrder = -1;
    property = property.substr(1);
  }
  return function (a, b) {
    /* next line works with strings and numbers,
     * and you may want to customize it to your needs
     */
    var result =
      a[property] > b[property] ? -1 : a[property] < b[property] ? 1 : 0;
    return result * sortOrder;
  };
}
