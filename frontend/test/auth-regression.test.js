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
  globalThis.window = { sessionStorage: {
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
  window.sessionStorage.setItem('tcv_guest_session_v1', 'guest-session');
  globalThis.fetch = async (url, options) => {
    assert.equal(url, base + '/api/auth/logout');
    assert.equal(JSON.parse(options.body).refreshToken, 'old-refresh');
    assert.equal(loadInternalSession(base).session.accessToken, 'old-access');
    return new Response(null, { status: 204 });
  };
  await logoutStoredInternalSession(base);
  assert.equal(loadInternalSession(base).session.accessToken, null);
  assert.equal(window.sessionStorage.getItem('tcv_guest_session_v1'), 'guest-session');
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
