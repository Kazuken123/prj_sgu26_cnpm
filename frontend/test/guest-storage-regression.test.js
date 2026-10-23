import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getEmptyGuestSession, loadGuestSession, saveGuestSession, clearGuestSession } from '../src/api/guestStorage.ts';
const base = 'https://demo.example.test', key = 'tcv_guest_session_v1';
function fixture(t) {
  const old = globalThis.window;
  const store = () => { const data = new Map(); return { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,String(v)), removeItem: k => data.delete(k) }; };
  globalThis.window = { localStorage: store(), sessionStorage: store() };
  t.after(() => { globalThis.window = old; });
  return { ...getEmptyGuestSession(base), sessionId: 'TEST-session', token: 'TEST-token' };
}
test('guest credentials survive a new tab while internal credentials stay in session storage', t => {
  const session = fixture(t);
  window.sessionStorage.setItem('tcv_internal_session_v1', 'TEST-internal');
  assert.equal(saveGuestSession(session).success, true);
  window.sessionStorage = { getItem: () => null, removeItem() {} };
  assert.equal(loadGuestSession(base).session.token, session.token);
  assert.equal(window.localStorage.getItem('tcv_internal_session_v1'), null);
});
test('legacy guest session migrates once without overwriting an existing persistent guest session', t => {
  const session = fixture(t);
  window.sessionStorage.setItem(key, JSON.stringify(session));
  assert.equal(loadGuestSession(base).session.token, session.token);
  assert.equal(window.sessionStorage.getItem(key), null);
  window.sessionStorage.setItem(key, JSON.stringify({ ...session, token: 'TEST-stale' }));
  assert.equal(loadGuestSession(base).session.token, session.token);
});
test('failed migration preserves the only guest token and reports the storage failure', t => {
  const session = fixture(t);
  window.sessionStorage.setItem(key, JSON.stringify(session));
  window.localStorage.setItem = () => { throw new Error('TEST quota'); };
  const result = loadGuestSession(base);
  assert.equal(result.session.token, session.token);
  assert.match(result.storageError, /TEST quota/);
  assert.ok(window.sessionStorage.getItem(key));
});
test('wrong backend and malformed storage never authorize a guest on the current backend', t => {
  const session = fixture(t);
  window.sessionStorage.setItem(key, JSON.stringify({ ...session, apiBaseUrl: 'https://other.example.test' }));
  assert.equal(loadGuestSession(base).mismatchedBaseUrl, true);
  assert.equal(window.localStorage.getItem(key), null);
  window.localStorage.setItem(key, '{bad json');
  assert.equal(loadGuestSession(base).session.token, null);
});
test('clearing guest state removes persistent and legacy copies but leaves internal credentials untouched', t => {
  const session = fixture(t);
  saveGuestSession(session); window.sessionStorage.setItem(key, JSON.stringify(session));
  window.sessionStorage.setItem('tcv_internal_session_v1', 'TEST-internal');
  clearGuestSession();
  assert.equal(window.localStorage.getItem(key), null);
  assert.equal(window.sessionStorage.getItem(key), null);
  assert.equal(window.sessionStorage.getItem('tcv_internal_session_v1'), 'TEST-internal');
});

test('a blocked persistent store does not prevent clearing a legacy guest copy', t => {
  const session = fixture(t);
  window.sessionStorage.setItem(key, JSON.stringify(session));
  window.localStorage.removeItem = () => { throw Error('TEST storage blocked'); };
  clearGuestSession();
  assert.equal(window.sessionStorage.getItem(key), null);
});
