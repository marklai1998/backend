const express = require("express");
const db = require("./Database");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bp = require("body-parser");
const app = express();
const minecraftUtil = require('minecraft-server-util');
const port = 8080;


require('./api/districts')(app);
require('./api/users')(app);
require('./api/network')(app);
require('./api/session')(app);

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
module.exports = {
  app:app,
  sleep: (ms) => sleep(ms),
  generateError: (msg, code, stacktrace) => generateError(msg, code, stacktrace),
  generatePasswordToken: (pw) => generatePasswordToken(pw),
  port:port,
  dynamicSort:(property) => dynamicSort(property),
}
