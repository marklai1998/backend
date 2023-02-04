import axios from "axios";
import * as dbCache from "../utils/cache/DatabaseCache";

const cheerio = require("cheerio");

const url = "https://minecraft.fandom.com/wiki/Protocol_version";

interface Version {
  name: string;
  protocol: string;
  type: "Snapshot" | "Release";
}

let versions_java: Version[] = [];
let versions_bedrock: Version[] = [];

async function scrapeData(): Promise<void> {
  const { data } = await axios.get(url);

  const $ = cheerio.load(data);
  const tables = $("table > tbody > tr > td");

  versions_java = [];
  versions_bedrock = [];
  for (let i = 0; i < tables.length; i++) {
    const e = $(tables[i]).text();

    if (!e.includes(" ")) continue;

    if (e.startsWith("Java Edition")) {
      const version = e.replace("Java Edition ", "");
      const protocol = $(tables[i + 1]).text();
      versions_java.push({
        name: version,
        protocol,
        type: protocol.includes("x") ? "Snapshot" : "Release",
      });
    } else if (e.startsWith("Bedrock Edition")) {
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

function checkForNewMinecraftVersions() {
  scrapeData().then(() => {
    const currentVersions = dbCache.findOne("adminsettings", {
      key: "newest_versions",
    });

    const versions = JSON.parse(currentVersions.value);

    const newestJava = versions_java.filter((v) => v.type === "Release")[0];
    if (versions.java !== newestJava.name) {
      // New Java Version
      versions.java = newestJava.name;
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

function countNewerVersions(type: string, version: string): number {
  if (type === "Java") {
    return versions_java
      .filter((v) => v.type === "Release")
      .findIndex((v) => v.name === version);
  } else if (type === "Bedrock") {
    return versions_bedrock
      .filter((v) => v.type === "Release")
      .findIndex((v) => v.name === version);
  }
  return -1;
}

export { scrapeData, checkForNewMinecraftVersions, countNewerVersions };
