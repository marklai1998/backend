const express = require("express");
const db = require("./Database");
const valid = require("./Validation");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bp = require("body-parser");
const app = express();
const minecraftUtil = require("minecraft-server-util");
const res = require("express/lib/response");
const port = 8080;

app.use(cors());
app.use(bp.json());
app.use(bp.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Status: ok");
});
app.get("/query", async (req, res) => {
  if (req.query.sleep) {
    await sleep(3000);
  }
  db.query(req.query.query, (err, result) => {
    if (err) {
      console.log(err);
      res.send(generateError("SQL Error", "sq1", err));
    } else {
      res.send(result);
    }
  });
});
app.get("/testing", async (req, res) => {
  console.log(req.body);
  res.send({ name: "ok" });
});

app.post("/login", (req, res) => {
  console.log("login");
  db.query(
    `SELECT * FROM users WHERE email = '${req.query.username}'`,

    (err, result) => {
      if (err) {
        console.log(err);
        res.send(
          generateError(
            "Error during login, please message a system administrator or try again",
            "lD1",
            err
          )
        );
      } else {
        if (result.length == 0) {
          res.send(
            generateError(
              "There is no User matching this username",
              "lUn2",
              null
            )
          );
        } else {
          jwt.verify(result[0].password, "progress", function (err, decoded) {
            if (err) {
              res.send(generateError("Invalid Password", "lPw3", err));
            } else {
              if (decoded.data == req.query.password) {
                db.query(
                  "SELECT * FROM minecraft WHERE rid = '" +
                    result[0].minecraft +
                    "'",
                  (err, result2) => {
                    if (err) {
                      console.log(err);
                      res.send(generateError("SQL Error", "sq2", err));
                    } else {
                      console.log(result2);
                      result[0].minecraft = result2[0];
                      res.send(result[0]);
                    }
                  }
                );
              } else {
                res.send(generateError("Invalid Password", "lPw4", err));
              }
            }
          });
        }
      }
    }
  );
});
app.post("/register", (req, res) => {
  if (req.body.username === undefined || req.body.password === undefined) {
    res.send(generateError("Speacify Username and Password", "R1", null));
    return;
  }
  db.query("SELECT * FROM users", (err, result) => {
    if (err) {
      console.log(err);
      res.send("Error");
    } else {
      for (var i = 0; i < result.length; i++) {
        if (result[i].name === req.body.username) {
          res.send("Username already exists");
          return;
        }
      }
      db.query(
        "INSERT INTO users (name, password) VALUES (?, ?)",
        [req.body.username, generatePasswordToken(req.body.password)],
        (err, result) => {}
      );
      res.redirect("http://localhost:3000");
    }
  });
});
app.get("/verify", (req, res) => {
  jwt.verify(req.body.token, "progress", function (err, decoded) {
    if (err) {
      res.send({ msg: "Invalid Token", error: err });
    }
    res.send("ok");
  });
});
app.get("/api/network/ping/:server", async (req, res) => {
  db.query(
    `SELECT value FROM adminsettings WHERE name = 'ips'`,
    (err, result) => {
      const ips = JSON.parse(result[0].value);

      const serverName = req.params.server;
      const server =
        ips[
          Object.keys(ips).find(
            (key) => key.toLowerCase() === serverName.toLowerCase()
          )
        ];
      if (server === undefined) {
        res.send({
          error: { name: "Invalid Server", stacktrace: null },
        });
        return;
      }
      const serverIp = server.split(":")[0];
      const serverPort = parseInt(server.split(":")[1]);
      minecraftUtil
        .status(serverIp, serverPort, {
          timeout: 1000 * 20,
          enableSRV: true,
        })
        .then((result) => {
          const time = new Date().toLocaleTimeString();
          const data = {
            online: true,
            ip: `${serverIp}:${serverPort}`,
            version: {
              name: result.version.name,
              protocol: result.version.protocol,
            },
            players: {
              online: result.players.online,
              max: result.players.max,
            },
            motd: {
              raw: result.motd.raw,
              clean: result.motd.clean,
              html: result.motd.html,
            },
            favicon: result.favicon,
            srvRecord: result.srvRecord,
            time: time,
          };
          res.send(data);
        })
        .catch((error) => {
          if (error.toString().includes("Timed out")) {
            res.send({
              error: { name: "Timed out", stacktrace: null },
              online: false,
            });
          } else {
            res.send({
              error: { name: "Unexpected Error", stacktrace: error.toString() },
            });
          }
        });
    }
  );
});

