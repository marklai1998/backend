const db = require("../Database");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bp = require("body-parser");
const minecraftUtil = require("minecraft-server-util");

module.exports = function (app) {
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
