import { Request, Response } from "express";

import { District } from "../../entity/District";
import { PlayerStat } from "../../entity/PlayerStat";
import { ProjectCount } from "../../entity/ProjectCount";

export const get = async (req: Request, res: Response) => {
  const districts = await District.find();
  const nyc = districts.find((d) => d.name == "New York City");

  const playersRw = await PlayerStat.find({
    take: 30,
    order: { date: "DESC" },
  });
  var players = [];
  for (const s of playersRw) {
    const date = new Date(s.date);
    const dateString = `${date.getDate()}.${
      date.getMonth() + 1
    }.${date.getFullYear()}`;

    const avgData = JSON.parse(s.avg);
    const avg = {};
    for (const key in avgData) {
      if (key === "counter") continue;

      if (avgData.counter === 0) {
        avg[key] = 0;
      } else {
        avg[key] = avgData[key] / avgData.counter;
      }
    }

    players.push({
      date: s.date,
      peaks: JSON.parse(s.max),
      averages: avg,
    });
  }

  const projectsRw = await ProjectCount.find({
    take: 30,
    order: { date: "DESC" },
  });
  var projects = [];
  for (const p of projectsRw) {
    projects.push({
      date: p.date,
      projects: p.projects,
    });
  }

  return res.send({
    blocks: {
      total: nyc.blocksDone + nyc.blocksLeft,
      done: nyc.blocksDone,
      left: nyc.blocksLeft,
    },
    districts: {
      count: districts.length,
      boroughs: districts.filter((d: any) => d.parent == 1).length,
      progress: districts
        .filter((d: any) => d.parent == 1)
        .map((d) => ({ name: d.name, progress: d.progress })),
    },
    players,
    projects,
  });
};
