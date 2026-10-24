import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { nearestTour } from '../src/api/tourPlanning.ts';
import { TourPlanner } from '../src/components/TourPlanner.tsx';
const pois = [1, 2, 3].map((id, i) => ({ poiId: id, originalName: 'Điểm ' + id, latitude: 10, longitude: 106 + i * .001,
  text: { name: 'Điểm ' + id }, audio: { status: id === 3 ? 'UNAVAILABLE' : 'AVAILABLE' } }));
test('custom tour uses Haversine nearest-neighbor locally with consecutive sequence, not input order', t => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('tour calculation must not use API'));
  const result = nearestTour(pois, [1, 2, 3], pois[2]);
  assert.deepEqual(result.tour.items, [{ poiId: 3, sequenceNo: 1 }, { poiId: 2, sequenceNo: 2 }, { poiId: 1, sequenceNo: 3 }]);
  assert.ok(result.distance > 200 && result.distance < 230);
  assert.match(result.tour.description, /không phải đường đi bộ/);
});
test('custom tour rejects empty/duplicate/unknown points and invalid start; ties are deterministic', () => {
  for (const ids of [[], [1, 1], [99]]) assert.throws(() => nearestTour(pois, ids, pois[0]));
  assert.throws(() => nearestTour(pois, [1], { latitude: NaN, longitude: 106 }));
  const same = pois.map(p => ({ ...p, latitude: 10, longitude: 106 }));
  assert.deepEqual(nearestTour(same, [3, 1, 2], same[0]).tour.items.map(i => i.poiId), [1, 2, 3]);
});
test('tour editor copies sample points, adds/removes without duplicates and applies only client state', async t => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('tour editing must not use API'));
  let chosen, view;
  const sample = { tourId: 1, items: [{ poiId: 2, sequenceNo: 1 }, { poiId: 1, sequenceNo: 2 }] };
  const props = { pois, location: null, activeTour: sample, onApply: value => { chosen = value; } };
  await act(async () => { view = create(React.createElement(TourPlanner, props)); });
  t.after(async () => act(async () => view.unmount()));
  const text = () => JSON.stringify(view.toJSON());
  const click = async label => act(async () => view.root.findAllByType('button').find(b => b.children.join('').includes(label)).props.onClick());
  await click('Sắp xếp'); assert.match(text(), /Chọn điểm xuất phát/);
  await click('Dùng các điểm');
  let inputs = view.root.findAllByType('input');
  assert.equal(inputs[0].props.checked, true); assert.equal(inputs[1].props.checked, true);
  await act(async () => inputs[2].props.onChange({ target: { checked: true } }));
  await act(async () => view.root.findByType('select').props.onChange({ target: { value: '3' } }));
  await click('Sắp xếp'); assert.deepEqual(chosen.items.map(i => i.poiId), [3, 2, 1]);
  await act(async () => view.update(React.createElement(TourPlanner, { ...props, activeTour: chosen })));
  assert.match(text(), /Tổng khoảng cách đường nối ước tính/); assert.match(text(), /âm thanh chưa sẵn sàng/);
  await act(async () => view.root.findAllByType('input')[1].props.onChange({ target: { checked: false } }));
  await click('Sắp xếp'); assert.deepEqual(chosen.items.map(i => i.poiId), [3, 1]);
  await click('Xóa lộ trình'); assert.equal(chosen, null);
});
