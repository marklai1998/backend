const express = require("express");
const db = require("./Database");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const app = express();
const port = 8080;

app.use(cors());

app.get("/", (req, res) => {
  console.log(req.body)
  res.send("")
});

app.get("/query", async (req, res) => {
  if(req.query.sleep) {
    await sleep(3000);
  }
  db.query(req.query.query, (err, result) => {
    if (err) {
      console.log(err);
      res.send(generateError("SQL Error","sq1",err));
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
        res.send(generateError("Error during login, please message a system administrator or try again","lD1",err));
      } else {
        if (result.length == 0) {


          res.send(generateError("There is no User matching this username","lUn2",null));
        } else {
          jwt.verify(result[0].password, "progress", function (err, decoded) {
            if (err) {


              res.send(generateError("Invalid Password","lPw3",err));
            } else {
              if (decoded.data == req.query.password) {


                res.send(
                  result[0],
                );
              } else {


                res.send(generateError("Invalid Password","lPw4",err));
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
        if (result[i].name === req.query.username) {
          res.send("Username already exists");
          return;
        }
      }
      db.query(
        "INSERT INTO users (name, password) VALUES (?, ?)",
        [req.query.username, generatePasswordToken(req.query.password)],
        (err, result) => {}
      );
      res.redirect("http://localhost:3000");
    }
  });
});

app.get("/verify", (req, res) => {
  jwt.verify(req.query.token, "progress", function (err, decoded) {
    if (err) {
      res.send({ msg: "Invalid Token", error: err });
    }
    res.send("ok");
  });
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
function generateError(msg,code,stacktrace){
  return {error:true, msg:msg,code:code,full:stacktrace}
}
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}