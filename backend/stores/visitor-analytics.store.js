const pool = require('../config/database');
const AuthStore = require('./auth.store');
const { analyticsWindow, insideZoo, nearestPoi, FRESH_MS, DWELL_MS } = require('../utils/visitor-analytics');
const AppError = require('../utils/app-error');
class VisitorAnalyticsStore {
  constructor(db = pool) { this.db = db; this.tx = new AuthStore(db); }
  async create(tokenHash) {
    await this.db.query('INSERT INTO ANALYTICS_SESSIONS(token_hash,created_at,expires_at) VALUES (?,UTC_TIMESTAMP(3),DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 30 DAY))', [tokenHash]);
  }
  async touch(tokenHash, position) {
    return this.tx.transaction(async db => {
      const [rows] = await db.query('SELECT *,UTC_TIMESTAMP(3) AS nowUtc FROM ANALYTICS_SESSIONS WHERE token_hash=? FOR UPDATE', [tokenHash]);
      const session = rows[0];
      if (!session || +session.expires_at <= +session.nowUtc) throw new AppError(401, 'ANALYTICS_SESSION_EXPIRED', 'Phiên thống kê đã hết hạn.');
      const now = session.nowUtc;
      if (!position.exit && session.last_received_at && +now - +session.last_received_at < 10000) return { recorded: false, reason: 'THROTTLED' };
      const inside = !position.exit && insideZoo(position.latitude, position.longitude);
      const continuous = session.last_received_at && +now - +session.last_received_at < FRESH_MS;
      let presenceId = session.presence_id, visitId = session.poi_visit_id;
      if (!inside) {
        if (presenceId) await db.query('UPDATE ANALYTICS_PRESENCE SET ends_at=LEAST(ends_at,?) WHERE presence_id=?', [now,presenceId]);
        presenceId = null; visitId = null;
      } else {
        if (presenceId && continuous) await db.query('UPDATE ANALYTICS_PRESENCE SET ends_at=? WHERE presence_id=?', [new Date(+now+FRESH_MS),presenceId]);
        else { const [created] = await db.query('INSERT INTO ANALYTICS_PRESENCE(session_id,started_at,ends_at) VALUES (?,?,?)',[session.session_id,now,new Date(+now+FRESH_MS)]); presenceId = created.insertId; visitId = null; }
        const [pois] = await db.query("SELECT poi_id AS poiId,latitude,longitude,trigger_radius AS triggerRadius FROM POIS WHERE status='ACTIVE'");
        const poiId = nearestPoi(position,pois);
        const [existing] = visitId ? await db.query('SELECT * FROM ANALYTICS_POI_VISITS WHERE visit_id=?',[visitId]) : [[]];
        if (poiId && existing[0]?.poi_id === poiId && continuous) {
          await db.query('UPDATE ANALYTICS_POI_VISITS SET last_seen_at=?,confirmed_at=COALESCE(confirmed_at,?) WHERE visit_id=?',[now,+now-+existing[0].entered_at>=DWELL_MS?now:null,visitId]);
        } else if (poiId) {
          const [created] = await db.query('INSERT INTO ANALYTICS_POI_VISITS(session_id,poi_id,entered_at,last_seen_at) VALUES (?,?,?,?)',[session.session_id,poiId,now,now]); visitId=created.insertId;
        } else visitId=null;
      }
      await db.query('UPDATE ANALYTICS_SESSIONS SET last_received_at=?,presence_id=?,poi_visit_id=? WHERE session_id=?',[now,presenceId,visitId,session.session_id]);
      return { recorded: true, inside };
    });
  }
  async report(query) {
    return this.tx.transaction(async db => {
      const run = async (sql,args=[]) => (await db.query({sql,timeout:10000},args))[0];
      const [meta] = await run('SELECT started_at AS startedAt,UTC_TIMESTAMP(3) AS nowUtc FROM ANALYTICS_META WHERE singleton=1');
      if (!meta) throw Error('ANALYTICS_SCHEMA_REQUIRED');
      const window = analyticsWindow(query,meta.nowUtc), args=[window.from,window.cutoff,window.cutoff,window.from];
      const events = await run(`SELECT at,SUM(delta) AS delta FROM (
        SELECT GREATEST(started_at,?) AS at,1 AS delta FROM ANALYTICS_PRESENCE WHERE started_at<? AND ends_at>?
        UNION ALL SELECT LEAST(ends_at,?) AS at,-1 AS delta FROM ANALYTICS_PRESENCE WHERE started_at<? AND ends_at>?
        ) events GROUP BY at ORDER BY at`,[window.from,window.cutoff,window.from,window.cutoff,window.cutoff,window.from]);
      const [counts] = await run(`SELECT COUNT(DISTINCT session_id) AS visitors,COUNT(*) AS entries
        FROM ANALYTICS_PRESENCE WHERE started_at<? AND ends_at>?`,[args[1],args[0]]);
      const [live] = await run('SELECT COUNT(DISTINCT session_id) AS active FROM ANALYTICS_PRESENCE WHERE started_at<=? AND ends_at>?',[meta.nowUtc,meta.nowUtc]);
      const pois = await run(`SELECT p.poi_id AS poiId,p.name,p.status,COALESCE(v.visitors,0) AS visitors,COALESCE(v.visits,0) AS visits
        FROM POIS p LEFT JOIN (SELECT poi_id,COUNT(DISTINCT session_id) AS visitors,COUNT(*) AS visits FROM ANALYTICS_POI_VISITS
        WHERE confirmed_at>=? AND confirmed_at<? GROUP BY poi_id) v ON v.poi_id=p.poi_id
        WHERE p.status='ACTIVE' OR v.visits>0 ORDER BY visitors DESC,visits DESC,p.name,p.poi_id`,[window.from,window.cutoff]);
      return { ...meta,window,events,counts,live,pois };
    },{repeatableRead:true});
  }
}
module.exports = VisitorAnalyticsStore;
