import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { InternalNavigation } from '../src/components/InternalNavigation.tsx';
import { VisitorNavigation } from '../src/components/VisitorNavigation.tsx';
import { PaymentPage } from '../src/pages/PaymentPage.tsx';
import { saveInternalSession, loadInternalSession } from '../src/api/authStorage.ts';
import { saveGuestSession, clearGuestSession, loadGuestSession } from '../src/api/guestStorage.ts';
import { getVisitPrice } from '../src/api/payment.ts';
import { InternalAuditLogsPage } from '../src/pages/InternalAuditLogsPage.tsx';
import { createRequire } from 'node:module';
const { AuditService } = createRequire(import.meta.url)('../../backend/services/audit.service.js');

const origin = 'http://localhost:18080';
const response = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const user = { id: 1, email: 'admin@example.invalid', fullName: 'Administrator', role: 'ADMIN', status: 'ACTIVE' };
const internal = () => ({ version: 1, apiBaseUrl: origin, user, accessToken: 'access-test', refreshToken: 'refresh-test' });
const views = new WeakMap();
function browser(t) {
  const events = new EventTarget(), entries = new Map();
  const storage = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) };
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, writable: true, value: { location: { origin }, scrollY: 0, sessionStorage: storage, localStorage: storage,
    addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events), dispatchEvent: events.dispatchEvent.bind(events),
    setTimeout, clearTimeout, setInterval, clearInterval } });
  views.set(t, []);
  t.after(async () => {
    for (const view of views.get(t)) await act(async () => view.unmount());
    if (previous) Object.defineProperty(globalThis, 'window', previous); else delete globalThis.window;
  });
  return events;
}
async function mount(t, Component) {
  let view;
  await act(async () => { view = create(React.createElement(MemoryRouter, { future: { v7_startTransition: true, v7_relativeSplatPath: true } }, React.createElement(Component))); });
  views.get(t).push(view);
  return view;
}
const text = view => JSON.stringify(view.toJSON());
const nodeText = node => typeof node === 'string' ? node : (node.children || []).map(nodeText).join('');
const button = (view, label) => view.root.findAllByType('button').find(node => nodeText(node).includes(label));

test('header observes login/role changes; failed logout retains credentials and successful retry clears menu', async t => {
  browser(t); let fail = true, calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return fail ? response({ code: 'UNAVAILABLE', error: 'retry' }, 503) : new Response(null, { status: 204 }); });
  const view = await mount(t, InternalNavigation);
  assert.doesNotMatch(text(view), /Administrator/);
  await act(async () => saveInternalSession(internal()));
  assert.match(text(view), /Administrator|ADMIN/);
  await act(async () => saveInternalSession({ ...internal(), user: { ...user, role: 'STAFF' } }));
  assert.doesNotMatch(text(view), /Nhật ký Audit/);
  await act(async () => saveInternalSession(internal()));
  assert.match(text(view), /Nhật ký Audit/);
  await act(async () => button(view, 'Đăng xuất').props.onClick());
  assert.match(text(view), /Chưa đăng xuất/); assert.equal(loadInternalSession(origin).session.refreshToken, 'refresh-test');
  fail = false;
  await act(async () => button(view, 'Đăng xuất').props.onClick());
  assert.equal(loadInternalSession(origin).session.accessToken, null); assert.doesNotMatch(text(view), /Administrator/); assert.equal(calls, 2);
});

