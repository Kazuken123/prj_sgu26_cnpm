import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { InternalTourEditPage } from '../src/pages/InternalTourEditPage.tsx';
import { InternalMonitoringPage } from '../src/pages/InternalMonitoringPage.tsx';
import { AudioPlayer } from '../src/components/AudioPlayer.tsx';
import { MapView } from '../src/components/MapView.tsx';
import { PoiImage } from '../src/components/PoiImage.tsx';
import { ExplorePage } from '../src/pages/ExplorePage.tsx';
import { InternalCashPage } from '../src/pages/InternalCashPage.tsx';
import { InternalToursPage } from '../src/pages/InternalToursPage.tsx';
import { InternalAuditLogsPage } from '../src/pages/InternalAuditLogsPage.tsx';
import { PaymentPage } from '../src/pages/PaymentPage.tsx';
import { useVisitExpiry } from '../src/hooks/useVisitExpiry.ts';
import { searchBundleText } from '../src/api/bundleSearch.ts';
import { actor, monitoringService, tourService, jsonResponse, serviceResponse } from './helpers/backend-contracts.js';

const h = React.createElement;
const origin = 'http://localhost:18080';
const cleanups = new WeakMap();
function cleanup(t, fn) {
  if (!cleanups.has(t)) {
    cleanups.set(t, []);
    t.after(async () => { for (const dispose of cleanups.get(t).reverse()) await dispose(); });
  }
  cleanups.get(t).push(fn);
}
function setGlobal(t, name, value) {
  const old = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  cleanup(t, () => old ? Object.defineProperty(globalThis, name, old) : delete globalThis[name]);
}
function browser(t) {
  // Node 20 has no global navigator; browser tests must supply their own.
  setGlobal(t, 'navigator', {});
  const entries = new Map([
    ['tcv_internal_session_v1', JSON.stringify({ version: 1, apiBaseUrl: origin, accessToken: 'admin-test', refreshToken: 'refresh-test', user: actor })],
    ['tcv_guest_session_v1', JSON.stringify({ version: 1, apiBaseUrl: origin, token: 'guest-test' })]
  ]);
  const storage = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) };
  setGlobal(t, 'window', {
    location: { origin }, L: {},
    sessionStorage: storage, localStorage: storage
  });
}
async function mount(t, element, options) {
  let view;
  await act(async () => { view = create(element, options); });
  cleanup(t, async () => { await act(async () => view.unmount()); });
  return view;
}
const text = view => JSON.stringify(view.toJSON());
const nodeText = node => typeof node === 'string' ? node : (node.children || []).map(nodeText).join('');
const button = (view, label) => view.root.findAllByType('button').find(node => nodeText(node).includes(label));
const preventDefault = () => {};

for (const conflict of [false, true]) {
  test('tour edit submits backend revision and ' + (conflict ? 'preserves stale-edit conflict' : 'saves successfully'), async t => {
    browser(t);
    const { service, state } = tourService();
    let payload;
    t.mock.method(globalThis, 'fetch', async (url, options) => {
      if (String(url).includes('/pois')) return jsonResponse({ data: { items: [{ poiId: 1, name: 'POI thử' }], total: 1 } });
      if (options.method === 'PUT') {
        payload = JSON.parse(options.body);
        return serviceResponse(() => service.update(actor, '1', payload));
      }
      return serviceResponse(() => service.get(actor, '1'));
    });
    const view = await mount(t, h(MemoryRouter, { initialEntries: ['/internal/tours/1/edit'], future: { v7_startTransition: true, v7_relativeSplatPath: true } },
      h(Routes, null,
        h(Route, { path: '/internal/tours/:id/edit', element: h(InternalTourEditPage) }),
        h(Route, { path: '/internal/tours', element: h('div', null, 'Saved tour list') }))));
    const expected = (await service.get(actor, '1')).revision;
    if (conflict) state.current = { ...state.current, name: 'Changed by another editor' };
    await act(async () => view.root.findByType('form').props.onSubmit({ preventDefault }));
    assert.equal(payload.expectedRevision, expected);
    assert.equal(state.writes, conflict ? 0 : 1);
    assert.match(text(view), conflict ? /Tour đã thay đổi/ : /Saved tour list/);
  });
}

