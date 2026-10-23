const MonitoringStore = require("../stores/monitoring.store");
const HealthStore = require("../stores/health.store");
const AppError = require("../utils/app-error");
const validation = require("./monitoring.validation");
function count(value) {
  const number = Number(value);
  if (!(typeof value === "number" || (typeof value === "string" && /^\d+$/.test(value))) || !Number.isSafeInteger(number) || number < 0) throw new Error("INVALID_MONITORING_COUNT");
  return number;
}
function states(rows, allowed) {
  const byStatus = Object.fromEntries(allowed.map(status => [status, 0]));
  for (const row of rows) {
    if (!allowed.includes(row.status)) throw new Error("INVALID_MONITORING_STATUS");
    byStatus[row.status] = count(row.total);
  }
  return { total: count(Object.values(byStatus).reduce((sum, value) => sum + value, 0)), byStatus };
}
function metric(value, unit, scope, asOf) {
  return { status: value === null ? "UNAVAILABLE" : "AVAILABLE", value, unit, scope, updatedAt: value === null ? null : asOf };
}
class MonitoringService {
  constructor(store = new MonitoringStore(), health = new HealthStore()) { this.store = store; this.healthStore = health; }
  async health() {
    const checks = await Promise.allSettled([this.healthStore.ping(), this.healthStore.pingRedis()]);
    const checkedAt = new Date().toISOString();
    return { liveness: { status: "UP", checkedAt }, database: { status: checks[0].status === "fulfilled" ? "READY" : "UNAVAILABLE", checkedAt },
      redis: { status: checks[1].status === "fulfilled" ? "READY" : "UNAVAILABLE", checkedAt } };
  }
  async get(actor, query) {
    if (!actor || !Number.isSafeInteger(actor.userId) || actor.userId < 1) throw new AppError(401, "MISSING_ACCESS_TOKEN", "Chưa xác thực tài khoản nội bộ.");
    if (actor.role !== "ADMIN" || actor.status !== "ACTIVE" || (actor.locked_until && new Date(actor.locked_until).getTime() > Date.now())) {
      throw new AppError(403, "FORBIDDEN", "Chỉ ADMIN được xem thống kê.");
    }
    const selected = validation.filters(query);
    try {
      const [snapshot, health] = await Promise.all([this.store.snapshot(async reader => {
        const window = validation.windowAt(selected, reader.now), asOf = reader.now.toISOString();
        const visits = await reader.activePaidVisits("PAID", "ACTIVE");
        const payments = await reader.paidPayments("PAID", window.from, window.to);
        const bundle = await reader.bundleTotals(window.from, window.to);
        const languages = bundle === null ? null : await reader.bundleLanguages(window.from, window.to);
        const jobs = await reader.jobs(), audios = await reader.audios(), chat = await reader.chatbot(window.from, window.to);
        let paymentValue = null;
        if (payments !== null) {
          paymentValue = { count: count(payments.reduce((sum, row) => sum + count(row.total), 0)), totals: payments.map(row => {
            if (typeof row.amount !== "string" || !/^\d+\.\d{2}$/.test(row.amount) || !/^[A-Z]{3}$/.test(row.currency)) throw new Error("INVALID_MONITORING_MONEY");
            return { currency: row.currency, amount: row.amount };
          }) };
        }
        return { asOf, window: { from: window.from.toISOString(), to: window.to.toISOString(), timezone: "UTC", interval: "[from,to)" },
          metrics: {
            activePaidVisits: metric(visits === null ? null : count(visits[0].total), "visit_sessions", "CURRENT", asOf),
            paidPayments: metric(paymentValue, "payments", "WINDOW_PAID_AT", asOf),
            bundleAccess: metric(bundle === null || languages === null ? null : { total: count(bundle[0].total), uniqueSessions: count(bundle[0].uniqueSessions),
              byLanguage: languages.map(row => ({ languageCode: row.languageCode, total: count(row.total), uniqueSessions: count(row.uniqueSessions) })) }, "bundle_issuances", "WINDOW_CREATED_AT", asOf),
            contentJobs: metric(jobs === null ? null : states(jobs, ["PENDING", "PROCESSING", "COMPLETED", "FAILED"]), "jobs", "CURRENT_ALL_VERSIONS", asOf),
            audioRecords: metric(audios === null ? null : states(audios, ["PENDING", "AVAILABLE", "FAILED"]), "audio_records", "CURRENT_ALL_RECORDS", asOf),
            chatbot: metric(chat === null ? null : states(chat, ["SUCCESS", "NO_CONTEXT", "FAILED"]), "logged_questions", "WINDOW_CREATED_AT", asOf),
          } };
      }), this.health()]);
      const checkedAt = new Date().toISOString();
      const sqlAvailable = Object.values(snapshot.metrics).every(value => value.status === "AVAILABLE");
      health.readiness = { status: health.database.status === "READY" && health.redis.status === "READY" && sqlAvailable ? "READY" : "NOT_READY", checkedAt };
      return { ...snapshot, generatedAt: checkedAt, health };
    } catch { throw new AppError(503, "MONITORING_UNAVAILABLE", "Chưa thể xác minh thống kê; giữ bộ lọc và thử lại, không thay số liệu bằng 0."); }
  }
}
module.exports = new MonitoringService();
module.exports.MonitoringService = MonitoringService;
