const { describe, it } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

describe("Database Schema SQL File Validation Test Suite", () => {
  const sqlPath = path.resolve(__dirname, "../../database/init_db.sql");

  it("File init_db.sql ton tai va khong bi rong", () => {
    assert.strictEqual(fs.existsSync(sqlPath), true, "File init_db.sql phai ton tai");
    const content = fs.readFileSync(sqlPath, "utf-8");
    assert.ok(content.length > 500, "File init_db.sql phai chua noi dung khoi tao");
  });

  it("File init_db.sql khai bao du 13 bang theo dac ta ERD", () => {
    const content = fs.readFileSync(sqlPath, "utf-8");
    const requiredTables = [
      "LANGUAGES",
      "USERS",
      "OWNER_REQUESTS",
      "AUDIT_LOGS",
      "CATEGORIES",
      "POIS",
      "POI_CATEGORIES",
      "DISHES",
      "POI_IMAGES",
      "POI_TRANSLATIONS",
      "DISH_TRANSLATIONS",
      "AUDIOS",
      "REVIEWS"
    ];

    for (const table of requiredTables) {
      const regex = new RegExp(`CREATE\\s+TABLE\\s+${table}\\b`, "i");
      assert.ok(regex.test(content), `Thieu lenh CREATE TABLE cho bang ${table}`);
    }
  });

  it("Co cau hinh ho tro Tieng Viet UTF-8", () => {
    const content = fs.readFileSync(sqlPath, "utf-8");
    assert.ok(content.includes("utf8mb4"), "Phai cau hinh bo ma utf8mb4");
  });
});
