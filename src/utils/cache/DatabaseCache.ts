import { validate } from "class-validator";
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
async function reload(updatedObject: BaseEntity | string): Promise<void> {
  if (typeof updatedObject === "string") {
    reloadFromDatabase(updatedObject);
    return;
  }
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
async function update(entity: BaseEntity, updates: any, toJsonParams?: any) {
  const { id, uid, status, ...rest } = updates;
  const changedValues = {};

  const addChange = (key: string, oldValue: any, newValue: any) => {
    changedValues[key] = {
      oldValue,
      newValue,
    };
  };

  Object.keys(rest).forEach((key) => {
    if (!(key in entity)) {
      delete rest[key];
    } else {
      const update = updateExceptions(entity.constructor.name, key, rest);
      if (update && entity[key] !== update) {
        addChange(key, entity[key], update);
      } else {
        // Transform if entity is not an object
        if (typeof entity[key] === "string" && typeof rest[key] === "object") {
          rest[key] = JSON.stringify(rest[key]);
        }
        if (entity[key] !== rest[key]) {
          addChange(key, entity[key], updates[key]);
        }
      }
    }
  });

  const updated = Object.assign(entity, rest);

  const errors = await validate(updated);
  if (errors.length > 0) {
    return {
      error: Object.values(errors[0].constraints)[0],
    };
  }

  await updated.save();
  return {
    [updated.constructor.name.toLowerCase()]: await updated.toJson(
      toJsonParams
    ),
    changedValues,
  };
}

function updateExceptions(type: string, key: any, rest: any): boolean {
  let newValue = undefined;
  // Block - Builder
  if (type === "Block" && key === "builder") {
    newValue = rest[key].join(",");
  }

  if (newValue !== undefined) {
    rest[key] = newValue;
  }

  return newValue;
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

export { loadAll, reload, findOne, find, update };