test('audit date and knowledge action filters satisfy the production backend contract', async t => {
  browser(t); saveInternalSession(internal());
  let lastQuery, lastStatus;
  const service = new AuditService({ list: async selected => ({ items: [], total: 0, page: selected.page, limit: selected.limit }) });
  t.mock.method(globalThis, 'fetch', async url => {
    lastQuery = Object.fromEntries(new URL(url).searchParams);
    try { lastStatus = 200; return response({ data: await service.list({ userId: 1, role: 'ADMIN', status: 'ACTIVE' }, lastQuery) }); }
    catch (error) { lastStatus = error.status; return response({ code: error.code, error: error.message }, error.status); }
  });
  const view = await mount(t, InternalAuditLogsPage);
  assert.ok(view.root.findAllByType('option').some(node => node.props.value === 'PUBLISH_KNOWLEDGE_DOCUMENT'));
  await act(async () => {
    const dates = view.root.findAllByType('input').filter(node => node.props.type === 'date');
    dates[0].props.onChange({ target: { value: '2026-10-23' } });
    dates[1].props.onChange({ target: { value: '2026-10-24' } });
    view.root.findByType('select').props.onChange({ target: { value: 'PUBLISH_KNOWLEDGE_DOCUMENT' } });
  });
  await act(async () => view.root.findByType('form').props.onSubmit({ preventDefault() {} }));
  assert.equal(lastStatus, 200);
  assert.equal(lastQuery.from, '2026-10-23T00:00:00Z');
  assert.equal(lastQuery.to, '2026-10-24T00:00:00Z');
  assert.equal(lastQuery.action, 'PUBLISH_KNOWLEDGE_DOCUMENT');
});

test('header clears a session rejected with HTTP 401 instead of retrying unusable credentials', async t => {
  browser(t); saveInternalSession(internal());
  t.mock.method(globalThis, 'fetch', async () => response({ code: 'SESSION_REVOKED', error: 'revoked' }, 401));
  const view = await mount(t, InternalNavigation);
  await act(async () => button(view, 'Đăng xuất').props.onClick());
  assert.equal(loadInternalSession(origin).session.accessToken, null);
  assert.doesNotMatch(text(view), /Administrator/);
});

test('guest menu verifies saved token and ignores stale verification after clearing it', async t => {
  browser(t); let resolveOld, pending = false;
  t.mock.method(globalThis, 'fetch', async () => {
    if (pending) return new Promise(resolve => { resolveOld = resolve; });
    return response({ data: { status: 'ACTIVE', expiresAt: new Date(Date.now() + 60000).toISOString() } });
  });
  const view = await mount(t, VisitorNavigation);
  const guest = { version: 1, apiBaseUrl: origin, token: 'guest-test' };
  await act(async () => saveGuestSession(guest)); assert.match(text(view), /Đã kích hoạt nghe/);
  pending = true; await act(async () => saveGuestSession(guest));
  await act(async () => clearGuestSession());
  await act(async () => resolveOld(response({ data: { status: 'ACTIVE', expiresAt: new Date(Date.now() + 60000).toISOString() } })));
  assert.doesNotMatch(text(view), /Đã kích hoạt nghe/);
});

test('guest revoked/expired/network failures never claim an active ticket or erase retry credentials', async t => {
  const events = browser(t); let mode = 'expired';
  saveGuestSession({ version: 1, apiBaseUrl: origin, token: 'guest-test' });
  t.mock.method(globalThis, 'fetch', async () => {
    if (mode === 'network') throw Error('offline');
    if (mode === 'revoked') return response({ code: 'VISIT_SESSION_REVOKED', error: 'revoked' }, 401);
    return response({ data: { status: 'ACTIVE', expiresAt: '2020-01-01T00:00:00Z' } });
  });
  const view = await mount(t, VisitorNavigation);
  for (const next of ['expired', 'revoked', 'network']) {
    mode = next; await act(async () => events.dispatchEvent(new Event('focus')));
    assert.doesNotMatch(text(view), /Đã kích hoạt nghe/); assert.equal(loadGuestSession(origin).session.token, 'guest-test');
  }
});

test('price appears before checkout, uses server value, and never creates a payment on mount/retry', async t => {
  browser(t); let fail = true; const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url: String(url), method: options.method });
    return fail ? response({ code: 'VISIT_PRICE_NOT_CONFIGURED', error: 'unavailable' }, 503) : response({ data: { amount: '12345.00', currency: 'VND' } });
  });
  const view = await mount(t, PaymentPage);
  assert.match(text(view), /Chưa tải được giá/);
  fail = false; await act(async () => button(view, 'Tải lại giá').props.onClick());
  assert.match(text(view), /12.345/); assert.equal(calls.length, 2);
  assert.ok(calls.every(call => call.method === 'GET' && call.url.endsWith('/api/payments/price')));
});

