const Store = require('../stores/operations.store');
const { filters } = require('./operations.validation');
const { assertContentEditor } = require('./internal-access');
const AppError = require('../utils/app-error');
class OperationsService {
  constructor(store = new Store()) { this.store = store; }
  async get(actor, query) {
    assertContentEditor(actor);
    const filter = filters(query);
    try {
      const result = await this.store.read({ userId: actor.userId ?? actor.user_id, role: actor.role }, filter);
      const counts = Object.fromEntries(Object.entries(result.counts).map(([key, value]) => {
        if (value === null || !Number.isSafeInteger(Number(value)) || Number(value) < 0) throw Error('INVALID_COUNT');
        return [key, Number(value)];
      }));
      for (const row of [...result.totals, ...result.hourly, ...result.staff]) {
        if (typeof row.amount !== 'string' || !/^\d+\.\d{2}$/.test(row.amount) || !/^[A-Z]{3}$/.test(row.currency)) throw Error('INVALID_REVENUE');
      }
      return { generatedAt: result.now.toISOString(), date: result.window.date, today: result.window.today,
        timeZone: 'Asia/Ho_Chi_Minh', scope: actor.role === 'ADMIN' ? 'ALL_STAFF' : 'MY_PAYMENTS',
        window: { from: result.window.from.toISOString(), to: result.window.to.toISOString() },
        counts, totals: result.totals, hourly: result.hourly, staff: result.staff,
        content: result.content, transactions: result.transactions };
    } catch (error) {
      if (error instanceof AppError && error.code === 'FUTURE_DATE') throw error;
      throw new AppError(503, 'OPERATIONS_UNAVAILABLE', 'Chưa tải được sổ thu ngân. Vui lòng thử lại; số tiền chưa được xác nhận.');
    }
  }
}
module.exports = new OperationsService();
module.exports.OperationsService = OperationsService;
