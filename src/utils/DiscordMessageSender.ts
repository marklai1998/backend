import { districtIdToName, statusToName } from "../utils/DistrictUtils";

import { Block } from "../entity/Block";
import { Webhook } from "../entity/Webhook";

export const Colors = {
  MineFact_Green: 0x1d9e64,
  Status_Done: 0x34ff43,
  Status_Detailing: 0xfffc47,
  Status_Building: 0xfd912a,
  Status_Reserved: 0x71abd9,
  Status_Not_Started: 0xc9312b,
  Error: 0x8b0000,
};

export async function sendDiscordChange({
  block = null,
  title = "No title set",
  statusChanged = false,
  oldStatus = null,
  oldValue = null,
  newValue = null,
}: {
  block?: Block;
  title?: string;
  statusChanged?: boolean;
  oldStatus?: number;
  oldValue?: string | number | boolean;
  newValue?: string | number | boolean;
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
      value: await districtIdToName(block.district),
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

  await sendWebhook("district_log", "POST", body);
}

export async function sendWebhook(name: string, method: string, body: object) {
  const webhook = await Webhook.findOne({ name: name });

  if (!webhook) {
    // TODO send Error Webhook
    return;
  }

  webhook.send({ method, body });
}
