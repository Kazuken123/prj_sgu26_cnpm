const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {TranslationService}=require('../../../../backend/services/translation.service');
const validation=require('../../../../backend/services/translation.validation');
const {parse,columns}=require('../../../../backend/config/staging-dataset');
const CODES=['de','es','it','pt-BR','nl','pl','cs','tr'];
const DIGEST='ade1868b3f7f55021176a5d6ec7414d81d0efeb9dc9d35778e15d067a10fd208';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const oldCodes=['vi','en','zh-Hans','ko','ja','ru','fr'];
function load(bytes,authorizationBytes,baseBytes){
 assert.equal(hash(bytes),DIGEST,'DEMO15_CONTENT_HASH_MISMATCH');
 const manifest=JSON.parse(bytes),authorization=JSON.parse(authorizationBytes),base=parse(baseBytes);
 assert.equal(authorization.authorizationForDemoExpansion,true);assert.equal(authorization.manifestSha256,DIGEST);
 assert.equal(manifest.baseDatasetSha256,hash(baseBytes));assert.equal(authorization.baseDatasetSha256,hash(baseBytes));
 assert.equal(manifest.datasetId,'TCV_DEMO_15_LANG_EXTENSION_V1');assert.equal(manifest.database,'tcv_demo_review_20261020');
 assert.deepEqual(manifest.languageCodes,CODES);assert.deepEqual(manifest.languages.map(l=>l.code),CODES);assert.equal(manifest.pois.length,10);
 assert.deepEqual(manifest.pois.map(p=>p.poiId),base.tables.POIS.map(p=>p.poi_id));
 for(const p of manifest.pois){
  const original=base.tables.POI_TRANSLATIONS.find(t=>t.poi_id===p.poiId&&t.language_code==='vi');
  assert.equal(p.sourceVersion,original.source_version);assert.equal(p.sourceTextSha256,hash(JSON.stringify({name:original.name,description:original.description,audioScript:original.audio_script})));
  assert.deepEqual(Object.keys(p.translations),CODES);
  for(const code of CODES){validation.language(code);validation.input({sourceVersion:p.sourceVersion,...p.translations[code]});}
 }
 return {manifest,base};
}
const numeric=new Set(['poi_id','translation_id','audio_id','job_id','tour_id','sequence_no','is_active','latitude','longitude','trigger_radius','display_order','content_version','source_version','duration','file_size']);
function project(table,rows){return rows.map(row=>Object.fromEntries(columns[table].map(c=>[c,row[c]===null?null:numeric.has(c)?Number(row[c]):row[c]]))).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));}
function oldProjection(tables){
 const oldIds=new Set(tables.POI_TRANSLATIONS.filter(t=>oldCodes.includes(t.language_code)).map(t=>t.translation_id));
 return Object.fromEntries(Object.entries(tables).map(([table,rows])=>[table,table==='LANGUAGES'?rows.filter(r=>oldCodes.includes(r.code)):table==='POI_TRANSLATIONS'||table==='CONTENT_JOBS'?rows.filter(r=>oldCodes.includes(r.language_code)):table==='AUDIOS'?rows.filter(r=>oldIds.has(r.translation_id)):rows]));
}
function inspect(snapshot,input){
 assert.ok(snapshot.actor,'ACTIVE_ADMIN_REQUIRED');
 for(const [table,rows]of Object.entries(oldProjection(snapshot.tables))){const actual=table==='POIS'?require('../../../../backend/config/demo-locations').normalizeApprovedPositions(rows,input.base.tables.POIS):rows;assert.deepEqual(project(table,actual),project(table,input.base.tables[table]),'BASE_CONTENT_CONFLICT_'+table);}
 const allowed=new Set([...oldCodes,...CODES]);for(const lang of snapshot.tables.LANGUAGES)assert.ok(allowed.has(lang.code),'UNEXPECTED_LANGUAGE');
 const missingLanguages=[];
 for(const lang of input.manifest.languages){const current=snapshot.tables.LANGUAGES.find(r=>r.code===lang.code);if(current){assert.equal(current.name,lang.name,'LANGUAGE_NAME_CONFLICT');assert.equal(Number(current.is_active),1,'LANGUAGE_DISABLED');}else missingLanguages.push(lang);}
 const items=[];
 for(const p of input.manifest.pois)for(const code of CODES){
  const text=snapshot.tables.POI_TRANSLATIONS.find(t=>t.poi_id===p.poiId&&t.language_code===code);
  const jobs=snapshot.tables.CONTENT_JOBS.filter(j=>j.poi_id===p.poiId&&j.language_code===code);
  assert.ok(jobs.length<=1,'JOB_HISTORY_REQUIRES_RECONCILIATION');const job=jobs[0];
  if(job){assert.equal(job.source_version,p.sourceVersion);assert.ok(['PENDING','COMPLETED'].includes(job.status),'JOB_REQUIRES_EXPLICIT_RECONCILIATION');assert.equal(job.claim_id,null);assert.equal(job.lease_expires_at,null);}
  if(text){assert.ok(job,'TEXT_WITHOUT_JOB');assert.equal(text.status,'READY');assert.equal(text.source_version,p.sourceVersion);
   for(const [key,column]of [['name','name'],['description','description'],['audioScript','audio_script']])assert.equal(text[column],p.translations[code][key],'REVIEWED_TEXT_CONFLICT');
  }
  const audio=text&&snapshot.tables.AUDIOS.find(a=>a.translation_id===text.translation_id);
  if(audio){assert.ok(job&&text);assert.equal(audio.status,'AVAILABLE');assert.equal(audio.source_version,p.sourceVersion);assert.equal(job.status,'COMPLETED');}
  if(job?.status==='COMPLETED')assert.ok(text&&audio,'COMPLETED_WITHOUT_AUDIO');
  items.push({poiId:p.poiId,code,sourceVersion:p.sourceVersion,text:p.translations[code],hasJob:!!job,hasText:!!text,audio});
 }
 assert.equal(items.length,80);
 // Unknown rows in an approved code must not be silently excluded from preservation checks.
 const newTexts=snapshot.tables.POI_TRANSLATIONS.filter(t=>!oldCodes.includes(t.language_code));
 const newJobs=snapshot.tables.CONTENT_JOBS.filter(j=>!oldCodes.includes(j.language_code));
 for(const row of [...newTexts,...newJobs])assert.ok(items.some(i=>i.poiId===row.poi_id&&i.code===row.language_code),'UNEXPECTED_CONTENT_ROW');
 const validTextIds=new Set(snapshot.tables.POI_TRANSLATIONS.map(t=>t.translation_id));for(const audio of snapshot.tables.AUDIOS)assert.ok(validTextIds.has(audio.translation_id),'ORPHAN_AUDIO');
 return {items,missingLanguages,missingTexts:items.filter(i=>!i.hasText).length,missingJobs:items.filter(i=>!i.hasJob).length};
}
async function execute(store,input,{apply=false,media}={}){
 const prepared=media?await require('../../../../backend/config/demo15-assets').verify(media,input):null;
 return store.transaction(async state=>{
  const before=await state.snapshot(),plan=inspect(before,input);
  if(prepared)for(const item of plan.items)if(item.audio){
   const file=prepared.files.find(f=>f.poiId===item.poiId&&f.languageCode===item.code);
   assert.equal(item.audio.file_url,'/api/media/audio/'+file.key,'PUBLISHED_AUDIO_CONFLICT');assert.equal(Number(item.audio.file_size),file.fileSize);assert.equal(item.audio.duration,file.duration);
  }
  const summary={missingLanguages:plan.missingLanguages.length,missingJobs:plan.missingJobs,missingTexts:plan.missingTexts};
  if(!apply)return {outcome:'PLAN',...summary};
  for(const lang of plan.missingLanguages)await state.addLanguage(lang);
  for(const item of plan.items)if(!item.hasJob)await state.addJob(item.poiId,item.code,item.sourceVersion);
  const service=new TranslationService(state.translations);
  for(const item of plan.items)await service.importReviewed(before.actor,item.poiId,item.code,{sourceVersion:item.sourceVersion,...item.text});
  const published=prepared?plan.items.filter(i=>!i.audio):[];
  for(const item of published)await state.publishAudio(prepared.files.find(f=>f.poiId===item.poiId&&f.languageCode===item.code));
  const changed=plan.missingLanguages.length+plan.missingJobs+plan.missingTexts+published.length>0;
  if(changed)await state.audit(before.actor,{manifestSha256:DIGEST,languageCodes:CODES,poiIds:input.manifest.pois.map(p=>p.poiId),preparedAudio:prepared?80:0});
  const after=await state.snapshot();inspect(after,input);
  assert.deepEqual(oldProjection(after.tables),oldProjection(before.tables),'OLD_CONTENT_CHANGED');
  for(const table of ['POI_TRANSLATIONS','CONTENT_JOBS','AUDIOS','LANGUAGES'])for(const old of before.tables[table]){
   if(table==='CONTENT_JOBS'&&published.some(i=>i.poiId===old.poi_id&&i.code===old.language_code))continue;
   assert.ok(after.tables[table].some(row=>JSON.stringify(row)===JSON.stringify(old)),'EXISTING_ROW_CHANGED');
  }
  return {outcome:changed?'IMPORTED':'UNCHANGED',...summary,...(prepared?{publishedAudio:published.length}:{})};
 });
}
module.exports={CODES,DIGEST,hash,load,inspect,execute};
