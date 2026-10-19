const fs = require("node:fs");
const path = require("node:path");
const pool = require("../config/database");
class SchemaStore {
  constructor(db = pool) { this.db = db; }
  async migrateRefreshTokens() {
    const sql = fs.readFileSync(path.resolve(__dirname, "../../database/migrations/001_refresh_tokens.sql"), "utf8");
    await this.db.query(sql);
    const [columns] = await this.db.query("SHOW COLUMNS FROM REFRESH_TOKENS LIKE 'rotated_token_hashes'");
    if (columns.length === 0) {
      const upgrade = fs.readFileSync(path.resolve(__dirname, "../../database/migrations/002_rotated_token_hashes.sql"), "utf8");
      try { await this.db.query(upgrade); }
      catch (error) { if (error.code !== "ER_DUP_FIELDNAME") throw error; }
    }
  }
}
module.exports = SchemaStore;
