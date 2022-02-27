import { District } from "../entity/District";
import { Block } from "../entity/Block";
import * as date from "./TimeUtils";

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
