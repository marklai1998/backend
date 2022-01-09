const mysql = require("mysql");

var con = mysql.createConnection({
  host: "localhost",
  user: "mfprogress",
  password: "progress",
  database: "mfprogress",
  multipleStatements: true,
});

module.exports = {
  con,
  query: (sql, result) => {
    return con.query(sql, result);
  },
};
