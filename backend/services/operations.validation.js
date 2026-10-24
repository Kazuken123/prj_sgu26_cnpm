const AppError = require('../utils/app-error');
const statuses = ['ALL', 'PENDING', 'PAID', 'UNCLAIMED', 'FAILED'];
function filters(query = {}) {
  const bad = () => { throw new AppError(400, 'VALIDATION_ERROR', 'Ngày, trạng thái hoặc trang tra cứu không hợp lệ.'); };
  if (!query || typeof query !== 'object' || Array.isArray(query) || Object.keys(query).some(k => !['date', 'status', 'q', 'page'].includes(k))) bad();
  const { date = '', status = 'ALL', q = '', page = '1' } = query;
  if (typeof date !== 'string' || typeof q !== 'string' || q.length > 100 || !statuses.includes(status) || typeof page !== 'string' || !/^[1-9]\d{0,4}$/.test(page)) bad();
  if (date && (!/^20\d{2}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date + 'T00:00:00Z')) || new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) !== date)) bad();
  return { date, status, q: q.trim(), page: Number(page), limit: 20 };
}
const { dayWindow } = require('../utils/business-day');
module.exports = { filters, dayWindow };
