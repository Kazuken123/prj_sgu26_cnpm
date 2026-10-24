const fs = require("node:fs");
const path = require("node:path");
const pool = require("../config/database");
class SchemaStore {
  constructor(db = pool) { this.db = db; }
  async migrateVisitorAnalytics() {
    const sql = fs.readFileSync(path.resolve(__dirname, "../../database/migrations/007_visitor_analytics.sql"), "utf8");
    for (const statement of sql.split(';').map(part => part.trim()).filter(Boolean)) await this.db.query(statement);
  }
  async migrateContentJobLease() {
    const [columns] = await this.db.query("SHOW FULL COLUMNS FROM CONTENT_JOBS LIKE 'lease_expires_at'");
    if (!columns.length) {
      const sql = fs.readFileSync(path.resolve(__dirname, "../../database/migrations/006_content_job_lease.sql"), "utf8");
      try { await this.db.query(sql); }
      catch (error) { if (error.code !== "ER_DUP_FIELDNAME") throw error; }
    }
    const [actual] = await this.db.query("SHOW FULL COLUMNS FROM CONTENT_JOBS LIKE 'lease_expires_at'");
    if (actual.length !== 1 || actual[0].Type.toLowerCase() !== "datetime(3)" || actual[0].Null !== "YES") {
      const error = new Error("CONTENT_JOB_LEASE_SCHEMA_REQUIRED"); error.code = error.message; throw error;
    }
  }
  async migrateContentJobClaim() {
    const [columns] = await this.db.query("SHOW FULL COLUMNS FROM CONTENT_JOBS LIKE 'claim_id'");
    if (!columns.length) {
      const sql = fs.readFileSync(path.resolve(__dirname, "../../database/migrations/005_content_job_claim.sql"), "utf8");
      try { await this.db.query(sql); }
      catch (error) { if (error.code !== "ER_DUP_FIELDNAME") throw error; }
    }
    const [actual] = await this.db.query("SHOW FULL COLUMNS FROM CONTENT_JOBS LIKE 'claim_id'");
    if (actual.length !== 1 || actual[0].Type.toLowerCase() !== "char(36)" || actual[0].Null !== "YES" || actual[0].Collation !== "ascii_bin") {
      const error = new Error("CONTENT_JOB_CLAIM_SCHEMA_REQUIRED"); error.code = error.message; throw error;
    }
  }
  async migratePaymentRequestKey() {
    const [columns] = await this.db.query("SHOW COLUMNS FROM PAYMENTS LIKE 'request_key_hash'");
    if (!columns.length) {
      const sql = fs.readFileSync(path.resolve(__dirname, "../../database/migrations/004_payment_request_key.sql"), "utf8");
      await this.db.query(sql);
    }
    const [indexes] = await this.db.query("SHOW INDEX FROM PAYMENTS WHERE Key_name = 'uq_payments_request_key_hash'");
    if (indexes.length !== 1 || Number(indexes[0].Non_unique) !== 0 || indexes[0].Column_name !== "request_key_hash") {
      const error = new Error("PAYMENT_REQUEST_KEY_INDEX_REQUIRED"); error.code = error.message; throw error;
    }
  }
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
  async migratePois() {
    const [tables] = await this.db.query("SHOW TABLES LIKE 'POIS'");
    if (tables.length === 0) {
      const error = new Error("Cần schema POIS hiện có; migration 003 không tự chuyển database nghiệp vụ cũ.");
      error.code = "POI_SCHEMA_REQUIRED";
      throw error;
    }
    const sql = fs.readFileSync(path.resolve(__dirname, "../../database/migrations/003_thao_cam_vien_pois.sql"), "utf8");
    const statements = sql.replace(/^--.*$/gm, "").split(";").map(item => item.trim()).filter(Boolean);
    for (const statement of statements) {
      const add = statement.match(/^ALTER TABLE POIS ADD COLUMN (category|conservation_status|activity_hours)\b/);
      if (add) {
        const [columns] = await this.db.query("SHOW COLUMNS FROM POIS LIKE ?", [add[1]]);
        if (columns.length) continue;
      }
      try { await this.db.query(statement); }
      catch (error) { if (!add || error.code !== "ER_DUP_FIELDNAME") throw error; }
    }
  }
}
module.exports = SchemaStore;
