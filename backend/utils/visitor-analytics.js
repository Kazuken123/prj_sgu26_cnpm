const AppError = require('./app-error');
const { dayWindow } = require('./business-day');
const boundary = require('../config/zoo-boundary.json');
const DAY = 86400000, OFFSET = 7 * 3600000;
const FRESH_MS = 120000, DWELL_MS = 20000;
function analyticsWindow(query = {}, now = new Date()) {
  if (!query || Array.isArray(query) || Object.keys(query).some(k => !['period', 'date'].includes(k))) throw new AppError(400, 'VALIDATION_ERROR', 'Bộ lọc thống kê không hợp lệ.');
  const period = query.period || 'day', date = query.date || new Date(+now + OFFSET).toISOString().slice(0, 10);
  if (!['day','week','month','year'].includes(period) || typeof date !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date + 'T00:00:00Z')) || new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) !== date) throw new AppError(400, 'VALIDATION_ERROR', 'Chọn ngày và khoảng thời gian hợp lệ.');
  dayWindow(date, now);
  const local = new Date(date + 'T00:00:00Z');
  if (period === 'week') local.setUTCDate(local.getUTCDate() - (local.getUTCDay() + 6) % 7);
  if (period === 'month' || period === 'year') local.setUTCDate(1);
  if (period === 'year') local.setUTCMonth(0);
  const from = +local - OFFSET, end = new Date(local);
  if (period === 'year') end.setUTCFullYear(end.getUTCFullYear() + 1);
  else if (period === 'month') end.setUTCMonth(end.getUTCMonth() + 1);
  else end.setUTCDate(end.getUTCDate() + (period === 'week' ? 7 : 1));
  const to = +end - OFFSET, buckets = [];
  for (let cursor = from; cursor < to;) {
    const d = new Date(cursor + OFFSET), next = new Date(d);
    if (period === 'year') next.setUTCMonth(next.getUTCMonth() + 1);
    const until = period === 'year' ? +next - OFFSET : cursor + (period === 'day' ? 3600000 : DAY);
    buckets.push({ from: cursor, to: until, label: period === 'day' ? d.getUTCHours() + 'h' : period === 'year' ? 'Tháng ' + (d.getUTCMonth() + 1) : d.getUTCDate() + '/' + (d.getUTCMonth() + 1) });
    cursor = until;
  }
  return { period, date, from: new Date(from), to: new Date(to), cutoff: new Date(Math.min(to, +now)), buckets };
}
function insideZoo(latitude, longitude) {
  const points = boundary.points; let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [yi, xi] = points[i], [yj, xj] = points[j];
    if ((yi > latitude) !== (yj > latitude) && longitude < (xj - xi) * (latitude - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function distance(a, b) {
  const rad = Math.PI / 180, dlat = (b.latitude - a.latitude) * rad, dlon = (b.longitude - a.longitude) * rad;
  return 6371000 * 2 * Math.asin(Math.min(1, Math.sqrt(Math.sin(dlat/2)**2 + Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin(dlon/2)**2)));
}
function nearestPoi(position, pois) {
  let best = null, closest = Infinity;
  for (const poi of pois) { const meters = distance(position, poi); if (meters <= Math.min(100, poi.triggerRadius) && meters < closest) { best = poi.poiId; closest = meters; } }
  return best;
}
function summarizeActivity(events, window, startedAt) {
  let active = 0, index = 0, peak = 0, peakAt = null;
  const buckets = window.buckets.map(bucket => {
    while (index < events.length && +new Date(events[index].at) <= bucket.from) { active += Number(events[index++].delta); }
    let maximum = active, at = active ? bucket.from : null;
    while (index < events.length && +new Date(events[index].at) < Math.min(bucket.to, +window.cutoff)) {
      const event = events[index++]; active += Number(event.delta);
      if (active > maximum) { maximum = active; at = +new Date(event.at); }
    }
    const observed = bucket.from < +window.cutoff && bucket.to > +startedAt;
    if (observed && maximum > peak) { peak = maximum; peakAt = new Date(at).toISOString(); }
    return { label: bucket.label, from: new Date(bucket.from).toISOString(), to: new Date(bucket.to).toISOString(), peak: observed ? maximum : null };
  });
  return { peak, peakAt, buckets };
}
module.exports = { analyticsWindow, insideZoo, nearestPoi, summarizeActivity, FRESH_MS, DWELL_MS };
