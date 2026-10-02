const mysql = require('mysql2/promise');
const config = require('../config');

if (!config.databaseUrl) {
  throw new Error('缺少 DATABASE_URL，請參考 .env.example 設定');
}

const pool = mysql.createPool({
  uri: config.databaseUrl,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
  decimalNumbers: true
});

module.exports = {
  pool
};
