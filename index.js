const express = require("express");
const db = require("./Database");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bp = require('body-parser')
const app = express();
const port = 8080;

app.use(cors());
app.use(bp.json())
app.use(bp.urlencoded({ extended: true }))

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
                res.send(result[0]);
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
        console.log(err?err:"No user found");
        res.send(
          generateError(
            "Could not find the User",
            "aUU1",
            err
          )
        );
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
  console.log("queryy")
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
  console.log("w")
        res.redirect("/query?query=SELECT * FROM users WHERE email = '"+toSet.email+"'");
});

app.get("/api/districts/", (req, res) => {
  const name = req.query.name;
  res.redirect("/query?query=SELECT * FROM districts WHERE name = '" + name + "'");
})


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
