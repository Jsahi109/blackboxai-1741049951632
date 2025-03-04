const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'srv864.hstgr.io',
  user: 'u596872099_vantage',
  database: 'u596872099_vantage',
  password: 'Vantage1623',
});

module.exports = pool.promise();
