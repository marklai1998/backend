const express = require("express");
const db = require("./Database");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bp = require("body-parser");
const { NULL } = require("mysql/lib/protocol/constants/types");
const app = express();
const minecraftUtil = require('minecraft-server-util');
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

                db.query("SELECT * FROM minecraft WHERE rid = '" +
                result[0].minecraft+"'", (err, result2) => {
                  if (err) {
                    console.log(err);
                    res.send(generateError("SQL Error", "sq2", err));
                  } else {
                    console.log(result2);
                    result[0].minecraft=result2[0];
                    res.send(result[0]);
                  }
                });

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
      } else if (result1[0].id != NULL) {
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
              var  polylocation = []
              result1[0].location.split(";").forEach(element => {
                polylocation.push(element.replace(" ","").split(","));
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

app.get("/api/network/ping", async (req,res) => {
    minecraftUtil.status('buildtheearth.net', 25565, {
      timeout: 1000 * 20, // timeout in milliseconds
      enableSRV: true // SRV record lookup
  })
    .then((result) => {
      const lobby = parseInt(result.players.sample[2].name.replace("§8[§b","").replace("§8]§7 are in §dLobby",""))
      const building = parseInt(result.players.sample[3].name.replace("§8[§b","").replace("§8]§7 are in §bBuilding",""));
      const teams = parseInt(result.players.sample[4].name.replace("§8[§b","").replace("§8]§7 are in §aBuild Teams",""));
      const data = {
        online:true,
        serverNews: result.motd.clean.split("\n")[1].replace("|||  ","").replace("  |||",""),
        ip: {
          default: "buildtheearth.net:25565",
          fallback: "network.buildtheearth.net:25565",
          bedrock: "bedrock.buildtheearth.net:19132"
        },
        version: {
          support: result.motd.clean.split("\n")[0].split("|  ")[1].replace("[","").replace("]",""),
          fullName: result.version.name,
          protocol: result.version.protocol,
          name: result.version.name.split(" ")[1],
          bedrock: "latest"
        },
        players: {
          total: result.players.online,
          max: result.players.max,
          lobby: lobby,
          building: building,
          teams: teams,
          other: result.players.online-(lobby+building+teams)
        },
        motd: {
          raw: result.motd.raw,
          clean: result.motd.clean,
          rows: [
            result.motd.clean.split("\n")[0],
            result.motd.clean.split("\n")[1],
          ],
          html: result.motd.html
        },
        favicon: result.favicon,
        srvRecord: result.srvRecord,
        error:{name:null,stacktrace:null},
        
      }
      res.send(data);
    })
    .catch((error) => {
      if(error.contains("Timed out")) {
        res.send({error:{name:"Timed out",stacktrace:null}});
      }else {
        res.send({error:{name:"Unexpected Error",stacktrace:error}});
      }
    });
  
});

app.get("/testing", async (req, res) => {
  console.log(req.body);
  res.send({name:"ok"});
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
