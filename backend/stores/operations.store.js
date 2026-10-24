const pool = require('../config/database');
const AuthStore = require('./auth.store');
const { dayWindow } = require('../utils/business-day');
const join = 'FROM PAYMENTS p JOIN VISIT_SESSIONS s ON s.session_id=p.session_id';
const unclaimed = "p.status='PAID' AND s.status='ACTIVE' AND s.expires_at>? AND s.token_hash IS NULL";
class OperationsStore {
  constructor(db = pool) { this.transactions = new AuthStore(db); }
  async read(actor, filter) {
    return this.transactions.transaction(async db => {
      const query = async (sql, args = []) => (await db.query({ sql, timeout: 5000 }, args))[0];
      const [clock] = await query('SELECT UTC_TIMESTAMP(3) AS nowUtc');
      const window = dayWindow(filter.date, clock.nowUtc);
      const scope = actor.role === 'ADMIN' ? '' : " AND ((p.status='PAID' AND p.confirmed_by=?) OR (p.status<>'PAID' AND s.created_by=?))";
      const scopeArgs = actor.role === 'ADMIN' ? [] : [actor.userId, actor.userId];
      const where = `p.payment_method='CASH' AND (p.status<>'PAID' OR p.confirmed_by IS NOT NULL)
        AND ((p.status='PAID' AND p.paid_at>=? AND p.paid_at<?) OR (p.status<>'PAID' AND p.created_at>=? AND p.created_at<?))${scope}`;
      const args = [window.from, window.to, window.from, window.to, ...scopeArgs];
      const [counts] = await query(`SELECT COUNT(*) AS total, COALESCE(SUM(p.status='PAID'),0) AS paid,
        COALESCE(SUM(p.status='PENDING'),0) AS pending, COALESCE(SUM(p.status='FAILED'),0) AS failed,
        COALESCE(SUM(${unclaimed}),0) AS unclaimed ${join} WHERE ${where}`, [clock.nowUtc, ...args]);
      const totals = await query(`SELECT p.currency, CAST(SUM(p.amount) AS CHAR) AS amount, COUNT(*) AS count
        ${join} WHERE ${where} AND p.status='PAID' GROUP BY p.currency ORDER BY p.currency`, args);
      const hourly = await query(`SELECT HOUR(DATE_ADD(p.paid_at, INTERVAL 7 HOUR)) AS hour, p.currency,
        CAST(SUM(p.amount) AS CHAR) AS amount, COUNT(*) AS count ${join} WHERE ${where} AND p.status='PAID'
        GROUP BY hour,p.currency ORDER BY hour,p.currency`, args);
      const staff = actor.role !== 'ADMIN' ? [] : await query(`SELECT p.confirmed_by AS userId,
        COALESCE(NULLIF(u.full_name,''),u.email,'Tài khoản đã xóa') AS name, p.currency,
        COUNT(*) AS count, CAST(SUM(p.amount) AS CHAR) AS amount ${join} LEFT JOIN USERS u ON u.user_id=p.confirmed_by
        WHERE ${where} AND p.status='PAID' GROUP BY p.confirmed_by,u.full_name,u.email,p.currency
        ORDER BY SUM(p.amount) DESC,p.confirmed_by`, args);
      let selected = where; const selectedArgs = [...args];
      if (filter.status === 'UNCLAIMED') { selected += ` AND (${unclaimed})`; selectedArgs.push(clock.nowUtc); }
      else if (filter.status !== 'ALL') { selected += ' AND p.status=?'; selectedArgs.push(filter.status); }
      if (filter.q) { selected += ' AND (LOCATE(?,p.payment_ref)>0 OR LOCATE(?,s.session_id)>0)'; selectedArgs.push(filter.q, filter.q); }
      const [matches] = await query(`SELECT COUNT(*) AS total ${join} WHERE ${selected}`, selectedArgs);
      const items = await query(`SELECT p.session_id AS sessionId,p.payment_ref AS paymentRef,CAST(p.amount AS CHAR) AS amount,
        p.currency,p.status AS paymentStatus,p.created_at AS createdAt,p.paid_at AS paidAt,
        CASE WHEN s.status='ACTIVE' AND s.expires_at<=? THEN 'EXPIRED' ELSE s.status END AS sessionStatus,
        s.expires_at AS expiresAt,(s.token_hash IS NOT NULL) AS accessClaimed,
        COALESCE(NULLIF(u.full_name,''),u.email,'Chưa xác nhận') AS staffName
        ${join} LEFT JOIN USERS u ON u.user_id=p.confirmed_by WHERE ${selected}
        ORDER BY COALESCE(p.paid_at,p.created_at) DESC,p.payment_id DESC LIMIT ? OFFSET ?`,
      [clock.nowUtc, ...selectedArgs, filter.limit, (filter.page - 1) * filter.limit]);
      // Operational problems are current, not historical counts for the selected day.
      const content = await query(`SELECT p.poi_id AS poiId,p.name,
        (SELECT COUNT(*) FROM CONTENT_JOBS j WHERE j.poi_id=p.poi_id AND j.source_version=p.content_version AND j.status='FAILED') AS failedJobs
        FROM POIS p WHERE p.status='ACTIVE' AND (EXISTS (SELECT 1 FROM CONTENT_JOBS j WHERE j.poi_id=p.poi_id
        AND j.source_version=p.content_version AND j.status='FAILED') OR NOT EXISTS (
          SELECT 1 FROM POI_TRANSLATIONS t JOIN AUDIOS a ON a.translation_id=t.translation_id
          JOIN LANGUAGES l ON l.code=t.language_code WHERE t.poi_id=p.poi_id AND l.is_active=1
          AND t.status='READY' AND t.source_version=p.content_version AND a.source_version=p.content_version
          AND a.status='AVAILABLE' AND a.file_url IS NOT NULL AND a.file_size>0)) ORDER BY p.display_order,p.poi_id`);
      return { now: clock.nowUtc, window, counts, totals, hourly, staff, content,
        transactions: { items, total: Number(matches.total), page: filter.page, limit: filter.limit } };
    }, { repeatableRead: true });
  }
}
module.exports = OperationsStore;
