const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { PoiService } = require("../services/poi.service");
const PoiStore = require("../stores/poi.store");
const SchemaStore = require("../stores/schema.store");

describe("UC-13 with real MySQL in a disposable database", { skip: process.env.RUN_DB_TESTS !== "1" }, () => {
  let admin, db, service, actor;
  const name = "tcv_poi_test_" + randomUUID().replaceAll("-", "");
  before(async () => {
    const mysql = require("mysql2/promise");
    const connection = { host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", timezone: "Z", connectTimeout: 3000 };
    admin = await mysql.createConnection(connection);
    assert.match(name, /^tcv_poi_test_[a-f0-9]{32}$/); assert.notEqual(name, process.env.DB_NAME);
    await admin.query("CREATE DATABASE `" + name + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    db = mysql.createPool({ ...connection, database: name, multipleStatements: true, connectionLimit: 5 });
    await db.query(fs.readFileSync(path.resolve(__dirname, "../../database/init_db.sql"), "utf8"));
    const [user] = await db.query("INSERT INTO USERS (email, password_hash, role, status) VALUES ('poi@example.invalid', 'test-only-not-for-login', 'STAFF', 'ACTIVE')");
    actor = { userId: user.insertId, role: "STAFF", status: "ACTIVE" };
    service = new PoiService(new PoiStore(db));
  });
  after(async () => {
    if (db) await db.end();
    if (admin) {
      if (/^tcv_poi_test_[a-f0-9]{32}$/.test(name) && name !== process.env.DB_NAME) await admin.query("DROP DATABASE IF EXISTS `" + name + "`");
      await admin.end();
    }
  });
  const input = label => ({ name: label, category: "PLANT", description: "Nguồn thử nghiệm, không phải dữ liệu thực địa.",
    audioScript: "Kịch bản thử nghiệm.", latitude: 10.78, longitude: 106.70, status: "ACTIVE" });
  it("migration preserves old POI values, leaves old classification unknown and is repeatable", async () => {
    await db.query("ALTER TABLE POIS DROP COLUMN category, DROP COLUMN conservation_status, DROP COLUMN activity_hours");
    await db.query("ALTER TABLE POIS ALTER COLUMN trigger_radius SET DEFAULT 50");
    const [created] = await db.query("INSERT INTO POIS (name, latitude, longitude, trigger_radius) VALUES ('Legacy fixture', 10, 106, 50)");
    await new SchemaStore(db).migratePois(); await new SchemaStore(db).migratePois();
    const [rows] = await db.query("SELECT trigger_radius, category FROM POIS WHERE poi_id = ?", [created.insertId]);
    assert.equal(rows[0].trigger_radius, 50); assert.equal(rows[0].category, null);
    const [columns] = await db.query("SHOW COLUMNS FROM POIS LIKE 'trigger_radius'");
    assert.equal(Number(columns[0].Default), 30);
  });
  it("source and metadata edits follow UC-13; concurrent stale edits cannot overwrite source", async () => {
    const data = input("Nguồn A"), created = await service.save(actor, null, data);
    const id = created.poiId;
    await service.save(actor, id, { ...data, latitude: 10.79, category: "HERITAGE", expectedVersion: 1 });
    let [jobs] = await db.query("SELECT * FROM CONTENT_JOBS WHERE poi_id = ?", [id]);
    assert.equal(jobs.length, 2);
    const outcomes = await Promise.allSettled([
      service.save(actor, id, { ...data, name: "Nguồn B", expectedVersion: 1 }),
      service.save(actor, id, { ...data, name: "Nguồn C", expectedVersion: 1 }),
    ]);
    assert.equal(outcomes.filter(outcome => outcome.status === "fulfilled").length, 1);
    assert.equal(outcomes.find(outcome => outcome.status === "rejected").reason.code, "POI_VERSION_CONFLICT");
    const result = await service.get(actor, id);
    assert.equal(result.contentVersion, 2);
    const [vi] = await db.query("SELECT name, source_version FROM POI_TRANSLATIONS WHERE poi_id = ? AND language_code = 'vi'", [id]);
    assert.equal(vi[0].name, result.name); assert.equal(vi[0].source_version, 2);
    [jobs] = await db.query("SELECT * FROM CONTENT_JOBS WHERE poi_id = ?", [id]); assert.equal(jobs.length, 4);
    await service.deactivate(actor, id); await service.deactivate(actor, id);
    assert.equal((await service.get(actor, id)).status, "INACTIVE");
    const [retained] = await db.query("SELECT * FROM POI_TRANSLATIONS WHERE poi_id = ?", [id]); assert.equal(retained.length, 1);
  });
  it("audit failure rolls back the POI, source and pending jobs on MySQL", async () => {
    const data = input("ROLLBACK fixture");
    await db.query("CREATE TRIGGER poi_test_fail_audit BEFORE INSERT ON AUDIT_LOGS FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'forced audit failure'");
    try { await assert.rejects(service.save(actor, null, data)); }
    finally { await db.query("DROP TRIGGER poi_test_fail_audit"); }
    const [rows] = await db.query("SELECT * FROM POIS WHERE name = ?", [data.name]); assert.equal(rows.length, 0);
    const [orphanJobs] = await db.query("SELECT j.job_id FROM CONTENT_JOBS j LEFT JOIN POIS p ON p.poi_id = j.poi_id WHERE p.poi_id IS NULL"); assert.equal(orphanJobs.length, 0);
  });
  it("account status is rechecked in the same transaction", async () => {
    await db.query("UPDATE USERS SET status = 'LOCKED' WHERE user_id = ?", [actor.userId]);
    try { await assert.rejects(service.save(actor, null, input("Forbidden")), error => error.code === "FORBIDDEN"); }
    finally { await db.query("UPDATE USERS SET status = 'ACTIVE' WHERE user_id = ?", [actor.userId]); }
    const [rows] = await db.query("SELECT * FROM POIS WHERE name = 'Forbidden'"); assert.equal(rows.length, 0);
  });
});
