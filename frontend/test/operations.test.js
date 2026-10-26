import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { createRequire } from 'node:module';
import { InternalDashboardPage } from '../src/pages/InternalDashboardPage.tsx';
import { InternalCashPage } from '../src/pages/InternalCashPage.tsx';
import { businessDate, money, operationsCsv } from '../src/api/operations.ts';
const { OperationsService } = createRequire(import.meta.url)('../../backend/services/operations.service.js');
const origin='http://localhost:18080';
const user={id:1,userId:1,fullName:'Owner',email:'owner@example.invalid',role:'ADMIN',status:'ACTIVE'};
const now=new Date('2026-10-24T08:00:00Z');
const snapshot=()=>({now,window:{date:'2026-10-24',today:'2026-10-24',from:new Date('2026-10-23T17:00:00Z'),to:new Date('2026-10-24T17:00:00Z')},
  counts:{total:2,paid:1,pending:1,failed:0,unclaimed:1},totals:[{currency:'VND',amount:'50000.00',count:1}],
  hourly:[{hour:15,currency:'VND',amount:'50000.00',count:1}],staff:[{userId:1,name:'Owner',currency:'VND',amount:'50000.00',count:1}],
  content:[{poiId:9,name:'New location',failedJobs:0}],transactions:{items:[{sessionId:'11111111-1111-4111-8111-111111111111',paymentRef:'REF-1',amount:'50000.00',currency:'VND',paymentStatus:'PAID',sessionStatus:'ACTIVE',createdAt:now.toISOString(),paidAt:now.toISOString(),expiresAt:'2026-10-25T08:00:00Z',accessClaimed:0,staffName:'Owner'}],total:1,page:1,limit:20}});
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const nodeText=node=>typeof node==='string'?node:(node.children||[]).map(nodeText).join('');
const button=(view,label)=>view.root.findAllByType('button').find(node=>nodeText(node)===label)||view.root.findAllByType('button').find(node=>nodeText(node).includes(label));
const text=view=>JSON.stringify(view.toJSON());
function browser(t) {
  const entries=new Map([['tcv_internal_session_v1',JSON.stringify({version:1,apiBaseUrl:origin,user,accessToken:'test',refreshToken:'refresh'})]]);
  const storage={getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,value),removeItem:key=>entries.delete(key)};
  const old=Object.getOwnPropertyDescriptor(globalThis,'window');
  const views=[];
  Object.defineProperty(globalThis,'window',{configurable:true,value:{location:{origin},sessionStorage:storage,localStorage:storage,setInterval,clearInterval,setTimeout,clearTimeout}});
  t.after(async()=>{for(const view of views) await act(async()=>view.unmount());if(old)Object.defineProperty(globalThis,'window',old);else delete globalThis.window;});
  return {entries,mount:async(Component,url='/internal/today')=>{let view;await act(async()=>{view=create(React.createElement(MemoryRouter,{initialEntries:[url],future:{v7_startTransition:true,v7_relativeSplatPath:true}},React.createElement(Component)));});views.push(view);return view;}};
}
test('report consumes production service DTO, sends table filters, and links directly to customer work',async t=>{
  const b=browser(t);let selected;
  const service=new OperationsService({read:async(actor,filters)=>{selected=filters;return snapshot();}});
  t.mock.method(globalThis,'fetch',async url=>new URL(url).pathname==='/api/admin/online-visitors'
    ? response({data:{count:4,generatedAt:now.toISOString(),windowSeconds:120,measurement:'BROWSER_SESSIONS'}})
    : response({data:await service.get(user,Object.fromEntries(new URL(url).searchParams))}));
  const view=await b.mount(InternalDashboardPage);
  assert.match(text(view),/50\.000/);assert.match(text(view),/Tổng quan kinh doanh/);
  assert.ok(view.root.findAllByType('a').some(a=>a.props.href.includes('/internal/cash?session=11111111')));
  await act(async()=>button(view,'Chưa đổi mã').props.onClick());assert.equal(selected.status,'UNCLAIMED');
  await act(async()=>view.root.findByProps({id:'payment-search'}).props.onChange({target:{value:'REF-1'}}));
  await act(async()=>view.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(selected.q,'REF-1');
});
test('failed report never fabricates zero revenue; stale data is explicitly identified and cannot export',async t=>{
  const b=browser(t);let failure=true;
  const service=new OperationsService({read:async()=>snapshot()});
  t.mock.method(globalThis,'fetch',async()=>failure?response({code:'OPERATIONS_UNAVAILABLE',error:'Unavailable'},503):response({data:await service.get(user,{})}));
  const view=await b.mount(InternalDashboardPage);
  assert.match(text(view),/không khả dụng/);assert.doesNotMatch(text(view),/Tiền thuyết minh đã thu/);
  failure=false;await act(async()=>button(view,'Làm mới').props.onClick());assert.match(text(view),/50\.000/);
  failure=true;await act(async()=>button(view,'Làm mới').props.onClick());assert.match(text(view),/lần tải thành công trước/);
  assert.equal(button(view,'Xuất tổng hợp CSV').props.disabled,true);
});
test('employee report omits owner totals and ignores a late response after a date change',async t=>{
  const b=browser(t);let resolveOld,calls=0;
  const service=new OperationsService({read:async()=>({...snapshot(),staff:[]})});
  const report=await service.get({...user,role:'STAFF'},{});
  t.mock.method(globalThis,'fetch',async()=>{calls++;if(calls===1)return new Promise(resolve=>{resolveOld=resolve;});return response({data:{...report,date:'2026-10-23',totals:[{currency:'VND',amount:'12500.00',count:1}]}});});
  const view=await b.mount(InternalDashboardPage);
  await act(async()=>view.root.findByProps({id:'business-day'}).props.onChange({target:{value:'2026-10-23'}}));
  await act(async()=>resolveOld(response({data:report})));
  assert.match(nodeText(view.root.findByProps({className:'ops-revenue'})),/12\.500/);assert.doesNotMatch(nodeText(view.root.findByProps({className:'ops-revenue'})),/50\.000/);assert.doesNotMatch(text(view),/Thu tiền theo nhân viên|Thêm nhân viên/);
});
test('business time, large decimal formatting and CSV preserve meaning and prevent spreadsheet formulas',()=>{
  assert.equal(businessDate(new Date('2026-10-23T17:00:00Z')),'2026-10-24');
  assert.equal(money('12345678901234567890.12','USD'),'12.345.678.901.234.567.890,12 USD');
  const data={...snapshot(),date:'2026-10-24',generatedAt:now.toISOString(),scope:'ALL_STAFF',staff:[{name:'=HYPERLINK("bad")',amount:'50000.00',currency:'VND',count:1}]};
  const csv=operationsCsv(data);assert.match(csv,/'=HYPERLINK/);assert.match(csv,/50000\.00/);assert.match(csv,/Asia\/Ho_Chi_Minh/);
});
test('counter opens an existing session from the ledger without creating another payment',async t=>{
  const b=browser(t);let creates=0;const id='11111111-1111-4111-8111-111111111111';
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    if(String(url).endsWith('/me'))return response({data:user});
    if(options.method==='POST')creates++;
    assert.ok(String(url).endsWith('/sessions/'+id));
    return response({data:{sessionId:id,paymentRef:'REF-existing',paymentMethod:'CASH',paymentStatus:'PAID',sessionStatus:'ACTIVE',amount:'50000.00',currency:'VND'}});
  });
  const view=await b.mount(InternalCashPage,'/internal/cash?session='+id);
  assert.match(text(view),/REF-existing/);assert.equal(creates,0);assert.equal(button(view,'Cấp mã ngắn 6 số').props.disabled,false);
});
test('counter keeps the idempotency key across a reload after an uncertain create response',async t=>{
  const b=browser(t);const keys=[];
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    if(String(url).endsWith('/me'))return response({data:user});
    keys.push(options.headers['Idempotency-Key']);
    if(keys.length===1)throw Error('network response lost');
    return response({data:{sessionId:'same-existing-session',amount:'50000.00',currency:'VND',paymentRef:'REF-existing',paymentStatus:'PENDING',sessionStatus:'PENDING'}});
  });
  const first=await b.mount(InternalCashPage,'/internal/cash');
  await act(async()=>button(first,'Tạo phiên tiền mặt mới').props.onClick());
  await act(async()=>first.unmount());
  const second=await b.mount(InternalCashPage,'/internal/cash');
  await act(async()=>button(second,'Tạo phiên tiền mặt mới').props.onClick());
  assert.equal(keys.length,2);assert.equal(keys[0],keys[1]);assert.match(text(second),/same-existing-session/);
});