test('monitoring renders production health objects and audioRecords; unavailable metrics never become zero', async t => {
  browser(t);
  let down = false;
  const urls = [];
  t.mock.method(globalThis, 'fetch', async url => {
    const parsed = new URL(url);
    urls.push(parsed);
    const service = monitoringService(down ? {
      activePaidVisits: async () => null, paidPayments: async () => null,
      bundleTotals: async () => null, audios: async () => null, chatbot: async () => null
    } : { chatbot: async () => [{ status: 'SUCCESS', total: 2 }, { status: 'NO_CONTEXT', total: 3 }, { status: 'FAILED', total: 1 }] }, down ? {
      ping: async () => { throw Error('db unavailable'); }, pingRedis: async () => { throw Error('redis unavailable'); }
    } : {});
    return serviceResponse(() => service.get(actor, Object.fromEntries(parsed.searchParams)));
  });
  const view = await mount(t, h(InternalMonitoringPage));
  assert.equal(urls[0].searchParams.has('window'), false);
  assert.equal(new Date(urls[0].searchParams.get('to')) - new Date(urls[0].searchParams.get('from')), 86400000);
  assert.match(text(view), /27/);
  assert.match(text(view), /Lượt hỏi chatbot được ghi nhận/);
  assert.match(text(view), /không phải đánh giá độ đúng/);
  assert.equal(view.root.findAllByType('p').some(node => nodeText(node).includes('Trong khoảng UTC đã chọn: 6')), true);
  assert.equal((text(view).match(/SẴN SÀNG \(READY\)/g) || []).length, 3);
  down = true;
  await act(async () => view.root.findByType('select').props.onChange({ target: { value: '7d' } }));
  assert.equal(new Date(urls.at(-1).searchParams.get('to')) - new Date(urls.at(-1).searchParams.get('from')), 7 * 86400000);
  assert.match(text(view), /NOT_READY/);
  assert.equal((text(view).match(/KHÔNG KHẢ DỤNG/g) || []).length, 2);
  assert.match(text(view), /Doanh thu không khả dụng/);
  assert.match(text(view), /Thống kê lượt tải không khả dụng/);
  assert.doesNotMatch(text(view), /SẴN SÀNG \(READY\)|0 VND/);
});

const poi = (id = 1, latitude = 10.7875) => ({
  poiId: id, originalName: 'Voi', category: 'ANIMAL', latitude, longitude: 106.7053, triggerRadius: 30,
  conservationStatus: null, activityHours: null, avatarUrl: null, displayOrder: id,
  text: { status: 'READY', languageCode: 'vi', isFallback: false, name: 'Voi', description: 'Nội dung từ bundle thử nghiệm.', audioScript: null },
  audio: { status: 'AVAILABLE', url: '/api/media/' + id, duration: 1, languageCode: 'vi', isFallback: false, mimeType: 'audio/wav' }
});
function audioMock(t) {
  const instances = [];
  class FakeAudio extends EventTarget {
    src = ''; currentTime = 0; duration = 1; calls = 0; blocked = false; emitPlaying = true;
    constructor() { super(); instances.push(this); }
    load() {}
    pause() { this.dispatchEvent(new Event('pause')); }
    async play() {
      this.calls++;
      if (this.blocked) throw new DOMException('User gesture required', 'NotAllowedError');
      if (this.emitPlaying) this.dispatchEvent(new Event('playing'));
    }
  }
  setGlobal(t, 'Audio', FakeAudio);
  t.mock.method(URL, 'createObjectURL', () => 'blob:test-' + Math.random());
  t.mock.method(URL, 'revokeObjectURL', () => {});
  return instances;
}
const mediaResponse = () => new Response('test-audio', { headers: { 'Content-Type': 'audio/wav' } });

