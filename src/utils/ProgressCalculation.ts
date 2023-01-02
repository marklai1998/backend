import {
  districtIdToDistrict,
  getBlocksOfDistrict,
  getDirectChildren,
} from "../utils/DistrictUtils";

import * as dbCache from "../utils/cache/DatabaseCache";
import { District } from "../entity/District";
import Logger from "./Logger";

export async function recalculateAll(district: number) {
  await recalculateDistrictBlocksDoneLeft(district);
  await recalculateDistrictProgress(district);
  await recalculateDistrictStatus(district);
}

export async function recalculateDistrictProgress(districtID: number) {
  const district = await District.findOneBy({ id: districtID });

  if (!district) return;

  const children = await getDirectChildren(district);
  if (children.length === 0) {
    const blocks = await getBlocksOfDistrict(
      await districtIdToDistrict(districtID)
    );

    if (!blocks || blocks.length === 0) return;

    let progress = 0;
    for (const block of blocks) {
      progress += block.progress;
    }
    progress /= blocks.length;

    Logger.info(
      `District Progress changed - District: ${district.name}, Progress: ${district.progress} -> ${progress}`
    );

    district.progress = progress;
    await district.save();
  } else {
    let progress = 0;
    for (const child of children) {
      progress += child.progress * (child.blocksDone + child.blocksLeft);
    }
    progress /= district.blocksDone + district.blocksLeft;

    Logger.info(
      `Borough Progress changed - District: ${district.name}, Progress: ${district.progress} -> ${progress}`
    );

    district.progress = progress;
    await district.save();
  }
  if (district.parent) {
    recalculateDistrictProgress(district.parent);
  } else {
    // Update district cache
    dbCache.reloadAll("districts");
  }
}

export async function recalculateDistrictBlocksDoneLeft(districtID: number) {
  const district = await District.findOneBy({ id: districtID });

  if (!district) return;

  const children = await getDirectChildren(district);
  if (children.length === 0) {
    const blocks = await getBlocksOfDistrict(
      await districtIdToDistrict(districtID)
    );

    if (!blocks || blocks.length === 0) return;

    const blockCounts = {
      done: 0,
      left: 0,
    };
    for (const block of blocks) {
      if (block.status === 4) {
        blockCounts.done++;
      } else {
        blockCounts.left++;
      }
    }

    Logger.info(
      `District Blocks Done/Left changed - District: ${district.name}, Done: ${district.blocksDone} -> ${blockCounts.done}, Left: ${district.blocksLeft} -> ${blockCounts.left}`
    );

    district.blocksDone = blockCounts.done;
    district.blocksLeft = blockCounts.left;
    await district.save();
  } else {
    const blockCounts = {
      done: 0,
      left: 0,
    };
    for (const child of children) {
      blockCounts.done += child.blocksDone;
      blockCounts.left += child.blocksLeft;
    }

    Logger.info(
      `Borough Blocks Done/Left changed - District: ${district.name}, Done: ${district.blocksDone} -> ${blockCounts.done}, Left: ${district.blocksLeft} -> ${blockCounts.left}`
    );

    district.blocksDone = blockCounts.done;
    district.blocksLeft = blockCounts.left;
    await district.save();
  }
  if (district.parent) {
    recalculateDistrictBlocksDoneLeft(district.parent);
  }
}

export async function recalculateDistrictStatus(districtID: number) {
  const district = await District.findOneBy({ id: districtID });
  const oldStatus = district.status;
  let changed = false;

  if (!district) return;

  if (
    district.progress === 100 &&
    district.blocksLeft === 0 &&
    oldStatus !== 4
  ) {
    Logger.info(
      `District Status changed - District: ${district.name}, Status: ${oldStatus} -> 4, Progress: ${district.progress}`
    );
    district.status = 4;
    district.completionDate = new Date();
    changed = true;
  } else if (district.progress === 100 && oldStatus !== 3) {
    Logger.info(
      `District Status changed - District: ${district.name}, Status: ${oldStatus} -> 3, Progress: ${district.progress}`
    );
    district.status = 3;
    changed = true;
  } else if (district.progress > 0 && oldStatus !== 2) {
    Logger.info(
      `District Status changed - District: ${district.name}, Status: ${oldStatus} -> 2, Progress: ${district.progress}`
    );
    district.status = 2;
    changed = true;
  } else if (district.progress === 0 && oldStatus !== 0) {
    Logger.info(
      `District Status changed - District: ${district.name}, Status: ${oldStatus} -> 0, Progress: ${district.progress}`
    );
    district.status = 0;
    changed = true;
  }

  if (changed) {
    if (oldStatus === 4) {
      district.completionDate = null;
    }

    await district.save();
  }
}
