import axios from "axios";
import { AdminSetting } from "../entity/AdminSetting";
import * as dbCache from "../utils/cache/DatabaseCache";

const cheerio = require("cheerio");

const URL_JAVA =
  "https://launchermeta.mojang.com/mc/game/version_manifest_v2.json";
const URL_BEDROCK = "https://minecraft.fandom.com/wiki/Protocol_version";
const URL_PAPER = "https://api.papermc.io/v2/projects/paper";
const URL_WATERFALL = "https://api.papermc.io/v2/projects/waterfall";

interface Version {
  name: string;
  protocol: string;
  type: "Snapshot" | "Release";
}

let versions_bedrock: Version[] = [];

let javaLastest: { release?: string; snapshot?: string } = {};
let javaVersions = [];

export async function fetchMinecraftVersions(): Promise<void> {
  const { data } = await axios.get(URL_JAVA);
  javaLastest = data.latest;
  javaVersions = data.versions;
}

async function fetchBedrockVersions(): Promise<void> {
  const { data } = await axios.get(URL_BEDROCK);

  const $ = cheerio.load(data);
  const tables = $("table > tbody > tr > td");

  versions_bedrock = [];
  for (let i = 0; i < tables.length; i++) {
    const e = $(tables[i]).text();

    if (!e.includes(" ")) continue;

    if (e.startsWith("Bedrock Edition")) {
      const version = e.replace("Bedrock Edition ", "");
      let protocol = $(tables[i + 1]).text();

      let counter = 1;
      while (counter <= i && isNaN(protocol)) {
        protocol = $(tables[i - counter++]).text();
      }

      versions_bedrock.push({
        name: version,
        protocol,
        type: version.includes("beta") ? "Snapshot" : "Release",
      });
    }
  }
}

async function checkForNewMinecraftVersions() {
  await fetchMinecraftVersions();
  fetchBedrockVersions().then(() => {
    const currentVersions = dbCache.findOne(AdminSetting, {
      key: "newest_versions",
    });

    const versions = JSON.parse(currentVersions.value);

    if (versions.java !== javaLastest.release) {
      // New Java Version
      versions.java = javaLastest.release;
    }

    const newestBedrock = versions_bedrock.filter(
      (v) => v.type === "Release"
    )[0];
    if (versions.bedrock !== newestBedrock.name) {
      // New Bedrock Version
      versions.bedrock = newestBedrock.name;
    }

    currentVersions.value = JSON.stringify(versions);
    currentVersions.save();
  });
}

async function countNewerVersions(
  type: string,
  version: string
): Promise<number> {
  if (javaVersions.length === 0) {
    await fetchMinecraftVersions();
  }
  if (versions_bedrock.length === 0) {
    await fetchBedrockVersions();
  }
  if (type === "Java") {
    return javaVersions
      .filter((v) => v.type === "release")
      .findIndex((v) => v.id === version);
  } else if (type === "Bedrock") {
    return versions_bedrock
      .filter((v) => v.type === "Release")
      .findIndex((v) => v.name === version);
  }
  return -1;
}

export { checkForNewMinecraftVersions, countNewerVersions };
