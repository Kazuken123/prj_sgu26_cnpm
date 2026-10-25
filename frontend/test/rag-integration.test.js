import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { VisitorChat } from '../src/components/VisitorChat.tsx';
import { VisitorChatWidget } from '../src/components/VisitorChatWidget.tsx';
import { InternalKnowledgePage } from '../src/pages/InternalKnowledgePage.tsx';
import { safeSourceUrl } from '../src/api/rag.ts';
import { jsonResponse, serviceResponse } from './helpers/backend-contracts.js';
const load = createRequire(import.meta.url);
const { ChatService } = load('../../backend/services/chat.service.js');
const { KnowledgeService } = load('../../backend/services/knowledge.service.js');
const { getRagConfig } = load('../../backend/services/rag.config.js');
const MockEmbedding = load('../../backend/adapters/mock-embedding.js');
const MockLlm = load('../../backend/adapters/mock-llm.js');
const h = React.createElement, origin = 'http://localhost:18080';
const visitorToken = 'tcv_visit_' + 'c'.repeat(64);
const actor = { userId: 1, role: 'STAFF', status: 'ACTIVE' };
const text = view => JSON.stringify(view.toJSON());
async function mount(t, component) {
  let view;
  await act(async () => { view = create(h(MemoryRouter, { future: { v7_startTransition: true, v7_relativeSplatPath: true } }, component)); });
  t.after(async () => { await act(async () => view.unmount()); });
  return view;
}
const button = (view, name) => view.root.findAllByType('button').find(n => n.children.join('').includes(name));

test('floating chat keeps conversation when minimized; dragging stays onscreen and does not open the chat', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return jsonResponse({ data: { status: 'NO_CONTEXT', answer: 'ANSWER_RETAINED', sources: [], mode: 'AI' } }); });
  const view = await mount(t, h(VisitorChatWidget, { token: visitorToken, baseUrl: origin, onSessionExpired() {} }));
  const launcher = () => view.root.findAllByType('button').find(n => n.props.className?.includes('garden-chat-launcher'));
  await act(async () => launcher().props.onClick({ detail: 1 }));
  await act(async () => view.root.findByType('textarea').props.onChange({ target: { value: 'Voi?' } }));
  await act(async () => view.root.findByType('form').props.onSubmit({ preventDefault() {} }));
  await act(async () => view.root.findAllByType('button').find(n => n.props.className === 'garden-chat-minimize').props.onClick());
  assert.equal(launcher().props['aria-expanded'], false);
  const target = { getBoundingClientRect: () => ({ left: 700, top: 600, width: 140, height: 54 }), setPointerCapture() {}, hasPointerCapture: () => true, releasePointerCapture() {} };
  await act(async () => launcher().props.onPointerDown({ isPrimary: true, button: 0, pointerId: 7, clientX: 700, clientY: 600, currentTarget: target }));
  await act(async () => launcher().props.onPointerMove({ pointerId: 7, clientX: -900, clientY: -900 }));
  await act(async () => launcher().props.onPointerUp({ pointerId: 7, currentTarget: target }));
  await act(async () => launcher().props.onClick({ detail: 1 }));
  assert.equal(launcher().props['aria-expanded'], false);
  assert.deepEqual(view.root.findByType('aside').props.style, { left: 8, top: 8, right: 'auto', bottom: 'auto' });
  await act(async () => launcher().props.onClick({ detail: 1 }));
  assert.match(text(view), /ANSWER_RETAINED/); assert.equal(calls, 1);
});

