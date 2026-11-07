import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { toneForStatus, StatusBadge, Pagination, Field, Alert } from '../src/components/admin/AdminUI.tsx';

const h = React.createElement;
const render = async element => { let view; await act(async () => { view = create(element); }); return view; };
const text = view => JSON.stringify(view.toJSON());

test('status tones follow business meaning and unknown statuses stay neutral', () => {
  for (const s of ['ACTIVE', 'PAID', 'COMPLETED', 'READY', 'AVAILABLE', 'SUCCESS']) assert.equal(toneForStatus(s), 'success', s);
  for (const s of ['PENDING', 'NO_CONTEXT']) assert.equal(toneForStatus(s), 'warning', s);
  for (const s of ['FAILED', 'REVOKED']) assert.equal(toneForStatus(s), 'danger', s);
  assert.equal(toneForStatus('PROCESSING'), 'info');
  for (const s of ['INACTIVE', 'SOMETHING_NEW', null, undefined, '']) assert.equal(toneForStatus(s), 'neutral', String(s));
});
test('status badge falls back to the raw status and an em dash', async () => {
  assert.match(text(await render(h(StatusBadge, { status: 'PAID' }))), /PAID/);
  assert.match(text(await render(h(StatusBadge, { status: 'PAID', label: 'Đã thu tiền' }))), /Đã thu tiền/);
  assert.match(text(await render(h(StatusBadge, { status: null }))), /—/);
});
test('pagination disables the edges and reports the requested page', async () => {
  const pages = [];
  const view = await render(h(Pagination, { page: 1, totalPages: 3, onChange: p => pages.push(p) }));
  const [prev, next] = view.root.findAllByType('button');
  assert.equal(prev.props.disabled, true); assert.equal(next.props.disabled, false);
  await act(async () => next.props.onClick());
  assert.deepEqual(pages, [2]);
  const last = await render(h(Pagination, { page: 3, totalPages: 3, onChange: () => {} }));
  assert.equal(last.root.findAllByType('button')[1].props.disabled, true);
  const busy = await render(h(Pagination, { page: 2, totalPages: 3, disabled: true, onChange: () => {} }));
  assert.ok(busy.root.findAllByType('button').every(b => b.props.disabled));
  assert.match(text(await render(h(Pagination, { page: 1, totalPages: 0, onChange: () => {} }))), /"1"/, 'zero pages displays as one page');
});
test('field shows its error instead of the hint, marks required and links the label', async () => {
  const hinted = await render(h(Field, { label: 'Email', htmlFor: 'e', hint: 'Gợi ý', required: true }, h('input', { id: 'e' })));
  assert.equal(hinted.root.findByType('label').props.htmlFor, 'e');
  assert.match(text(hinted), /Gợi ý/); assert.match(text(hinted), /\*/);
  const invalid = await render(h(Field, { label: 'Email', htmlFor: 'e', hint: 'Gợi ý', error: 'Sai định dạng' }, h('input', { id: 'e' })));
  assert.doesNotMatch(text(invalid), /Gợi ý/);
  assert.equal(invalid.root.findByProps({ role: 'alert' }).children.join(''), 'Sai định dạng');
});
test('danger alerts interrupt assistive technology, other tones are polite status messages', async () => {
  assert.equal((await render(h(Alert, { tone: 'danger' }, 'x'))).root.findByProps({ role: 'alert' }).type, 'div');
  assert.equal((await render(h(Alert, { tone: 'success' }, 'x'))).root.findByProps({ role: 'status' }).type, 'div');
});