test('explicit autoplay on an already selected POI starts media and reports only the playing event', async t => {
  browser(t);
  const instances = audioMock(t);
  const started = [];
  t.mock.method(globalThis, 'fetch', async () => mediaResponse());
  const props = { poi: poi(), requestedLanguageCode: 'vi', token: 'guest-test', onSessionExpired() {}, onPlaybackStarted: id => started.push(id) };
  const view = await mount(t, h(AudioPlayer, props));
  const audio = instances[0];
  assert.equal(audio.calls, 0);
  audio.emitPlaying = false;
  await act(async () => view.update(h(AudioPlayer, { ...props, autoPlayRequestId: 1 })));
  assert.equal(audio.calls, 1);
  assert.deepEqual(started, []);
  await act(async () => audio.dispatchEvent(new Event('playing')));
  assert.deepEqual(started, [1]);
  await act(async () => view.update(h(AudioPlayer, { ...props, autoPlayRequestId: 1 })));
  assert.equal(audio.calls, 1);
});

test('blocked autoplay is not marked played, waits for a manual gesture, then reports playback', async t => {
  browser(t);
  const instances = audioMock(t);
  const started = [];
  t.mock.method(globalThis, 'fetch', async () => mediaResponse());
  const props = { poi: poi(), requestedLanguageCode: 'vi', token: 'guest-test', onSessionExpired() {}, onPlaybackStarted: id => started.push(id) };
  const view = await mount(t, h(AudioPlayer, props));
  instances[0].blocked = true;
  await act(async () => view.update(h(AudioPlayer, { ...props, autoPlayRequestId: 1 })));
  assert.deepEqual(started, []);
  assert.equal(instances[0].calls, 1);
  assert.match(text(view), /NEED_GESTURE/);
  instances[0].blocked = false;
  await act(async () => button(view, 'Bấm để phát').props.onClick());
  assert.deepEqual(started, [1]);
});

test('media download failure does not mark a POI played', async t => {
  browser(t);
  const instances = audioMock(t);
  const started = [];
  t.mock.method(globalThis, 'fetch', async () => jsonResponse({ error: 'Unavailable' }, 503));
  const view = await mount(t, h(AudioPlayer, { poi: poi(), requestedLanguageCode: 'vi', token: 'guest-test', autoPlayRequestId: 1, onSessionExpired() {}, onPlaybackStarted: id => started.push(id) }));
  assert.deepEqual(started, []);
  assert.equal(instances[0].calls, 0);
  assert.match(text(view), /ERROR/);
});

for (const cancel of ['disable', 'switch']) {
  test('late media response cannot play after ' + cancel, async t => {
    browser(t);
    const instances = audioMock(t);
    let finish;
    const started = [];
    t.mock.method(globalThis, 'fetch', () => new Promise(resolve => { finish = resolve; }));
    const props = { poi: poi(), requestedLanguageCode: 'vi', token: 'guest-test', onSessionExpired() {}, onPlaybackStarted: id => started.push(id) };
    const view = await mount(t, h(AudioPlayer, { ...props, key: 1, autoPlayRequestId: 1 }));
    assert.equal(typeof finish, 'function');
    await act(async () => view.update(h(AudioPlayer, { ...props, key: cancel === 'switch' ? 2 : 1, poi: cancel === 'switch' ? poi(2) : poi(), autoPlayRequestId: null })));
    await act(async () => finish(mediaResponse()));
    assert.equal(instances.reduce((n, audio) => n + audio.calls, 0), 0);
    assert.deepEqual(started, []);
  });
}

