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
  setGlobal(t, 'window', {
    location: { origin }, L: {},
    sessionStorage: { getItem: key => JSON.stringify({
      version: 1, apiBaseUrl: origin,
      ...(key.includes('internal') ? { accessToken: 'admin-test', user: actor } : { token: 'guest-test' })
    }) }
  });
}
async function mount(t, element) {
  let view;
  await act(async () => { view = create(element); });
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
      bundleTotals: async () => null, audios: async () => null
    } : {}, down ? {
      ping: async () => { throw Error('db unavailable'); }, pingRedis: async () => { throw Error('redis unavailable'); }
    } : {});
    return serviceResponse(() => service.get(actor, Object.fromEntries(parsed.searchParams)));
  });
  const view = await mount(t, h(InternalMonitoringPage));
  assert.equal(urls[0].searchParams.has('window'), false);
  assert.equal(new Date(urls[0].searchParams.get('to')) - new Date(urls[0].searchParams.get('from')), 86400000);
  assert.match(text(view), /27/);
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
      requestedLanguageCode: 'vi', languages: [{ code: 'vi', name: 'Vietnamese' }], pois: [poi()], tours: [], expiresAt: '2026-10-24T00:00:00Z'
    } });
    return jsonResponse({ data: {} });
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
    requestedLanguageCode: 'vi', languages: [{ code: 'vi', name: 'Vietnamese' }], pois: [tree, deer], tours: [], expiresAt: '2026-10-24T00:00:00Z'
  } : {} }));
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

test('POI imagery falls back on a failed image and recovers for a different source', async t => {
  const props = { src: '/missing.webp', name: 'Hươu Sao', category: 'ANIMAL' };
  const view = await mount(t, h(PoiImage, props));
  await act(async () => view.root.findByType('img').props.onError());
  assert.equal(view.root.findAllByType('img').length, 0);
  assert.match(text(view), /Chưa có ảnh Hươu Sao/);
  await act(async () => view.update(h(PoiImage, { ...props, src: '/new.webp' })));
  assert.equal(view.root.findByType('img').props.src, '/new.webp');
});
