const db = require("../config/database");

class OwnerRequestStore {
  static async createRequest(
    userId,
    restaurantName,
    restaurantAddress,
    phoneNumber,
  ) {
    const sql = `INSERT INTO OWNER_REQUESTS (user_id, restaurant_name, restaurant_address, phone_number, status)
                 VALUES (?, ?, ?, ?, 'PENDING')`;
    const [result] = await db.query(sql, [
      userId,
      restaurantName,
      restaurantAddress,
      phoneNumber,
    ]);
    return result.insertId;
  }

  static async getLatestByUserId(userId) {
    const sql = `SELECT * FROM OWNER_REQUESTS WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`;
    const [rows] = await db.query(sql, [userId]);
    return rows[0];
  }
}

module.exports = OwnerRequestStore;