for (const savedToken of [false, true]) test('public map remains usable without verified listening access: ' + savedToken, async t => {
  browser(t);
  if (!savedToken) window.localStorage.removeItem('tcv_guest_session_v1');
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const path = new URL(url).pathname; calls.push(path);
    if (path === '/api/visits/me') return jsonResponse({ code: 'VISITOR_AUTH_UNAVAILABLE', error: 'Temporary outage' }, 503);
    assert.equal(path, '/api/content/map');
    assert.equal(options.headers.Authorization, undefined);
    return jsonResponse({ data: { requestedLanguageCode: 'vi', languages: [{ code: 'vi', name: 'Tiếng Việt' }],
      expiresAt: null, tours: [], pois: [{ ...poi(), text: { ...poi().text, audioScript: null }, audio: { status: 'UNAVAILABLE', url: null } }] } });
  });
  const view = await mount(t, h(MemoryRouter, null, h(ExplorePage)));
  assert.equal(view.root.findByType(MapView).props.pois.length, 1);
  assert.equal(view.root.findAllByType(AudioPlayer).length, 0);
  assert.equal(button(view, 'Bắt đầu tham quan').props.disabled, true);
  assert.match(text(view), /Bản đồ miễn phí|Chưa xác minh được quyền nghe/);
  assert.match(text(view), /Kích hoạt quyền nghe/);
  assert.ok(!calls.some(path => path.includes('/media/') || path.includes('/bundle')));
  if (savedToken) assert.ok(window.localStorage.getItem('tcv_guest_session_v1'), 'temporary failure retains retry credentials');
});

test('Explore uses real GPS, auto-plays once per pass and rearms after leaving the radius', async t => {
  browser(t);
  const instances = audioMock(t);
  let position;
  setGlobal(t, 'navigator', { geolocation: {
    watchPosition(callback) { position = callback; return 1; }, clearWatch() {}
  } });
  t.mock.method(globalThis, 'fetch', async url => {
    if (String(url).includes('/api/media/')) return mediaResponse();
    if (String(url).includes('/bundle')) return jsonResponse({ data: {
      requestedLanguageCode: 'vi', languages: [{ code: 'vi', name: 'Vietnamese' }], pois: [poi()], tours: [], expiresAt: new Date(Date.now() + 86400000).toISOString()
    } });
    return jsonResponse({ data: { status: 'ACTIVE', expiresAt: new Date(Date.now() + 86400000).toISOString() } });
  });
  const view = await mount(t, h(MemoryRouter, { future: { v7_startTransition: true, v7_relativeSplatPath: true } }, h(ExplorePage)));
  await act(async () => button(view, 'Bắt đầu tham quan').props.onClick());
  assert.equal(instances[0].calls, 0, 'default map center must not trigger playback');
  await act(async () => position({ coords: { latitude: 10.7875, longitude: 106.7053 } }));
  assert.equal(instances[0].calls, 1);
  await act(async () => position({ coords: { latitude: 10.7875, longitude: 106.7053 } }));
  assert.equal(instances[0].calls, 1);
  await act(async () => position({ coords: { latitude: 11, longitude: 106.7053 } }));
  await act(async () => position({ coords: { latitude: 10.7875, longitude: 106.7053 } }));
  assert.equal(instances[0].calls, 2);
  await act(async () => button(view, 'Tra cứu điểm tham quan').props.onClick());
  assert.match(text(view), /Chưa tích hợp chatbot RAG/);
  assert.doesNotMatch(text(view), /tư liệu chính thức|Thảo Cầm Viên AI/);
});

test('bundle lookup quotes only available text and never invents opening hours, ticket prices or sources', () => {
  for (const question of ['giờ mở cửa', 'giá vé', 'cho thú ăn', '']) {
    const answer = searchBundleText(question, [poi()]);
    assert.match(answer, /Chưa tích hợp chatbot RAG/);
    assert.doesNotMatch(answer, /7:00|18:30|50\.000|Nguồn:|Quy định tham quan/);
  }
  const answer = searchBundleText('voi', [poi()]);
  assert.match(answer, /Nội dung từ bundle thử nghiệm/);
  assert.match(answer, /chưa xác minh/);
  assert.doesNotMatch(searchBundleText('voi', [{ ...poi(), text: { ...poi().text, status: 'UNAVAILABLE' } }]), /Nội dung từ bundle thử nghiệm/);
});


