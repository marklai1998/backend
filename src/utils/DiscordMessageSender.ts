import { districtIdToName, statusToName } from "../utils/DistrictUtils";
import { reviews } from "../cache";

import { Block } from "../entity/Block";
import { Webhook } from "../entity/Webhook";
import { District } from "../entity/District";
import { ProjectCount } from "../entity/ProjectCount";
import { AdminSetting } from "../entity/AdminSetting";
import { User } from "../entity/User";

export const Colors = {
  MineFact_Green: 0x1d9e64,
  Status_Done: 0x34ff43,
  Status_Detailing: 0xfffc47,
  Status_Building: 0xfd912a,
  Status_Reserved: 0x71abd9,
  Status_Not_Started: 0xc9312b,
  Error: 0x8b0000,
  Green: 0x0cb300,
  Yellow: 0xfcc603,
};

function progressToColor(progress: number) {
  if (progress >= 100) return ":green_circle:";
  else if (progress >= 80) return ":yellow_circle:";
  else if (progress >= 30) return ":orange_circle:";
  else return ":red_circle:";
}
function statusToColor(status: number) {
  switch (status) {
    case 4:
      return ":green_circle:";
    case 3:
      return ":yellow_circle:";
    case 2:
      return ":orange_circle:";
    case 1:
      return ":blue_circle:";
    default:
      return ":red_circle:";
  }
}

export async function sendOverview() {
  const districtIDs = JSON.parse(
    (await AdminSetting.findOne({ key: "nyc_overview_districts" })).value
  );
  const projects = await ProjectCount.find({ order: { projects: "DESC" } });
  const embeds = [
    {
      title: "New York City Overview",
      description:
        "Click [here](https://progress.minefact.de/) to open the Progress Website of New York City",
      color: Colors.MineFact_Green,
      fields: [
        {
          name: "**Overall Projects**",
          value: `» ${projects[0].projects}`,
          inline: true,
        },
        {
          name: "**Today's Projects**",
          value: `» ${projects[0].projects - projects[1].projects}`,
          inline: true,
        },
        {
          name: "**Projects to review**",
          value: `» ${reviews.total}`,
          inline: true,
        },
      ],
    },
  ];

  for (const id of districtIDs) {
    const parent = await District.findOne({ id: id });
    const children = (await District.find({ parent: id })).sort(
      (a: District, b: District) => b.progress - a.progress
    );

    if (children.length === 0) continue;

    const fields = [
      {
        name: `__${parent.name}__`,
        value: `${parent.progress.toFixed(2)}%`,
        inline: false,
      },
    ];
    for (const district of children) {
      fields.push({
        name: `${progressToColor(district.progress)} ${district.name}`,
        value: `${district.progress.toFixed(2)}%`,
        inline: true,
      });
    }

    while (fields.length % 3 !== 1) {
      fields.push({
        name: "‎",
        value: "‎",
        inline: true,
      });
    }

    embeds.push({
      title: "",
      description: "",
      color: Colors.MineFact_Green,
      fields,
    });
  }

  // District with most progress
  const district = await District.createQueryBuilder("district")
    .where("parent = :parent", { parent: districtIDs[0] })
    .andWhere("progress < 100")
    .orderBy("progress", "DESC")
    .getOne();
  const blocks = await Block.createQueryBuilder("blocks")
    .where("districtId = :district", { district: district.id })
    .andWhere("status < 4")
    .orderBy("id")
    .getMany();

  const fields = [];
  for (const block of blocks) {
    if (fields.length > 25) break;
    fields.push({
      name: `${statusToColor(block.status)} Block #${block.id}`,
      value:
        `» ${block.progress.toFixed(2)}%\n` +
        `» Details: ${block.details ? ":white_check_mark:" : ":x:"}\n` +
        `» Builder: ${block.builder}`,
      inline: true,
    });
  }
  while (fields.length % 3 !== 0) {
    fields.push({
      name: "‎",
      value: "‎",
      inline: true,
    });
  }

  embeds.push({
    title: `${district.name}`,
    description: `There ${blocks.length === 1 ? "is" : "are"} **${
      blocks.length
    }** Block${blocks.length === 1 ? "" : "s"} left!`,
    color: Colors.MineFact_Green,
    fields: fields,
  });

  const body = {
    content: "",
    embeds,
  };

  await sendWebhook("nyc_overview", body);
}

export async function sendDistrictChange({
  block = null,
  title = "No title set",
  statusChanged = false,
  oldStatus = null,
  oldValue = null,
  newValue = null,
  user = null,
}: {
  block?: Block;
  title?: string;
  statusChanged?: boolean;
  oldStatus?: number;
  oldValue?: string | number | boolean;
  newValue?: string | number | boolean;
  user?: User;
} = {}) {
  if (block === null) return;

  let color = Colors.MineFact_Green;
  switch (block.status) {
    case 4:
      color = Colors.Status_Done;
      break;
    case 3:
      color = Colors.Status_Detailing;
      break;
    case 2:
      color = Colors.Status_Building;
      break;
    case 1:
      color = Colors.Status_Reserved;
      break;
    default:
      color = Colors.Status_Not_Started;
      break;
  }

  const type = title.split(" ")[0];

  const fields = [
    {
      name: "District",
      value: block.district.name,
      inline: true,
    },
    {
      name: "Block",
      value: block.id,
      inline: true,
    },
    {
      name: "Status",
      value: `${
        statusChanged ? `${statusToName(oldStatus, true)} → ` : ""
      }${statusToName(block.status, true)}`,
      inline: true,
    },
  ];
  // Value
  if (type === "Builder") {
    if (newValue !== null) {
      // Build builder string
      let builders = "";
      for (const builder of block.builder.split(",")) {
        if (builder === newValue) {
          if (title.split(" ")[1] === "Added") {
            builders += `- **${builder}**\n`;
          } else if (title.split(" ")[1] === "Removed") {
            builders += `- ~~${builder}~~\n`;
          } else if (title.split(" ")[1] === "Updated") {
            builders += `- ${builder}\n`;
          }
        } else {
          builders += `- ${builder}\n`;
        }
      }

      fields.push({
        name: type,
        value: builders,
        inline: true,
      });
    }
  } else {
    if (oldValue !== null && newValue !== null) {
      fields.push({
        name: type,
        value: `${oldValue} → ${newValue}`,
        inline: true,
      });
    }
  }

  const body = {
    content: "",
    embeds: [
      {
        author: {
          name: user.username,
          icon_url:
            user.picture || `https://mc-heads.net/avatar/${user.username}`,
        },
        title:
          statusChanged && block.status === 4
            ? "New Block Completed :tada:"
            : statusChanged
            ? "Status Updated"
            : title,
        description: "",
        color: color,
        timestamp: new Date().toISOString(),
        footer: {
          text: "MineFact Network",
          icon_url:
            "https://cdn.discordapp.com/avatars/422633274918174721/7e875a4ccb7e52097b571af1925b2dc1.png",
        },
        fields: fields,
      },
    ],
  };

  await sendWebhook("district_log", body);

  // Modify embed for #new-york-city channel
  body.embeds[0].description = `__**Last Change**__\n${body.embeds[0].title}`;
  body.embeds[0].title = "";
  delete body.embeds[0].author;
  await sendWebhook("last_change", body);
}

export async function sendWebhook(name: string, body: object) {
  const webhook = await Webhook.findOne({ name: name });

  if (!webhook) {
    // TODO send Error Webhook
    return;
  }

  webhook.send(body);
}
