import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { ReviewedTranslationPanel } from '../src/components/ReviewedTranslationPanel.tsx';
const base = 'http://localhost:18080';
const response = (data,status=200) => new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
async function mount(t, fetcher) {
  const old = Object.getOwnPropertyDescriptor(globalThis,'window');
  const session = JSON.stringify({ version:1,apiBaseUrl:base,accessToken:'TEST internal',refreshToken:'TEST refresh' });
  Object.defineProperty(globalThis,'window',{configurable:true,value:{location:{origin:base},sessionStorage:{getItem:key=>key==='tcv_internal_session_v1'?session:null}}});
  t.mock.method(globalThis,'fetch',fetcher);
  let view; await act(async()=>{view=create(React.createElement(ReviewedTranslationPanel,{poiId:1}));});
  t.after(async()=>{await act(async()=>view.unmount()); if(old)Object.defineProperty(globalThis,'window',old);else delete globalThis.window;});
  return view;
}
const button=(v,label)=>v.root.findAllByType('button').find(b=>b.children.join('').includes(label));
test('reviewed translation panel loads published text without extra payload fields or allowing overwrite',async t=>{
  let calls=0;const view=await mount(t,async(url,options)=>{calls++;assert.equal(options.method,'GET');assert.ok(url.endsWith('/1/translations/en'));
    return response({data:{sourceVersion:1,source:null,translation:{name:'Giraffe',description:'Intro',audioScript:'Script',sourceVersion:1,status:'READY'},job:{status:'COMPLETED'}}});});
  assert.equal(calls,0);
  await act(async()=>button(view,'Tải bản dịch').props.onClick());
  assert.equal(calls,1);assert.ok(view.root.findAllByType('textarea').every(t=>t.props.disabled));
  assert.equal(button(view,'Lưu bản dịch').props.disabled,true);assert.match(JSON.stringify(view.toJSON()),/không ghi đè/);
});
test('reviewed translation panel sends exactly source version and approved fields, preserves conflict draft',async t=>{
  let payload;const view=await mount(t,async(url,options)=>{
    if(options.method==='GET')return response({data:{sourceVersion:2,source:{name:'Nguồn',description:'Giới thiệu',audioScript:'Đọc'},translation:null,job:{status:'PENDING'}}});
    payload=JSON.parse(options.body);assert.equal(options.headers.Authorization,'Bearer TEST internal');
    return response({code:'TRANSLATION_SOURCE_CONFLICT',error:'Nguồn đã đổi; tải lại để đối chiếu.'},409);
  });
  await act(async()=>button(view,'Tải bản dịch').props.onClick());
  for(const [index,value] of ['Name','Introduction','Narration'].entries())await act(async()=>view.root.findAllByType('textarea')[index].props.onChange({target:{value}}));
  assert.equal(button(view,'Lưu bản dịch').props.disabled,true);
  await act(async()=>view.root.findByType('input').props.onChange({target:{checked:true}}));
  await act(async()=>button(view,'Lưu bản dịch').props.onClick());
  assert.deepEqual(payload,{sourceVersion:2,name:'Name',description:'Introduction',audioScript:'Narration'});
  assert.equal(view.root.findAllByType('textarea')[2].props.value,'Narration');assert.match(JSON.stringify(view.toJSON()),/Nguồn đã đổi/);
});
