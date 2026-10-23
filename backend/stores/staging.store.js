const fs = require("node:fs/promises"), path = require("node:path");
const pool = require("../config/database"), SchemaStore = require("./schema.store");
const { columns } = require("../config/staging-dataset");
class StagingStore {
  constructor(db = pool, target = process.env.DB_NAME) { this.db = db; this.target = target; }
  async locked(work, { initializeEmpty = false } = {}) {
    if (this.target !== "tcv_demo_review_20261020" && !(process.env.NODE_ENV === "test" && /^tcv_staging_test_[a-f0-9]{32}$/.test(this.target || ""))) throw new Error("WRONG_STAGING_DATABASE");
    const db = await this.db.getConnection(); let locked = false, transaction = false;
    const lock = "tcv-staging:" + this.target;
    try {
      const [identity] = await db.query("SELECT DATABASE() AS name");
      if (identity[0].name !== this.target) throw new Error("WRONG_STAGING_DATABASE");
      const [lockRows] = await db.query("SELECT GET_LOCK(?, 10) AS acquired", [lock]);
      if (lockRows[0].acquired !== 1) throw new Error("STAGING_LOCK_UNAVAILABLE"); locked = true;
      const [tables] = await db.query("SHOW TABLES");
      if (!tables.length) {
        if (!initializeEmpty) throw new Error("STAGING_SCHEMA_INITIALIZATION_REQUIRED");
        const sql = (await fs.readFile(path.resolve(__dirname, "../../database/init_db.sql"), "utf8")).replace(/^\uFEFF/, "").replace(/^--.*$/gm, "");
        for (const statement of sql.split(";").map(s => s.trim()).filter(Boolean)) await db.query(statement);
      } else {
        const expected = ["LANGUAGES", "USERS", "REFRESH_TOKENS", "AUDIT_LOGS", "VISIT_SESSIONS", "PAYMENTS", "POIS", "POI_TRANSLATIONS", "AUDIOS", "CONTENT_JOBS", "TOURS", "TOUR_POIS", "KNOWLEDGE_DOCUMENTS", "KNOWLEDGE_CHUNKS", "CHAT_LOGS", "BUNDLE_ACCESS_LOGS"].sort();
        if (JSON.stringify(tables.map(row => Object.values(row)[0]).sort()) !== JSON.stringify(expected)) throw new Error("STAGING_PARTIAL_SCHEMA_STOP");
      }
      const schema = new SchemaStore(db);
      await schema.migrateRefreshTokens(); await schema.migratePois(); await schema.migratePaymentRequestKey();
      await schema.migrateContentJobClaim(); await schema.migrateContentJobLease();
      await db.beginTransaction(); transaction = true;
      const state = {
        snapshot: async () => Object.fromEntries(await Promise.all(Object.entries(columns).map(async ([table, cols]) => {
          const [rows] = await db.query(`SELECT ${cols.join(",")} FROM ${table}`); return [table, rows];
        }))),
        insert: async (table, rows) => {
          if (!rows.length) return;
          const cols = columns[table]; if (!cols) throw new Error("INVALID_STAGING_TABLE");
          await db.query(`INSERT INTO ${table} (${cols.join(",")}) VALUES ${rows.map(() => "(" + cols.map(() => "?").join(",") + ")").join(",")}`,
            rows.flatMap(row => cols.map(c => row[c])));
        },
        audit: async details => db.query("INSERT INTO AUDIT_LOGS (action,resource_type,resource_id,details) VALUES ('SEED_APPROVED_DEMO','DATASET','TCV_STAGING_FROZEN_20261023',?)", [JSON.stringify(details)]),
      };
      const result = await work(state); await db.commit(); transaction = false; return result;
    } catch (error) { if (transaction) await db.rollback().catch(() => {}); throw error; }
    finally { if (locked) await db.query("SELECT RELEASE_LOCK(?)", [lock]).catch(() => {}); db.release(); }
  }
}
module.exports = StagingStore;