test('discovery filters and unaccented search share map results while preserving the full tour data', async t => {
  browser(t);
  audioMock(t);
  const deer = { ...poi(1), originalName: 'Hươu Sao', category: 'ANIMAL', text: { ...poi().text, name: 'Hươu Sao' } };
  const tree = { ...poi(2), originalName: 'Cây dầu', category: 'PLANT', text: { ...poi().text, name: 'Cây dầu' } };
  t.mock.method(globalThis, 'fetch', async url => jsonResponse({ data: String(url).includes('/bundle') ? {
    requestedLanguageCode: 'vi', languages: [{ code: 'vi', name: 'Vietnamese' }], pois: [tree, deer], tours: [], expiresAt: new Date(Date.now() + 86400000).toISOString()
  } : { status: 'ACTIVE', expiresAt: new Date(Date.now() + 86400000).toISOString() } }));
  const view = await mount(t, h(MemoryRouter, { initialEntries: ['/explore?category=ANIMAL'], future: { v7_startTransition: true, v7_relativeSplatPath: true } }, h(ExplorePage)));
  const map = () => view.root.findByType(MapView);
  assert.deepEqual(map().props.pois.map(p => p.poiId), [1]);
  assert.equal(map().props.selectedPoiId, 1, 'category entry selects a relevant POI');
  assert.equal(map().props.tourPois.length, 2, 'filters must not truncate route coordinates');
  await act(async () => button(view, 'Tất cả').props.onClick());
  const search = view.root.findByProps({ 'aria-label': 'Tìm điểm tham quan' });
  await act(async () => search.props.onChange({ target: { value: 'huou sao' } }));
  assert.deepEqual(map().props.pois.map(p => p.poiId), [1]);
  await act(async () => search.props.onChange({ target: { value: 'khong ton tai' } }));
  assert.equal(map().props.pois.length, 0);
  assert.match(text(view), /Không tìm thấy điểm phù hợp/);
  await act(async () => button(view, 'Xóa bộ lọc').props.onClick());
  assert.equal(map().props.pois.length, 2);
  const treeButton = view.root.findAllByType('button').find(node => node.props.className === 'poi-list-item' && nodeText(node).includes('Cây dầu'));
  await act(async () => treeButton.props.onClick());
  assert.equal(map().props.selectedPoiId, 2);
  assert.match(nodeText(view.root.findByProps({ id: 'selected-poi-detail' })), /Cây dầu/);
});

for (const initialEntry of ['/explore', '/explore?category=ANIMAL']) {
  test('uncategorized bundle POIs remain usable through GPS updates: ' + initialEntry, async t => {
    browser(t);
    audioMock(t);
    let position;
    setGlobal(t, 'navigator', { geolocation: {
      watchPosition(callback) { position = callback; return 1; }, clearWatch() {}
    } });
    const unclassified = { ...poi(1), category: null, originalName: 'Điểm chưa phân loại', text: { ...poi().text, name: 'Điểm chưa phân loại' } };
    const animal = poi(2);
    t.mock.method(globalThis, 'fetch', async url => {
      if (String(url).includes('/api/media/')) return mediaResponse();
      return jsonResponse({ data: String(url).includes('/bundle') ? {
        requestedLanguageCode: 'vi', languages: [{ code: 'vi', name: 'Vietnamese' }],
        pois: [unclassified, animal], tours: [], expiresAt: new Date(Date.now() + 86400000).toISOString()
      } : { status: 'ACTIVE', expiresAt: new Date(Date.now() + 86400000).toISOString() } });
    });
    const view = await mount(t, h(MemoryRouter, { initialEntries: [initialEntry], future: { v7_startTransition: true, v7_relativeSplatPath: true } }, h(ExplorePage)));
    const map = () => view.root.findByType(MapView);
    assert.equal(map().props.selectedPoiId, initialEntry.includes('?') ? 2 : 1);
    await act(async () => position({ coords: { latitude: 10.7875, longitude: 106.7053 } }));
    assert.match(text(view), /GPS đã bật/);
    await act(async () => button(view, 'Tất cả').props.onClick());
    assert.equal(map().props.pois.length, 2);
    const unclassifiedButton = view.root.findAllByType('button').find(node => node.props.className === 'poi-list-item' && nodeText(node).includes('Điểm chưa phân loại'));
    await act(async () => unclassifiedButton.props.onClick());
    assert.match(nodeText(view.root.findByProps({ id: 'selected-poi-detail' })), /Chưa phân loại/);
    assert.ok(view.root.findAllByProps({ 'aria-label': 'Chưa có ảnh Điểm chưa phân loại' }).length > 0);
    await act(async () => button(view, 'Động vật').props.onClick());
    assert.deepEqual(map().props.pois.map(item => item.poiId), [2]);
    await act(async () => position({ coords: { latitude: 10.788, longitude: 106.706 } }));
    assert.match(text(view), /GPS đã bật/);
  });
}

