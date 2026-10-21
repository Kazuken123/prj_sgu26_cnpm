import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getApiBaseUrl, requestApi } from '../src/api/client.ts';
import { fetchAudioBlob } from '../src/api/media.ts';
import { executeAuthenticatedInternalRequest } from '../src/api/auth.ts';
import { saveInternalSession } from '../src/api/authStorage.ts';

test('API and protected audio use the deployed browser origin by default', async t => {
  const oldWindow = globalThis.window;
  const oldFetch = globalThis.fetch;
  t.after(() => { globalThis.window = oldWindow; globalThis.fetch = oldFetch; });
  globalThis.window = { location: { origin: 'https://guide.example' } };
  assert.equal(getApiBaseUrl(), 'https://guide.example');
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return url.includes('/media/')
      ? new Response(new Uint8Array([82, 73, 70, 70]), { headers: { 'Content-Type': 'audio/wav' } })
      : Response.json({ data: { status: 'ACTIVE' } });
  };
  await requestApi({ path: '/api/visits/me', token: 'test-token' });
  await fetchAudioBlob({ audioUrl: '/api/media/audio/sample.wav', token: 'test-token' });
  assert.equal(calls[0].url, 'https://guide.example/api/visits/me');
  assert.equal(calls[1].url, 'https://guide.example/api/media/audio/sample.wav');
  assert.equal(calls[1].options.headers.Authorization, 'Bearer test-token');
  await assert.rejects(fetchAudioBlob({ audioUrl: 'https://other.example/audio.wav', token: 'test-token' }),
    error => error.code === 'UNTRUSTED_MEDIA_HOST');
  assert.equal(calls.length, 2);
});

test('internal session from another backend is rejected before sending credentials', async t => {
  const oldWindow = globalThis.window;
  t.after(() => { globalThis.window = oldWindow; });
  const storage = new Map();
  globalThis.window = { sessionStorage: {
    getItem: key => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value)
  } };
  saveInternalSession({ version: 1, apiBaseUrl: 'https://old.example', accessToken: 'private-token', refreshToken: 'private-refresh', user: null });
  let sent = false;
  await assert.rejects(executeAuthenticatedInternalRequest('https://new.example', async () => { sent = true; }),
    error => error.code === 'SESSION_BACKEND_MISMATCH');
  assert.equal(sent, false);
});
