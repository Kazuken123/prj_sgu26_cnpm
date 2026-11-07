import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { InternalReissuePage } from '../src/pages/InternalReissuePage.tsx';

const origin = 'http://localhost:18080';
const user = { id: 1, userId: 1, email: 'staff@example.invalid', fullName: 'Staff', role: 'STAFF', status: 'ACTIVE' };
const sessionId = '11111111-1111-4111-8111-111111111111', paymentRef = '22222222-2222-4222-8222-222222222222';
const summary = { sessionId, paymentRef, paymentMethod: 'CASH', amount: '50000.00', currency: 'VND', paidAt: '2026-10-20T00:30:00.000Z',
  expiresAt: new Date(Date.now() + 86400000).toISOString(), reissueCount: 0, maxReissues: 2, remainingAfter: 1, pendingPickup: false };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const nodeText = node => typeof node === 'string' ? node : (node.children || []).map(nodeText).join('');
const text = view => JSON.stringify(view.toJSON());
const button = (view, label) => view.root.findAllByType('button').find(b => nodeText(b).includes(label));
let restore = () => {};
function browser() {
  const entries = new Map([['tcv_internal_session_v1', JSON.stringify({ version: 1, apiBaseUrl: origin, user, accessToken: 'test', refreshToken: 'refresh' })]]);
  const storage = { getItem: k => entries.get(k) ?? null, setItem: (k, v) => entries.set(k, v), removeItem: k => entries.delete(k) };
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, writable: true, value: { location: { origin }, sessionStorage: storage, localStorage: storage,
    addEventListener() {}, removeEventListener() {}, setInterval, clearInterval, setTimeout, clearTimeout } });
  restore = () => { if (previous) Object.defineProperty(globalThis, 'window', previous); else delete globalThis.window; };
}
async function mount(t) {
  browser();
  let view;
  await act(async () => { view = create(React.createElement(MemoryRouter, { initialEntries: ['/internal/reissue?session=' + sessionId], future: { v7_startTransition: true, v7_relativeSplatPath: true } }, React.createElement(InternalReissuePage))); });
  t.after(async () => { await act(async () => view.unmount()); restore(); });
  return view;
}
const input = (view, id) => view.root.findByProps({ id });
async function fill(view, values) {
  for (const [id, value] of Object.entries(values)) await act(async () => input(view, id).props.onChange({ target: { value } }));
}
const submit = view => act(async () => view.root.findByType('form').props.onSubmit({ preventDefault() {} }));

test('prefills the session from the URL and blocks invalid input with field errors and no request', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async url => { calls.push(String(url)); return json({ data: user }); });
  const view = await mount(t);
  assert.equal(input(view, 'reissue-session').props.value, sessionId);
  await fill(view, { 'reissue-ref': 'not-a-uuid', 'reissue-reason': 'abc' });
  await submit(view);
  assert.match(text(view), /Mã giao dịch phải là UUID/); assert.match(text(view), /Chọn ngày giờ thanh toán/); assert.match(text(view), /5 đến 255 ký tự/);
  assert.equal(input(view, 'reissue-ref').props['aria-invalid'], true);
  assert.deepEqual(calls.filter(url => url.includes('reissue')), []);
});
test('verify shows the reconciled ticket, then confirmation reissues and displays the pickup code', async t => {
  const bodies = {};
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const path = new URL(url).pathname;
    if (path.endsWith('/me')) return json({ data: user });
    bodies[path] = JSON.parse(options.body);
    if (path.endsWith('/reissue/verify')) return json({ data: summary });
    return json({ data: { ...summary, reissueCount: 1, remainingAfter: 1, shortedCode: '482913', codeExpiresAt: new Date(Date.now() + 600000).toISOString(), renewedCode: false, reissueNumber: 1 } });
  });
  const view = await mount(t);
  await fill(view, { 'reissue-ref': paymentRef, 'reissue-paid': '2026-10-20T07:30', 'reissue-reason': 'Khách đổi điện thoại' });
  await submit(view);
  assert.equal(bodies['/api/admin/payments/reissue/verify'].paidAt, '2026-10-20T00:30:00.000Z');
  assert.equal(bodies['/api/admin/payments/reissue/verify'].reason, undefined, 'verification does not send the reason');
  assert.match(text(view), /Đã khớp giao dịch/); assert.match(text(view), /0 \/ 2 lần/);
  await act(async () => button(view, 'Cấp lại vé').props.onClick());
  assert.ok(view.root.findByProps({ role: 'dialog' }));
  await act(async () => button(view, 'Thu hồi vé cũ và cấp lại').props.onClick());
  assert.equal(bodies['/api/admin/payments/reissue'].reason, 'Khách đổi điện thoại');
  assert.match(text(view), /482913/); assert.match(text(view), /Đã thu hồi/);
  assert.equal(view.root.findAllByProps({ role: 'dialog' }).length, 0);
});
test('server rejections show the message, guidance and support code; editing data clears a stale verification', async t => {
  let mode = 'limit';
  t.mock.method(globalThis, 'fetch', async url => {
    if (new URL(url).pathname.endsWith('/me')) return json({ data: user });
    return mode === 'limit' ? json({ code: 'REISSUE_LIMIT_REACHED', error: 'Vé đã được cấp lại 2 lần.' }, 409) : json({ data: summary });
  });
  const view = await mount(t);
  await fill(view, { 'reissue-ref': paymentRef, 'reissue-paid': '2026-10-20T07:30', 'reissue-reason': 'Khách đổi điện thoại' });
  await submit(view);
  assert.match(text(view), /Vé đã được cấp lại 2 lần/); assert.match(text(view), /dùng hết số lần cấp lại/); assert.match(text(view), /REISSUE_LIMIT_REACHED/);
  mode = 'ok'; await submit(view);
  assert.match(text(view), /Đã khớp giao dịch/);
  await fill(view, { 'reissue-paid': '2026-10-20T07:45' });
  assert.doesNotMatch(text(view), /Đã khớp giao dịch/);
});