app.get("/api/network/general", async (req, res) => {
  minecraftUtil
    .status("buildtheearth.net", 25565, {
      timeout: 1000 * 20, // timeout in milliseconds
      enableSRV: true, // SRV record lookup
    })
    .then((result) => {
      db.query(
        `SELECT value FROM adminsettings WHERE name = 'ips'`,
        (err, result3) => {
          const ips = JSON.parse(result3[0].value);

          const serverName = "Hub1";
          const server =
            ips[
              Object.keys(ips).find(
                (key) => key.toLowerCase() === serverName.toLowerCase()
              )
            ];
          if (server === undefined) {
            res.send({
              error: { name: "Invalid Server", stacktrace: null },
            });
            return;
          }
          const serverIp = server.split(":")[0];
          const serverPort = parseInt(server.split(":")[1]);
          minecraftUtil
            .status(serverIp, serverPort, {
              timeout: 1000 * 20,
              enableSRV: true,
            })
            .then((result2) => {
              const time = new Date().toLocaleTimeString();
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
                time: time,

                joinable: true,
                hub: {
                  online: true,
                  version: {
                    name: result2.version.name,
                    protocol: result2.version.protocol,
                  },
                  players: {
                    online: result2.players.online,
                    max: result2.players.max,
                  },
                  motd: {
                    raw: result2.motd.raw,
                    clean: result2.motd.clean,
                    html: result2.motd.html,
                  },
                  favicon: result2.favicon,
                  srvRecord: result2.srvRecord,
                },
                servers: toArray(ips),
              };
              res.send(data);
            })
            .catch((error) => {
              if (error.toString().includes("Timed out")) {
                res.send({
                  error: { name: "Timed out", stacktrace: null },
                  online: false,
                });
              } else {
                res.send({
                  error: {
                    name: "Unexpected Error 2 ",
                    stacktrace: error.toString(),
                  },
                });
              }
            });
        }
      );
    })
    .catch((error) => {
      if (error.toString().includes("Timed out")) {
        res.send({ error: { name: "Timed out", stacktrace: null } });
      } else {
        res.send({
          error: { name: "Unexpected Error 1", stacktrace: error.toString() },
        });
      }
    });
});
app.post("/api/users/update", (req, res) => {
  var oldData = {};
  const oldV = req.body.old;
  const newV = req.body.new;
  db.query(
    "SELECT * FROM users WHERE email = ?",
    [oldV.email],
    (err, result) => {
      if (err || result.length == 0) {
        console.log(err ? err : "No user found");
        res.send(generateError("Could not find the User", "aUU1", err));
      } else {
        oldData = result[0];
      }
    }
  );
  var toSet = {};
  for (var key in newV) {
    if (newV[key] != oldData[key]) {
      toSet[key] = newV[key];
    } else {
      toSet[key] = oldData[key];
    }
  }
  console.log("queryy");
  db.query(
    "UPDATE users SET name = ?, discord = ?, about = ?, image = ?, picture = ?, password = ? WHERE email = ?",
    [
      toSet.name,
      toSet.discord,
      toSet.about,
      toSet.image,
      toSet.picture,
      generatePasswordToken(toSet.password),
      toSet.email,
    ]
  );
  console.log("w");
  res.redirect(
    "/query?query=SELECT * FROM users WHERE email = '" + toSet.email + "'"
  );
});
// Overview
app.get("/api/progress", (req, res) => {
  db.query(`SELECT * FROM districts ORDER BY parent`, (err1, districts) => {
    if (err1) {
      console.log(err1);
      res.send(generateError("SQL Error", "sq1", err1));
    } else {
      db.query(`SELECT * FROM blocks`, (err2, blocks) => {
        if (err2) {
          console.log(err2);
          res.send(generateError("SQL Error", "sq1", err2));
        } else {
          const json = {
            name: districts[0].name,
            status: districts[0].status,
            blocks_done: districts[0].blocksDone,
            blocks_left: districts[0].blocksLeft,
            progress: districts[0].progress,
            completion:
              districts[0].completionDate !== null
                ? districts[0].completionDate.toLocaleDateString()
                : null,
            boroughs: [],
          };
          var counter = 0;

          for (var i = 1; i < districts.length; i++) {
            if (districts[i].parent === districts[0].name) {
              json.boroughs[counter++] = {
                name: districts[i].name,
                status: districts[i].status,
                blocks_done: districts[i].blocksDone,
                blocks_left: districts[i].blocksLeft,
                progress: districts[i].progress,
                completion:
                  districts[i].completionDate !== null
                    ? districts[i].completionDate.toLocaleDateString()
                    : null,
                location: districts[i].location,
                subboroughs: [],
              };
            }
          }
          counter = 0;

          for (var i = 0; i < json.boroughs.length; i++) {
            for (var j = 0; j < districts.length; j++) {
              if (districts[j].parent === json.boroughs[i].name) {
                json.boroughs[i].subboroughs[counter++] = {
                  name: districts[j].name,
                  status: districts[j].status,
                  blocks_done: districts[j].blocksDone,
                  blocks_left: districts[j].blocksLeft,
                  progress: districts[j].progress,
                  completion:
                    districts[j].completionDate !== null
                      ? districts[j].completionDate.toLocaleDateString()
                      : null,
                  location: districts[j].location,
                  districts: [],
                };
              }
            }
            counter = 0;
          }

          for (var i = 0; i < json.boroughs.length; i++) {
            for (var j = 0; j < json.boroughs[i].subboroughs.length; j++) {
              for (var k = 0; k < districts.length; k++) {
                if (
                  districts[k].parent === json.boroughs[i].subboroughs[j].name
                ) {
                  json.boroughs[i].subboroughs[j].districts[counter++] = {
                    name: districts[k].name,
                    status: districts[k].status,
                    blocks_done: districts[k].blocksDone,
                    blocks_left: districts[k].blocksLeft,
                    progress: districts[k].progress,
                    completion:
                      districts[k].completionDate !== null
                        ? districts[k].completionDate.toLocaleDateString()
                        : null,
                    location: districts[k].location,
                    blocks: [],
                  };
                }
              }
              counter = 0;
            }
          }

          var districtCounter = 0;
          for (var i = 0; i < json.boroughs.length; i++) {
            for (var j = 0; j < json.boroughs[i].subboroughs.length; j++) {
              for (
                var k = 0;
                k < json.boroughs[i].subboroughs[j].districts.length;
                k++
              ) {
                for (var l = 0; l < blocks.length; l++) {
                  if (blocks[l].district === districts[districtCounter].id) {
                    json.boroughs[i].subboroughs[j].districts[k - 1].blocks[
                      counter++
                    ] = {
                      block: blocks[l].id,
                      status: blocks[l].status,
                      progress: blocks[l].progress,
                      details: blocks[l].details === 1 ? true : false,
                      builder: blocks[l].builder,
                      completion:
                        blocks[l].completionDate !== null
                          ? blocks[l].completionDate.toLocaleDateString()
                          : null,
                      location: blocks[l].location,
                    };
                  }
                }
                districtCounter++;
              }
              districtCounter = 0;
            }
          }

          res.send(json);
        }
      });
    }
  });
});

