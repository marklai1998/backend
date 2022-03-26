import * as date from "./TimeUtils";

import { Block } from "../entity/Block";
import { District } from "../entity/District";

// Children
export async function isChild(toCheck: District, parent: District) {
  if (toCheck.parent === null) return false;

  const districts = await District.find();

  let current = toCheck;
  while (current.parent !== null) {
    if (current.parent === parent.id) {
      return true;
    }
    current = districts.find((district) => district.id === current.parent);
  }
  return false;
}
export async function getDirectChildren(district: District) {
  return await District.find({ where: { parent: district.id } });
}

// Iterative stuff
export async function countBlocks(district: District) {
  const children = await getDirectChildren(district);

  if (children.length === 0) {
    return (await Block.findAndCount({ where: { district: district.id } }))[1];
  }

  let counter = 0;
  for (const child of children) {
    counter += await countBlocks(child);
  }
  return counter;
}
export async function calculateProgressForDistrict2(district: District) {
  const blocksAll = await Block.find();
  let children = await getDirectChildren(district);

  while (true) {
    if (children.length === 0) {
      const blocks = blocksAll.filter((block) => {
        return block.district === district.id;
      });
      let totalProgress = 0;
      for (const block of blocks) {
        totalProgress += block.progress;
      }
      return totalProgress / blocks.length;
    } else {
      // TODO
    }
  }
}
export async function calculateProgressForDistrict(district: District) {
  let children = await getDirectChildren(district);

  if (children.length === 0) {
    const blocks = await Block.find({ where: { district: district.id } });
    let totalProgress = 0;
    for (const block of blocks) {
      totalProgress += block.progress;
    }
    return totalProgress / blocks.length;
  }

  let totalProgress = 0;
  for (const child of children) {
    const numberBlocks = await countBlocks(child);

    if (numberBlocks === 0) continue;

    totalProgress += (await calculateProgressForDistrict(child)) * numberBlocks;
  }
  return totalProgress / (await countBlocks(district));
}
export function getBuildersOfDistrict(district: District) {}

// To JSON
export function blockToJson(block: Block, timezone?: string) {
  return {
    uid: block.uid,
    id: block.id,
    location: block.location,
    status: block.status,
    progress: block.progress,
    details: block.details,
    builders: block.builder.split(","),
    completionDate: date.parseDate(block.completionDate, timezone),
  };
}

// Converting
export async function districtIdToName(id: number) {
  const districts = await District.find();
  for (const district of districts) {
    if (district.id === id) {
      return district.name;
    }
  }
  return null;
}
export function statusToName(status: number) {
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
export function statusToNumber(status: string) {
  switch (status.toLowerCase()) {
    case "done":
      return 4;
    case "detailing":
      return 3;
    case "building":
      return 2;
    case "reserved":
      return 1;
    default:
      return 0;
  }
}