test('map uses the public OSM endpoint and reports failed tiles without hiding POIs', async t => {
  browser(t);
  const events = {};
  let tileUrl, attribution;
  window.setTimeout = setTimeout; window.clearTimeout = clearTimeout;
  window.L = {
    map: () => ({ invalidateSize() {}, remove() {} }),
    tileLayer: (url, options) => {
      tileUrl = url; attribution = options.attribution;
      return { on(name, handler) { events[name] = handler; }, addTo() {} };
    }
  };
  const view = await mount(t, h(MapView, { pois: [], selectedPoiId: null, onSelectPoi() {}, userLocation: null, activeTour: null, filteredCategory: 'ALL' }),
    { createNodeMock: element => element.props.className === 'leaflet-map-canvas' ? {} : null });
  assert.equal(tileUrl, 'https://tile.openstreetmap.org/{z}/{x}/{y}.png');
  assert.match(attribution, /OpenStreetMap/);
  await act(async () => events.tileerror());
  assert.match(text(view), /Chưa tải được một phần nền bản đồ/);
  assert.ok(view.root.findByProps({ 'aria-label': 'Bản đồ điểm tham quan Thảo Cầm Viên' }));
  await act(async () => events.loading());
  assert.doesNotMatch(text(view), /Chưa tải được một phần nền bản đồ/);
});

test('POI imagery falls back on a failed image and recovers for a different source', async t => {
  const props = { src: '/missing.webp', name: 'Hươu Sao', category: 'ANIMAL' };
  const view = await mount(t, h(PoiImage, props));
  await act(async () => view.root.findByType('img').props.onError());
  assert.equal(view.root.findAllByType('img').length, 0);
  assert.match(text(view), /Chưa có ảnh Hươu Sao/);
  await act(async () => view.update(h(PoiImage, { ...props, src: '/new.webp' })));
  assert.equal(view.root.findByType('img').props.src, '/new.webp');
});

test('expiry while a tab is suspended stops loaded audio, clears guest access and preserves the public map and GPS', async t => {
  browser(t);
  const audios = audioMock(t), listeners = new Map();
  let now = Date.now(), stopped = 0, calls = 0;
  t.mock.method(Date, 'now', () => now);
  window.addEventListener = (name, callback) => listeners.set(name, callback);
  window.removeEventListener = name => listeners.delete(name);
  setGlobal(t, 'navigator', { geolocation: { watchPosition: () => 1, clearWatch: () => { stopped++; } } });
  t.mock.method(globalThis, 'fetch', async url => {
    calls++;
    if (String(url).includes('/api/media/')) return mediaResponse();
    if (String(url).includes('/map?')) return jsonResponse({ data: { requestedLanguageCode: 'vi', languages: [{ code: 'vi', name: 'Vietnamese' }], pois: [{ ...poi(), audio: { status: 'UNAVAILABLE', url: null } }], tours: [], expiresAt: null } });
    return jsonResponse({ data: String(url).includes('/bundle') ? {
      requestedLanguageCode: 'vi', languages: [{ code: 'vi', name: 'Vietnamese' }], pois: [poi()], tours: [], expiresAt: new Date(now + 10000).toISOString()
    } : { status: 'ACTIVE', expiresAt: new Date(now + 10000).toISOString() } });
  });
  const view = await mount(t, h(MemoryRouter, null, h(ExplorePage)));
  await act(async () => button(view, 'Nghe thuyết minh').props.onClick());
  assert.match(audios[0].src, /^blob:/);
  const count = calls;
  now += 10001;
  await act(async () => listeners.get('focus')());
  assert.match(text(view), /đã hết hạn/);
  assert.equal(audios[0].src, '');
  assert.equal(window.localStorage.getItem('tcv_guest_session_v1'), null);
  assert.equal(calls, count + 1, 'expiry reloads only the public map');
  assert.equal(stopped, 0, 'free GPS browsing continues');
  assert.equal(view.root.findByType(MapView).props.pois.length, 1);
  assert.equal(view.root.findAllByType(AudioPlayer).length, 0);
});