// Districts
app.get("/api/districts/:name", async (req, res) => {
  const name = req.params.name;
  if (req.query.sleep) {
    await sleep(3000);
  }
  db.query(
    "SELECT * FROM districts WHERE name = '" + name + "'",
    (err, result1) => {
      if (err) {
        console.log(err);
        res.send(generateError("SQL Error", "sq1", err));
      } else if (result1[0] != null) {
        db.query(
          "SELECT * FROM blocks WHERE district = " + result1[0].id,
          (err, result2) => {
            if (err) {
              console.log(err);
              res.send(generateError("SQL Error", "sq2", err));
            } else {
              var builders = [];
              for (var i = 0; i < result2.length; i++) {
                if (result2[i].builder.includes(" ,")) {
                  var buildersMultiple = result2[i].builder.split(",");
                  for (var j = 0; j < buildersMultiple.length; j++) {
                    if (builders.some((e) => e.name === buildersMultiple[j])) {
                      builders.some((e) => {
                        if (e.name === buildersMultiple[j]) {
                          e.blocks++;
                        }
                      });
                    } else {
                      builders.push({ name: buildersMultiple[j], blocks: 1 });
                    }
                  }
                } else {
                  if (builders.some((e) => e.name === result2[i].builder)) {
                    builders.some((e) => {
                      if (e.name === result2[i].builder) {
                        e.blocks++;
                      }
                    });
                  } else {
                    builders.push({ name: result2[i].builder, blocks: 1 });
                  }
                }
              }
              builders.sort(dynamicSort("blocks"));
              var polylocation = [];
              result1[0].location.split(";").forEach((element) => {
                polylocation.push(element.replace(" ", "").split(","));
              });

              const response = {
                id: result1[0].id,
                name: result1[0].name,
                status: result1[0].status,
                blocksDone: result1[0].blocksDone,
                blocksLeft: result1[0].blocksLeft,
                blocksTotal: result1[0].blocksDone + result1[0].blocksLeft,
                progress: result1[0].progress,
                completionDate: result1[0].completionDate,
                image: result1[0].image,
                builders: builders,
                blocks: result2,
                parent: result1[0].parent,
                about: result1[0].about,
                map: result1[0].map,
                area: polylocation,
              };
              res.send(response);
            }
          }
        );
      }
    }
  );
});
// Blocks
app.post("/api/blocks/update", (req, res) => {
  const district = req.body.district;
  const blockID = req.body.blockID;
  const progress = req.body.progress;
  const details = req.body.details;
  const builder = req.body.builder;

  valid.validateBlockUpdate
    .validate(req.body)
    .then(function (valid) {
      db.query(
        `SELECT blocks.* FROM blocks JOIN districts ON blocks.district=districts.id WHERE districts.name = '${district}' AND blocks.id = '${blockID}'`,
        (err1, result1) => {
          if (err1) {
            console.log(err1);
            res.send(generateError("SQL Error", "sq1", err1));
          } else {
            if (result1.length === 0) {
              res.send(generateError("District/Block not found", "aBU2", null));
            } else if (result1.length > 1) {
              res.send(
                generateError(
                  "More then one block found, please message a system administrator",
                  "aBU3",
                  null
                )
              );
            } else {
              db.query(
                `UPDATE blocks SET progress = '${progress}' WHERE rid = '${result1[0].rid}';` +
                  `UPDATE blocks SET details = '${
                    details ? "1" : "0"
                  }' WHERE rid = '${result1[0].rid}';` +
                  `UPDATE blocks SET builder = '${builder}' WHERE rid = '${result1[0].rid}';`,
                (err2, result2) => {
                  if (err2) {
                    console.log(err2);
                    res.send(generateError("SQL Error", "sq1", err2));
                  } else {
                    checkForChangeBlock(result1, district, blockID);
                    calculateProgressDistrict(district);
                    res.send(
                      generateSuccess(`Block ${blockID} of ${district} updated`)
                    );
                  }
                }
              );
            }
          }
        }
      );
    })
    .catch(function (err) {
      res.send(generateError(err.message, "aBU1"));
    });
});
app.post("/api/blocks/setprogress", (req, res) => {
  const district = req.body.district;
  const blockID = req.body.blockID;
  const progress = req.body.progress;

  valid.validateProgress
    .validate(req.body)
    .then(function (valid) {
      db.query(
        `SELECT blocks.* FROM blocks JOIN districts ON blocks.district=districts.id WHERE districts.name = '${district}' AND blocks.id = '${blockID}'`,
        (err1, result1) => {
          if (err1) {
            console.log(err1);
            res.send(generateError("SQL Error", "sq1", err1));
          } else {
            if (result1.length === 0) {
              res.send(
                generateError("District/Block not found", "aBSP2", null)
              );
            } else if (result1.length > 1) {
              res.send(
                generateError(
                  "More then one block found, please message a system administrator",
                  "aBSP3",
                  null
                )
              );
            } else {
              db.query(
                `UPDATE blocks SET progress = '${progress}' WHERE rid = '${result1[0].rid}'`,
                (err2, result2) => {
                  if (err2) {
                    console.log(err2);
                    res.send(generateError("SQL Error", "sq1", err2));
                  } else {
                    checkForChangeBlock(result1, district, blockID);
                    calculateProgressDistrict(district);
                    res.send(
                      generateSuccess(
                        `Progress of ${district} block ${blockID} set to ${progress}%`
                      )
                    );
                  }
                }
              );
            }
          }
        }
      );
    })
    .catch(function (err) {
      res.send(generateError(err.message, "aBSP1"));
    });
});
app.post("/api/blocks/setdetails", (req, res) => {
  const district = req.body.district;
  const blockID = req.body.blockID;
  const details = req.body.details;

  valid.validateDetails
    .validate(req.body)
    .then(function (valid) {
      db.query(
        `SELECT blocks.* FROM blocks JOIN districts ON blocks.district=districts.id WHERE districts.name = '${district}' AND blocks.id = '${blockID}'`,
        (err1, result1) => {
          if (err1) {
            console.log(err1);
            res.send(generateError("SQL Error", "sq1", err1));
          } else {
            if (result1.length === 0) {
              res.send(
                generateError("District/Block not found", "aBSD2", null)
              );
            } else if (result1.length > 1) {
              res.send(
                generateError(
                  "More then one block found, please message a system administrator",
                  "aBSD3",
                  null
                )
              );
            } else {
              db.query(
                `UPDATE blocks SET details = '${
                  details ? "1" : "0"
                }' WHERE rid = '${result1[0].rid}'`,
                (err2, result2) => {
                  if (err2) {
                    console.log(err2);
                    res.send(generateError("SQL Error", "sq1", err2));
                  } else {
                    checkForChangeBlock(result1, district, blockID);
                    res.send(
                      generateSuccess(
                        `Details of ${district} block ${blockID} set to ${details}`
                      )
                    );
                  }
                }
              );
            }
          }
        }
      );
    })
    .catch(function (err) {
      res.send(generateError(err.message, "aBSD1"));
    });
});

