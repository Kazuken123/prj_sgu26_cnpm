import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { ConfirmDialog } from '../src/components/admin/AdminUI.tsx';

function browser(t) {
  const events = new EventTarget();
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, writable: true,
    value: { addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events) } });
  return { events, restore: () => { if (previous) Object.defineProperty(globalThis, 'window', previous); else delete globalThis.window; } };
}
const escape = events => { const e = new Event('keydown'); e.key = 'Escape'; events.dispatchEvent(e); };
async function render(t, props) {
  const b = browser(t), calls = { confirm: 0, cancel: 0 };
  const element = extra => React.createElement(ConfirmDialog, { open: true, title: 'Ngừng sử dụng?', confirmLabel: 'Xác nhận',
    onConfirm: () => calls.confirm++, onCancel: () => calls.cancel++, ...props, ...extra }, 'Nội dung cảnh báo');
  let view;
  await act(async () => { view = create(element()); });
  t.after(async () => { await act(async () => view.unmount()); b.restore(); });
  return { view, calls, events: b.events, update: async extra => act(async () => view.update(element(extra))) };
}
const buttons = view => view.root.findAllByType('button');

test('closed dialog renders nothing', async t => {
  const { view } = await render(t, { open: false });
  assert.equal(view.toJSON(), null);
});
test('accessible modal labelled by its title, confirm and cancel invoke callbacks', async t => {
  const { view, calls } = await render(t, {});
  const dialog = view.root.findByProps({ role: 'dialog' });
  assert.equal(dialog.props['aria-modal'], 'true');
  const title = view.root.findByType('h2');
  assert.equal(dialog.props['aria-labelledby'], title.props.id);
  await act(async () => buttons(view)[1].props.onClick());
  await act(async () => buttons(view)[0].props.onClick());
  assert.deepEqual(calls, { confirm: 1, cancel: 1 });
});
test('Escape and backdrop clicks cancel, but not while the action is in progress', async t => {
  const { view, calls, events, update } = await render(t, {});
  await act(async () => escape(events));
  const backdrop = view.root.findByProps({ className: 'adm-dialog-backdrop' });
  await act(async () => backdrop.props.onMouseDown({ target: 1, currentTarget: 1 }));
  await act(async () => backdrop.props.onMouseDown({ target: 1, currentTarget: 2 }));
  assert.equal(calls.cancel, 2);
  await update({ busy: true });
  await act(async () => escape(events));
  await act(async () => view.root.findByProps({ className: 'adm-dialog-backdrop' }).props.onMouseDown({ target: 1, currentTarget: 1 }));
  assert.equal(calls.cancel, 2);
  assert.ok(buttons(view).every(b => b.props.disabled));
  assert.match(JSON.stringify(view.toJSON()), /Đang xử lý/);
});
test('danger tone uses the destructive button style and can be disabled independently', async t => {
  const { view } = await render(t, { tone: 'danger', confirmDisabled: true });
  const confirm = buttons(view)[1];
  assert.match(confirm.props.className, /adm-btn--danger/); assert.equal(confirm.props.disabled, true);
});
