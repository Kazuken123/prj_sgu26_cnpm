import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { InternalNotFoundPage } from '../src/pages/InternalNotFoundPage.tsx';

test('unknown internal paths render an internal 404 with the path and recovery links', async () => {
  let view;
  await act(async () => { view = create(React.createElement(MemoryRouter, { initialEntries: ['/internal/does-not-exist'], future: { v7_startTransition: true, v7_relativeSplatPath: true } },
    React.createElement(Routes, null, React.createElement(Route, { path: '/internal/*', element: React.createElement(InternalNotFoundPage) })))); });
  const text = JSON.stringify(view.toJSON());
  assert.match(text, /Không tìm thấy trang nội bộ/); assert.match(text, /\/internal\/does-not-exist/);
  assert.deepEqual(view.root.findAllByType('a').map(a => a.props.href), ['/internal/cash', '/internal/today']);
  await act(async () => view.unmount());
});
