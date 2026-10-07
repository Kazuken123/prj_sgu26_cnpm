const fs = require("node:fs");
const path = require("node:path");
const pool = require("../config/database");
class SchemaStore {
  constructor(db = pool) { this.db = db; }
  async migrateRefreshTokens() {
    const sql = fs.readFileSync(path.resolve(__dirname, "../../database/migrations/001_refresh_tokens.sql"), "utf8");
    await this.db.query(sql);
  }
}
module.exports = SchemaStore;
