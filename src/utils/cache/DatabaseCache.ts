import { BaseEntity } from "typeorm";
import { User } from "../../entity/User";

type DBCache = {
  users: User[];
};

const DatabaseCache: DBCache = {
  users: null,
};

async function loadAll(): Promise<void> {
  const promises = [];
  for (const key of Object.keys(DatabaseCache)) {
    promises.push(reloadFromDatabase(key));
  }
  await Promise.allSettled(promises);
}
async function reload(updatedObject: BaseEntity): Promise<void> {
  if (updatedObject instanceof User) {
    reloadFromDatabase("users");
  }
}
async function reloadFromDatabase(type: string): Promise<void> {
  switch (type) {
    // TODO: Add other tables
    case "users":
      DatabaseCache.users = await User.find();
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
        if (element[key] !== value) {
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
