import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { InternalMonitoringPage } from '../src/pages/InternalMonitoringPage.tsx';
import { actor, monitoringService, serviceResponse, jsonResponse } from './helpers/backend-contracts.js';

const origin = 'http://localhost:18080';
test('monitoring skips background polls while the tab is hidden and resumes when visible', async t => {
  const entries = new Map([['tcv_internal_session_v1', JSON.stringify({ version: 1, apiBaseUrl: origin, user: actor, accessToken: 'test', refreshToken: 'r' })]]);
  const storage = { getItem: k => entries.get(k) ?? null, setItem: (k, v) => entries.set(k, v), removeItem: k => entries.delete(k) };
  const previous = ['window', 'document'].map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]);
  Object.defineProperty(globalThis, 'window', { configurable: true, writable: true, value: { location: { origin }, sessionStorage: storage, localStorage: storage } });
  Object.defineProperty(globalThis, 'document', { configurable: true, writable: true, value: { visibilityState: 'visible' } });
  const ticks = [];
  t.mock.method(globalThis, 'setInterval', (fn, ms) => { ticks.push({ fn, ms }); return ticks.length; });
  t.mock.method(globalThis, 'clearInterval', () => {});
  let monitoringReads = 0;
  t.mock.method(globalThis, 'fetch', async url => {
    if (new URL(url).pathname === '/api/admin/online-visitors') return jsonResponse({ data: { count: 1, generatedAt: new Date().toISOString(), windowSeconds: 120, measurement: 'BROWSER_SESSIONS' } });
    monitoringReads++;
    return serviceResponse(() => monitoringService().get(actor, Object.fromEntries(new URL(url).searchParams)));
  });
  let view;
  await act(async () => { view = create(React.createElement(MemoryRouter, { future: { v7_startTransition: true, v7_relativeSplatPath: true } }, React.createElement(InternalMonitoringPage))); });
  assert.equal(monitoringReads, 1);
  const poll = ticks.find(tick => tick.ms === 30000);
  assert.ok(poll, 'monitoring registers a 30 second poll');
  globalThis.document.visibilityState = 'hidden';
  await act(async () => poll.fn());
  assert.equal(monitoringReads, 1);
  globalThis.document.visibilityState = 'visible';
  await act(async () => poll.fn());
  assert.equal(monitoringReads, 2);
  await act(async () => view.unmount());
  for (const [k, d] of previous) { if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k]; }
});