test('text fallback is labelled separately from real-language audio and no longer claims one-second mock', async t => {
  browser(t); audioMock(t);
  const fallback = { ...poi(), text: { ...poi().text, languageCode: 'en', isFallback: true } };
  t.mock.method(globalThis, 'fetch', async url => jsonResponse({ data: String(url).includes('/bundle') ? {
    requestedLanguageCode: 'vi', languages: [], pois: [fallback], tours: [], expiresAt: new Date(Date.now() + 60000).toISOString()
  } : { status: 'ACTIVE', expiresAt: new Date(Date.now() + 86400000).toISOString() } }));
  const view = await mount(t, h(MemoryRouter, null, h(ExplorePage)));
  assert.match(text(view), /Văn bản thay thế bằng/);
  assert.match(text(view), /Giọng đọc tổng hợp/);
  assert.doesNotMatch(text(view), /Âm thử MOCK|một giây|Phát âm thử/);
});

test('cash desk clears the previous code on session switch and cannot issue before confirmation', async t => {
  browser(t);
  const first = '11111111-1111-4111-8111-111111111111', second = '22222222-2222-4222-8222-222222222222';
  let issued = 0;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (String(url).endsWith('/me')) return jsonResponse({ data: actor });
    if (String(url).endsWith('/cash-code')) { issued++; assert.ok(String(url).includes(first)); return jsonResponse({ data: { sessionId: first, shortedCode: '654321', codeExpiresAt: 'TEST deadline' } }); }
    const sessionId = String(url).includes(second) ? second : first;
    const paid = String(url).endsWith('/confirm-cash');
    return jsonResponse({ data: { sessionId, paymentRef: 'TEST payment', paymentMethod: 'CASH', amount: '50000.00', currency: 'VND', paymentStatus: paid ? 'PAID' : 'PENDING', sessionStatus: paid ? 'ACTIVE' : 'PENDING' } }, options.method === 'POST' && String(url).endsWith('/payments') ? 201 : 200);
  });
  const view = await mount(t, h(MemoryRouter, null, h(InternalCashPage)));
  await act(async () => button(view, 'Tạo phiên tiền mặt mới').props.onClick());
  assert.equal(button(view, 'Cấp mã ngắn 6 số').props.disabled, true);
  await act(async () => button(view, 'Xác nhận đã nhận tiền mặt').props.onClick());
  await act(async () => button(view, 'Cấp mã ngắn 6 số').props.onClick());
  assert.match(text(view), /654321/);
  await act(async () => view.root.findByType('input').props.onChange({ target: { value: second } }));
  await act(async () => view.root.findByType('form').props.onSubmit({ preventDefault }));
  assert.doesNotMatch(text(view), /654321|11111111-1111/);
  assert.equal(button(view, 'Cấp mã ngắn 6 số').props.disabled, true);
  await act(async () => button(view, 'Cấp mã ngắn 6 số').props.onClick());
  assert.equal(issued, 1);
});

test('tour list uses only supported pagination and shared refresh when its access token expires', async t => {
  const { createRequire } = await import('node:module');
  const { TourService } = createRequire(import.meta.url)('../../backend/services/tour.service.js');
  browser(t);
  let refreshes = 0, receivedQuery;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const path = new URL(url);
    if (path.pathname.endsWith('/refresh')) { refreshes++; return jsonResponse({ data: { user: actor, accessToken: 'rotated', refreshToken: 'rotated-refresh' } }); }
    if (options.headers.Authorization !== 'Bearer rotated') return jsonResponse({ code: 'INVALID_ACCESS_TOKEN', error: 'expired' }, 401);
    if (path.pathname.endsWith('/tours')) {
      receivedQuery = Object.fromEntries(path.searchParams);
      const service = new TourService({ list: async query => ({ items: [], total: 0, ...query }) });
      return serviceResponse(() => service.list(actor, receivedQuery));
    }
    return jsonResponse({ data: { items: [], total: 0 } });
  });
  const view = await mount(t, h(MemoryRouter, null, h(InternalToursPage)));
  assert.equal(refreshes, 1);
  assert.deepEqual(receivedQuery, { page: '1', limit: '10' });
  assert.match(text(view), /Chưa có lộ trình mẫu/);
  assert.equal(view.root.findAllByType('input').length, 0, 'do not advertise an unsupported search');
});