// Admin
app.use("/api/admin", (req, res, next) => {
  if (req.body.token || req.query.token) {
    var token = req.body.token;
    if (token === undefined) {
      token = req.query.token;
    }
    db.query(
      "SELECT * FROM users WHERE password = '" + token + "'",
      (err, result) => {
        if (err) {
          console.log(err);
          res.send(generateError("SQL Error", "sq1", err));
        } else {
          if (result[0].permissions.includes("admin")) {
            next();
          } else {
            res.send(generateError("Invalid Token", "aA", err));
          }
        }
      }
    );
  } else {
    res.send(generateError("No token specified", "aA", null));
  }
});

app.post("/api/admin/districts/update", (req, res) => {
  const district = req.body.district;
  const status = req.body.status;
  const blocksDone = req.body.blocksDone;
  const blocksLeft = req.body.blocksLeft;
  const progress = req.body.progress;
  const completionDate = req.body.completionDate;
  const image = req.body.image;
  const map = req.body.map;
  const parent = req.body.parent;
  const location = req.body.location;
  const about = req.body.about;

  valid.validateDistrictUpdateAdmin
    .validate(req.body)
    .then(function (valid) {
      db.query(
        `${
          status !== undefined
            ? `UPDATE districts SET status = '${status}' WHERE name = '${district}';`
            : ``
        }` +
          `${
            blocksDone !== undefined
              ? `UPDATE districts SET blocksDone = '${blocksDone}' WHERE name = '${district}';`
              : ``
          }` +
          `${
            blocksLeft !== undefined
              ? `UPDATE districts SET blocksLeft = '${blocksLeft}' WHERE name = '${district}';`
              : ``
          }` +
          `${
            progress !== undefined
              ? `UPDATE districts SET progress = '${progress}' WHERE name = '${district}';`
              : ``
          }` +
          `${
            completionDate !== undefined
              ? `UPDATE districts SET completionDate = '${completionDate}' WHERE name = '${district}';`
              : ``
          }` +
          `${
            image !== undefined
              ? `UPDATE districts SET image = '${image}' WHERE name = '${district}';`
              : ``
          }` +
          `${
            map !== undefined
              ? `UPDATE districts SET map = '${map}' WHERE name = '${district}';`
              : ``
          }` +
          `${
            parent !== undefined
              ? `UPDATE districts SET parent = '${parent}' WHERE name = '${district}';`
              : ``
          }` +
          `${
            location !== undefined
              ? `UPDATE districts SET location = '${location}' WHERE name = '${district}';`
              : ``
          }` +
          `${
            about !== undefined
              ? `UPDATE districts SET about = '${about}' WHERE name = '${district}';`
              : ``
          }`,
        (err, result) => {
          if (err) {
            console.log(err);
            res.send(generateError("SQL Error", "sq1", err));
          } else {
            res.send(generateSuccess(`District ${district} updated`));
          }
        }
      );
    })
    .catch(function (err) {
      res.send(generateError(err.message, "aADU1"));
    });
});
app.post("/api/admin/blocks/update", (req, res) => {
  const district = req.body.district;
  const blockID = req.body.blockID;
  const location = req.body.location;
  const status = req.body.status;
  const progress = req.body.progress;
  const details = req.body.details;
  const builder = req.body.builder;
  const completionDate = req.body.completionDate;

  valid.validateBlockUpdateAdmin
    .validate(req.body)
    .then(function (valid) {
      db.query(
        `SELECT blocks.* FROM blocks JOIN districts ON blocks.district=districts.id WHERE districts.name = '${district}' AND blocks.id = '${blockID}'`,
        (err1, result1) => {
          if (err1) {
            console.log(err1);
            res.send(generateError("SQL Error", "sq1", err1));
          } else {
            if (result1.length === 0) {
              res.send(
                generateError("District/Block not found", "aaBU2", null)
              );
            } else if (result1.length > 1) {
              res.send(
                generateError(
                  "More then one block found, please message a system administrator",
                  "aaBU3",
                  null
                )
              );
            } else {
              db.query(
                `${
                  location !== undefined
                    ? `UPDATE blocks SET location = '${location}' WHERE rid = '${result1[0].rid}';`
                    : ``
                }` +
                  `${
                    status !== undefined
                      ? `UPDATE blocks SET status = '${status}' WHERE rid = '${result1[0].rid}';`
                      : ``
                  }` +
                  `${
                    progress !== undefined
                      ? `UPDATE blocks SET progress = '${progress}' WHERE rid = '${result1[0].rid}';`
                      : ``
                  }` +
                  `${
                    details !== undefined
                      ? `UPDATE blocks SET details = '${
                          details ? "1" : "0"
                        }' WHERE rid = '${result1[0].rid}';`
                      : ``
                  }` +
                  `${
                    builder !== undefined
                      ? `UPDATE blocks SET builder = '${builder}' WHERE rid = '${result1[0].rid}';`
                      : ``
                  }` +
                  `${
                    completionDate !== undefined
                      ? `UPDATE blocks SET completionDate = '${completionDate}' WHERE rid = '${result1[0].rid}';`
                      : ``
                  }`,
                (err2, result2) => {
                  if (err2) {
                    console.log(err2);
                    res.send(generateError("SQL Error", "sq1", err2));
                  } else {
                    checkForChangeBlock(result1, district, blockID);
                    calculateProgressDistrict(district);
                    res.send(
                      generateSuccess(`Block ${blockID} of ${district} updated`)
                    );
                  }
                }
              );
            }
          }
        }
      );
    })
    .catch(function (err) {
      res.send(generateError(err.message, "aABU1"));
    });
});
app.post("/api/admin/districts/add", (req, res) => {
  const name = req.body.district;

  valid.validateDistrict
    .validate(req.body)
    .then(function (valid) {
      db.query(
        `SELECT * FROM districts WHERE name = '${name}'`,
        (err1, result1) => {
          if (err1) {
            console.log(err1);
            res.send(generateError("SQL Error", "sq1", err1));
          } else {
            if (result1.length > 0) {
              res.send(generateError("District already exists", "aADA2", null));
            } else {
              db.query(
                `INSERT INTO districts (name) VALUES ('${name}')`,
                (err2, result2) => {
                  if (err2) {
                    console.log(err2);
                    res.send(generateError("SQL Error", "sq1", err2));
                  } else {
                    res.send(generateSuccess(`District ${name} added`));
                  }
                }
              );
            }
          }
        }
      );
    })
    .catch(function (err) {
      res.send(generateError(err.message, "aADA1"));
    });
});
app.post("/api/admin/blocks/add", (req, res) => {
  const district = req.body.district;
  const blockID = req.body.blockID;

  valid.validateBlock
    .validate(req.body)
    .then(function (valid) {
      db.query(
        `SELECT blocks.* FROM blocks JOIN districts ON blocks.district=districts.id WHERE districts.name = '${district}' AND blocks.id = '${blockID}'`,
        (err1, result1) => {
          if (err1) {
            console.log(err1);
            res.send(generateError("SQL Error", "sq1", err1));
          } else {
            if (result1.length > 0) {
              res.send(generateError("Block already exists", "aABA2", null));
            } else {
              db.query(
                `SELECT * FROM districts WHERE name = '${district}'`,
                (err2, result2) => {
                  if (err2) {
                    console.log(err2);
                    res.send(generateError("SQL Error", "sq1", err2));
                  } else {
                    if (result2.length === 0) {
                      res.send(
                        generateError("District not found", "aABA3", null)
                      );
                    } else if (result2.length > 1) {
                      res.send(
                        generateError(
                          "More then one district found, please message a system administrator",
                          "aABA4",
                          null
                        )
                      );
                    } else {
                      db.query(
                        `INSERT INTO blocks (id,district) VALUES ('${blockID}','${result2[0].id}');` +
                          `UPDATE districts SET blocksLeft = blocksLeft+1 WHERE name = '${district}'`,
                        (err3, result3) => {
                          if (err3) {
                            console.log(err3);
                            res.send(generateError("SQL Error", "sq1", err3));
                          } else {
                            calculateProgressDistrict(district);
                            res.send(
                              generateSuccess(
                                `Block ${blockID} of ${district} added`
                              )
                            );
                          }
                        }
                      );
                    }
                  }
                }
              );
            }
          }
        }
      );
    })
    .catch(function (err) {
      res.send(generateError(err.message, "aABA1"));
    });
});
app.get("/api/admin/settings", (req, res) => {
  db.query("SELECT * FROM adminsettings", (err, result) => {
    if (err) {
      console.log(err);
      res.send(generateError("SQL Error", "sq1", err));
    } else {
      res.send(result);
    }
  });
});
app.post("/api/admin/settings/set", (req, res) => {
  const name = req.body.name;
  const value = req.body.value;

  valid.validateAdminSettingsUpdate
    .validate(req.body)
    .then(function (valid) {
      db.query(
        `SELECT * FROM adminsettings WHERE name = '${name}'`,
        (err1, result1) => {
          if (err1) {
            console.log(err1);
            res.send(generateError("SQL Error", "sq1", err1));
          } else {
            if (result1.length === 0) {
              db.query(
                `INSERT INTO adminsettings (name,value) VALUES ('${name}','${value}')`,
                (err2, result2) => {
                  if (err2) {
                    console.log(err2);
                    res.send(generateError("SQL Error", "sq1", err2));
                  } else {
                    res.send(generateSuccess("Setting added"));
                  }
                }
              );
            } else {
              db.query(
                `UPDATE adminsettings SET value = '${value}' WHERE name = '${name}'`,
                (err2, result2) => {
                  if (err2) {
                    console.log(err2);
                    res.send(generateError("SQL Error", "sq1", err2));
                  } else {
                    res.send(generateSuccess("Setting updated"));
                  }
                }
              );
            }
          }
        }
      );
    })
    .catch(function (err) {
      res.send(generateError(err.message, "aASS1"));
    });
});
app.post("/api/admin/districts/remove", (req, res) => {});
app.post("/api/admin/blocks/remove", (req, res) => {});
app.post("/api/admin/syncdata", (req, res) => {
  db.query(`SELECT * FROM blocks ORDER BY district`, (err1, blocks) => {
    if (err1) {
      console.log(err1);
      res.send(generateError("SQL Error", "sq1", err1));
    } else {
      db.query(`SELECT * FROM districts`, (err2, districts) => {
        if (err2) {
          console.log(err2);
          res.send(generateError("SQL Error", "sq1", err2));
        } else {
          var parents = [];
          var edits = 0;
          var currentDistrict = blocks[0].district;
          var blocksDone = 0;
          var blocksLeft = 0;
          var progress = 0;

          for (const block of blocks) {
            // Check for block inconsistency
            if (
              block.progress === 100 &&
              block.details === 1 &&
              block.status !== 4
            ) {
              db.query(`UPDATE blocks SET status = 4 WHERE rid = ${block.rid}`);
              block.status = 4;
              edits++;
            } else if (
              block.progress === 100 &&
              block.details === 0 &&
              block.status !== 3
            ) {
              db.query(`UPDATE blocks SET status = 3 WHERE rid = ${block.rid}`);
              block.status = 3;
              edits++;
            } else if (
              ((block.progress > 0 && block.progress < 100) ||
                (block.details === 1 && block.progress < 100)) &&
              block.status !== 2
            ) {
              db.query(`UPDATE blocks SET status = 2 WHERE rid = ${block.rid}`);
              block.status = 2;
              edits++;
            } else if (
              block.progress === 0 &&
              block.details === 0 &&
              block.builder !== "" &&
              block.builder !== null &&
              block.status !== 1
            ) {
              db.query(`UPDATE blocks SET status = 1 WHERE rid = ${block.rid}`);
              block.status = 1;
              edits++;
            } else if (
              block.progress === 0 &&
              block.details === 0 &&
              (block.builder === "" || block.builder === null) &&
              block.status !== 0
            ) {
              db.query(`UPDATE blocks SET status = 0 WHERE rid = ${block.rid}`);
              block.status = 0;
              edits++;
            }

            // District inconsistency
            if (currentDistrict !== block.district) {
              // Update district
              const district = districts.find(
                (element) => element.id === currentDistrict
              );

              if (blocksDone !== district.blocksDone) {
                db.query(
                  `UPDATE districts SET blocksDone = ${blocksDone} WHERE id = ${currentDistrict}`
                );
                district.blocksDone = blocksDone;
                edits++;
              }
              if (blocksLeft !== district.blocksLeft) {
                db.query(
                  `UPDATE districts SET blocksLeft = ${blocksLeft} WHERE id = ${currentDistrict}`
                );
                district.blocksLeft = blocksLeft;
                edits++;
              }
              if (progress / (blocksDone + blocksLeft) !== district.progress) {
                db.query(
                  `UPDATE districts SET progress = ${
                    progress / (blocksDone + blocksLeft)
                  } WHERE id = ${currentDistrict}`
                );
                district.progress = progress / (blocksDone + blocksLeft);
                edits++;
              }
              //Update Status
              if (
                district.progress === 100 &&
                district.blocksLeft === 0 &&
                district.status !== 4
              ) {
                db.query(
                  `UPDATE districts SET status = 4 WHERE id = ${district.id}`
                );
                edits++;
              } else if (district.progress === 100 && district.status !== 3) {
                db.query(
                  `UPDATE districts SET status = 3 WHERE id = ${district.id}`
                );
                edits++;
              } else if (district.progress > 0 && district.status !== 2) {
                db.query(
                  `UPDATE districts SET status = 2 WHERE id = ${district.id}`
                );
                edits++;
              } else if (district.progress === 0 && district.status !== 0) {
                db.query(
                  `UPDATE districts SET status = 0 WHERE id = ${district.id}`
                );
                edits++;
              }

              parents.push(district.parent);

              // Reset for next district
              currentDistrict = block.district;
              blocksDone = blocksLeft = progress = 0;
            }

            // Change counters
            block.status === 4 ? blocksDone++ : blocksLeft++;
            progress += block.progress;
          }
          // Update last district
          var district = districts.find(
            (element) => element.id === currentDistrict
          );

          if (blocksDone !== district.blocksDone) {
            db.query(
              `UPDATE districts SET blocksDone = ${blocksDone} WHERE id = ${currentDistrict}`
            );
            edits++;
          }
          if (blocksLeft !== district.blocksLeft) {
            db.query(
              `UPDATE districts SET blocksLeft = ${blocksLeft} WHERE id = ${currentDistrict}`
            );
            edits++;
          }
          if (progress / (blocksDone + blocksLeft) !== district.progress) {
            db.query(
              `UPDATE districts SET progress = ${
                progress / (blocksDone + blocksLeft)
              } WHERE id = ${currentDistrict}`
            );
            edits++;
          }
          //Update Status
          if (
            district.progress === 100 &&
            district.blocksLeft === 0 &&
            district.status !== 4
          ) {
            db.query(
              `UPDATE districts SET status = 4 WHERE id = ${district.id}`
            );
            edits++;
          } else if (
            district.progress === 100 &&
            district.blocksLeft > 0 &&
            district.status !== 3
          ) {
            db.query(
              `UPDATE districts SET status = 3 WHERE id = ${district.id}`
            );
            edits++;
          } else if (
            district.progress > 0 &&
            district.blocksLeft > 0 &&
            district.status !== 2
          ) {
            db.query(
              `UPDATE districts SET status = 2 WHERE id = ${district.id}`
            );
            edits++;
          } else if (
            district.progress === 0 &&
            district.blocksLeft > 0 &&
            district.status !== 0
          ) {
            db.query(
              `UPDATE districts SET status = 0 WHERE id = ${district.id}`
            );
            edits++;
          }

          parents.push(district.parent);

          // Check parents
          for (const parent of parents) {
            blocksDone = blocksLeft = progress = 0;
            for (const district of districts) {
              if (parent === district.parent) {
                blocksDone += district.blocksDone;
                blocksLeft += district.blocksLeft;
                progress +=
                  (district.blocksDone + district.blocksLeft) *
                  district.progress;
              }
            }

            // Update parent
            district = districts.find((element) => element.name === parent);
            if (district.blocksDone !== blocksDone) {
              db.query(
                `UPDATE districts SET blocksDone = ${blocksDone} WHERE id = ${district.id}`
              );
              edits++;
            }
            if (district.blocksLeft !== blocksLeft) {
              db.query(
                `UPDATE districts SET blocksLeft = ${blocksLeft} WHERE id = ${district.id}`
              );
              edits++;
            }
            if (district.progress !== progress / (blocksLeft + blocksDone)) {
              db.query(
                `UPDATE districts SET progress = ${
                  progress / (blocksDone + blocksLeft)
                } WHERE id = ${district.id}`
              );
              edits++;
            }
            //Update Status
            if (
              district.progress === 100 &&
              district.blocksLeft === 0 &&
              district.status !== 4
            ) {
              db.query(
                `UPDATE districts SET status = 4 WHERE id = ${district.id}`
              );
              edits++;
            } else if (
              district.progress === 100 &&
              district.blocksLeft > 0 &&
              district.status !== 3
            ) {
              db.query(
                `UPDATE districts SET status = 3 WHERE id = ${district.id}`
              );
              edits++;
            } else if (
              district.progress > 0 &&
              district.blocksLeft > 0 &&
              district.status !== 2
            ) {
              db.query(
                `UPDATE districts SET status = 2 WHERE id = ${district.id}`
              );
              edits++;
            } else if (
              district.progress === 0 &&
              district.blocksLeft > 0 &&
              district.status !== 0
            ) {
              db.query(
                `UPDATE districts SET status = 0 WHERE id = ${district.id}`
              );
              edits++;
            }
            if (district.parent !== null) {
              parents.push(district.parent);
            }
          }

          res.send(
            generateSuccess(
              edits === 0
                ? `No inconsistencies found`
                : `${edits} inconsistencies fixed`
            )
          );
        }
      });
    }
  });
});

// Minecraft
app.get("/api/minecraft/user", (req, res) => {
  var id = req.query.uuid;
  var type = "uuid";
  if (id === undefined) {
    id = req.query.username;
    type = "name";
  }
  if (id === undefined) {
    res.send(generateError("Specify username or uuid", "aMU1"));
    return;
  }
  db.query(`SELECT * FROM minecraft WHERE ${type} = '${id}'`, (err, result) => {
    if (err) {
      console.log(err);
      res.send(generateError("SQL Error", "sq1", err));
    } else {
      res.send({
        uuid: result[0].uuid,
        username: result[0].name,
        rank: result[0].rank,
        settings: JSON.parse(result[0].settings),
      });
    }
  });
});
app.get("/api/minecraft/users", (req, res) => {
  db.query(`SELECT * FROM minecraft`, (err, result) => {
    if (err) {
      console.log(err);
      res.send(generateError("SQL Error", "sq1", err));
    } else {
      const json = [];
      for (var i = 0; i < result.length; i++) {
        json[i] = {
          uuid: result[i].uuid,
          username: result[i].name,
          rank: result[i].rank,
          settings: JSON.parse(result[i].settings),
        };
      }
      res.send(json);
    }
  });
});
app.post("/api/minecraft/registerUser", checkUUID, (req, res) => {
  const uuid = req.body.uuid;
  const name = req.body.username;
  const rank = req.body.rank;
  const settings = req.body.settings;

  if (name === undefined || rank === undefined || settings === undefined) {
    res.send(
      generateError("Specify UUID, Username, Rank and Settings", "aMRU1")
    );
    return;
  }
  db.query(
    `SELECT * FROM minecraft WHERE uuid = '${uuid}'`,
    (err1, result1) => {
      if (err1) {
        console.log(err1);
        res.send(generateError("SQL Error", "sq1", err1));
      } else {
        if (result1.length >= 1) {
          res.send(generateError("User already registered", "aMRU2"));
        } else {
          db.query(
            `INSERT INTO minecraft (uuid,name,settings,rank) VALUES ('${uuid}','${name}','${settings}','${rank}')`,
            (err2, result2) => {
              if (err2) {
                console.log(err2);
                res.send(generateError("SQL Error", "sq1", err2));
              } else {
                res.send(generateSuccess("User registered"));
              }
            }
          );
        }
      }
    }
  );
});
app.post("/api/minecraft/updateUser", checkUUID, (req, res) => {
  const uuid = req.body.uuid;
  const type = req.body.type;
  const value = req.body.value;

  //Error handling
  if (
    typeof type !== "string" &&
    type.toLowerCase() !== "name" &&
    type.toLowerCase() !== "rank"
  ) {
    res.send(
      generateError("Invalid type. Available types: name, rank", "aMUU3")
    );
    return;
  }

  db.query(
    `SELECT * FROM minecraft WHERE uuid = '${uuid}'`,
    (err1, result1) => {
      if (err1) {
        console.log(err1);
        res.send(generateError("SQL Error", "sq1", err1));
      } else {
        if (result1.length === 0) {
          res.send(`UUID ${uuid} not found`, "aMUU4");
        } else if (result1.length > 1) {
          res.send(
            "More then one user found, please message a system administrator",
            "aMUU5"
          );
        } else {
          db.query(
            `UPDATE minecraft SET ${type} = '${value}' WHERE uuid = '${uuid}'`,
            (err2, result2) => {
              if (err2) {
                console.log(err2);
                res.send(generateError("SQL Error", "sq1", err2));
              } else {
                res.send(generateSuccess("User updated"));
              }
            }
          );
        }
      }
    }
  );
});
app.post("/api/minecraft/setSettings", checkUUID, (req, res) => {
  const uuid = req.body.uuid;
  const type = req.body.type;
  const value = req.body.value;

  if (type === undefined || value === undefined) {
    res.send(generateError("Specify UUID, type and value", "aMSS1"));
    return;
  }

  db.query(
    `SELECT * FROM minecraft WHERE uuid = '${uuid}'`,
    (err1, result1) => {
      if (err1) {
        console.log(err1);
        res.send(generateError("SQL Error", "sq1", err1));
      } else {
        if (result1.length === 0) {
          res.send(`UUID ${uuid} not found`, "aMSS2");
        } else if (result1.length > 1) {
          res.send(
            "More then one user found, please message a system administrator",
            "aMSS3"
          );
        } else {
          const settings = JSON.parse(result1[0].settings);

          setAttributeJson(settings, type, value);

          db.query(
            `UPDATE minecraft SET settings = '${JSON.stringify(
              settings
            )}' WHERE uuid = '${uuid}'`,
            (err2, result2) => {
              if (err2) {
                console.log(err2);
                res.send(generateError("SQL Error", "sq1", err2));
              } else {
                res.send(generateSuccess("User Settings updated"));
              }
            }
          );
        }
      }
    }
  );
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

