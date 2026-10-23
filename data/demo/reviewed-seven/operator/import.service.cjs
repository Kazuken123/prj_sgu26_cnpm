const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {TranslationService}=require('../../../../backend/services/translation.service');
const validation=require('../../../../backend/services/translation.validation');
const languages={'zh-Hans':'简体中文',ko:'한국어',ja:'日本語',ru:'Русский',fr:'Français'};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function validateFiles(draftBytes,approvalBytes,sourceBytes) {
  const approval=JSON.parse(approvalBytes),draft=JSON.parse(draftBytes),source=JSON.parse(sourceBytes);
  assert.equal(hash(draftBytes),approval.jsonSha256,'APPROVED_DRAFT_HASH_MISMATCH');
  assert.equal(hash(sourceBytes),approval.sourceManifestSha256,'APPROVED_SOURCE_HASH_MISMATCH');
  assert.equal(draft.sourceManifestSha256,approval.sourceManifestSha256);
  assert.deepEqual(draft.languageCodes,Object.keys(languages));
  assert.deepEqual(draft.pois.map(p=>p.key).sort(),source.pois.map(p=>p.key).sort());
  for(const p of draft.pois)for(const code of Object.keys(languages))validation.input({sourceVersion:1,...p.translations[code]});
  return {draft,source};
}
function guard(snapshot,{draft,source}) {
  assert.equal(snapshot.database,'tcv_demo_review_20261020','WRONG_TARGET');
  assert.equal(snapshot.pois.length,2,'UNEXPECTED_POIS');assert.equal(snapshot.markers.length,1,'SEED_MARKER_CONFLICT');
  const marker=JSON.parse(snapshot.markers[0].details);assert.equal(marker.poiIds.length,2);
  assert.equal(snapshot.tours.length,1);assert.equal(snapshot.tours[0].tour_id,marker.tourId);
  assert.deepEqual(snapshot.links.map(r=>r.poi_id),marker.poiIds);
  assert.deepEqual(snapshot.links.map(r=>r.sequence_no),[1,2]);
  const actor=snapshot.actors.find(a=>!a.locked_until||new Date(a.locked_until).getTime()<=Date.now());assert.ok(actor,'NO_ACTIVE_ADMIN');
  const items=[];
  for(const [index,p] of source.pois.entries()) {
    const poi=snapshot.pois.find(row=>row.poi_id===marker.poiIds[index]);assert.ok(poi);
    assert.equal(poi.name,p.text.vi.name);assert.equal(poi.status,'ACTIVE');assert.equal(poi.content_version,1);
    assert.equal(Number(poi.latitude),p.latitude);assert.equal(Number(poi.longitude),p.longitude);
    for(const code of ['vi','en']) {
      const text=snapshot.translations.find(r=>r.poi_id===poi.poi_id&&r.language_code===code);assert.ok(text);
      for(const [db,key]of [['name','name'],['description','description'],['audio_script','audioScript']])assert.equal(text[db],p.text[code][key],'SOURCE_TEXT_MISMATCH');
      assert.equal(text.status,'READY');assert.equal(text.source_version,poi.content_version);
      const audio=snapshot.audios.find(r=>r.translation_id===text.translation_id);assert.ok(audio);assert.equal(audio.status,'AVAILABLE');assert.equal(audio.source_version,poi.content_version);
      const job=snapshot.jobs.find(r=>r.poi_id===poi.poi_id&&r.language_code===code&&r.source_version===poi.content_version);assert.ok(job);assert.equal(job.status,'COMPLETED');
    }
    const next=draft.pois.find(r=>r.key===p.key);assert.ok(next);
    for(const code of Object.keys(languages)) {
      const data=validation.input({sourceVersion:poi.content_version,...next.translations[code]});
      const current=snapshot.translations.find(r=>r.poi_id===poi.poi_id&&r.language_code===code);
      if(current) {
        assert.equal(current.source_version,poi.content_version);assert.equal(current.status,'READY');
        assert.equal(current.name,data.name,'EXISTING_TEXT_CONFLICT');assert.equal(current.description,data.description,'EXISTING_TEXT_CONFLICT');assert.equal(current.audio_script,data.audioScript,'EXISTING_TEXT_CONFLICT');
      }
      const job=snapshot.jobs.find(r=>r.poi_id===poi.poi_id&&r.language_code===code&&r.source_version===poi.content_version);
      if(job)assert.ok(['PENDING','COMPLETED'].includes(job.status),'JOB_NEEDS_RECONCILIATION');
      const audio=current&&snapshot.audios.find(r=>r.translation_id===current.translation_id);
      if(audio)assert.ok(current&&job?.status==='COMPLETED'&&audio.status==='AVAILABLE'&&audio.source_version===poi.content_version,'AUDIO_NEEDS_RECONCILIATION');
      if(job?.status==='COMPLETED')assert.ok(audio,'COMPLETED_WITHOUT_AUDIO');
      items.push({poiId:poi.poi_id,key:p.key,code,data,hasJob:!!job,hasText:!!current});
    }
  }
  for(const [code,name]of Object.entries(languages)) {
    const existing=snapshot.languages.find(r=>r.code===code);
    if(existing) {assert.equal(existing.is_active,1,'EXISTING_LANGUAGE_DISABLED');assert.equal(existing.name,name,'EXISTING_LANGUAGE_CONFLICT');}
  }
  assert.ok(snapshot.languages.every(l=>['vi','en',...Object.keys(languages)].includes(l.code)),'UNEXPECTED_LANGUAGE');
  assert.ok(snapshot.jobs.every(j=>j.source_version===1&&marker.poiIds.includes(j.poi_id)&&['vi','en',...Object.keys(languages)].includes(j.language_code)),'UNEXPECTED_JOB');
  return {actor,items,missingLanguages:Object.entries(languages).filter(([c])=>!snapshot.languages.some(l=>l.code===c))};
}
async function execute(store,files,apply) {
  return store.transaction(async state=>{
    const before=await state.snapshot(),plan=guard(before,files);
    if(!apply)return {outcome:'PLAN',languages:plan.missingLanguages.map(([c])=>c),newJobs:plan.items.filter(r=>!r.hasJob).length,newTranslations:plan.items.filter(r=>!r.hasText).length,before};
    for(const [code,name]of plan.missingLanguages)await state.insertLanguage(code,name);
    for(const row of plan.items)if(!row.hasJob)await state.insertJob(row.poiId,row.code,row.data.sourceVersion);
    const service=new TranslationService(state.translationStore),results=[];
    for(const row of plan.items)results.push(await service.importReviewed(plan.actor,row.poiId,row.code,row.data));
    const after=await state.snapshot();guard(after,files);
    for(const key of ['pois','tours','links'])assert.deepEqual(after[key],before[key],'PRESERVATION_CONFLICT');
    for(const row of before.translations)assert.deepEqual(after.translations.find(t=>t.translation_id===row.translation_id),row,'PRESERVATION_CONFLICT');
    for(const row of before.audios)assert.deepEqual(after.audios.find(a=>a.audio_id===row.audio_id),row,'PRESERVATION_CONFLICT');
    for(const row of before.jobs)assert.deepEqual(after.jobs.find(j=>j.job_id===row.job_id),row,'PRESERVATION_CONFLICT');
    return {outcome:results.every(r=>r.outcome==='UNCHANGED')?'UNCHANGED':'IMPORTED',results:results.map(({poiId,languageCode,outcome,sourceVersion})=>({poiId,languageCode,outcome,sourceVersion})),after};
  });
}
module.exports={validateFiles,guard,execute,languages,hash};
