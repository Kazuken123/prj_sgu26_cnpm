const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { filters, dayWindow } = require('../services/operations.validation');
const { OperationsService } = require('../services/operations.service');
const actor = { userId: 1, role: 'ADMIN', status: 'ACTIVE' };
test('business day uses Vietnam midnight, validates real dates and rejects future dates', () => {
  const now = new Date('2026-10-23T17:10:00Z');
  const window = dayWindow('', now);
  assert.equal(window.date, '2026-10-24');
  assert.equal(window.from.toISOString(), '2026-10-23T17:00:00.000Z');
  assert.equal(window.to.toISOString(), '2026-10-24T17:00:00.000Z');
  for (const query of [{ date: '2025-02-29' }, { date: ['2026-10-24'] }, { status: 'unknown' }, { page: '0' }, { staffId: '2' }, { q: 'x'.repeat(101) }, { date: '2026-13-01' }]) {
    assert.throws(() => filters(query), e => e.status === 400);
  }
  assert.throws(() => dayWindow('2026-10-25', now), e => e.code === 'FUTURE_DATE');
});
test('operations rejects unauthorized actors before SQL and fails unavailable without fabricated amounts', async () => {
  let reads = 0;
  const service = new OperationsService({ read: async () => { reads++; throw Error('private SQL'); } });
  for (const bad of [null, { ...actor, role: 'VISITOR' }, { ...actor, status: 'LOCKED' }]) await assert.rejects(service.get(bad, {}), e => [401,403].includes(e.status));
  assert.equal(reads, 0);
  await assert.rejects(service.get(actor, {}), e => e.status === 503 && e.code === 'OPERATIONS_UNAVAILABLE' && !e.message.includes('SQL'));
});
test('operations HTTP requires internal authentication, allows STAFF with actual identity and sends no-store', async t => {
  const AppError = require('../utils/app-error');
  const server = http.createServer(require('../server').createApp({
    authService: { authenticate: async token => { if (token !== 'staff') throw new AppError(401,'INVALID_ACCESS_TOKEN','denied'); return { ...actor, userId: 7, role: 'STAFF' }; } },
    operationsService: { get: async (user, query) => { assert.equal(user.userId,7); assert.equal(user.role,'STAFF'); return { selected: query.date }; } }
  }));
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const url = `http://127.0.0.1:${server.address().port}/api/admin/operations?date=2026-10-24`;
  assert.equal((await fetch(url)).status,401);
  const response = await fetch(url,{headers:{Authorization:'Bearer staff'}});
  assert.equal(response.status,200); assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal((await response.json()).data.selected,'2026-10-24');
});
