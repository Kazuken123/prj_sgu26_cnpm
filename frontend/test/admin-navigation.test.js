import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { InternalNavigation } from '../src/components/InternalNavigation.tsx';
import { saveInternalSession } from '../src/api/authStorage.ts';

const origin = 'http://localhost:18080';
const session = role => ({ version: 1, apiBaseUrl: origin, accessToken: 'a', refreshToken: 'r',
  user: { id: 1, email: role.toLowerCase() + '@example.invalid', fullName: 'Nguyễn Văn An', role, status: 'ACTIVE' } });
let restoreWindow = () => {};
// Unmount before restoring window: effect cleanups still remove listeners from it.
function browser(t) {
  const events = new EventTarget(), entries = new Map();
  const storage = { getItem: k => entries.get(k) ?? null, setItem: (k, v) => entries.set(k, v), removeItem: k => entries.delete(k) };
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, writable: true, value: { location: { origin }, sessionStorage: storage, localStorage: storage,
    addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events), dispatchEvent: events.dispatchEvent.bind(events) } });
  restoreWindow = () => { if (previous) Object.defineProperty(globalThis, 'window', previous); else delete globalThis.window; };
  return events;
}
let navigateTo;
const Navigator = () => { navigateTo = useNavigate(); return null; };
async function mount(t, path = '/internal/cash') {
  let view;
  await act(async () => { view = create(React.createElement(MemoryRouter, { initialEntries: [path], future: { v7_startTransition: true, v7_relativeSplatPath: true } },
    React.createElement(InternalNavigation), React.createElement(Navigator))); });
  t.after(async () => { await act(async () => view.unmount()); restoreWindow(); });
  return view;
}
const hrefs = view => view.root.findAllByType('a').map(a => a.props.href);
const menuButton = view => view.root.findAllByType('button').find(b => b.props['aria-controls'] === 'adm-sidebar');
const sidebar = view => view.root.findByType('aside');

test('STAFF sees operations and content links but no ADMIN-only destinations', async t => {
  browser(t); saveInternalSession(session('STAFF'));
  const view = await mount(t);
  const links = hrefs(view);
  for (const path of ['/internal/today', '/internal/cash', '/internal/reissue', '/internal/pois', '/internal/tours', '/internal/jobs', '/internal/knowledge', '/internal/account']) assert.ok(links.includes(path), path);
  for (const path of ['/internal/monitoring', '/internal/audit-logs', '/internal/staff/new']) assert.equal(links.includes(path), false, path);
  assert.match(JSON.stringify(view.toJSON()), /Nhân viên/);
});
test('ADMIN additionally sees monitoring, audit log and staff management', async t => {
  browser(t); saveInternalSession(session('ADMIN'));
  const view = await mount(t, '/internal/audit-logs');
  for (const path of ['/internal/monitoring', '/internal/audit-logs', '/internal/staff/new']) assert.ok(hrefs(view).includes(path), path);
  const active = view.root.findAllByType('a').find(a => a.props.href === '/internal/audit-logs');
  assert.equal(active.props['aria-current'], 'page');
  assert.match(JSON.stringify(view.toJSON()), /Lịch sử thao tác/);
});
test('mobile drawer opens, closes with Escape and closes again after navigation', async t => {
  const events = browser(t); saveInternalSession(session('STAFF'));
  const view = await mount(t);
  assert.equal(menuButton(view).props['aria-expanded'], false);
  await act(async () => menuButton(view).props.onClick());
  assert.equal(menuButton(view).props['aria-expanded'], true); assert.match(sidebar(view).props.className, /is-open/);
  await act(async () => { const e = new Event('keydown'); e.key = 'Escape'; events.dispatchEvent(e); });
  assert.doesNotMatch(sidebar(view).props.className, /is-open/);
  await act(async () => menuButton(view).props.onClick());
  await act(async () => navigateTo('/internal/pois'));
  assert.doesNotMatch(sidebar(view).props.className, /is-open/);
});
test('signed-out visitors only get the brand and a link back to the public site', async t => {
  browser(t);
  const view = await mount(t, '/internal/login');
  assert.equal(view.root.findAllByType('aside').length, 0);
  assert.deepEqual(hrefs(view).sort(), ['/', '/internal/login']);
});
