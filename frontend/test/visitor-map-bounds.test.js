import { test } from 'node:test';
import assert from 'node:assert/strict';
import { visitorMapRegion, constrainVisitorMap } from '../src/components/visitorMapBounds.ts';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { MapView } from '../src/components/MapView.tsx';

const points = [
  { latitude: 10.789, longitude: 106.704 },
  { latitude: 10.785, longitude: 106.708 }
];
function mapMock() {
  const state = { zoom: 17, fitZoom: 16.75, fits: [], events: new Map() };
  const map = {
    getBoundsZoom(bounds, inside, padding) {
      assert.equal(inside, false);
      assert.deepEqual(padding, [88, 88]);
      state.measured = bounds;
      return state.fitZoom;
    },
    getZoom: () => state.zoom,
    setMinZoom(zoom) { state.minZoom = zoom; state.zoom = Math.max(state.zoom, zoom); },
    setMaxBounds(bounds) { state.region = bounds; },
    fitBounds(bounds, options) { state.fits.push({ bounds, options }); state.zoom = Math.min(state.fitZoom, options.maxZoom); },
    on(event, callback) { state.events.set(event, callback); },
    off(event, callback) { if (state.events.get(event) === callback) state.events.delete(event); }
  };
  return { map, state };
}

test('view region encloses every POI with margin without altering source coordinates', () => {
  const source = structuredClone(points);
  const result = visitorMapRegion(points);
  assert.deepEqual(result.points, [[10.785, 106.704], [10.789, 106.708]]);
  for (const point of points) {
    assert.ok(result.region[0][0] < point.latitude && result.region[1][0] > point.latitude);
    assert.ok(result.region[0][1] < point.longitude && result.region[1][1] > point.longitude);
  }
  assert.deepEqual(points, source);
});

test('empty or invalid points create no camera constraint; a single point has a usable region', () => {
  const { map, state } = mapMock();
  assert.equal(constrainVisitorMap(map, []), null);
  assert.equal(visitorMapRegion([{ latitude: NaN, longitude: 1 }, { latitude: 91, longitude: 181 }]), null);
  assert.equal(state.region, undefined);
  const region = visitorMapRegion([points[0]]).region;
  assert.ok(region[1][0] > region[0][0]);
  assert.ok(region[1][1] > region[0][1]);
});

test('overview and minimum zoom use all points with marker padding, not a selected point', () => {
  const { map, state } = mapMock();
  const policy = constrainVisitorMap(map, points);
  assert.equal(state.minZoom, 16.75);
  assert.deepEqual(state.region, visitorMapRegion(points).region);
  state.zoom = 19;
  policy.fitOverview();
  assert.deepEqual(state.fits.at(-1), {
    bounds: visitorMapRegion(points).points,
    options: { padding: [44, 44], maxZoom: 18, animate: false }
  });
});

test('resizing overview to phone refits all POIs and allows the lower fitting zoom', () => {
  const { map, state } = mapMock();
  constrainVisitorMap(map, points);
  state.fitZoom = 15.75;
  state.events.get('resize')();
  assert.equal(state.minZoom, 15.75);
  assert.equal(state.zoom, 15.75);
  assert.equal(state.fits.length, 2);
  assert.deepEqual(state.fits.at(-1).bounds, visitorMapRegion(points).points);
});

test('resizing a zoomed-in view preserves zoom; wider screen raises minimum without jumping to overview', () => {
  const { map, state } = mapMock();
  constrainVisitorMap(map, points);
  state.zoom = 19;
  state.fitZoom = 17.5;
  state.events.get('resize')();
  assert.equal(state.minZoom, 17.5);
  assert.equal(state.zoom, 19);
  assert.equal(state.fits.length, 1);
});

test('single-point infinite fitting zoom is capped and resize listeners are removed', () => {
  const { map, state } = mapMock();
  state.fitZoom = Infinity;
  const policy = constrainVisitorMap(map, [points[0]]);
  assert.equal(state.minZoom, 18);
  policy.dispose();
  assert.equal(state.events.size, 0);
});

test('MapView keeps overview across filters, pans to a selected POI and removes camera listeners', async t => {
  const { map, state } = mapMock();
  map.invalidateSize = () => {};
  map.remove = () => {};
  map.panTo = point => { state.panned = point; };
  const layer = () => ({ addTo() { return this; }, on() { return this; }, bindTooltip() { return this; }, remove() {} });
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    L: { map(_container, options) { state.options = options; return map; }, tileLayer: layer,
      marker: layer, circle: layer, divIcon: value => value },
    setTimeout() { return 1; }, clearTimeout() {}, addEventListener() {}, removeEventListener() {}
  } });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => ({}) } });
  let view;
  t.after(async () => {
    if (view) await act(async () => view.unmount());
    if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow); else delete globalThis.window;
    if (oldDocument) Object.defineProperty(globalThis, 'document', oldDocument); else delete globalThis.document;
  });
  const pois = points.map((p, i) => ({ ...p, poiId: i + 1, originalName: 'POI ' + i, category: 'ANIMAL' }));
  const props = { pois, tourPois: pois, selectedPoiId: null, onSelectPoi() {}, userLocation: null,
    activeTour: null, filteredCategory: 'ALL' };
  await act(async () => { view = create(React.createElement(MapView, props), { createNodeMock: () => ({}) }); });
  assert.equal(state.options.maxBoundsViscosity, 1);
  assert.equal(state.options.bounceAtZoomLimits, false);
  assert.equal(state.options.maxZoom, 19);
  assert.equal(state.fits.length, 1);
  await act(async () => view.update(React.createElement(MapView, { ...props, pois: [pois[1]], selectedPoiId: 2 })));
  assert.deepEqual(state.panned, [pois[1].latitude, pois[1].longitude]);
  assert.equal(state.fits.length, 1, 'filter must not reset the camera region');
  await act(async () => view.root.findByProps({ 'aria-label': 'Hiện toàn bộ điểm' }).props.onClick());
  assert.deepEqual(state.fits.at(-1).bounds, visitorMapRegion(points).points);
  await act(async () => view.unmount());
  view = null;
  assert.equal(state.events.size, 0);
});
