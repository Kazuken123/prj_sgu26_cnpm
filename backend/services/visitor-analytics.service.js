const crypto = require('node:crypto');
const Store = require('../stores/visitor-analytics.store');
const AppError = require('../utils/app-error');
const { assertContentEditor } = require('./internal-access');
const { analyticsWindow, summarizeActivity, FRESH_MS, DWELL_MS } = require('../utils/visitor-analytics');
const hash = token => crypto.createHash('sha256').update(token).digest('hex');
class VisitorAnalyticsService {
  constructor(store = new Store()) { this.store = store; }
  async create() { const token=crypto.randomBytes(32).toString('hex'); await this.store.create(hash(token)); return {token}; }
  async touch(token, input) {
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw new AppError(401,'ANALYTICS_SESSION_EXPIRED','Phiên thống kê không hợp lệ.');
    const exit = input && input.exit === true && Object.keys(input).length === 1;
    if (!exit && (!input || Array.isArray(input) || Object.keys(input).some(k=>!['latitude','longitude','accuracy','sampleAgeMs'].includes(k)) ||
      !['latitude','longitude','accuracy','sampleAgeMs'].every(k=>typeof input[k]==='number' && Number.isFinite(input[k])) ||
      Math.abs(input.latitude)>90 || Math.abs(input.longitude)>180 || input.accuracy<0 || input.accuracy>40 || input.sampleAgeMs<0 || input.sampleAgeMs>45000)) throw new AppError(400,'GPS_UNRELIABLE','Vị trí chưa đủ mới hoặc đủ chính xác để thống kê.');
    return this.store.touch(hash(token),exit?{exit:true}:input);
  }
  async report(actor, query) {
    assertContentEditor(actor);
    analyticsWindow(query);
    try {
      const data=await this.store.report(query), summary=summarizeActivity(data.events,data.window,data.startedAt);
      return {generatedAt:data.nowUtc.toISOString(),trackingStartedAt:data.startedAt.toISOString(),timeZone:'Asia/Ho_Chi_Minh',
        period:data.window.period,date:data.window.date,from:data.window.from.toISOString(),to:data.window.to.toISOString(),
        hasCoverage:+data.window.cutoff>+data.startedAt,partialCoverage:+data.window.from<+data.startedAt,
        activeNow:Number(data.live.active),visitors:Number(data.counts.visitors),entries:Number(data.counts.entries),
        freshnessSeconds:FRESH_MS/1000,dwellSeconds:DWELL_MS/1000,...summary,pois:data.pois.map(p=>({...p,visitors:Number(p.visitors),visits:Number(p.visits)}))};
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(503,'ANALYTICS_UNAVAILABLE','Chưa tải được thống kê khách tham quan. Vui lòng thử lại hoặc liên hệ người quản lý hệ thống.');
    }
  }
}
module.exports = new VisitorAnalyticsService();
module.exports.VisitorAnalyticsService = VisitorAnalyticsService;
