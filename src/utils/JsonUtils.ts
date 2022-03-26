import { blockToJson, districtIdToName, statusToName } from "./DistrictUtils";

import { Block } from "../entity/Block";

export function setAttributeJson(json: object, path: string, value: any) {
  var k = json;
  var steps = path.split(".");
  var last = steps.pop();
  steps.forEach((e) => (k[e] = k[e] || {}) && (k = k[e]));
  k[last] = value;
}

export function dynamicSort(property: string) {
  var sortOrder = 1;
  if (property[0] === "-") {
    sortOrder = -1;
    property = property.substr(1);
  }
  return function (a, b) {
    /* next line works with strings and numbers,
     * and you may want to customize it to your needs
     */
    var result =
      a[property] > b[property] ? -1 : a[property] < b[property] ? 1 : 0;
    return result * sortOrder;
  };
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
