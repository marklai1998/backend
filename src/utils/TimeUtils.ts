import { BTEconnection, fetch, port } from "../index";
import { PlayerStat, createMissingDayEntries } from "../entity/PlayerStat";

import Logger from "./Logger";
import { ProjectCount } from "../entity/ProjectCount";
import { createMissingProjectEntries } from "../entity/ProjectCount";
import { sendOverview } from "./DiscordMessageSender";
import { Cache } from "../cache";
import { getCpuUsage } from "./CpuUsage";
import { checkServerStatus } from "./ServerStatus";

export function parseDate(date: string | Date, locale?: string) {
  if (date === null) {
    return null;
  }
  return new Date(date).toLocaleDateString(locale);
}

export var memoryUsage = { cpu: [], ram: [] };

export function executeEveryXMinutes(
  startHour: number,
  startMinute: number,
  startSecond: number,
  startMillisecond: number,
  callback: any,
  intervalMinutes: number
) {
  var now = new Date();
  var millisTill =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      startHour,
      startMinute,
      startSecond,
      startMillisecond
    ).getTime() - now.getTime();
  if (millisTill < 0) {
    millisTill += 60000 * intervalMinutes;
  }
  setTimeout(function () {
    callback();
    setInterval(callback, 60000 * intervalMinutes);
  }, millisTill);
}

export function executeEveryXMinutesStartingNow(
  callback: any,
  intervalMinutes: number
) {
  const now = new Date();
  executeEveryXMinutes(
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
    callback,
    intervalMinutes
  );
}

export function startIntervals() {
  // Add missing projects if backend was offline at 0:00
  createMissingProjectEntries();

  // Add new Project Count at 0:00
  executeEveryXMinutes(
    0,
    0,
    0,
    0,
    async function () {
      Logger.info("Adding new Project Count for today");
      const allProjects = await ProjectCount.find({
        order: { date: "ASC" },
      });
      const last = allProjects[allProjects.length - 1];

      const projectCount = new ProjectCount();
      projectCount.date = new Date();
      projectCount.projects = last.projects;

      await projectCount.save();
      sendOverview();
    },
    1440
  );

  // Add new Player Stat at 0:00
  executeEveryXMinutes(
    0,
    0,
    0,
    0,
    async function () {
      const playersRaw = await fetch(
        `http://localhost:${port}/api/network/ping?type=java`
      );
      const json = await playersRaw.json();
      const players = json.java.players;

      const stats = {
        total: 0,
      };
      for (const key in players.groups) {
        stats[key] = 0;
      }

      Logger.info("Adding new Player Count for today");
      const playerStat = new PlayerStat();
      playerStat.date = new Date();
      playerStat.max = JSON.stringify(stats);

      stats["counter"] = 0;
      playerStat.avg = JSON.stringify(stats);
      await playerStat.save();
    },
    1440
  );

  trackPlayerCount();

  trackProjectCount();

  // Track system memory
  executeEveryXMinutesStartingNow(async function () {
    const ram = Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + "MB";
    // const cpu =
    //   Math.round(process.cpuUsage().user / 1000 / 1000 / os.cpus().length) +
    //   "%";
    const cpu = Math.round(getCpuUsage() * 100) / 100;
    if (memoryUsage.ram.length >= 15) {
      memoryUsage.cpu.shift();
      memoryUsage.ram.shift();
    }
    // memoryUsage.cpu.push(cpu);
    memoryUsage.cpu.push(cpu + "%");
    memoryUsage.ram.push(ram);
    // if (parseInt(cpu.split("%")[0]) > 50) {
    //   if (parseInt(cpu.split("%")[0]) > 80) {
    if (cpu > 50) {
      if (cpu > 80) {
        Logger.warn(
          "System is overloaded, please change memory allocation or restart the process. A long state of high CPU usage is not recommended. Current CPU usage: " +
            cpu +
            "%"
        );
        Logger.warn("");
        Logger.warn("");
        Logger.error("----------------------");
        Logger.error("CPU usage is over 80%");
        Logger.error("----------------------");
        Logger.warn("");
        Logger.warn("");
      } else {
        Logger.warn("CPU usage is over 50% (" + cpu + "%)");
      }
    }
  }, 1);

  // Request server status
  executeEveryXMinutesStartingNow(checkServerStatus, 1);
}

function trackPlayerCount() {
  executeEveryXMinutesStartingNow(async function () {
    const playersRaw = await fetch(
      `http://localhost:${port}/api/network/ping?type=java`
    );
    const json = await playersRaw.json();
    const players = json.java.players;

    if (!players) return;

    const date = new Date();
    Logger.info(
      `Updating Player Count for ${date.toISOString().split("T")[0]}`
    );
    let playerStat = await PlayerStat.findOne({
      date: new Date(
        `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
      ),
    });

    if (!playerStat) {
      await createMissingDayEntries();
      playerStat = await PlayerStat.findOne({
        date: new Date(
          `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
        ),
      });
    }

    const maxJson = JSON.parse(playerStat.max);
    const avgJson = JSON.parse(playerStat.avg);

    for (const key in players.groups) {
      // Check max players
      if (players.groups[key] > maxJson[key]) {
        maxJson[key] = players.groups[key];
      }
      // Check avg players
      avgJson[key] += players.groups[key];
    }
    // Total & counter
    if (players.total > maxJson.total) {
      maxJson.total = players.total;
    }
    avgJson.counter++;
    avgJson.total += players.total;

    // Update database entry
    playerStat.max = JSON.stringify(maxJson);
    playerStat.avg = JSON.stringify(avgJson);
    playerStat.save();
  }, 1);
}

async function trackProjectCount() {
  executeEveryXMinutesStartingNow(async function () {
    await BTEconnection.query(
      "SELECT * FROM `BuildingServers`",
      async (error, results, fields) => {
        if (error) Logger.error(error);
        var count = 0;
        var reviewCount = 0;
        for (const server of results) {
          count += server.Projects;
          reviewCount += server.ToReview;
        }
        const date = new Date();
        var project = await ProjectCount.findOne({
          date: new Date(
            `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
          ),
        });

        // Update Cache
        Cache.projects_total = count;

        var updateOverview = false;
        if (count > project.projects) {
          Logger.info(
            `Setting projects from ${project.projects} to ${count} (${project.date})`
          );
          project.projects = count;
          await project.save();
          updateOverview = true;
        }
        if (reviewCount !== Cache.reviews) {
          Logger.info(
            `Setting reviews from ${Cache.reviews} to ${reviewCount}`
          );
          Cache.reviews = reviewCount;
          updateOverview = true;
        }
        if (updateOverview) {
          sendOverview();
        }
      }
    );
  }, 5);
}
export function calculateStatus(cpu, ram, dbstatus) {
  if (!dbstatus) {
    return "outage";
  }
  if (cpu >= 70) {
    return "overload";
  }
  if (cpu >= 60) {
    return "danger";
  }
  if (cpu >= 50) {
    return "warning";
  }
  if (ram >= 90) {
    return "danger";
  }
  if (ram >= 80) {
    return "overload";
  }
  if (ram >= 70) {
    return "warning";
  }
  return "ok";
}
