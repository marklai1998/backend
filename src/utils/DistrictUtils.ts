import { Block } from "../entity/Block";
import { District } from "../entity/District";

export async function getBlocksOfDistrict(district: District) {
  return await Block.find({ district: district.id });
}

export async function countGenerations(district: District): Promise<number> {
  let generations = 0;

  let children = await getDirectChildren(district);
  while (children.length > 0) {
    generations++;
    district = children[0];
    children = await getDirectChildren(children[0]);
  }

  return generations;
}

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
export async function districtIdToDistrict(id: number): Promise<District> {
  return await District.findOne({ id: id });
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
