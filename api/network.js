const db = require("../Database");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bp = require("body-parser");
const minecraftUtil = require("minecraft-server-util");

module.exports = function (app) {
  app.get("/api/network/ping", async (req, res) => {
    minecraftUtil
      .status("buildtheearth.net", 25565, {
        timeout: 1000 * 20, // timeout in milliseconds
        enableSRV: true, // SRV record lookup
      })
      .then((result) => {
        const lobby = parseInt(
          result.players.sample[2].name
            .replace("§8[§b", "")
            .replace("§8]§7 are in §dLobby", "")
        );
        const building = parseInt(
          result.players.sample[3].name
            .replace("§8[§b", "")
            .replace("§8]§7 are in §bBuilding", "")
        );
        const teams = parseInt(
          result.players.sample[4].name
            .replace("§8[§b", "")
            .replace("§8]§7 are in §aBuild Teams", "")
        );
        const data = {
          online: true,
          serverNews: result.motd.clean
            .split("\n")[1]
            .replace("|||  ", "")
            .replace("  |||", ""),
          ip: {
            default: "buildtheearth.net:25565",
            fallback: "network.buildtheearth.net:25565",
            bedrock: "bedrock.buildtheearth.net:19132",
          },
          version: {
            support: result.motd.clean
              .split("\n")[0]
              .split("|  ")[1]
              .replace("[", "")
              .replace("]", ""),
            fullName: result.version.name,
            protocol: result.version.protocol,
            name: result.version.name.split(" ")[1],
            bedrock: "latest",
          },
          players: {
            total: result.players.online,
            max: result.players.max,
            lobby: lobby,
            building: building,
            teams: teams,
            other: result.players.online - (lobby + building + teams),
          },
          motd: {
            raw: result.motd.raw,
            clean: result.motd.clean,
            rows: [
              result.motd.clean.split("\n")[0],
              result.motd.clean.split("\n")[1],
            ],
            html: result.motd.html,
          },
          favicon: result.favicon,
          srvRecord: result.srvRecord,
          error: { name: null, stacktrace: null },
        };
        res.send(data);
      })
      .catch((error) => {
        if (error.contains("Timed out")) {
          res.send({ error: { name: "Timed out", stacktrace: null } });
        } else {
          res.send({ error: { name: "Unexpected Error", stacktrace: error } });
        }
      });
  });
};

function generatePasswordToken(pw) {
  return jwt.sign(
    {
      data: pw,
    },
    "progress"
  );
}
function generateError(msg, code, stacktrace) {
  return { error: true, msg: msg, code: code, full: stacktrace };
}
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
function dynamicSort(property) {
  var sortOrder = 1;
  if (property[0] === "-") {
    sortOrder = -1;
    property = property.substr(1);
  }
  return function (a, b) {
    /* next line works with strings and numbers,
     * and you may want to customize it to your needs
     */
    var result =
      a[property] > b[property] ? -1 : a[property] < b[property] ? 1 : 0;
    return result * sortOrder;
  };
}
