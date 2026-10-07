const pool = require("../config/database");

class OwnerRequestStore {
  constructor(db = pool) { this.db = db; }
  async createRequest(userId, request, executor = this.db) {
    const [result] = await executor.query(
      "INSERT INTO OWNER_REQUESTS (user_id, restaurant_name, restaurant_address, phone_number, status) VALUES (?, ?, ?, ?, 'PENDING')",
      [userId, request.restaurantName, request.restaurantAddress, request.phoneNumber],
    );
    return result.insertId;
  }
  async getLatestByUserId(userId) {
    const [rows] = await this.db.query(
      "SELECT * FROM OWNER_REQUESTS WHERE user_id = ? ORDER BY created_at DESC, request_id DESC LIMIT 1", [userId],
    );
    return rows[0];
  }
}
module.exports = OwnerRequestStore;
