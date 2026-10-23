import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { executeAuthenticatedInternalRequest, getAuthMe, createStaffAccount, logoutStoredInternalSession } from '../src/api/auth.ts';
import { saveInternalSession, loadInternalSession } from '../src/api/authStorage.ts';
import { getApiBaseUrl } from '../src/api/client.ts';

const base = 'http://127.0.0.1:18080';
const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
beforeEach(() => {
  const entries = new Map();
  const guestEntries = new Map();
  globalThis.window = { localStorage: {
    getItem: key => guestEntries.get(key) ?? null,
    setItem: (key, value) => guestEntries.set(key, String(value)),
    removeItem: key => guestEntries.delete(key)
  }, sessionStorage: {
    getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, String(value)),
    removeItem: key => entries.delete(key)
  } };
  saveInternalSession({ version: 1, apiBaseUrl: base, user: null, accessToken: 'old-access', refreshToken: 'old-refresh' });
});
afterEach(() => { globalThis.fetch = originalFetch; globalThis.window = originalWindow; });
test('expired access refreshes once, rotates stored tokens and retries with Bearer', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, ...options });
    if (calls.length === 1) return json({ code: 'INVALID_ACCESS_TOKEN', error: 'expired' }, 401);
    if (url.endsWith('/refresh')) return json({ data: { user: null, accessToken: 'new-access', refreshToken: 'new-refresh' } });
    return json({ data: { email: 'test@example.com' } });
  };
  const result = await executeAuthenticatedInternalRequest(base, token => getAuthMe(token, base));
  assert.equal(result.email, 'test@example.com');
  assert.equal(calls[0].headers.Authorization, 'Bearer old-access');
  assert.equal(JSON.parse(calls[1].body).refreshToken, 'old-refresh');
  assert.equal(calls[2].headers.Authorization, 'Bearer new-access');
  assert.equal(loadInternalSession(base).session.refreshToken, 'new-refresh');
  assert.equal(calls.length, 3);
});
test('logout waits for server acknowledgment before clearing only internal credentials', async () => {
  window.localStorage.setItem('tcv_guest_session_v1', 'guest-session');
  globalThis.fetch = async (url, options) => {
    assert.equal(url, base + '/api/auth/logout');
    assert.equal(JSON.parse(options.body).refreshToken, 'old-refresh');
    assert.equal(loadInternalSession(base).session.accessToken, 'old-access');
    return new Response(null, { status: 204 });
  };
  await logoutStoredInternalSession(base);
  assert.equal(loadInternalSession(base).session.accessToken, null);
  assert.equal(window.localStorage.getItem('tcv_guest_session_v1'), 'guest-session');
});
test('network failure and 503 during logout retain credentials for retry', async () => {
  for (const failure of ['network', 'unavailable']) {
    globalThis.fetch = async () => {
      if (failure === 'network') throw new Error('network');
      return json({ code: 'UNAVAILABLE', error: 'try again' }, 503);
    };
    await assert.rejects(logoutStoredInternalSession(base));
    assert.equal(loadInternalSession(base).session.refreshToken, 'old-refresh');
  }
});
test('staff creation preserves payload and uses the rotated token after refresh', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, ...options });
    if (calls.length === 1) return json({ code: 'INVALID_ACCESS_TOKEN', error: 'expired' }, 401);
    if (url.endsWith('/refresh')) return json({ data: { user: null, accessToken: 'new-access', refreshToken: 'new-refresh' } });
    return json({ data: { role: 'STAFF' } }, 201);
  };
  const input = { email: 'staff@example.com', password: 'Test-only-password1!', fullName: 'Test staff' };
  await executeAuthenticatedInternalRequest(base, token => createStaffAccount(token, input, base));
  assert.deepEqual(calls.map(call => new URL(call.url).pathname), ['/api/admin/staff', '/api/auth/refresh', '/api/admin/staff']);
  assert.deepEqual(JSON.parse(calls[2].body), input);
  assert.equal(calls[2].headers.Authorization, 'Bearer new-access');
});
test('failed refresh is not retried indefinitely and clears the unusable session', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return json({ code: calls === 1 ? 'INVALID_ACCESS_TOKEN' : 'INVALID_REFRESH_TOKEN', error: 'denied' }, 401); };
  await assert.rejects(executeAuthenticatedInternalRequest(base, token => getAuthMe(token, base)));
  assert.equal(calls, 2);
  assert.equal(loadInternalSession(base).session.accessToken, null);
});
test('packaged frontend defaults to its own origin without a build-time API URL', () => {
  window.location = { protocol: 'https:', origin: 'https://demo.example.test' };
  assert.equal(getApiBaseUrl(), 'https://demo.example.test');
});

test('refresh service unavailable keeps credentials for a later retry', async () => {
  globalThis.fetch = async url => url.endsWith('/refresh')
    ? json({ code: 'UNAVAILABLE', error: 'try again' }, 503)
    : json({ code: 'INVALID_ACCESS_TOKEN', error: 'expired' }, 401);
  await assert.rejects(executeAuthenticatedInternalRequest(base, token => getAuthMe(token, base)));
  assert.equal(loadInternalSession(base).session.refreshToken, 'old-refresh');
});
test('business error after refresh does not erase successfully rotated credentials', async () => {
  let calls = 0;
  globalThis.fetch = async url => {
    if (url.endsWith('/refresh')) return json({ data: { user: null, accessToken: 'new-access', refreshToken: 'new-refresh' } });
    return ++calls === 1 ? json({ code: 'INVALID_ACCESS_TOKEN', error: 'expired' }, 401) : json({ code: 'TOUR_VERSION_CONFLICT', error: 'reload' }, 409);
  };
  await assert.rejects(executeAuthenticatedInternalRequest(base, token => getAuthMe(token, base)), error => error.status === 409);
  assert.equal(loadInternalSession(base).session.refreshToken, 'new-refresh');
});
test('a delayed old-token failure uses the rotated token instead of replaying a consumed refresh token', async () => {
  let release, refreshes = 0;
  const late = new Promise(resolve => { release = resolve; });
  globalThis.fetch = async url => { assert.ok(url.endsWith('/refresh')); refreshes++; return json({ data: { user: null, accessToken: 'new-access', refreshToken: 'new-refresh' } }); };
  const request = async token => { if (token === 'old-access') { await late; throw new (await import('../src/api/client.ts')).ApiError({ status: 401, code: 'INVALID_ACCESS_TOKEN', message: 'expired' }); } return token; };
  const pending = executeAuthenticatedInternalRequest(base, request);
  await executeAuthenticatedInternalRequest(base, async token => { if (token === 'old-access') throw new (await import('../src/api/client.ts')).ApiError({ status: 401, code: 'INVALID_ACCESS_TOKEN', message: 'expired' }); return token; });
  release();
  assert.equal(await pending, 'new-access');
  assert.equal(refreshes, 1);
});
