import * as dbCache from "../../utils/cache/DatabaseCache";

import { Request, Response } from "express";

import { Block } from "../../entity/Block";
import { ProjectCount } from "../../entity/ProjectCount";
import { fetch } from "../..";

/*

Push all current blocks to the bte.net api


*/

export const get = async (req: Request, res: Response) => {
  const blocks = dbCache.find(Block);

  const data = [];

  for (const block of blocks) {
    if (block.uid <= parseInt(req.query.min.toString())) continue;
    if (block.uid > parseInt(req.query.max.toString())) continue;
    if (block.area == null || block.area.length == 0 || block.area == undefined || block.area == "[]") {
      console.log("skipping block " + block.uid);
      continue;
    }

    const area = JSON.parse(block.area).map((a: number[]) => [a[1], a[0]]);
    area.push(area[0]);

    data.push({
      owner: "3ead476f-1b69-465b-bade-70cb5737ba7a",
      area: area,
      active: true,
      finished: block.status == 4,
      name: "Block #" + block.uid + " in NYC",
    });

    console.log("sent " + block.uid);
  }

  const resp = await fetch("http://localhost:8080/api/v1/private/buildteams/761a8674-1751-490a-aba2-e8f0bc7bf011/claims", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      key: "29b5c1c695db4792b2d4d49b103a244a",
    },
    body: JSON.stringify({ data }),
  });
  const json = resp.json();
  res.send({ sent: data.length, start: req.query.min, end: req.query.max, data: json });
};
