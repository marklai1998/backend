import { Block } from "../entity/Block";
import { District } from "../entity/District";

export async function getBlocksOfDistrict(district: District) {
  return Block.find({
    where: { district: district.id },
    order: { id: "ASC" },
  });
}

export async function getClaims(user: string) {
  const blocksRaw = await Block.find();
  const blocks = blocksRaw.filter((b: Block) => {
    if (b.builder === null) return false;
    const builders = b.builder.split(",");
    for (const builder of builders) {
      if (builder.toLowerCase().includes(user.toLowerCase())) {
        return true;
      }
    }
    return false;
  });

  const json = {
    name: user,
    claims: {
      total: blocks.length,
      done: blocks.filter((b) => b.status === 4).length,
      detailing: blocks.filter((b) => b.status === 3).length,
      building: blocks.filter((b) => b.status === 2).length,
      reserved: blocks.filter((b) => b.status === 1).length,
      districts: [],
    },
  };
  for (const block of blocks) {
    const districtName = await districtIdToName(block.district);
    const index = json.claims.districts.findIndex((d) => {
      return d.id === block.district;
    });
    if (index !== -1) {
      json.claims.districts[index].blocks.push(
        block.toJson({ showDistrict: false })
      );
    } else {
      json.claims.districts.push({
        id: block.district,
        name: districtName,
        blocks: [block.toJson({ showDistrict: false })],
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
  return (await District.findOneBy({ id: id })).name;
}
export async function districtIdToDistrict(id: number): Promise<District> {
  return await District.findOneBy({ id: id });
}
export function statusToName(status: number, formatted = false) {
  switch (status) {
    case 4:
      return formatted ? "Done" : "done";
    case 3:
      return formatted ? "Detailing" : "detailing";
    case 2:
      return formatted ? "Building" : "building";
    case 1:
      return formatted ? "Reserved" : "reserved";
    default:
      return formatted ? "Not Started" : "not_started";
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

export function calculateCenterOfLatLong(locations: any[]) {
  const length = locations.length;

  if (length === 0) {
    return [];
  }

  let x = 0,
    y = 0,
    z = 0;

  for (const loc of locations) {
    const lat = (loc[0] * Math.PI) / 180;
    const lon = (loc[1] * Math.PI) / 180;

    x += Math.cos(lat) * Math.cos(lon);
    y += Math.cos(lat) * Math.sin(lon);
    z += Math.sin(lat);
  }

  x /= length;
  y /= length;
  z /= length;

  const lon = Math.atan2(y, x);
  const hyp = Math.sqrt(x * x + y * y);
  const lat = Math.atan2(z, hyp);

  return [(lat * 180) / Math.PI, (lon * 180) / Math.PI];
}

export function calculateAreaOfLatLong(locations: any[]) {
  locations.push(locations[0]);
  const R = 6378137;
  let area = 0.0;
  if (locations.length > 2) {
    for (let i = 0; i < locations.length - 1; i++) {
      const p1 = locations[i];
      const p2 = locations[i + 1];
      area +=
        convert2Radian(p2[1] - p1[1]) *
        (2 + Math.sin(convert2Radian(p1[0])) + Math.sin(convert2Radian(p2[0])));
    }

    area = (area * R * R) / 2.0;
  }

  return Math.abs(area);
}

function convert2Radian(input: number) {
  return (input * Math.PI) / 180;
}
