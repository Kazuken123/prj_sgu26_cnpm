import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { VisitSummary } from '../src/components/VisitSummary.tsx';
const h = React.createElement;
const response = (total, generatedAt = '2026-10-25T08:00:00Z') => new Response(
  JSON.stringify({ data: { activePaidVisits: total, generatedAt } }), { headers: { 'Content-Type': 'application/json' } });
async function mount(t) {
  let view;
  await act(async () => { view = create(h(VisitSummary, { baseUrl: 'http://summary.test' })); });
  t.after(async () => { await act(async () => view.unmount()); });
  return view;
}
const text = view => JSON.stringify(view.toJSON());

test('guest summary uses public endpoint without credentials and shows approved text for positive and zero counts', async t => {
  let total = 12;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'http://summary.test/api/visits/summary');
    assert.equal(options.headers.Authorization, undefined);
    return response(total);
  });
  const view = await mount(t);
  assert.match(text(view), /Cùng khám phá với/); assert.match(text(view), /12/);
  assert.match(text(view), /khách có vé còn hiệu lực/);
  assert.doesNotMatch(text(view), /Tính theo|Sẵn sàng khám phá|online|đang nghe/);
  total = 0;
  await act(async () => view.root.findByType('button').props.onClick());
  assert.equal(view.root.findByType('strong').children.join(''), '0');
  assert.match(text(view), /khách có vé còn hiệu lực/);
});

test('malformed count/date and failed requests stay unavailable, then a manual refresh recovers', async t => {
  let result = response(-1);
  t.mock.method(globalThis, 'fetch', async () => result.clone());
  const view = await mount(t);
  for (const invalid of [response(-1), response('12'), response(null), response(2, 'bad'),
    new Response(JSON.stringify({ code: 'VISIT_SUMMARY_UNAVAILABLE', error: 'Thử lại sau.' }), { status: 503, headers: { 'Content-Type': 'application/json' } })]) {
    result = invalid;
    await act(async () => view.root.findByType('button').props.onClick());
    assert.match(text(view), /Chưa cập nhật được số vé/);
    assert.equal(view.root.findAllByType('strong').length, 0);
  }
  result = response(7);
  await act(async () => view.root.findByType('button').props.onClick());
  assert.equal(view.root.findByType('strong').children.join(''), '7');
});

test('late response from an old backend cannot replace a newer summary', async t => {
  let resolveOld;
  t.mock.method(globalThis, 'fetch', async url => url.startsWith('http://summary.test')
    ? new Promise(resolve => { resolveOld = resolve; }) : response(4));
  const view = await mount(t);
  assert.equal(view.root.findByType('button').props.disabled, true);
  await act(async () => view.update(h(VisitSummary, { baseUrl: 'http://new.test' })));
  await act(async () => resolveOld(response(99)));
  assert.equal(view.root.findByType('strong').children.join(''), '4');
});
