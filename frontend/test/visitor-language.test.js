import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { catalogs } from '../src/i18n/catalogs.ts';
import { translateText, translateVisitorMessage, normalizeVisitorLanguage, VISITOR_LANGUAGES, VISITOR_LANGUAGE_KEY } from '../src/i18n/translate.ts';
import { VisitorLanguageProvider, useVisitorLanguage } from '../src/i18n/VisitorLanguage.tsx';
import { VisitorNavigation } from '../src/components/VisitorNavigation.tsx';
import { LanguagePicker } from '../src/components/LanguagePicker.tsx';
import { HomePage } from '../src/pages/HomePage.tsx';
import { PaymentPage } from '../src/pages/PaymentPage.tsx';
import { ExplorePage } from '../src/pages/ExplorePage.tsx';

const h = React.createElement;
const json = data => new Response(JSON.stringify({ data }), { headers: { 'Content-Type': 'application/json' } });
const text = view => JSON.stringify(view.toJSON());
const nodeText = node => typeof node === 'string' ? node : (node.children || []).map(nodeText).join('');
const mountedViews = new WeakMap();
const bundle = (code, pois = []) => ({ requestedLanguageCode: code, generatedAt: '2026-10-25T00:00:00Z',
  expiresAt: null, languages: VISITOR_LANGUAGES, pois, tours: [] });

test('all 15 visitor catalogs cover every message, preserve placeholders and protect the brand names', () => {
  const keys = Object.keys(catalogs.vi).sort();
  assert.ok(keys.length >= 400);
  assert.equal(Object.keys(catalogs).length, 15);
  const slots = value => (value.match(/\{\w+\}/g) || []).sort();
  for (const { code } of VISITOR_LANGUAGES) {
    assert.deepEqual(Object.keys(catalogs[code]).sort(), keys, code);
    for (const key of keys) {
      assert.ok(catalogs[code][key].trim(), `${code}: ${key}`);
      assert.deepEqual(slots(catalogs[code][key]), slots(key), `${code}: ${key}`);
      assert.doesNotMatch(catalogs[code][key], /987654321\d+987/);
      assert.doesNotMatch(catalogs[code][key], /[\r\n]|(?<!\d)00\d{2}(?!\d)/, `${code}: ${key}`);
    }
    assert.match(translateText('Sài Gòn • Thuyết Minh Đa Ngôn Ngữ', code), /Sài Gòn/);
  }
  assert.equal(normalizeVisitorLanguage('zh-CN'), 'zh-Hans');
  assert.equal(normalizeVisitorLanguage('pt-br'), 'pt-BR');
  assert.equal(normalizeVisitorLanguage('unknown'), 'vi');
});

test('existing notices translate after a language change and unexpected backend messages get a localized retry message', () => {
  assert.equal(translateText('Kiểm tra lại sau 12s', 'en'), translateText('Kiểm tra lại sau {0}s', 'en', { 0: 12 }));
  assert.doesNotMatch(translateVisitorMessage('Lỗi máy chủ không có trong danh mục', 'en'), /Lỗi máy chủ/);
  assert.equal(translateVisitorMessage('Original backend detail', 'vi'), 'Original backend detail');
});

function browser(t, initial = 'vi', blocked = false) {
  mountedViews.set(t, []);
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const entries = new Map([[VISITOR_LANGUAGE_KEY, initial]]), events = new EventTarget();
  const storage = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => {
    if (blocked) throw Error('storage blocked'); entries.set(key, value);
  }, removeItem: key => entries.delete(key) };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    location: { origin: 'http://visitor.test' }, localStorage: storage, sessionStorage: storage, scrollY: 0,
    setTimeout, clearTimeout, setInterval, clearInterval,
    addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events)
  } });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { documentElement: { lang: 'vi' }, title: '',
    addEventListener() {}, removeEventListener() {} } });
  t.after(async () => {
    for (const view of mountedViews.get(t)) await act(async () => view.unmount());
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow); else delete globalThis.window;
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument); else delete globalThis.document;
  });
  return entries;
}

