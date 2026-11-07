import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vietnamLocalToIso, verifyTokenReissue, reissueVisitorToken } from '../src/api/reissue.ts';

const origin = 'http://localhost:18080';
const json = data => new Response(JSON.stringify({ data }), { status: 200, headers: { 'Content-Type': 'application/json' } });

test('Vietnam datetime-local values become the matching UTC instant', () => {
  assert.equal(vietnamLocalToIso('2026-10-20T07:30'), '2026-10-20T00:30:00.000Z');
  assert.equal(vietnamLocalToIso('2026-10-21T00:05'), '2026-10-20T17:05:00.000Z');
  assert.equal(vietnamLocalToIso('2026-01-01T03:00'), '2025-12-31T20:00:00.000Z');
});
test('malformed or impossible calendar values are rejected instead of rolling over', () => {
  for (const value of ['', '2026-10-20', '2026-10-20 07:30', '2026-02-30T10:00', '2026-13-01T10:00', 'hôm qua']) {
    assert.equal(vietnamLocalToIso(value), null, value);
  }
});
test('verify and reissue send trimmed, lower-cased identifiers to the staff endpoints with the bearer token', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => { calls.push({ url: String(url), options }); return json({ ok: true }); });
  const input = { sessionId: '  11111111-1111-4111-8111-AAAAAAAAAAAA ', paymentRef: '22222222-2222-4222-8222-BBBBBBBBBBBB', paidAt: '2026-10-20T00:30:00.000Z' };
  await verifyTokenReissue('staff-token', input, origin);
  await reissueVisitorToken('staff-token', { ...input, reason: '  Mất điện thoại  ' }, origin);
  assert.equal(calls[0].url, origin + '/api/admin/payments/reissue/verify');
  assert.equal(calls[1].url, origin + '/api/admin/payments/reissue');
  for (const call of calls) { assert.equal(call.options.method, 'POST'); assert.equal(call.options.headers.Authorization, 'Bearer staff-token'); }
  assert.deepEqual(JSON.parse(calls[0].options.body), { sessionId: '11111111-1111-4111-8111-aaaaaaaaaaaa', paymentRef: '22222222-2222-4222-8222-bbbbbbbbbbbb', paidAt: input.paidAt });
  assert.equal(JSON.parse(calls[1].options.body).reason, 'Mất điện thoại');
});
