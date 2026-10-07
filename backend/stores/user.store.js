const pool = require("../config/database");

class UserStore {
  constructor(db = pool) { this.db = db; }

  async getUserByEmail(email, executor = this.db, lock = false) {
    const [rows] = await executor.query(
      `SELECT * FROM USERS WHERE email = ? LIMIT 1${lock ? " FOR UPDATE" : ""}`, [email],
    );
    return rows[0];
  }
  async getUserById(userId, executor = this.db, lock = false) {
    const [rows] = await executor.query(
      `SELECT * FROM USERS WHERE user_id = ? LIMIT 1${lock ? " FOR UPDATE" : ""}`, [userId],
    );
    return rows[0];
  }
  async createUser(user, executor = this.db) {
    const [result] = await executor.query(
      "INSERT INTO USERS (email, password_hash, full_name, phone_number, role, status) VALUES (?, ?, ?, ?, ?, ?)",
      [user.email, user.passwordHash, user.fullName ?? null, user.phoneNumber ?? null, user.role, user.status],
    );
    return result.insertId;
  }
  async updateLoginState(userId, failedCount, lockedUntil, executor = this.db) {
    await executor.query(
      "UPDATE USERS SET failed_login_count = ?, locked_until = ? WHERE user_id = ?",
      [failedCount, lockedUntil, userId],
    );
  }
  async replacePlaceholderPassword(userId, expectedHash, passwordHash) {
    const [result] = await this.db.query(
      "UPDATE USERS SET password_hash = ? WHERE user_id = ? AND password_hash = ?",
      [passwordHash, userId, expectedHash],
    );
    return result.affectedRows === 1;
  }
}
module.exports = UserStore;
