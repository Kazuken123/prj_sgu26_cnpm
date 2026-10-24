const {test}=require('node:test');
const assert=require('node:assert/strict');
const {analyticsWindow,insideZoo,nearestPoi,summarizeActivity}=require('../utils/visitor-analytics');
const {VisitorAnalyticsService}=require('../services/visitor-analytics.service');
test('analytics periods follow Vietnam calendar boundaries and Monday weeks',()=>{
  const now=new Date('2026-10-24T08:00:00Z');
  const week=analyticsWindow({period:'week',date:'2026-10-24'},now);
  assert.equal(week.from.toISOString(),'2026-10-18T17:00:00.000Z');assert.equal(week.buckets.length,7);
  const month=analyticsWindow({period:'month',date:'2024-02-20'},now);assert.equal(month.buckets.length,29);
  const year=analyticsWindow({period:'year',date:'2024-02-20'},now);assert.equal(year.buckets.length,12);assert.equal(year.to.toISOString(),'2024-12-31T17:00:00.000Z');
  assert.throws(()=>analyticsWindow({date:'2024-02-30'},now),{code:'VALIDATION_ERROR'});
  assert.throws(()=>analyticsWindow({date:'2026-10-25'},now),{code:'FUTURE_DATE'});
});
test('peak counts concurrent presence, carries across buckets and marks uncovered history',()=>{
  const window=analyticsWindow({date:'2026-10-24'},new Date('2026-10-24T05:00:00Z'));
  const at=(hours)=>new Date(+window.from+hours*3600000);
  const summary=summarizeActivity([{at:at(1),delta:1},{at:at(1.5),delta:1},{at:at(2),delta:0},{at:at(2.5),delta:-1},{at:at(3),delta:-1}],window,at(1));
  assert.equal(summary.peak,2);assert.equal(summary.peakAt,at(1.5).toISOString());assert.equal(summary.buckets[0].peak,null);assert.equal(summary.buckets[2].peak,2);assert.equal(summary.buckets[3].peak,0);assert.equal(summary.buckets[13].peak,null);
});
test('zoo geofence excludes remote visitors and nearest matching POI wins',()=>{
  const position={latitude:10.787,longitude:106.707};assert.equal(insideZoo(position.latitude,position.longitude),true);assert.equal(insideZoo(10.7,106.6),false);
  assert.equal(nearestPoi(position,[{poiId:1,latitude:10.7871,longitude:106.707,triggerRadius:30},{poiId:2,...position,triggerRadius:30}]),2);
  assert.equal(nearestPoi(position,[{poiId:1,latitude:10.8,longitude:106.71,triggerRadius:50000}]),null);
});
test('tracking validates fresh accurate GPS and report requires an active internal actor',async()=>{
  let calls=0;const service=new VisitorAnalyticsService({touch:async()=>{calls++;return{recorded:true};},report:async()=>{calls++;throw Error('db');}});
  const token='a'.repeat(64),position={latitude:10.787,longitude:106.707,accuracy:5,sampleAgeMs:100};
  await assert.rejects(service.touch(token,{...position,accuracy:500}),{code:'GPS_UNRELIABLE'});
  await assert.rejects(service.touch(token,{...position,sampleAgeMs:50000}),{code:'GPS_UNRELIABLE'});
  await assert.rejects(service.touch(token,{...position,poiId:1}),{code:'GPS_UNRELIABLE'});
  await assert.rejects(service.report(null,{}),{status:401});assert.equal(calls,0);
  await service.touch(token,position);await service.touch(token,{exit:true});assert.equal(calls,2);
  await assert.rejects(service.report({userId:1,role:'ADMIN',status:'ACTIVE'},{}),{code:'ANALYTICS_UNAVAILABLE',status:503});
});
test('HTTP analytics aggregates require staff authentication and public tracking tokens have no report access',async t=>{
  const http=require('node:http'),AppError=require('../utils/app-error');let reports=0;
  const app=require('../server').createApp({authService:{authenticate:async token=>{if(token!=='staff')throw new AppError(401,'INVALID_ACCESS_TOKEN','denied');return{userId:7,role:'STAFF',status:'ACTIVE'};}},visitorAnalyticsService:{report:async(actor,query)=>{reports++;assert.equal(actor.userId,7);return{period:query.period};},create:async()=>({token:'a'.repeat(64)}),touch:async()=>({recorded:true})}});
  const server=http.createServer(app);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
  const base=`http://127.0.0.1:${server.address().port}`;
  const issued=await fetch(base+'/api/analytics/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(issued.status,201);
  const token=(await issued.json()).data.token;
  assert.equal((await fetch(base+'/api/admin/visitor-analytics')).status,401);
  assert.equal((await fetch(base+'/api/admin/visitor-analytics',{headers:{Authorization:'Bearer '+token}})).status,401);assert.equal(reports,0);
  const report=await fetch(base+'/api/admin/visitor-analytics?period=month',{headers:{Authorization:'Bearer staff'}});
  assert.equal(report.status,200);assert.equal(report.headers.get('cache-control'),'no-store');assert.equal((await report.json()).data.period,'month');
});
