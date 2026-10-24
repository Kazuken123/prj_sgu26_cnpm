const {test,describe,before,after}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const backendRequire=require('node:module').createRequire(path.join(__dirname,'../../../../backend/package.json'));
const {load,execute,inspect}=require('./service.cjs'),{Store}=require('./store.cjs');
const manifest=fs.readFileSync(path.join(__dirname,'../extension.json')),authorization=fs.readFileSync(path.join(__dirname,'../authorization.json'));
const baseBytes=fs.readFileSync(path.join(__dirname,'../../../staging/dataset.json')),input=load(manifest,authorization,baseBytes);
test('15-language extension pins eighty source-compared text sets and approval scope',()=>{
 assert.equal(input.manifest.pois.length,10);assert.equal(input.manifest.languageCodes.length,8);
 assert.equal(input.manifest.independentNativeLanguageReview,false);
 for(const p of input.manifest.pois)assert.equal(Object.keys(p.translations).length,8);
 const altered=JSON.parse(manifest);altered.pois[0].translations.de.audioScript='Not approved';
 assert.throws(()=>load(Buffer.from(JSON.stringify(altered)),authorization,baseBytes),/DEMO15_CONTENT_HASH_MISMATCH/);
 const declined=JSON.parse(authorization);declined.authorizationForDemoExpansion=false;
 assert.throws(()=>load(manifest,Buffer.from(JSON.stringify(declined)),baseBytes));
});
test('extension refuses an ordinary database and missing active administrator',()=>{
 assert.throws(()=>new Store({},'food_tour_db'),/WRONG_DEMO15_TARGET/);
 assert.throws(()=>inspect({tables:input.base.tables},input),/ACTIVE_ADMIN_REQUIRED/);
});
if(process.env.RUN_DB_TESTS==='1')describe('15-language additive operator with isolated MySQL and unchanged base dataset',()=>{
 let admin,db,target,store;
 const identity=()=> 'tcv_staging_test_'+randomUUID().replaceAll('-','');
 before(async()=>{
  const mysql=backendRequire('mysql2/promise');const options={host:process.env.DB_HOST,user:process.env.DB_USER,password:process.env.DB_PASSWORD||'',port:Number(process.env.DB_PORT||3306),timezone:'Z',connectTimeout:3000};
  admin=await mysql.createConnection(options);target=identity();assert.notEqual(target,process.env.DB_NAME);
  await admin.query('CREATE DATABASE `'+target+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  db=require('../../../../backend/config/utc-pool')(mysql.createPool({...options,database:target,connectionLimit:6}));
  await new(require('../../../../backend/stores/staging.store'))(db,target).locked(async state=>{
   for(const [table,rows]of Object.entries(input.base.tables))await state.insert(table,table==='LANGUAGES'?rows.filter(r=>!['vi','en'].includes(r.code)):rows);
  },{initializeEmpty:true});
  await db.query("INSERT INTO USERS(email,password_hash,role,status) VALUES('demo15-admin@example.invalid','isolated-test-placeholder','ADMIN','ACTIVE')");store=new Store(db,target);
 });
 after(async()=>{await db?.end();await admin?.end();}); // Preserve this test-only UUID database for evidence.
 const snapshot=()=>store.transaction(state=>state.snapshot());
 test('dry-run describes eighty missing texts/jobs and eight languages without changes',async()=>{
  const before=await snapshot();assert.deepEqual(await execute(store,input),{outcome:'PLAN',missingLanguages:8,missingJobs:80,missingTexts:80});assert.deepEqual(await snapshot(),before);
 });
 test('audit failure rolls back languages, jobs and texts without touching seventy old records',async()=>{
  const before=await snapshot();
  await db.query("CREATE TRIGGER demo15_fail_audit BEFORE INSERT ON AUDIT_LOGS FOR EACH ROW BEGIN IF NEW.action='SEED_APPROVED_DEMO' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='isolated forced failure'; END IF; END");
  try{await assert.rejects(execute(store,input,{apply:true}));}finally{await db.query('DROP TRIGGER demo15_fail_audit');}
  assert.deepEqual(await snapshot(),before);
 });
 test('two importers serialize: one adds eighty texts/jobs, the other is UNCHANGED; replay preserves all rows',async()=>{
  const results=await Promise.all([execute(store,input,{apply:true}),execute(new Store(db,target),input,{apply:true})]);
  assert.deepEqual(results.map(r=>r.outcome).sort(),['IMPORTED','UNCHANGED']);
  const before=await snapshot();assert.equal(before.tables.POI_TRANSLATIONS.length,150);assert.equal(before.tables.CONTENT_JOBS.length,150);
  assert.equal(before.tables.AUDIOS.length,70);assert.equal(before.tables.LANGUAGES.length,15);
  assert.equal((await execute(store,input,{apply:true})).outcome,'UNCHANGED');assert.deepEqual(await snapshot(),before);
  const [[audit]]=await db.query("SELECT COUNT(*) AS total FROM AUDIT_LOGS WHERE action='SEED_APPROVED_DEMO' AND resource_id='TCV_DEMO_15_LANG_EXTENSION_V1'");assert.equal(audit.total,1);
 });
 test('changed source, READY text conflict and disabled language stop without overwriting',async()=>{
  for(const [change,restore]of [
   [()=>db.query('UPDATE POIS SET content_version=2 WHERE poi_id=1'),()=>db.query('UPDATE POIS SET content_version=1 WHERE poi_id=1')],
   [()=>db.query("UPDATE POI_TRANSLATIONS SET name='conflict' WHERE poi_id=1 AND language_code='de'"),()=>db.query("UPDATE POI_TRANSLATIONS SET name=? WHERE poi_id=1 AND language_code='de'",[input.manifest.pois[0].translations.de.name])],
   [()=>db.query("UPDATE LANGUAGES SET is_active=0 WHERE code='pt-BR'"),()=>db.query("UPDATE LANGUAGES SET is_active=1 WHERE code='pt-BR'")]
  ]){await change();const before=await snapshot();try{await assert.rejects(execute(store,input,{apply:true}));assert.deepEqual(await snapshot(),before);}finally{await restore();}}
 });
 test('PROCESSING/FAILED jobs and COMPLETED without real audio require explicit reconciliation',async()=>{
  for(const status of ['PROCESSING','FAILED','COMPLETED']){
   await db.query('UPDATE CONTENT_JOBS SET status=? WHERE poi_id=1 AND language_code=\'de\'',[status]);
   try{await assert.rejects(execute(store,input,{apply:true}));}finally{await db.query("UPDATE CONTENT_JOBS SET status='PENDING' WHERE poi_id=1 AND language_code='de'");}
  }
 });
 test('wrong physical database is refused before any insert',async()=>{
  const before=await snapshot();await assert.rejects(execute(new Store(db,identity()),input,{apply:true}),/WRONG_PHYSICAL_DATABASE/);assert.deepEqual(await snapshot(),before);
 });
 test('missing or corrupt prepared WAV fails before a database transaction',async()=>{
  let touched=false;
  await assert.rejects(execute({transaction:()=>{touched=true;}},input,{apply:true,media:{get:async()=>Buffer.from('not a WAV')}}));
  assert.equal(touched,false);
  const assets=require('../../../../backend/config/demo15-assets'),metadata=JSON.parse(fs.readFileSync(path.join(__dirname,'../audio-manifest.json')));
  metadata.files[0].sha256='0'.repeat(64);assert.throws(()=>assets.parse(Buffer.from(JSON.stringify(metadata))),/DEMO15_AUDIO_MANIFEST_CHANGED/);
 });
 test('verified immutable audio publishes atomically, rolls back on audit failure and replays without writes',async()=>{
  const root=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'tcv-demo15-prepared-test-'));
  require('node:child_process').execFileSync('tar',['-xzf',path.join(__dirname,'../media.tar.gz'),'-C',root]);
  const media=new(require('../../../../backend/adapters/local-media'))({root}),before=await snapshot();
  await db.query("CREATE TRIGGER demo15_publish_fail BEFORE INSERT ON AUDIT_LOGS FOR EACH ROW BEGIN IF NEW.action='SEED_APPROVED_DEMO' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='isolated publication failure'; END IF; END");
  try{await assert.rejects(execute(store,input,{apply:true,media}));}finally{await db.query('DROP TRIGGER demo15_publish_fail');}
  assert.deepEqual(await snapshot(),before);
  const result=await execute(store,input,{apply:true,media});assert.equal(result.publishedAudio,80);
  const completed=await snapshot();assert.equal(completed.tables.AUDIOS.length,150);assert.ok(completed.tables.CONTENT_JOBS.every(j=>j.status==='COMPLETED'));
  assert.equal((await execute(store,input,{apply:true,media})).outcome,'UNCHANGED');assert.deepEqual(await snapshot(),completed);
  const config=require('../../../../backend/config/demo15-assets'),files=(await config.load()).files;
  for(const f of files){const t=completed.tables.POI_TRANSLATIONS.find(t=>t.poi_id===f.poiId&&t.language_code===f.languageCode),a=completed.tables.AUDIOS.find(a=>a.translation_id===t.translation_id);assert.equal(a.file_url,'/api/media/audio/'+f.key);}
 });
 test('location plan is read-only, stale plan refuses and audit failure rolls back every coordinate',async()=>{
  const LocationService=require('../../../../backend/services/demo-location.service'),LocationStore=require('../../../../backend/stores/demo-location.store');
  const service=new LocationService(new LocationStore(db,target)),before=await snapshot();
  const plan=await service.apply();assert.equal(plan.outcome,'PLAN');assert.equal(plan.simulated,7);assert.deepEqual(await snapshot(),before);
  await assert.rejects(service.apply({apply:true,expectedHash:'0'.repeat(64)}),/LOCATION_PLAN_CHANGED/);assert.deepEqual(await snapshot(),before);
  await db.query("CREATE TRIGGER location_audit_fail BEFORE INSERT ON AUDIT_LOGS FOR EACH ROW BEGIN IF NEW.resource_id='TCV_BROWSER_DEMO_POSITIONS_V1' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='isolated location audit failure'; END IF; END");
  try{await assert.rejects(service.apply({apply:true,expectedHash:plan.planHash}));}finally{await db.query('DROP TRIGGER location_audit_fail');}
  assert.deepEqual(await snapshot(),before);
 });
 test('concurrent location imports update once, preserve all texts/audio/jobs/tours, and keep fifteen-language replay safe',async()=>{
  const LocationService=require('../../../../backend/services/demo-location.service'),LocationStore=require('../../../../backend/stores/demo-location.store');
  const service=new LocationService(new LocationStore(db,target)),before=await snapshot(),plan=await service.apply();
  const otherTables=async()=>{const out={};for(const table of ['PAYMENTS','VISIT_SESSIONS','USERS','REFRESH_TOKENS'])out[table]=(await db.query('SELECT * FROM '+table))[0];return out;};
  const identities=await otherTables();const result=await Promise.all([service.apply({apply:true,expectedHash:plan.planHash}),new LocationService(new LocationStore(db,target)).apply({apply:true,expectedHash:plan.planHash})]);
  assert.deepEqual(result.map(r=>r.outcome).sort(),['UNCHANGED','UPDATED']);
  const after=await snapshot();for(const table of ['POI_TRANSLATIONS','AUDIOS','CONTENT_JOBS','TOURS','TOUR_POIS','LANGUAGES'])assert.deepEqual(after.tables[table],before.tables[table]);
  assert.deepEqual(await otherTables(),identities);assert.equal((await service.apply({apply:true})).outcome,'UNCHANGED');
  assert.equal((await execute(store,input,{apply:true})).outcome,'UNCHANGED');
  const [[audit]]=await db.query("SELECT COUNT(*) AS total FROM AUDIT_LOGS WHERE resource_id='TCV_BROWSER_DEMO_POSITIONS_V1'");assert.equal(Number(audit.total),1);
  await db.query('UPDATE POIS SET latitude=10.78999 WHERE poi_id=5');
  try{await assert.rejects(service.apply({apply:true}),/LOCATION_DRIFT_STOP/);await assert.rejects(execute(store,input,{apply:true}),/BASE_CONTENT_CONFLICT_POIS/);}finally{const point=require('../../../../backend/config/demo-locations').manifest.points.find(p=>p.poiId===5);await db.query('UPDATE POIS SET latitude=? WHERE poi_id=5',[point.latitude]);}
  await assert.rejects(new LocationService(new LocationStore(db,identity())).apply(),/WRONG_PHYSICAL_DATABASE/);
 });

});
