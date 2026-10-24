const AppError = require('./app-error');
function dayWindow(date, now) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw Error('INVALID_SQL_CLOCK');
  const today = new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10);
  const selected = date || today;
  if (selected > today) throw new AppError(400, 'FUTURE_DATE', 'Chọn hôm nay hoặc một ngày đã qua.');
  const from = new Date(selected + 'T00:00:00+07:00');
  return { date: selected, today, from, to: new Date(from.getTime() + 86400000) };
}
module.exports = { dayWindow };
