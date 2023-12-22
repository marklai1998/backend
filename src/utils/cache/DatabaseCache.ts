import { AdminSetting } from "../../entity/AdminSetting";
import { Banner } from "../../entity/Banner";
import { BaseEntity } from "typeorm";
import { Block } from "../../entity/Block";
import { Claim } from "../../entity/Claim";
import { District } from "../../entity/District";
import { Event } from "../../entity/events/Event";
import { EventTeam } from "../../entity/events/EventTeam";
import { Landmark } from "../../entity/Landmark";
import Logger from "../Logger";
import { ProjectCount } from "../../entity/ProjectCount";
import { User } from "../../entity/User";
import { UserSetting } from "../../entity/UserSetting";
import { hash } from "../encryption/bcrypt";
import { validate } from "class-validator";

import _ = require("lodash");

type DBCache = {
  users: User[];
  districts: District[];
  blocks: Block[];
  claims: Claim[];
  landmarks: Landmark[];
  adminsettings: AdminSetting[];
  events: Event[];
  eventteams: EventTeam[];
  usersettings: UserSetting[];
  banners: Banner[];
  projectcounts: ProjectCount[];
};

const DatabaseCache: DBCache = {
  users: null,
  districts: null,
  blocks: null,
  claims: null,
  landmarks: null,
  adminsettings: null,
  events: null,
  eventteams: null,
  usersettings: null,
  banners: null,
  projectcounts: null,
};

async function loadAll(): Promise<number> {
  const time = new Date().getTime();
  const promises = [];
  for (const key of Object.keys(DatabaseCache)) {
    promises.push(reloadAll(key));
  }
  await Promise.allSettled(promises);
  const elapsedTime = (new Date().getTime() - time) / 1000;
  Logger.debug(`Updated cache from Database in ${elapsedTime} seconds`);
  return elapsedTime;
}
async function reload(updatedObject: BaseEntity | string): Promise<void> {
  if (typeof updatedObject === "string") {
    await reloadAll(updatedObject);
    return;
  }
  if (updatedObject instanceof User) {
    await reloadAll("users");
  } else if (updatedObject instanceof District) {
    await reloadAll("districts");
  } else if (updatedObject instanceof Block) {
    await reloadAll("blocks");
  } else if (updatedObject instanceof Claim) {
    await reloadAll("claims");
  } else if (updatedObject instanceof Landmark) {
    await reloadAll("landmarks");
  } else if (updatedObject instanceof AdminSetting) {
    await reloadAll("adminsettings");
  } else if (updatedObject instanceof Event) {
    await reloadAll("events");
  } else if (updatedObject instanceof EventTeam) {
    await reloadAll("eventteams");
  } else if (updatedObject instanceof UserSetting) {
    await reloadAll("usersettings");
  } else if (updatedObject instanceof Banner) {
    await reloadAll("banners");
  } else if (updatedObject instanceof ProjectCount) {
    await reloadAll("projectcounts");
  }
}
async function reloadAll(type: string): Promise<void> {
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
    case "claims":
      DatabaseCache.claims = await Claim.find();
      break;
    case "landmarks":
      DatabaseCache.landmarks = await Landmark.find();
      break;
    case "adminsettings":
      DatabaseCache.adminsettings = await AdminSetting.find();
      break;
    case "events":
      DatabaseCache.events = await Event.find();
      break;
    case "eventteams":
      DatabaseCache.eventteams = await EventTeam.find();
      break;
    case "usersettings":
      DatabaseCache.usersettings = await UserSetting.find();
      break;
    case "banners":
      DatabaseCache.banners = await Banner.find();
      break;
    case "projectcounts":
      DatabaseCache.projectcounts = await ProjectCount.find();
      break;
  }
}

function findOne<Type extends BaseEntity>(
  type: { new (): Type },
  conditions?: any
): Type {
  return search(type, conditions, true);
}
function find<Type extends BaseEntity>(
  type: { new (): Type },
  conditions?: any
): Type[] {
  return search(type, conditions, false);
}
async function update(entity: BaseEntity, updates: any, toJsonParams?: any) {
  const { id, uid, uuid, status, ...rest } = updates;
  const changedValues: any = {};

  const addChange = (key: string, oldValue: any, newValue: any) => {
    changedValues[key] = {
      oldValue,
      newValue,
    };
  };

  for (const key of Object.keys(rest)) {
    if (!(key in entity)) {
      delete rest[key];
    } else {
      const update = await updateExceptions(entity, key, rest);
      if (update && entity[key] !== update) {
        addChange(key, entity[key], update);
      } else {
        // Transform if entity is not an object
        if (typeof entity[key] === "string" && typeof rest[key] === "object") {
          rest[key] = JSON.stringify(rest[key]);
        }
        // Check for array equality
        if (
          !Array.isArray(entity[key]) ||
          !Array.isArray(rest[key]) ||
          !_.isEqual(entity[key], rest[key])
        ) {
          if (entity[key] !== rest[key]) {
            addChange(key, entity[key], rest[key]);
          }
        }
      }
    }
  }

  const updated = Object.assign(entity, rest);

  const errors = await validate(updated, {
    skipMissingProperties: true,
    forbidUnknownValues: false,
  });
  if (errors.length > 0) {
    return {
      error: Object.values(errors[0].constraints)[0],
    };
  }

  await updated.save();
  return {
    [updated.constructor.name.toLowerCase()]: updated.toJson
      ? await updated.toJson(toJsonParams)
      : updated,
    changedValues,
  };
}

async function updateExceptions(
  entity: BaseEntity,
  key: any,
  rest: any
): Promise<boolean> {
  let newValue = undefined;
  // Block
  if (entity instanceof Block) {
    // Builder
    if (key === "builder" && rest[key][0] === "") {
      // newValue = [];
      rest[key] = [];
    }
  }
  // User
  if (entity instanceof User) {
    // Password
    if (key === "password") {
      newValue = await hash(rest[key]);
    }
    // Username
    if (key === "username") {
      entity.old_username = entity.username;
    }
  }

  if (newValue !== undefined) {
    rest[key] = newValue;
  }

  return newValue;
}

function search<Type extends BaseEntity>(
  type: { new (): Type },
  conditions: any,
  onlyOne: boolean
) {
  const res = [];
  for (const element of DatabaseCache[type.name.toLowerCase() + "s"]) {
    let found = true;
    if (conditions) {
      for (const [key, value] of Object.entries(conditions)) {
        if (typeof element[key] === "object" && typeof value === "object") {
          if (!_.isEqual(element[key], value)) {
            found = false;
            break;
          }
        } else if (element[key] != value) {
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

export { loadAll, reloadAll, reload, findOne, find, update };
