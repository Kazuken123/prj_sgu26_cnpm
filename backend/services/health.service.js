const HealthStore = require("../stores/health.store");
const AppError = require("../utils/app-error");
class HealthService {
  constructor(store = new HealthStore()) { this.store = store; }
  async ready() {
    try { await this.store.ping(); }
    catch { throw new AppError(503, "DATABASE_UNAVAILABLE", "Database chưa sẵn sàng."); }
    return { status: "ok", service: "food-tour-api", database: "ready" };
  }
}
module.exports = new HealthService();
module.exports.HealthService = HealthService;
