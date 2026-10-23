const assert=require('node:assert/strict');
const {TranslationService}=require('../../../../backend/services/translation.service');
const validation=require('../../../../backend/services/translation.validation');
const {inspect,hash}=require('./service.cjs');
const CODES=['zh-Hans','ko','ja','ru','fr'];
function loadLanguages(bytes,authorizationBytes,base){
 const manifest=JSON.parse(bytes),authorization=JSON.parse(authorizationBytes);
 assert.equal(hash(bytes),authorization.manifestSha256,'LANGUAGE_MANIFEST_HASH_MISMATCH');
 assert.equal(manifest.sourceManifestSha256,base.manifestSha256,'LANGUAGE_SOURCE_HASH_MISMATCH');
 assert.equal(authorization.sourceManifestSha256,base.manifestSha256);assert.equal(manifest.authorizedForDemo,true);
 assert.equal(manifest.datasetId,'TCV_DEMO_EIGHT_POIS_FIVE_LANG_V1');assert.equal(manifest.database,base.manifest.database);
 assert.deepEqual(manifest.languageCodes,CODES);assert.deepEqual(manifest.pois.map(p=>p.key),base.manifest.pois.map(p=>p.key));
 for(const p of manifest.pois){assert.equal(p.sourceVersion,1);assert.deepEqual(Object.keys(p.translations),CODES);for(const code of CODES)validation.input({sourceVersion:1,...p.translations[code]});}
 return {base,manifest};
}
function inspectLanguages(snapshot,input,target){
 assert.equal(snapshot.markers.length,1,'BASE_DATASET_REQUIRED');const marker=JSON.parse(snapshot.markers[0].details),ids=new Set(marker.poiIds);
 // Reuse the unchanged VI/EN guard on its own projection, then validate every
 // additional row explicitly below. Unknown languages are never filtered away.
 for(const t of snapshot.texts.filter(t=>ids.has(t.poi_id)))assert.ok(['vi','en',...CODES].includes(t.language_code),'UNEXPECTED_LANGUAGE_ROW');
 const projected={...snapshot,texts:snapshot.texts.filter(t=>!ids.has(t.poi_id)||['vi','en'].includes(t.language_code))};
 const basePlan=inspect(projected,input.base,target);assert.equal(basePlan.outcome,'UNCHANGED');
 const items=[];
 for(const [i,p]of input.manifest.pois.entries())for(const code of CODES){
  const poiId=marker.poiIds[i],data=validation.input({sourceVersion:p.sourceVersion,...p.translations[code]});
  const job=snapshot.jobs.find(j=>j.poi_id===poiId&&j.language_code===code&&j.source_version===1);assert.ok(job,'MISSING_EXISTING_JOB');assert.ok(['PENDING','COMPLETED'].includes(job.status),'EXPLICIT_JOB_RECONCILIATION_REQUIRED');
  const current=snapshot.texts.find(t=>t.poi_id===poiId&&t.language_code===code);
  if(current){assert.equal(current.source_version,1);assert.equal(current.status,'READY');assert.equal(current.name,data.name,'READY_CONTENT_CONFLICT');assert.equal(current.description,data.description,'READY_CONTENT_CONFLICT');assert.equal(current.audio_script,data.audioScript,'READY_CONTENT_CONFLICT');}
  const audio=current&&snapshot.audios.find(a=>a.translation_id===current.translation_id);
  if(audio){assert.equal(audio.status,'AVAILABLE');assert.equal(audio.source_version,1);assert.equal(job.status,'COMPLETED');}
  if(job.status==='COMPLETED')assert.ok(current&&audio,'COMPLETED_WITHOUT_CONTENT');
  items.push({poiId,code,data,jobId:job.job_id,exists:!!current});
 }
 assert.equal(items.length,40);return {...basePlan,items};
}
async function executeLanguages(store,input,apply){return store.transaction(async state=>{
 const before=await state.snapshot(),plan=inspectLanguages(before,input,store.target);
 if(!apply)return {outcome:'PLAN',missingTexts:plan.items.filter(i=>!i.exists).length,existingJobs:40,before};
 const service=new TranslationService(state.translationStore),results=[];
 for(const row of plan.items){const result=await service.importReviewed(plan.actor,row.poiId,row.code,row.data);results.push({poiId:row.poiId,languageCode:row.code,outcome:result.outcome});}
 const after=await state.snapshot();inspectLanguages(after,input,store.target);
 for(const key of ['pois','jobs','audios','tours','links','languages','markers'])assert.deepEqual(after[key],before[key],'EXISTING_DATA_CHANGED');
 for(const old of before.texts)assert.deepEqual(after.texts.find(t=>t.translation_id===old.translation_id),old,'EXISTING_TEXT_CHANGED');
 return {outcome:results.every(r=>r.outcome==='UNCHANGED')?'UNCHANGED':'IMPORTED',results,after};
});}
module.exports={CODES,loadLanguages,inspectLanguages,executeLanguages};
