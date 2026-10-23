const mysql = require("mysql2/promise");
const utcPool = require("./utc-pool");
const { databaseOptions } = require("./database-options");
require("dotenv").config({ quiet: true });
const pool = mysql.createPool(databaseOptions());
module.exports = utcPool(pool);
