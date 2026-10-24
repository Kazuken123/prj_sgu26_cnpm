import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {act,create} from 'react-test-renderer';
import {MemoryRouter} from 'react-router-dom';
import {VisitorAnalyticsPanel} from '../src/components/VisitorAnalyticsPanel.tsx';
import {analyticsCsv} from '../src/api/visitorAnalytics.ts';
import {useVisitorPresence} from '../src/hooks/useVisitorPresence.ts';
const baseUrl='http://localhost:18080';
const user={id:1,userId:1,role:'ADMIN',status:'ACTIVE',email:'owner@test.invalid'};
const report={generatedAt:'2026-10-24T08:00:00Z',trackingStartedAt:'2026-10-23T08:00:00Z',timeZone:'Asia/Ho_Chi_Minh',period:'day',date:'2026-10-24',from:'2026-10-23T17:00:00Z',to:'2026-10-24T17:00:00Z',hasCoverage:true,partialCoverage:false,activeNow:3,visitors:12,entries:14,peak:5,peakAt:'2026-10-24T03:00:00Z',freshnessSeconds:120,dwellSeconds:20,buckets:[{label:'10h',from:'2026-10-24T03:00:00Z',to:'2026-10-24T04:00:00Z',peak:5}],pois:[{poiId:1,name:'Elephants',status:'ACTIVE',visitors:9,visits:10},{poiId:2,name:'Unvisited garden',status:'ACTIVE',visitors:0,visits:0}]};
const text=node=>typeof node==='string'?node:(node.children||[]).map(text).join('');
function setup(t){
  const saved=new Map([['tcv_internal_session_v1',JSON.stringify({version:1,apiBaseUrl:baseUrl,user,accessToken:'test',refreshToken:'refresh'})]]);
  const storage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};
  const originals=['window','document'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]);
  Object.defineProperty(globalThis,'window',{configurable:true,value:{location:{origin:baseUrl},sessionStorage:storage,localStorage:storage,setInterval,clearInterval,setTimeout,clearTimeout,addEventListener(){},removeEventListener(){}}});
  Object.defineProperty(globalThis,'document',{configurable:true,value:{visibilityState:'visible',addEventListener(){},removeEventListener(){}}});
  const views=[];t.after(async()=>{for(const v of views)await act(async()=>v.unmount());for(const[k,descriptor]of originals){if(descriptor)Object.defineProperty(globalThis,k,descriptor);else delete globalThis[k];}});
  return {saved,mount:async C=>{let v;await act(async()=>{v=create(React.createElement(MemoryRouter,{future:{v7_startTransition:true,v7_relativeSplatPath:true}},React.createElement(C)));});views.push(v);return v;}};
}
test('analytics period controls query the server, lowest ranking includes zeros, and chart selection is accessible',async t=>{
  const b=setup(t),queries=[];
  t.mock.method(globalThis,'fetch',async url=>{queries.push(new URL(url).searchParams.get('period'));return new Response(JSON.stringify({data:report}),{headers:{'Content-Type':'application/json'}});});
  const view=await b.mount(VisitorAnalyticsPanel);
  assert.match(text(view.toJSON()),/3/);assert.match(text(view.toJSON()),/không phải tổng vé vào cổng/);
  await act(async()=>view.root.findAllByType('button').find(n=>text(n)==='Năm').props.onClick());assert.equal(queries.at(-1),'year');
  await act(async()=>view.root.findAllByType('button').find(n=>text(n)==='Ít lượt nhất').props.onClick());
  assert.match(text(view.root.findByType('tbody').children[0]),/Unvisited garden/);
  await act(async()=>view.root.findByProps({'aria-label':'10h: 5 lượt đồng thời'}).props.onClick());
  assert.match(text(view.root.findByProps({className:'analytics-chart-detail'})),/cao điểm 5/);
});
test('analytics failure does not fabricate attendance or rankings and CSV preserves zero versus unobserved',async t=>{
  const b=setup(t);t.mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify({code:'ANALYTICS_UNAVAILABLE',error:'Unavailable'}),{status:503}));
  const view=await b.mount(VisitorAnalyticsPanel);assert.match(text(view.toJSON()),/không khả dụng/);assert.equal(view.root.findAllByProps({className:'analytics-scoreboard'}).length,0);
  const csv=analyticsCsv({...report,hasCoverage:false,pois:[{...report.pois[0],name:'=HYPERLINK("x")'}]});assert.match(csv,/'=HYPERLINK/);assert.match(csv,/Chưa có dữ liệu/);
});
test('GPS reporting stays off until consent, records independently of payment, and sends exit on opt-out',async t=>{
  const b=setup(t),requests=[];let state;
  t.mock.method(globalThis,'fetch',async(url,options)=>{requests.push({path:new URL(url).pathname,body:JSON.parse(options.body)});return new Response(JSON.stringify({data:String(url).endsWith('/sessions')?{token:'a'.repeat(64)}:{recorded:true}}),{headers:{'Content-Type':'application/json'}});});
  function Probe(){state=useVisitorPresence(baseUrl,{latitude:10.787,longitude:106.707,accuracy:5,observedAt:Date.now()});return React.createElement('span',null,state.status);}
  await b.mount(Probe);assert.equal(requests.length,0);
  await act(async()=>{state.toggle(true);});
  assert.equal(requests[0].path,'/api/analytics/sessions');assert.equal(requests[1].path,'/api/analytics/heartbeat');assert.equal(requests[1].body.latitude,10.787);
  await act(async()=>state.toggle(false));assert.deepEqual(requests.at(-1).body,{exit:true});
  assert.equal(b.saved.get('tcv_analytics_consent:'+baseUrl),'no');
});
