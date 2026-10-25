import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { ActivationCode } from '../src/components/ActivationCode.tsx';
import { PaymentPage } from '../src/pages/PaymentPage.tsx';
import { loadGuestSession } from '../src/api/guestStorage.ts';

async function codeView(t) {
  let view; const focused = [];
  function Host() { const [value, setValue] = React.useState(''); return React.createElement(ActivationCode, { value, onChange: setValue }); }
  await act(async () => { view = create(React.createElement(Host), { createNodeMock: n => n.type === 'input' ? { focus: () => focused.push(n.props['aria-label']), select() {} } : null }); });
  t.after(async () => { await act(async () => view.unmount()); });
  return { fields: () => view.root.findAllByType('input'), value: () => view.root.findAllByType('input').map(i => i.props.value).join(''), focused };
}
test('cash fields accept one-time-code autofill and keep leading zero', async t => {
  const ui = await codeView(t);
  await act(async () => ui.fields()[0].props.onChange({ target: { value: '012345' } }));
  assert.equal(ui.value(), '012345'); assert.equal(ui.focused.at(-1), 'Chữ số 6');
});
test('cash fields paste a complete code into any cell without truncating the start', async t => {
  const ui = await codeView(t); let prevented = false;
  await act(async () => ui.fields()[3].props.onPaste({ preventDefault() { prevented = true; }, clipboardData: { getData: () => ' 012345 ' } }));
  assert.ok(prevented); assert.equal(ui.value(), '012345');
});
test('cash fields reject letters and punctuation without changing the code', async t => {
  const ui = await codeView(t);
  await act(async () => ui.fields()[0].props.onChange({ target: { value: 'abc123' } }));
  assert.equal(ui.value(), '');
});
test('cash keyboard entry moves focus and backspace from an empty cell removes previous digit', async t => {
  const ui = await codeView(t);
  await act(async () => ui.fields()[0].props.onChange({ target: { value: '0' } }));
  await act(async () => ui.fields()[1].props.onChange({ target: { value: '1' } }));
  assert.equal(ui.value(), '01'); assert.equal(ui.focused.at(-1), 'Chữ số 3');
  await act(async () => ui.fields()[2].props.onKeyDown({ key: 'Backspace', preventDefault() {} }));
  assert.equal(ui.value(), '0'); assert.equal(ui.focused.at(-1), 'Chữ số 2');
});
test('editing an existing cash digit preserves the remaining code', async t => {
  const ui = await codeView(t);
  await act(async () => ui.fields()[0].props.onChange({ target: { value: '012345' } }));
  await act(async () => ui.fields()[2].props.onChange({ target: { value: '9' } }));
  assert.equal(ui.value(), '019345');
});

const text = n => typeof n === 'string' ? n : (n.children || []).map(text).join('');
const button = (v, label) => v.root.findAllByType('button').find(n => text(n).includes(label));
const response = data => new Response(JSON.stringify({ data }), { headers: { 'content-type': 'application/json' } });
test('new checkout keeps create → mock confirmation → one exchange → verify, and sends no client price', async t => {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const entries = new Map(), calls = [], origin = 'http://demo.invalid';
  const storage = { getItem: k => entries.get(k) || null, setItem: (k,v) => entries.set(k,v), removeItem: k => entries.delete(k) };
  Object.defineProperty(globalThis,'window',{configurable:true,value:{ location:{ origin }, localStorage:storage, sessionStorage:storage, setInterval, clearInterval, setTimeout, clearTimeout, dispatchEvent() {} }});
  t.after(() => { if (oldWindow) Object.defineProperty(globalThis,'window',oldWindow); else delete globalThis.window; });
  t.mock.method(globalThis,'fetch',async (url, options) => {
    const path = new URL(url).pathname; calls.push({ path, options });
    if (path.endsWith('/price')) return response({ amount:'50000.00',currency:'VND' });
    if (path.endsWith('/online-checkout')) return response({ sessionId:'visit',paymentRef:'ref',amount:'50000.00',currency:'VND',paymentStatus:'PENDING',sessionStatus:'PENDING',authCode:'code',codeExpiresAt:new Date(Date.now()+600000).toISOString() });
    if (path.endsWith('/exchange-online-code')) return response({ token:'guest-only',sessionId:'visit',expiresAt:new Date(Date.now()+60000).toISOString() });
    if (path.endsWith('/me')) return response({ sessionId:'visit',status:'ACTIVE',expiresAt:new Date(Date.now()+60000).toISOString() });
    return response({ accepted:true,paymentStatus:'PAID' });
  });
  let view;
  await act(async () => { view=create(React.createElement(MemoryRouter,null,React.createElement(PaymentPage))); });
  t.after(async () => { await act(async () => view.unmount()); });
  assert.equal(calls.length,1);
  await act(async () => button(view,'Tạo yêu cầu thanh toán mô phỏng').props.onClick());
  assert.deepEqual(JSON.parse(calls.at(-1).options.body),{});
  assert.ok(calls.at(-1).options.headers['Idempotency-Key']);
  assert.equal(loadGuestSession(origin).session.token,null);
  await act(async () => button(view,'Mô phỏng thanh toán thành công').props.onClick());
  assert.equal(loadGuestSession(origin).session.token,null);
  await act(async () => button(view,'Kích hoạt vé và bắt đầu nghe').props.onClick());
  assert.equal(loadGuestSession(origin).session.token,'guest-only');
  assert.equal(calls.filter(c => c.path.endsWith('/exchange-online-code')).length,1);
  assert.match(JSON.stringify(view.toJSON()),/Vé của bạn đã sẵn sàng/);
});
