const pool = require("../config/database");
const AuthStore = require("./auth.store");
const UserStore = require("./user.store");
const AuditLogStore = require("./audit_log.store");
const columns = "tour_id AS tourId, name, description, created_at AS createdAt, updated_at AS updatedAt";

class TourStore {
  constructor(db = pool) {
    this.db = db;
    this.transactions = new AuthStore(db);
    this.users = new UserStore(db);
    this.audit = new AuditLogStore(db);
  }
  async attachItems(rows, connection) {
    if (!rows.length) return rows;
    const ids = rows.map(row => row.tourId);
    const [items] = await connection.query(`SELECT tp.tour_id AS tourId, tp.poi_id AS poiId, tp.sequence_no AS sequenceNo,
      p.name, p.status FROM TOUR_POIS tp JOIN POIS p ON p.poi_id = tp.poi_id
      WHERE tp.tour_id IN (${ids.map(() => "?").join(",")}) ORDER BY tp.tour_id, tp.sequence_no`, ids);
    const grouped = new Map();
    for (const { tourId, ...item } of items) {
      if (!grouped.has(tourId)) grouped.set(tourId, []);
      grouped.get(tourId).push(item);
    }
    return rows.map(row => ({ ...row, items: grouped.get(row.tourId) || [] }));
  }
  async read(id, connection) {
    const [rows] = await connection.query(`SELECT ${columns} FROM TOURS WHERE tour_id = ?`, [id]);
    return (await this.attachItems(rows, connection))[0];
  }
  async get(id) {
    return this.transactions.transaction(connection => this.read(id, connection), { repeatableRead: true });
  }
  async list({ page, limit }) {
    return this.transactions.transaction(async connection => {
      const [count] = await connection.query("SELECT COUNT(*) AS total FROM TOURS");
      const [rows] = await connection.query(`SELECT ${columns} FROM TOURS ORDER BY tour_id DESC LIMIT ? OFFSET ?`, [limit, (page - 1) * limit]);
      return { items: await this.attachItems(rows, connection), total: Number(count[0].total), page, limit };
    }, { repeatableRead: true });
  }
  async withCreate(actorId, poiIds, work) {
    return this.transactions.transaction(async connection => {
      const actor = await this.users.getUserById(actorId, connection, true);
      // Follow existing content mutations: actor first, then POIs in ID order.
      const sorted = [...poiIds].sort((a, b) => a - b);
      const [pois] = await connection.query(`SELECT poi_id AS poiId, status FROM POIS
        WHERE poi_id IN (${sorted.map(() => "?").join(",")}) ORDER BY poi_id FOR UPDATE`, sorted);
      return work({ actor, pois, persist: async (data, audit) => {
        const [created] = await connection.query("INSERT INTO TOURS (name, description) VALUES (?, ?)", [data.name, data.description]);
        for (const item of data.items) {
          await connection.query("INSERT INTO TOUR_POIS (tour_id, poi_id, sequence_no) VALUES (?, ?, ?)", [created.insertId, item.poiId, item.sequenceNo]);
        }
        await this.audit.create({ ...audit, userId: actorId, resourceType: "TOURS", resourceId: String(created.insertId) }, connection);
        return this.read(created.insertId, connection);
      } });
    });
  }
  async withUpdate(actorId, id, poiIds, work) {
    return this.transactions.transaction(async connection => {
      const actor = await this.users.getUserById(actorId, connection, true);
      const [locked] = await connection.query(`SELECT ${columns} FROM TOURS WHERE tour_id = ? FOR UPDATE`, [id]);
      // Current locking reads avoid a stale RR snapshot for a waiting editor.
      // POI metadata is not needed to compare the editable tour fingerprint.
      let current;
      if (locked.length) {
        const [items] = await connection.query("SELECT poi_id AS poiId, sequence_no AS sequenceNo FROM TOUR_POIS WHERE tour_id = ? ORDER BY poi_id FOR UPDATE", [id]);
        current = { ...locked[0], items };
      }
      const sorted = [...poiIds].sort((a, b) => a - b);
      const [pois] = current ? await connection.query(`SELECT poi_id AS poiId, status FROM POIS
        WHERE poi_id IN (${sorted.map(() => "?").join(",")}) ORDER BY poi_id FOR UPDATE`, sorted) : [[]];
      return work({ actor, current, pois, persist: async (data, audit) => {
        await connection.query("UPDATE TOURS SET name = ?, description = ? WHERE tour_id = ?", [data.name, data.description, id]);
        // Replace the whole set inside one transaction, avoiding transient
        // unique(tour_id, sequence_no) conflicts when swapping two positions.
        await connection.query("DELETE FROM TOUR_POIS WHERE tour_id = ?", [id]);
        for (const item of data.items) {
          await connection.query("INSERT INTO TOUR_POIS (tour_id, poi_id, sequence_no) VALUES (?, ?, ?)", [id, item.poiId, item.sequenceNo]);
        }
        await this.audit.create({ ...audit, userId: actorId, resourceType: "TOURS", resourceId: String(id) }, connection);
        return this.read(id, connection);
      } });
    });
  }
}
module.exports = TourStore;
