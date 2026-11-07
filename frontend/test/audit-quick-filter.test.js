import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { InternalAuditLogsPage } from '../src/pages/InternalAuditLogsPage.tsx';

const origin = 'http://localhost:18080';
const user = { id: 1, email: 'admin@example.invalid', role: 'ADMIN', status: 'ACTIVE' };
const nodeText = node => typeof node === 'string' ? node : (node.children || []).map(nodeText).join('');
test('quick filters query the selected action immediately and only list actions the server supports', async t => {
  const entries = new Map([['tcv_internal_session_v1', JSON.stringify({ version: 1, apiBaseUrl: origin, user, accessToken: 'test', refreshToken: 'r' })]]);
  const storage = { getItem: k => entries.get(k) ?? null, setItem: (k, v) => entries.set(k, v), removeItem: k => entries.delete(k) };
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, writable: true, value: { location: { origin }, sessionStorage: storage, localStorage: storage } });
  const queries = [];
  t.mock.method(globalThis, 'fetch', async url => {
    queries.push(new URL(url).searchParams.get('action'));
    return new Response(JSON.stringify({ data: { items: [], total: 0, page: 1, limit: 15, actions: ['REISSUE_VISITOR_TOKEN', 'CONFIRM_CASH_PAYMENT'] } }), { headers: { 'Content-Type': 'application/json' } });
  });
  let view;
  await act(async () => { view = create(React.createElement(MemoryRouter, { future: { v7_startTransition: true, v7_relativeSplatPath: true } }, React.createElement(InternalAuditLogsPage))); });
  const group = view.root.findByProps({ 'aria-label': 'Lọc nhanh theo hành động' });
  const labels = group.findAllByType('button').map(nodeText);
  assert.deepEqual(labels, ['Tất cả', 'Cấp lại vé cho khách', 'Xác nhận thu tiền']);
  await act(async () => group.findAllByType('button')[1].props.onClick());
  assert.equal(queries.at(-1), 'REISSUE_VISITOR_TOKEN');
  assert.equal(view.root.findByType('select').props.value, 'REISSUE_VISITOR_TOKEN');
  await act(async () => group.findAllByType('button')[0].props.onClick());
  assert.equal(queries.at(-1), null);
  await act(async () => view.unmount());
  if (previous) Object.defineProperty(globalThis, 'window', previous); else delete globalThis.window;
});
