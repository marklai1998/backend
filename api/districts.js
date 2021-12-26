const db = require("../Database");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bp = require("body-parser");
const minecraftUtil = require("minecraft-server-util");

module.exports = function (app) {
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
        } else if (result1[0].id != null) {
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
                      if (
                        builders.some((e) => e.name === buildersMultiple[j])
                      ) {
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
