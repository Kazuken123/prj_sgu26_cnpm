const pool = require("../config/database");
const AuthStore = require("./auth.store");
// These statement failures do not end the InnoDB transaction. All other
// failures abort the response: never mix snapshots after a lost transaction.
const sourceUnavailable = new Set(["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR", "ER_TABLEACCESS_DENIED_ERROR", "ER_COLUMNACCESS_DENIED_ERROR"]);
class MonitoringStore {
  constructor(db = pool) { this.db = db; this.transactions = new AuthStore(db); }
  async snapshot(work) {
    return this.transactions.transaction(async connection => {
      const [[clock]] = await connection.query({ sql: "SELECT UTC_TIMESTAMP(3) AS nowUtc", timeout: 2000 });
      const query = async (sql, values = []) => {
        try { return (await connection.query({ sql, timeout: 2000 }, values))[0]; }
        catch (error) { if (sourceUnavailable.has(error.code)) return null; throw error; }
      };
      return work({ now: clock.nowUtc,
        activePaidVisits: (paid, active) => query(`SELECT COUNT(*) AS total FROM VISIT_SESSIONS s
          JOIN PAYMENTS p ON p.session_id = s.session_id WHERE p.status = ? AND p.paid_at IS NOT NULL
          AND s.status = ? AND s.activated_at IS NOT NULL AND s.expires_at > ?`, [paid, active, clock.nowUtc]),
        paidPayments: (paid, from, to) => query(`SELECT currency, COUNT(*) AS total, CAST(SUM(amount) AS CHAR) AS amount
          FROM PAYMENTS WHERE status = ? AND paid_at >= ? AND paid_at < ? GROUP BY currency ORDER BY currency`, [paid, from, to]),
        bundleTotals: (from, to) => query(`SELECT COUNT(*) AS total, COUNT(DISTINCT session_id) AS uniqueSessions
          FROM BUNDLE_ACCESS_LOGS WHERE created_at >= ? AND created_at < ?`, [from, to]),
        bundleLanguages: (from, to) => query(`SELECT language_code AS languageCode, COUNT(*) AS total, COUNT(DISTINCT session_id) AS uniqueSessions
          FROM BUNDLE_ACCESS_LOGS WHERE created_at >= ? AND created_at < ? GROUP BY language_code ORDER BY language_code`, [from, to]),
        jobs: () => query("SELECT status, COUNT(*) AS total FROM CONTENT_JOBS GROUP BY status ORDER BY status"),
        audios: () => query("SELECT status, COUNT(*) AS total FROM AUDIOS GROUP BY status ORDER BY status"),
      });
    }, { repeatableRead: true });
  }
}
module.exports = MonitoringStore;
