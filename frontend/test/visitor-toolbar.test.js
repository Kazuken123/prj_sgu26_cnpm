import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { LanguagePicker } from '../src/components/LanguagePicker.tsx';
import { ListeningDeadline } from '../src/components/ListeningDeadline.tsx';

const languages = [{ code: 'vi', name: 'Tiếng Việt' }, { code: 'en', name: 'English' }, { code: 'de', name: 'Deutsch' }, { code: 'ja', name: '日本語' }, { code: 'zh-Hans', name: '简体中文' }];
async function picker(t, extra = {}) {
  let view;
  await act(async () => { view = create(React.createElement(LanguagePicker, { languages, value: 'vi', disabled: false, onChange() {}, ...extra })); });
  t.after(async () => { await act(async () => view.unmount()); });
  return view;
}
const open = async view => act(async () => view.root.findByProps({ role: 'combobox' }).props.onClick());
const key = async (node, value) => act(async () => node.props.onKeyDown({ key: value, preventDefault() {}, stopPropagation() {} }));

test('language picker shows native and Vietnamese names, current selection, and emits only a changed code', async t => {
  const changes = [];
  const view = await picker(t, { onChange: code => changes.push(code) });
  await open(view);
  assert.equal(view.root.findAllByProps({ role: 'option' }).length, 5);
  assert.match(JSON.stringify(view.toJSON()), /Tiếng Đức/);
  assert.match(JSON.stringify(view.toJSON()), /Tiếng Trung \(giản thể\)/);
  const options = view.root.findAllByProps({ role: 'option' });
  assert.equal(options[0].props['aria-selected'], true);
  await act(async () => options[0].props.onClick());
  assert.deepEqual(changes, []);
  await open(view);
  await act(async () => view.root.findAllByProps({ role: 'option' })[1].props.onClick());
  assert.deepEqual(changes, ['en']);
  assert.equal(view.root.findAllByProps({ role: 'listbox' }).length, 0);
});

test('language list supports arrow keys, Home/End and Escape with a single focusable option', async t => {
  const view = await picker(t);
  await key(view.root.findByProps({ role: 'combobox' }), 'ArrowDown');
  const active = () => view.root.findAllByProps({ role: 'option' }).findIndex(option => option.props.tabIndex === 0);
  assert.equal(active(), 0);
  await key(view.root.findByProps({ role: 'listbox' }), 'ArrowUp'); assert.equal(active(), 4);
  await key(view.root.findByProps({ role: 'listbox' }), 'Home'); assert.equal(active(), 0);
  await key(view.root.findByProps({ role: 'listbox' }), 'End'); assert.equal(active(), 4);
  await key(view.root.findByProps({ role: 'listbox' }), 'Escape');
  assert.equal(view.root.findByProps({ role: 'combobox' }).props['aria-expanded'], false);
});

test('loading disables language changes and closes a previously opened list', async t => {
  const onChange = () => assert.fail('Must not select while loading');
  const view = await picker(t, { onChange });
  await open(view);
  await act(async () => view.update(React.createElement(LanguagePicker, { languages, value: 'vi', disabled: true, onChange })));
  assert.equal(view.root.findByProps({ role: 'combobox' }).props.disabled, true);
  assert.equal(view.root.findAllByProps({ role: 'option' }).length, 0);
  await open(view);
  assert.equal(view.root.findAllByProps({ role: 'option' }).length, 0);
});

test('listening deadline uses the supplied expiry in Vietnam time, including the next calendar day', async () => {
  let view;
  await act(async () => { view = create(React.createElement(ListeningDeadline, { expiresAt: '2099-12-31T18:30:00.000Z' })); });
  assert.equal(view.root.findByType('time').props.dateTime, '2099-12-31T18:30:00.000Z');
  const text = JSON.stringify(view.toJSON());
  assert.match(text, /01:30/); assert.match(text, /01\/01/);
  await act(async () => view.unmount());
});

test('no verified expiry, malformed dates and expired deadlines show no entitlement badge', async () => {
  for (const expiresAt of [null, undefined, 'bad', new Date(Date.now() - 1000).toISOString()]) {
    let view;
    await act(async () => { view = create(React.createElement(ListeningDeadline, { expiresAt })); });
    assert.equal(view.toJSON(), null);
    await act(async () => view.unmount());
  }
});