test('local deadline fires once without a focus event and cleans up its timer', async t => {
  browser(t);
  let expired = 0;
  function Deadline() { useVisitExpiry(new Date(Date.now() + 100).toISOString(), () => { expired++; }); return null; }
  await mount(t, h(Deadline));
  assert.equal(expired, 0);
  await act(async () => new Promise(resolve => setTimeout(resolve, 180)));
  assert.equal(expired, 1);
});

test('payment verification arriving after local expiry cannot reactivate or recreate cleared guest access', async t => {
  browser(t);
  const listeners = new Map();
  let now = Date.now(), resolveVisit;
  t.mock.method(Date, 'now', () => now);
  window.addEventListener = (name, callback) => listeners.set(name, callback);
  window.removeEventListener = name => listeners.delete(name);
  const deadline = new Date(now + 10000).toISOString();
  window.localStorage.setItem('tcv_guest_session_v1', JSON.stringify({ version: 1, apiBaseUrl: origin, token: 'TEST pending token', expiresAt: deadline }));
  t.mock.method(globalThis, 'fetch', () => new Promise(resolve => { resolveVisit = resolve; }));
  const view = await mount(t, h(MemoryRouter, null, h(PaymentPage)));
  now += 10001;
  await act(async () => listeners.get('focus')());
  await act(async () => resolveVisit(jsonResponse({ data: { sessionId: 'TEST visit', status: 'ACTIVE', expiresAt: deadline } })));
  assert.match(text(view), /đã hết hạn/);
  assert.doesNotMatch(text(view), /Phiên khách tham quan hợp lệ/);
  assert.equal(window.localStorage.getItem('tcv_guest_session_v1'), null);
});

test('cash initialization retries an uncertain response with the same idempotency key', async t => {
  browser(t);
  const keys = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (String(url).endsWith('/me')) return jsonResponse({ data: actor });
    keys.push(options.headers['Idempotency-Key']);
    if (keys.length === 1) throw Error('TEST lost response');
    return jsonResponse({ data: { sessionId: 'TEST same session', paymentStatus: 'PENDING', sessionStatus: 'PENDING' } });
  });
  const view = await mount(t, h(MemoryRouter, null, h(InternalCashPage)));
  await act(async () => button(view, 'Tạo phiên tiền mặt mới').props.onClick());
  await act(async () => button(view, 'Tạo phiên tiền mặt mới').props.onClick());
  assert.equal(keys.length, 2);
  assert.equal(keys[0], keys[1]);
  assert.match(text(view), /TEST same session/);
});

for (const Page of [InternalAuditLogsPage, InternalMonitoringPage]) {
  test(Page.name + ' refreshes expired credentials before retrying protected reads', async t => {
    browser(t);
    let refreshes = 0, reads = 0;
    t.mock.method(globalThis, 'fetch', async (url, options) => {
      if (String(url).endsWith('/refresh')) { refreshes++; return jsonResponse({ data: { user: actor, accessToken: 'rotated', refreshToken: 'rotated-refresh' } }); }
      if (options.headers.Authorization !== 'Bearer rotated') return jsonResponse({ code: 'INVALID_ACCESS_TOKEN', error: 'expired' }, 401);
      reads++;
      return Page === InternalMonitoringPage ? serviceResponse(() => monitoringService().get(actor, {})) : jsonResponse({ data: { items: [], total: 0, page: 1, actions: [] } });
    });
    const view = await mount(t, h(Page));
    assert.equal(refreshes, 1);
    assert.equal(reads, 1);
    assert.doesNotMatch(text(view), /expired|Không thể tải/);
  });
}
