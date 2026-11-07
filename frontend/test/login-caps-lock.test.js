import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../src/pages/LoginPage.tsx';

test('login warns while Caps Lock is on and clears the warning on blur', async t => {
  const storage = { getItem: () => null, setItem() {}, removeItem() {} };
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, writable: true, value: { location: { origin: 'http://localhost:18080' }, sessionStorage: storage, localStorage: storage } });
  let view;
  await act(async () => { view = create(React.createElement(MemoryRouter, { future: { v7_startTransition: true, v7_relativeSplatPath: true } }, React.createElement(LoginPage))); });
  const password = () => view.root.findByProps({ id: 'password-input' });
  const text = () => JSON.stringify(view.toJSON());
  assert.doesNotMatch(text(), /Caps Lock/);
  await act(async () => password().props.onKeyUp({ getModifierState: key => key === 'CapsLock' }));
  assert.match(text(), /Caps Lock đang bật/);
  await act(async () => password().props.onBlur());
  assert.doesNotMatch(text(), /Caps Lock/);
  await act(async () => view.unmount());
  if (previous) Object.defineProperty(globalThis, 'window', previous); else delete globalThis.window;
});