function generatePasswordToken(pw) {
  return jwt.sign(
    {
      data: pw,
    },
    "progress"
  );
}
function generateError(msg, code, stacktrace) {
  return { success: false, msg: msg, code: code, full: stacktrace };
}
function generateSuccess(msg, newData) {
  return { success: true, msg: msg, newData: newData };
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
function toArray(json) {
  var result = [];
  for (var key in json) {
    result.push({ value: json[key], key });
  }
  return result;
}
function setAttributeJson(json, path, value) {
  var k = json;
  var steps = path.split(".");
  var last = steps.pop();
  steps.forEach((e) => (k[e] = k[e] || {}) && (k = k[e]));
  k[last] = value;
}

// Follow-up changes
function checkForChangeBlock(before, district, block) {
  const oldStatus = before[0].status;
  db.query(
    `SELECT blocks.* FROM blocks JOIN districts ON blocks.district=districts.id WHERE districts.name = '${district}' AND blocks.id = '${block}'`,
    (err, result) => {
      if (err) {
        console.log(err);
        res.send(generateError("SQL Error", "sq1", err));
      } else {
        const data = result[0];
        var newStatus = undefined;
        var date = undefined;

        if (data.progress === 100 && data.details === 1) {
          if (oldStatus !== 4) {
            // Status changed to Completed
            newStatus = 4;

            date = `'${new Date().toISOString().split("T")[0]}'`;
          }
        } else if (data.progress === 100 && data.details === 0) {
          if (oldStatus !== 3) {
            // Status changed to Detailing
            newStatus = 3;

            if (oldStatus === 4) {
              date = null;
            }
          }
        } else if (data.progress > 0 || data.details === 1) {
          if (oldStatus !== 2) {
            // Status changed to Building
            newStatus = 2;

            if (oldStatus === 4) {
              date = null;
            }
          }
        } else if (
          data.progress === 0 &&
          data.details === 0 &&
          data.builder !== ""
        ) {
          if (oldStatus !== 1) {
            // Status changed to Reserved
            newStatus = 1;

            if (oldStatus === 4) {
              date = null;
            }
          }
        } else if (
          data.progress === 0 &&
          data.details === 0 &&
          data.builder === ""
        ) {
          if (oldStatus !== 0) {
            // Status changed to Not Started
            newStatus = 0;

            if (oldStatus === 4) {
              date = null;
            }
          }
        }

        if (newStatus !== undefined) {
          // Status changed
          db.query(
            `UPDATE blocks SET status = '${newStatus}' WHERE rid = '${data.rid}'`
          );
          if (newStatus === 4) {
            // Increase blocks done for district
            db.query(
              `UPDATE districts SET blocksDone = blocksDone+1 WHERE name = '${district}';` +
                `UPDATE districts SET blocksLeft = blocksLeft-1 WHERE name = '${district}';`
            );
          } else {
            if (oldStatus === 4) {
              // Decrease blocks done for district
              db.query(
                `UPDATE districts SET blocksDone = blocksDone-1 WHERE name = '${district}';` +
                  `UPDATE districts SET blocksLeft = blocksLeft+1 WHERE name = '${district}';`
              );
            }
          }
        }
        if (date !== undefined) {
          db.query(
            `UPDATE blocks SET completionDate = ${date} WHERE rid = '${data.rid}'`
          );
        }
      }
    }
  );
}
function calculateProgressDistrict(district) {
  db.query(
    `SELECT blocks.* FROM blocks JOIN districts ON blocks.district=districts.id WHERE districts.name = '${district}'`,
    (err, result) => {
      if (err) {
        console.log(err);
        res.send(generateError("SQL Error", "sq1", err));
      } else {
        var progress = 0;
        for (const block of result) {
          progress += block.progress;
        }
        progress /= result.length;

        db.query(
          `UPDATE districts SET progress = ${progress} WHERE name = '${district}'`
        );
        calculateProgressSubborough(district);
      }
    }
  );
}
function calculateProgressSubborough(districtName) {
  db.query(
    `SELECT * FROM districts WHERE parent = (SELECT parent FROM districts WHERE name = '${districtName}')`,
    (err1, result1) => {
      if (err1) {
        console.log(err1);
        res.send(generateError("SQL Error", "sq1", err1));
      } else {
        var progress = 0;
        for (const district of result1) {
          progress +=
            (district.blocksDone + district.blocksLeft) * district.progress;
        }

        db.query(
          `SELECT * FROM districts WHERE name = '${result1[0].parent}'`,
          (err2, result2) => {
            if (err2) {
              console.log(err2);
              res.send(generateError("SQL Error", "sq1", err2));
            } else {
              progress /= result2[0].blocksDone + result2[0].blocksLeft;

              db.query(
                `UPDATE districts SET progress = ${progress} WHERE name = '${result1[0].parent}'`
              );
            }
          }
        );
      }
    }
  );
}
function calculateProgressBorough() {}

// Middlewares
function checkUUID(req, res, next) {
  const uuid = req.body.uuid;

  if (uuid === undefined) {
    res.send(generateError("Specify a UUID", "cU1"));
    return;
  }
  if (typeof uuid !== "string" || uuid.length !== 36) {
    res.send(generateError("Invalid UUID", "cU1"));
    return;
  }
  next();
}

module.exports = {
  app: app,
  sleep: (ms) => sleep(ms),
  generateError: (msg, code, stacktrace) =>
    generateError(msg, code, stacktrace),
  generatePasswordToken: (pw) => generatePasswordToken(pw),
  port: port,
  dynamicSort: (property) => dynamicSort(property),
};
