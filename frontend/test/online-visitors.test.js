import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { browserVisitorId, useVisitorOnline } from '../src/hooks/useVisitorOnline.ts';
import { OnlineVisitorsCard } from '../src/components/OnlineVisitorsCard.tsx';
const origin = 'http://online.example.test';
const id = '11111111-1111-4111-8111-111111111111';
function browser(t) {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const map = new Map(), listeners = new Map(), timers = new Map(); let timerId = 0;
  const storage = { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)) };
  const document = { visibilityState: 'visible', addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) };
  const window = { location: { origin }, crypto: { randomUUID: () => id }, localStorage: storage, sessionStorage: storage,
    setInterval: fn => { timers.set(++timerId, fn); return timerId; }, clearInterval: key => timers.delete(key) };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: window });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: document });
  const views = [];
  t.after(async () => {
    for (const view of views) await act(async () => view.unmount());
    if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow); else delete globalThis.window;
    if (oldDocument) Object.defineProperty(globalThis, 'document', oldDocument); else delete globalThis.document;
  });
  return { window, document, timers, listeners, storage, mount: async element => {
    let view; await act(async () => { view = create(element); }); views.push(view); return view;
  } };
}
const response = (data, status = 200) => new Response(JSON.stringify({ data }), { status, headers: { 'Content-Type': 'application/json' } });
test('one browser shares an identifier across tabs and storage refusal disables tracking without failing the app', t => {
  const b = browser(t); let generated = 0;
  b.window.crypto.randomUUID = () => { generated++; return id; };
  assert.equal(browserVisitorId(origin), id); assert.equal(browserVisitorId(origin), id); assert.equal(generated, 1);
  b.storage.getItem = () => { throw Error('storage disabled'); }; assert.equal(browserVisitorId(origin), null);
});
test('visitor tracking sends no credentials, pauses hidden tabs, resumes and cleans up when entering admin', async t => {
  const b = browser(t); let calls = 0;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, origin + '/api/presence/heartbeat'); assert.equal(options.headers.Authorization, undefined);
    assert.deepEqual(JSON.parse(options.body), { visitorId: id }); calls++;
    return response({ accepted: true, windowSeconds: 120 });
  });
  function Harness({ enabled }) { useVisitorOnline(enabled); return null; }
  const view = await b.mount(React.createElement(Harness, { enabled: true })); assert.equal(calls, 1);
  b.document.visibilityState = 'hidden'; await act(async () => { for (const tick of b.timers.values()) tick(); }); assert.equal(calls, 1);
  b.document.visibilityState = 'visible'; await act(async () => b.listeners.get('visibilitychange')()); assert.equal(calls, 2);
  await act(async () => view.update(React.createElement(Harness, { enabled: false })));
  assert.equal(b.timers.size, 0); assert.equal(b.listeners.size, 0);
});
test('admin card shows count and freshness, retains stale data on failure and recovers', async t => {
  const b = browser(t); let down = false, count = 4;
  b.storage.setItem('tcv_internal_session_v1', JSON.stringify({ version: 1, apiBaseUrl: origin,
    user: { id: 1, email: 'admin@example.invalid', role: 'ADMIN', status: 'ACTIVE' }, accessToken: 'admin-test-token', refreshToken: 'test-refresh' }));
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, origin + '/api/admin/online-visitors'); assert.equal(options.headers.Authorization, 'Bearer admin-test-token');
    if (down) return new Response(JSON.stringify({ code: 'ONLINE_VISITORS_UNAVAILABLE', error: 'Unavailable' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    return response({ count, generatedAt: '2026-10-26T07:00:00Z', windowSeconds: 120, measurement: 'BROWSER_SESSIONS' });
  });
  const view = await b.mount(React.createElement(OnlineVisitorsCard));
  const text = () => JSON.stringify(view.toJSON());
  assert.match(text(), /ước tính/); assert.match(text(), /"4"/); assert.match(text(), /Cập nhật/);
  down = true; await act(async () => view.root.findByType('button').props.onClick());
  assert.match(text(), /lần lấy thành công trước/); assert.match(text(), /"4"/);
  down = false; count = 0; await act(async () => view.root.findByType('button').props.onClick());
  assert.match(text(), /"0"/); assert.doesNotMatch(text(), /lần lấy thành công trước/);
});
