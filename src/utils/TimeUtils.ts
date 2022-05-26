import { fetch, port } from "../index";

import { PlayerStat, createMissingDayEntries } from "../entity/PlayerStat";
import { createMissingProjectEntries } from "../entity/ProjectCount";
import { ProjectCount } from "../entity/ProjectCount";
import { sendOverview } from "./DiscordMessageSender";

const os = require("os");

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
      const playerStat = new PlayerStat();
      playerStat.date = new Date();
      playerStat.max = JSON.stringify({
        total: 0,
        lobby: 0,
        building: 0,
        buildteams: 0,
        other: 0,
      });
      playerStat.avg = JSON.stringify({
        total: 0,
        lobby: 0,
        building: 0,
        buildteams: 0,
        other: 0,
        counter: 0,
      });
      playerStat.save();
    },
    1440
  );

  trackPlayerCount();

  // Track system memory

  const now = new Date();
  executeEveryXMinutes(
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
    async function () {
      const ram =
        Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + "MB";
      const cpu =
        Math.round(process.cpuUsage().user / 1000 / 1000 / os.cpus().length) +
        "%";
      if (memoryUsage.ram.length >= 15) {
        memoryUsage.cpu.shift();
        memoryUsage.ram.shift();
      }
      memoryUsage.cpu.push(cpu);
      memoryUsage.ram.push(ram);
    },
    1
  );
}

function trackPlayerCount() {
  const now = new Date();

  executeEveryXMinutes(
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
    async function () {
      const playersRaw = await fetch(
        `http://localhost:${port}/api/network/ping?type=java`
      );
      const json = await playersRaw.json();
      const players = json.java.players;

      if (!players) return;

      const date = new Date();
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
    },
    1
  );
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