test('minimizing chat aborts the pending request and keeps the draft without accepting its late reply', async t => {
  let resolve, signal;
  t.mock.method(globalThis, 'fetch', (_url, options) => { signal = options.signal; return new Promise(done => { resolve = done; }); });
  const props = { token: visitorToken, baseUrl: origin, open: true, onSessionExpired() {} };
  const view = await mount(t, h(VisitorChat, props));
  await act(async () => view.root.findByType('textarea').props.onChange({ target: { value: 'Voi?' } }));
  await act(async () => { void view.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
  await act(async () => view.update(h(MemoryRouter, null, h(VisitorChat, { ...props, open: false }))));
  assert.equal(signal.aborted, true);
  await act(async () => resolve(jsonResponse({ data: { status: 'NO_CONTEXT', answer: 'STALE_REPLY', sources: [], mode: 'AI' } })));
  await act(async () => view.update(h(MemoryRouter, null, h(VisitorChat, props))));
  assert.doesNotMatch(text(view), /STALE_REPLY/); assert.equal(view.root.findByType('textarea').props.value, 'Voi?');
});

test('visitor chat uses real backend contract, guest token and retrieved sources; labels mock instead of claiming real AI', async t => {
  const config = getRagConfig({}), embedding = new MockEmbedding(), logs = [];
  const service = new ChatService({ config, embedding, llm: new MockLlm(), redis: { consumeLookup: async () => true },
    store: { candidates: async () => [{ documentId: 1, chunkId: '1', sourceVersion: 1, title: 'Voi', source: 'https://example.invalid/voi', text: 'Voi ăn cỏ.', embedding: embedding.vector('Voi ăn cỏ.') }], createLog: async log => logs.push(log) } });
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, origin + '/api/chat/questions');
    assert.equal(options.headers.Authorization, 'Bearer ' + visitorToken);
    const body = JSON.parse(options.body); assert.deepEqual(Object.keys(body), ['question']);
    return serviceResponse(() => service.ask({ sessionId: '11111111-1111-4111-8111-111111111111' }, body, '192.0.2.1'));
  });
  const view = await mount(t, h(VisitorChat, { token: visitorToken, baseUrl: origin, open: true, onSessionExpired() { assert.fail('valid session'); } }));
  await act(async () => view.root.findByType('textarea').props.onChange({ target: { value: 'Voi ăn gì?' } }));
  await act(async () => view.root.findByType('form').props.onSubmit({ preventDefault() {} }));
  assert.match(text(view), /Phản hồi mô phỏng/); assert.match(text(view), /Voi ăn cỏ/);
  assert.equal(view.root.findAllByType('a').find(a => a.props.href === 'https://example.invalid/voi').props.rel, 'noreferrer');
  assert.equal(logs.length, 1); assert.equal(logs[0].status, 'SUCCESS');
});

test('chat blocks duplicate sends and ignores a late answer after the visitor token is removed', async t => {
  let resolve, calls = 0;
  t.mock.method(globalThis, 'fetch', () => { calls++; return new Promise(done => { resolve = done; }); });
  const props = { token: visitorToken, baseUrl: origin, open: true, onSessionExpired() {} };
  const view = await mount(t, h(VisitorChat, props));
  await act(async () => view.root.findByType('textarea').props.onChange({ target: { value: 'Voi?' } }));
  await act(async () => { void view.root.findByType('form').props.onSubmit({ preventDefault() {} }); void view.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
  assert.equal(calls, 1);
  await act(async () => view.update(h(MemoryRouter, null, h(VisitorChat, { ...props, token: null }))));
  await act(async () => resolve(jsonResponse({ data: { status: 'NO_CONTEXT', answer: 'LATE_ANSWER', sources: [], mode: 'AI' } })));
  assert.doesNotMatch(text(view), /LATE_ANSWER/); assert.match(text(view), /Kích hoạt vé/);
});

test('chat retains question on 429/503, reports 401 to the host and makes no request for unpaid visitors', async t => {
  let status = 429, expired = 0, calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return jsonResponse({ code: 'TEST_ERROR', error: 'Unavailable' }, status); });
  const props = { token: visitorToken, baseUrl: origin, open: true, onSessionExpired() { expired++; } };
  const view = await mount(t, h(VisitorChat, props));
  await act(async () => view.root.findByType('textarea').props.onChange({ target: { value: 'Voi?' } }));
  for (const code of [429, 503, 401]) {
    status = code;
    await act(async () => view.root.findByType('form').props.onSubmit({ preventDefault() {} }));
    assert.equal(view.root.findByType('textarea').props.value, 'Voi?');
  }
  assert.equal(expired, 1); assert.equal(calls, 3);
  await act(async () => view.update(h(MemoryRouter, null, h(VisitorChat, { ...props, token: null }))));
  assert.equal(view.root.findAllByType('form').length, 0); assert.equal(calls, 3);
});