test('invalid server price cannot be rendered as zero, NaN or a client chosen amount', async t => {
  browser(t);
  for (const data of [{ amount: 'NaN', currency: 'VND' }, { amount: '0.00', currency: 'VND' }, { amount: '1.00', currency: 'USD' }]) {
    t.mock.method(globalThis, 'fetch', async () => response({ data }));
    await assert.rejects(getVisitPrice(), /Giá vé không hợp lệ/);
  }
});

test('cash guest enters only six digits; verification failure keeps the issued token and never exchanges it twice', async t => {
  browser(t); const requests = []; let verifyFails = true;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const path = new URL(url).pathname; requests.push({ path, body: options.body });
    if (path.endsWith('/price')) return response({ data: { amount: '50000.00', currency: 'VND' } });
    if (path.endsWith('/exchange-cash-code')) {
      assert.deepEqual(JSON.parse(options.body), { shortedCode: '012345' });
      assert.equal(options.headers.Authorization, undefined);
      return response({ data: { sessionId: 'test-visit', token: 'cash-guest-test', tokenType: 'Bearer', expiresAt: new Date(Date.now() + 60000).toISOString() } });
    }
    if (verifyFails) return response({ code: 'TEMPORARILY_UNAVAILABLE', error: 'retry' }, 503);
    return response({ data: { sessionId: 'test-visit', status: 'ACTIVE', expiresAt: new Date(Date.now() + 60000).toISOString() } });
  });
  const view = await mount(t, PaymentPage);
  await act(async () => button(view, 'Nhập mã tại quầy').props.onClick());
  const inputs = view.root.findAllByType('input');
  assert.equal(inputs.length, 1); assert.equal(inputs[0].props.id, 'cash-code'); assert.equal(inputs[0].props.inputMode, 'numeric');
  assert.doesNotMatch(text(view), /UUID|cash-session-id|Mã phiên tham quan/);
  await act(async () => inputs[0].props.onChange({ target: { value: '012345' } }));
  await act(async () => view.root.findByType('form').props.onSubmit({ preventDefault() {} }));
  assert.equal(loadGuestSession(origin).session.token, 'cash-guest-test');
  assert.equal(requests.filter(item => item.path.endsWith('/exchange-cash-code')).length, 1);
  verifyFails = false;
  await act(async () => button(view, 'Xác minh lại phiên').props.onClick());
  assert.match(text(view), /Vé của bạn đã sẵn sàng|Bắt đầu khám phá/);
  assert.equal(requests.filter(item => item.path.endsWith('/exchange-cash-code')).length, 1);
  assert.equal(view.root.findByType('table').parent.type, 'details');
});

test('invalid cash codes show a human message; technical error remains in collapsed support details', async t => {
  browser(t);
  t.mock.method(globalThis, 'fetch', async url => String(url).endsWith('/price')
    ? response({ data: { amount: '50000.00', currency: 'VND' } })
    : response({ code: 'CASH_CODE_INVALID_OR_EXPIRED', error: 'technical backend detail' }, 401));
  const view = await mount(t, PaymentPage);
  await act(async () => button(view, 'Nhập mã tại quầy').props.onClick());
  await act(async () => view.root.findByType('input').props.onChange({ target: { value: '012345' } }));
  await act(async () => view.root.findByType('form').props.onSubmit({ preventDefault() {} }));
  assert.match(text(view), /Bạn hãy kiểm tra lại với nhân viên/);
  assert.doesNotMatch(text(view), /technical backend detail/);
  const detail = view.root.findByType('details'); assert.equal(detail.props.open, undefined);
  assert.equal(view.root.findByType('input').props.value, '012345');
  assert.equal(loadGuestSession(origin).session.token, null);
});
