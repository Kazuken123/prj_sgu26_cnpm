import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { InternalCashPage } from '../src/pages/InternalCashPage.tsx';

const origin = 'http://localhost:18080', id = '11111111-1111-4111-8111-111111111111';
const user = { id: 1, userId: 1, email: 'staff@example.invalid', role: 'STAFF', status: 'ACTIVE' };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const nodeText = node => typeof node === 'string' ? node : (node.children || []).map(nodeText).join('');
test('an already-activated paid session offers a direct link to the reissue page', async t => {
  const entries = new Map([['tcv_internal_session_v1', JSON.stringify({ version: 1, apiBaseUrl: origin, user, accessToken: 'test', refreshToken: 'r' })]]);
  const storage = { getItem: k => entries.get(k) ?? null, setItem: (k, v) => entries.set(k, v), removeItem: k => entries.delete(k) };
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, writable: true, value: { location: { origin }, sessionStorage: storage, localStorage: storage, setInterval, clearInterval, setTimeout, clearTimeout } });
  t.mock.method(globalThis, 'fetch', async url => {
    if (String(url).endsWith('/me')) return json({ data: user });
    if (String(url).endsWith('/cash-code')) return json({ code: 'VISIT_TOKEN_ALREADY_ISSUED', error: 'Phiên đã được cấp token.' }, 409);
    return json({ data: { sessionId: id, paymentRef: 'REF', paymentMethod: 'CASH', amount: '50000.00', currency: 'VND', paymentStatus: 'PAID', sessionStatus: 'ACTIVE' } });
  });
  let view;
  await act(async () => { view = create(React.createElement(MemoryRouter, { initialEntries: ['/internal/cash?session=' + id], future: { v7_startTransition: true, v7_relativeSplatPath: true } }, React.createElement(InternalCashPage))); });
  const links = () => view.root.findAllByType('a').map(a => a.props.href);
  assert.equal(links().includes('/internal/reissue?session=' + id), false);
  await act(async () => view.root.findAllByType('button').find(b => nodeText(b).includes('Cấp mã ngắn 6 số')).props.onClick());
  assert.ok(links().includes('/internal/reissue?session=' + id));
  await act(async () => view.unmount());
  if (previous) Object.defineProperty(globalThis, 'window', previous); else delete globalThis.window;
});
