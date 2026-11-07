import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { useUnsavedChangesGuard } from '../src/hooks/useUnsavedChangesGuard.ts';

test('registers a beforeunload prompt only while dirty and removes it when clean or unmounted', async t => {
  const listeners = new Set();
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, writable: true, value: {
    addEventListener: (type, fn) => { if (type === 'beforeunload') listeners.add(fn); },
    removeEventListener: (type, fn) => { if (type === 'beforeunload') listeners.delete(fn); } } });
  t.after(() => { if (previous) Object.defineProperty(globalThis, 'window', previous); else delete globalThis.window; });
  const Probe = ({ dirty }) => { useUnsavedChangesGuard(dirty); return null; };
  let view;
  await act(async () => { view = create(React.createElement(Probe, { dirty: false })); });
  assert.equal(listeners.size, 0);
  await act(async () => view.update(React.createElement(Probe, { dirty: true })));
  assert.equal(listeners.size, 1);
  const event = { prevented: false, preventDefault() { this.prevented = true; }, returnValue: undefined };
  [...listeners][0](event);
  assert.equal(event.prevented, true); assert.equal(event.returnValue, '');
  await act(async () => view.update(React.createElement(Probe, { dirty: false })));
  assert.equal(listeners.size, 0);
  await act(async () => view.update(React.createElement(Probe, { dirty: true })));
  await act(async () => view.unmount());
  assert.equal(listeners.size, 0);
});
