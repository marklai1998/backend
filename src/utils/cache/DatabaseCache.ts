import { BaseEntity } from "typeorm";
import { Block } from "../../entity/Block";
import { District } from "../../entity/District";
import { Landmark } from "../../entity/Landmark";
import { User } from "../../entity/User";
import Logger from "../Logger";

type DBCache = {
  users: User[];
  districts: District[];
  blocks: Block[];
  landmarks: Landmark[];
};

const DatabaseCache: DBCache = {
  users: null,
  districts: null,
  blocks: null,
  landmarks: null,
};

async function loadAll(): Promise<void> {
  const promises = [];
  for (const key of Object.keys(DatabaseCache)) {
    promises.push(reloadFromDatabase(key));
  }
  await Promise.allSettled(promises);
  Logger.debug("Updated cache from Database");
}
async function reload(updatedObject: BaseEntity): Promise<void> {
  if (updatedObject instanceof User) {
    reloadFromDatabase("users");
  } else if (updatedObject instanceof District) {
    reloadFromDatabase("districts");
  } else if (updatedObject instanceof Block) {
    reloadFromDatabase("blocks");
  } else if (updatedObject instanceof Landmark) {
    reloadFromDatabase("landmarks");
  }
}
async function reloadFromDatabase(type: string): Promise<void> {
  switch (type) {
    // TODO: Add other tables
    case "users":
      DatabaseCache.users = await User.find();
      break;
    case "districts":
      DatabaseCache.districts = await District.find();
      break;
    case "blocks":
      DatabaseCache.blocks = await Block.find();
      break;
    case "landmarks":
      DatabaseCache.landmarks = await Landmark.find();
      break;
  }
}

function findOne(type: string, conditions?: any) {
  return search(type, conditions, true);
}
function find(type: string, conditions?: any) {
  return search(type, conditions, false);
}

function search(type: string, conditions: any, onlyOne: boolean) {
  const res = [];
  for (const element of DatabaseCache[type]) {
    let found = true;
    if (conditions) {
      for (const [key, value] of Object.entries(conditions)) {
        if (element[key] != value) {
          found = false;
          break;
        }
      }
    }
    if (found) {
      res.push(element);
      if (onlyOne) {
        break;
      }
    }
  }
  return onlyOne ? res[0] : res;
}

export { loadAll, reload, findOne, find };
