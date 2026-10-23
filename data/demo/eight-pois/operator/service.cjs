const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {PoiService}=require('../../../../backend/services/poi.service');
const {TranslationService}=require('../../../../backend/services/translation.service');
const poiValidation=require('../../../../backend/services/poi.validation');
const translationValidation=require('../../../../backend/services/translation.validation');
const {TARGET,DATASET}=require('./store.cjs');
const LANGUAGES=['en','fr','ja','ko','ru','vi','zh-Hans'];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function load(manifestBytes,sourceBytes,legacyBytes,approvalBytes){
 const m=JSON.parse(manifestBytes),legacy=JSON.parse(legacyBytes),approval=JSON.parse(approvalBytes);
 assert.equal(hash(manifestBytes),approval.manifestSha256,'APPROVED_MANIFEST_HASH_MISMATCH');
 assert.equal(m.sourceDocumentSha256,approval.sourceDocumentSha256);
 assert.equal(m.datasetId,DATASET);assert.equal(m.database,TARGET);assert.equal(m.approved,true);
 assert.equal(hash(sourceBytes),m.sourceDocumentSha256,'SOURCE_DOCUMENT_HASH_MISMATCH');
 assert.equal(m.pois.length,8);assert.equal(new Set(m.pois.map(p=>p.key)).size,8);
 for(const [i,p]of m.pois.entries()){
  assert.equal(p.displayOrder,i+3);assert.equal(p.locationEvidence.mode,'SIMULATED_BROWSER_DEMO');assert.ok(p.locationEvidence.label.includes('minh họa'));assert.equal(p.locationEvidence.osmCheckedAt,null);
  poiValidation.poi(payload(p));translationValidation.input({sourceVersion:1,...p.text.en});
 }
 return {manifest:m,manifestSha256:hash(manifestBytes),legacy};
}
function payload(p){return {name:p.text.vi.name,description:p.text.vi.description,audioScript:p.text.vi.audioScript,category:p.category,latitude:p.latitude,longitude:p.longitude,triggerRadius:30,displayOrder:p.displayOrder,status:'ACTIVE',activityHours:null,conservationStatus:null,avatarUrl:null};}
function textEquals(row,text){assert.ok(row,'MISSING_REVIEWED_TEXT');assert.equal(row.name,text.name,'TEXT_CONFLICT');assert.equal(row.description,text.description,'TEXT_CONFLICT');assert.equal(row.audio_script,text.audioScript,'TEXT_CONFLICT');assert.equal(row.status,'READY');assert.equal(row.source_version,1);}
function inspect(s,input,target=TARGET){
 assert.equal(s.database,target,'WRONG_TARGET');assert.deepEqual(s.languages.filter(l=>l.is_active===1).map(l=>l.code),LANGUAGES,'LANGUAGE_CONFIGURATION_CONFLICT');
 assert.equal(s.rootMarkers.length,1);const root=JSON.parse(s.rootMarkers[0].details);assert.equal(root.poiIds.length,2);
 assert.equal(s.tours.length,1);assert.equal(s.tours[0].tour_id,root.tourId);assert.deepEqual(s.links.map(r=>r.poi_id),root.poiIds);assert.deepEqual(s.links.map(r=>r.sequence_no),[1,2]);
 for(const [i,p]of input.legacy.pois.entries()){
  const poi=s.pois.find(r=>r.poi_id===root.poiIds[i]);assert.ok(poi);assert.equal(poi.content_version,1);assert.equal(poi.name,p.text.vi.name);
  for(const code of ['vi','en'])textEquals(s.texts.find(t=>t.poi_id===poi.poi_id&&t.language_code===code),p.text[code]);
  assert.equal(s.texts.filter(t=>t.poi_id===poi.poi_id).length,7);assert.equal(s.jobs.filter(j=>j.poi_id===poi.poi_id).length,7);
  for(const t of s.texts.filter(t=>t.poi_id===poi.poi_id)){assert.equal(t.status,'READY');const a=s.audios.find(a=>a.translation_id===t.translation_id);assert.ok(a);assert.equal(a.status,'AVAILABLE');assert.equal(a.source_version,1);}
  assert.ok(s.jobs.filter(j=>j.poi_id===poi.poi_id).every(j=>j.status==='COMPLETED'&&j.source_version===1));
 }
 const actor=s.actors.find(a=>!a.locked_until||new Date(a.locked_until).getTime()<=Date.now());assert.ok(actor,'NO_ACTIVE_ADMIN');
 assert.ok(s.markers.length<=1,'DUPLICATE_MARKER');
 if(!s.markers.length){assert.equal(s.pois.length,2,'UNOWNED_CONTENT_CONFLICT');return {actor,root,outcome:'CREATE'};}
 const marker=JSON.parse(s.markers[0].details);assert.equal(marker.manifestSha256,input.manifestSha256,'MANIFEST_CONFLICT');assert.equal(marker.poiIds.length,8);assert.equal(s.pois.length,10,'UNEXPECTED_POIS');
 for(const [i,p]of input.manifest.pois.entries()){
  const id=marker.poiIds[i],poi=s.pois.find(r=>r.poi_id===id);assert.ok(poi);const values=payload(p);
  for(const [column,key]of [['name','name'],['category','category'],['latitude','latitude'],['longitude','longitude'],['trigger_radius','triggerRadius'],['display_order','displayOrder'],['status','status']])assert.equal(['latitude','longitude'].includes(column)?Number(poi[column]):poi[column],values[key],'POI_CONFLICT');
  assert.equal(poi.content_version,1);assert.equal(s.texts.filter(t=>t.poi_id===id).length,2,'UNEXPECTED_TRANSLATION');
  for(const code of ['vi','en'])textEquals(s.texts.find(t=>t.poi_id===id&&t.language_code===code),p.text[code]);
  const jobs=s.jobs.filter(j=>j.poi_id===id);assert.deepEqual(jobs.map(j=>j.language_code).sort(),LANGUAGES);assert.ok(jobs.every(j=>j.source_version===1&&j.status!=='PROCESSING'),'JOB_RECONCILIATION_REQUIRED');
 }
 return {actor,root,marker,outcome:'UNCHANGED'};
}
async function execute(store,input,apply){return store.transaction(async state=>{
 const before=await state.snapshot(),plan=inspect(before,input,store.target);
 if(!apply)return {outcome:'PLAN',action:plan.outcome,newPois:plan.outcome==='CREATE'?8:0,newJobs:plan.outcome==='CREATE'?56:0,renderNow:16,waitForTranslations:40,before};
 if(plan.outcome==='UNCHANGED')return {outcome:'UNCHANGED',poiIds:plan.marker.poiIds,after:before};
 const pois=new PoiService(state.poiStore),translations=new TranslationService(state.translationStore),poiIds=[];
 for(const p of input.manifest.pois){const created=await pois.save(plan.actor,null,payload(p));poiIds.push(created.poiId);await translations.importReviewed(plan.actor,created.poiId,'en',{sourceVersion:1,...p.text.en});}
 await state.audit(plan.actor,{datasetId:DATASET,manifestSha256:input.manifestSha256,poiIds,tourId:plan.root.tourId,languageCodes:['vi','en'],locationMode:'SIMULATED_BROWSER_DEMO'});
 const after=await state.snapshot();inspect(after,input,store.target);
 for(const key of ['tours','links','languages'])assert.deepEqual(after[key],before[key],'EXISTING_DATA_CHANGED');
 for(const [key,idKey]of [['pois','poi_id'],['texts','translation_id'],['audios','audio_id'],['jobs','job_id']])for(const old of before[key])assert.deepEqual(after[key].find(r=>r[idKey]===old[idKey]),old,'EXISTING_DATA_CHANGED');
 return {outcome:'CREATED',poiIds,after};
});}
module.exports={load,inspect,execute,hash,payload};
