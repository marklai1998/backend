import { Block } from "../entity/Block";
import { District } from "../entity/District";

export async function getBlocksOfDistrict(district: District) {
  return await Block.find({ district: district.id });
}

export async function getClaims(user: string) {
  const blocks = await Block.createQueryBuilder("block")
    .where("block.builder like :name", { name: `%${user}%` })
    .orderBy("district", "ASC")
    .getMany();

  const json = {
    name: user,
    claims: {
      total: 0,
      done: 0,
      detailing: 0,
      building: 0,
      reserved: 0,
      districts: [],
    },
  };
  for (const block of blocks) {
    json.claims.total++;
    json.claims[statusToName(block.status)]++;

    const districtName = await districtIdToName(block.district);
    const index = json.claims.districts.findIndex((d) => {
      return d.id === block.district;
    });
    if (index !== -1) {
      json.claims.districts[index].blocks.push(
        await block.toJson({ showDistrict: false })
      );
    } else {
      json.claims.districts.push({
        id: block.district,
        name: districtName,
        blocks: [await block.toJson({ showDistrict: false })],
      });
    }
  }
  return json;
}

// Children
export async function getDirectChildren(district: District) {
  return await District.find({ where: { parent: district.id } });
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