test('source links only allow HTTP(S) without embedded credentials; arbitrary references remain text', () => {
  assert.equal(safeSourceUrl('javascript:alert(1)'), null);
  assert.equal(safeSourceUrl('data:text/html,test'), null);
  assert.equal(safeSourceUrl('https://user:password@example.invalid'), null);
  assert.equal(safeSourceUrl('Sách tham khảo'), null);
  assert.equal(safeSourceUrl('https://example.invalid/voi'), 'https://example.invalid/voi');
});

function internalBrowser(t) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const values = new Map([['tcv_internal_session_v1', JSON.stringify({ version: 1, apiBaseUrl: origin, accessToken: 'internal-test', refreshToken: 'refresh-test', user: actor })]]);
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  Object.defineProperty(globalThis, 'window', { configurable: true, writable: true, value: { location: { origin }, localStorage: storage, sessionStorage: storage, addEventListener() {}, removeEventListener() {} } });
  t.after(() => previous ? Object.defineProperty(globalThis, 'window', previous) : delete globalThis.window);
}

test('knowledge UI preserves expectedVersion, draft after conflict, and distinguishes a saved document from failed embedding', async t => {
  internalBrowser(t);
  const config = getRagConfig({}), embedding = new MockEmbedding(), docs = new Map();
  let next = 1, conflict = false;
  const store = {
    list: async ({ page, limit }) => ({ items: [...docs.values()], total: docs.size, page, limit }),
    get: async id => docs.get(id),
    mutate: async (id, key, authorize, work) => {
      authorize(actor);
      const current = docs.get(key);
      if (conflict && current) current.contentVersion++;
      return work({ current, persist: async (data, audit) => {
        const documentId = key ?? next++;
        const row = { documentId, ...data, chunkCount: 0, embeddingModel: null, lifecycleAction: audit.action, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        docs.set(documentId, row); return row;
      } });
    },
    publish: async (id, key, version, chunks) => {
      const row = docs.get(key); row.status = 'ACTIVE'; row.chunkCount = chunks.length; row.embeddingModel = chunks[0].model;
      return { published: true, document: row };
    },
    recordFailure: async (id, key, audit) => Object.assign(docs.get(key), { processingAction: audit.action, processingDetails: audit.details })
  };
  const service = new KnowledgeService({ store, embedding, config });
  const payloads = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer internal-test');
    const address = new URL(url), id = Number(address.pathname.split('/').at(-1));
    if (options.method === 'POST' || options.method === 'PUT') {
      const input = JSON.parse(options.body); payloads.push(input);
      return serviceResponse(() => options.method === 'POST' ? service.create(actor, input) : service.update(actor, id, input));
    }
    return serviceResponse(() => id ? service.get(actor, id) : service.list(actor, Object.fromEntries(address.searchParams)));
  });
  const view = await mount(t, h(InternalKnowledgePage));
  await act(async () => button(view, 'Thêm tài liệu').props.onClick());
  for (const [label, value] of [['Tiêu đề tài liệu', 'Voi'], ['Nội dung tài liệu', 'Voi ăn cỏ.']]) await act(async () => view.root.findByProps({ 'aria-label': label }).props.onChange({ target: { value } }));
  embedding.mode = 'failure';
  await act(async () => view.root.findByType('form').props.onSubmit({ preventDefault() {} }));
  assert.equal(docs.size, 1); assert.equal(docs.get(1).status, 'INACTIVE');
  assert.match(text(view), /Tài liệu đã được lưu nhưng/);
  embedding.mode = 'success'; conflict = true;
  await act(async () => view.root.findByProps({ 'aria-label': 'Tiêu đề tài liệu' }).props.onChange({ target: { value: 'Bản nháp cần giữ' } }));
  await act(async () => view.root.findByType('form').props.onSubmit({ preventDefault() {} }));
  assert.equal(payloads.at(-1).expectedVersion, 1);
  assert.equal(view.root.findByProps({ 'aria-label': 'Tiêu đề tài liệu' }).props.value, 'Bản nháp cần giữ');
  assert.equal(docs.get(1).title, 'Voi');
  assert.match(text(view), /chưa ghi đè/);
});
