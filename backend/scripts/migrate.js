require("dotenv").config({ quiet: true });
const pool = require("../config/database");
const SchemaStore = require("../stores/schema.store");
(async () => {
  try {
    await new SchemaStore().migrateRefreshTokens();
    console.log("Migration 001 hoàn tất; dữ liệu tài khoản hiện có được giữ nguyên.");
  } catch (error) {
    console.error("Migration thất bại:", error.code || error.name);
    process.exitCode = 1;
  } finally { await pool.end(); }
})();
