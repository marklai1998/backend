import { blockToJson, districtIdToName, statusToName } from "./DistrictUtils";
import { Block } from "../entity/Block";

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
      json.claims.districts[index].blocks.push(blockToJson(block));
    } else {
      json.claims.districts.push({
        id: block.district,
        name: districtName,
        blocks: [blockToJson(block)],
      });
    }
  }
  return json;
}
