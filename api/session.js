const db = require("../Database");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bp = require("body-parser");
const minecraftUtil = require("minecraft-server-util");
module.exports = function (app) {
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
