import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { InternalProtectedRoute } from '../src/components/InternalProtectedRoute.tsx';

const origin = 'http://localhost:18080';
const h = React.createElement;
async function render(t, role, requireAdmin) {
  const entries = new Map(role ? [['tcv_internal_session_v1', JSON.stringify({ version: 1, apiBaseUrl: origin, accessToken: 'a', refreshToken: 'r', user: { id: 1, email: 'x@example.invalid', role, status: 'ACTIVE' } })]] : []);
  const storage = { getItem: k => entries.get(k) ?? null, setItem: (k, v) => entries.set(k, v), removeItem: k => entries.delete(k) };
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, writable: true, value: { location: { origin }, sessionStorage: storage, localStorage: storage } });
  let view;
  await act(async () => { view = create(h(MemoryRouter, { initialEntries: ['/internal/audit-logs'], future: { v7_startTransition: true, v7_relativeSplatPath: true } },
    h(Routes, null,
      h(Route, { path: '/internal/audit-logs', element: h(InternalProtectedRoute, { requireAdmin }, h('p', null, 'PROTECTED CONTENT')) }),
      h(Route, { path: '/internal/login', element: h('p', null, 'LOGIN PAGE') })))); });
  t.after(async () => { await act(async () => view.unmount()); if (previous) Object.defineProperty(globalThis, 'window', previous); else delete globalThis.window; });
  return JSON.stringify(view.toJSON());
}
test('no internal session redirects to the login page', async t => {
  assert.match(await render(t, null, false), /LOGIN PAGE/);
});
test('STAFF on an ADMIN-only page sees the denial screen with their role, never the content', async t => {
  const text = await render(t, 'STAFF', true);
  assert.match(text, /Không có quyền truy cập/); assert.match(text, /STAFF/); assert.doesNotMatch(text, /PROTECTED CONTENT/);
});
test('ADMIN and non-admin-only pages render the protected content', async t => {
  assert.match(await render(t, 'ADMIN', true), /PROTECTED CONTENT/);
});
test('STAFF reaches pages that do not require ADMIN', async t => {
  assert.match(await render(t, 'STAFF', false), /PROTECTED CONTENT/);
});
