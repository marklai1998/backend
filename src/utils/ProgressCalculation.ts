import {
  getBlocksOfDistrict,
  districtIdToDistrict,
  getDirectChildren,
} from "../utils/DistrictUtils";

import { District } from "../entity/District";

export async function recalculateDistrictProgress(districtID: number) {
  const district = await District.findOne({ id: districtID });

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

    district.progress = progress;
    await district.save();
  } else {
    let progress = 0;
    for (const child of children) {
      progress += child.progress * (child.blocksDone + child.blocksLeft);
    }
    progress /= district.blocksDone + district.blocksLeft;

    district.progress = progress;
    await district.save();
  }
  if (district.parent) {
    recalculateDistrictProgress(district.parent);
  }
}

export async function recalculateDistrictBlocksDoneLeft(districtID: number) {
  const district = await District.findOne({ id: districtID });

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

    district.blocksDone = blockCounts.done;
    district.blocksLeft = blockCounts.left;
    await district.save();
  }
  if (district.parent) {
    recalculateDistrictBlocksDoneLeft(district.parent);
  }
}

export async function recalculateDistrictStatus(districtID: number) {
  const district = await District.findOne({ id: districtID });
  const oldStatus = district.status;
  let changed = false;

  if (!district) return;

  if (
    district.progress === 100 &&
    district.blocksLeft === 0 &&
    oldStatus !== 4
  ) {
    district.status = 4;
    district.completionDate = new Date();
    changed = true;
  } else if (district.progress === 100 && oldStatus !== 3) {
    district.status = 3;
    changed = true;
  } else if (district.progress > 0 && oldStatus !== 2) {
    district.status = 2;
    changed = true;
  } else if (oldStatus !== 0) {
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