let controls;
function Probe() {
  controls = { ...useVisitorLanguage(), navigate: useNavigate() };
  return h('output', null, controls.language, ':', controls.t('Trang chủ'));
}
function CustomerPages() {
  return h(React.Fragment, null, h(Probe), h(VisitorNavigation), h(Routes, null,
    h(Route, { path: '/', element: h(HomePage) }), h(Route, { path: '/payment', element: h(PaymentPage) }),
    h(Route, { path: '/explore', element: h(ExplorePage) })));
}
async function mount(t, route = '/', pages = true) {
  let view;
  await act(async () => { view = create(h(MemoryRouter, { initialEntries: [route], future: { v7_startTransition: true, v7_relativeSplatPath: true } },
    h(VisitorLanguageProvider, null, pages ? h(CustomerPages) : h(Probe)))); });
  mountedViews.get(t).push(view);
  return view;
}

test('one language selection translates home and payment, persists after reload, and preserves an entered code without a payment request', async t => {
  const entries = browser(t);
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url: String(url), method: options.method });
    if (String(url).includes('/map?')) return json(bundle('vi'));
    if (String(url).endsWith('/price')) return json({ amount: '50000.00', currency: 'VND' });
    throw Error('Unexpected request');
  });
  const view = await mount(t);
  assert.equal(view.root.findAllByType(LanguagePicker).length, 1);
  await act(async () => view.root.findByType(LanguagePicker).props.onChange('en'));
  assert.match(text(view), /Slow down a little/);
  assert.match(text(view), /Multilingual Audio Guide/);
  assert.match(text(view), /Thảo Cầm Viên/);
  assert.equal(document.documentElement.lang, 'en');
  assert.equal(entries.get(VISITOR_LANGUAGE_KEY), 'en');
  await act(async () => controls.navigate('/payment'));
  const cash = view.root.findAllByType('button').find(node => nodeText(node).includes('Counter code'));
  await act(async () => cash.props.onClick());
  let fields = view.root.findAllByType('input');
  await act(async () => fields[0].props.onChange({ target: { value: '012345' } }));
  await act(async () => view.root.findByType(LanguagePicker).props.onChange('ja'));
  fields = view.root.findAllByType('input');
  assert.equal(fields.map(field => field.props.value).join(''), '012345');
  assert.equal(document.documentElement.lang, 'ja');
  assert.ok(text(view).includes(translateText('Bạn đã có mã từ quầy?', 'ja')));
  assert.ok(requests.every(request => request.method === 'GET'));
  await act(async () => view.unmount());
  await mount(t, '/payment');
  assert.equal(controls.language, 'ja');
});

test('Explore requests the saved language and discards an older response after changing language', async t => {
  browser(t, 'en');
  let completeEnglish;
  const requested = [];
  t.mock.method(globalThis, 'fetch', async url => {
    if (String(url).includes('/summary')) return json({ activePaidVisits: 0, generatedAt: '2026-10-25T00:00:00Z' });
    const code = new URL(url).searchParams.get('languageCode');
    requested.push(code);
    if (code === 'en') return new Promise(resolve => { completeEnglish = resolve; });
    return json(bundle(code));
  });
  const view = await mount(t, '/explore');
  assert.ok(requested.includes('en'));
  await act(async () => controls.setLanguage('ja'));
  assert.ok(requested.includes('ja'));
  await act(async () => completeEnglish(json(bundle('en'))));
  assert.equal(view.root.findByType(LanguagePicker).props.value, 'ja');
  assert.equal(document.documentElement.lang, 'ja');
});

test('blocked storage still allows switching languages, while internal routes stay Vietnamese and make no language request', async t => {
  browser(t, 'en', true);
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async () => { requests++; return json(bundle('vi')); });
  await mount(t, '/', false);
  await act(async () => controls.setLanguage('fr'));
  assert.equal(controls.language, 'fr');
  const before = requests;
  await act(async () => controls.navigate('/internal/cash'));
  assert.equal(controls.language, 'vi');
  assert.equal(document.documentElement.lang, 'vi');
  assert.equal(controls.t('Trang chủ'), 'Trang chủ');
  assert.equal(requests, before);
});
