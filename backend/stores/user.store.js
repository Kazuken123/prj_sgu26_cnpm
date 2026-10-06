const db = require("../config/database");

class UserStore {
  static async getUserByEmail(email) {
    const sql = `SELECT * FROM USERS WHERE email = ? LIMIT 1`;
    const [rows] = await db.query(sql, [email]);
    return rows[0];
  }

  static async createUser(
    email,
    passwordHash,
    fullName,
    phoneNumber,
    role = "TOURIST",
    status = "ACTIVE",
  ) {
    const sql = `INSERT INTO USERS (email, password_hash, full_name, phone_number, role, status) 
                     VALUES (?, ?, ?, ?, ?, ?)`;
    const [result] = await db.query(sql, [
      email,
      passwordHash,
      fullName,
      phoneNumber,
      role,
      status,
    ]);
    return result.insertId;
  }

  static async incrementFailedLogin(userId, currentCount) {
    const newCount = currentCount + 1;
    let sql = `UPDATE USERS SET failed_login_count = ? WHERE user_id = ?`;
    let params = [newCount, userId];

    if (newCount >= 5) {
      sql = `UPDATE USERS SET failed_login_count = ?, locked_until = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE user_id = ?`;
    }
    await db.query(sql, params);
    return newCount;
  }

  static async resetFailedLogin(userId) {
    const sql = `UPDATE USERS SET failed_login_count = 0, locked_until = NULL WHERE user_id = ?`;
    await db.query(sql, [userId]);
  }
}
module.exports = UserStore;
