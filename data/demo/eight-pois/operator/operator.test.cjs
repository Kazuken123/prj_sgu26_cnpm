const {test,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {randomUUID}=require('node:crypto'),mysql=require('node:module').createRequire(path.resolve(__dirname,'../../../../backend/package.json'))('mysql2/promise');
const {Store}=require('./store.cjs'),{load,execute}=require('./service.cjs');
const utcPool=require('../../../../backend/config/utc-pool');const pools=[],connections=[];
async function inputs(){const paths=['../approved.json','../SOURCE_DRAFT02_APPROVED.md','../../reviewed-seven/SOURCE_DRAFT03_REVIEWED.json','../approval.json'];const bytes=await Promise.all(paths.map(p=>fs.readFile(path.resolve(__dirname,p))));return {bytes,input:load(...bytes)};}
async function fixture(){
 assert.equal(process.env.NODE_ENV,'test');assert.equal(process.env.RUN_DB_TESTS,'1');
 const target='tcv_eight_test_'+randomUUID().replaceAll('-',''),settings={host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,timezone:'Z',connectTimeout:3000};
 const admin=await mysql.createConnection(settings);connections.push(admin);await admin.query('CREATE DATABASE `'+target+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
 const db=utcPool(mysql.createPool({...settings,database:target,multipleStatements:true,connectionLimit:12}));pools.push(db);
 await db.query(await fs.readFile(path.resolve(__dirname,'../../../../database/init_db.sql'),'utf8'));
 const Schema=require('../../../../backend/stores/schema.store');await new Schema(db).migrateContentJobClaim();await new Schema(db).migrateContentJobLease();
 await db.query("INSERT INTO USERS(email,password_hash,role,status) VALUES('eight-fixture@example.invalid','TEST_ONLY_NOT_FOR_LOGIN','ADMIN','ACTIVE')");
 for(const code of ['fr','ja','ko','ru','zh-Hans'])await db.query('INSERT INTO LANGUAGES(code,name,is_active) VALUES(?,?,1)',[code,code]);
 const {input}=await inputs();let poiId=0;
 for(const p of input.legacy.pois){poiId++;await db.query("INSERT INTO POIS(poi_id,name,category,latitude,longitude,status,content_version) VALUES(?,?,'ANIMAL',?,?,'ACTIVE',1)",[poiId,p.text.vi.name,p.latitude,p.longitude]);
  for(const code of ['vi','en','fr','ja','ko','ru','zh-Hans']){const text=p.text[code]||p.text.vi;
   const [t]=await db.query("INSERT INTO POI_TRANSLATIONS(poi_id,language_code,name,description,audio_script,source_version,status) VALUES(?,?,?,?,?,1,'READY')",[poiId,code,text.name,text.description,text.audioScript]);
   await db.query("INSERT INTO CONTENT_JOBS(poi_id,language_code,source_version,status) VALUES(?,?,1,'COMPLETED')",[poiId,code]);
   // Metadata-only fixture for import tests, never demo data or speech evidence.
   await db.query("INSERT INTO AUDIOS(translation_id,source_version,status,file_url,duration,file_size) VALUES(?,1,'AVAILABLE',?,1,32044)",[t.insertId,'/api/media/audio/'+randomUUID()+'.wav']);
  }
 }
 await db.query("INSERT INTO TOURS(tour_id,name,description) VALUES(1,'TEST tour','TEST only')");await db.query('INSERT INTO TOUR_POIS(tour_id,poi_id,sequence_no) VALUES(1,1,1),(1,2,2)');
 await db.query("INSERT INTO AUDIT_LOGS(action,resource_type,resource_id,details) VALUES('SEED_APPROVED_DEMO','DEMO_DATASET','TCV_DEMO_POIS_V1',?)",[JSON.stringify({poiIds:[1,2],tourId:1})]);
 return {db,target,input,store:new Store(db,{target})};
}
after(async()=>{for(const p of pools)await p.end();for(const c of connections)await c.end();await require('../../../../backend/config/database').end();});
test('approved manifest/source tampering is rejected before accessing any database',async()=>{const {bytes}=await inputs();for(const pos of [0,1]){const copy=[...bytes];copy[pos]=Buffer.concat([copy[pos],Buffer.from(' ')]);assert.throws(()=>load(...copy));}});
test('wrong physical database is refused without importing records',async()=>{const {db,target,input}=await fixture();const other='tcv_eight_test_'+randomUUID().replaceAll('-','');await assert.rejects(execute(new Store(db,{target:other}),input,true),/WRONG_DATABASE/);assert.equal((await db.query('SELECT COUNT(*) n FROM POIS'))[0][0].n,2);assert.ok(target!==other);});
test('audit failure rolls back eight POIs, sixteen texts and all fifty-six jobs together',async()=>{const {store,db,input}=await fixture();const wrapped={target:store.target,transaction:fn=>store.transaction(s=>fn({...s,audit:async()=>{throw Error('TEST_AUDIT_FAILURE');}}))};await assert.rejects(execute(wrapped,input,true),/TEST_AUDIT_FAILURE/);for(const [table,total]of [['POIS',2],['POI_TRANSLATIONS',14],['CONTENT_JOBS',14]])assert.equal((await db.query('SELECT COUNT(*) n FROM '+table))[0][0].n,total);});
test('disabled ADMIN or unowned name collision stops with no import',async()=>{for(const action of ['admin','collision']){const {store,db,input}=await fixture();if(action==='admin')await db.query("UPDATE USERS SET status='LOCKED'");else await db.query("INSERT INTO POIS(name,latitude,longitude) VALUES('Unowned fixture',10,106)");const before=(await db.query('SELECT COUNT(*) n FROM POIS'))[0][0].n;await assert.rejects(execute(store,input,true));assert.equal((await db.query('SELECT COUNT(*) n FROM POIS'))[0][0].n,before);}});
test('concurrent imports create exactly eight POIs and repeat UNCHANGED without touching original records',async()=>{const {store,db,input}=await fixture();const before=await store.transaction(s=>s.snapshot());const results=await Promise.all(Array.from({length:6},()=>execute(store,input,true)));assert.equal(results.filter(r=>r.outcome==='CREATED').length,1);assert.equal(results.filter(r=>r.outcome==='UNCHANGED').length,5);const after=await store.transaction(s=>s.snapshot());assert.equal(after.pois.length,10);assert.equal(after.texts.length,30);assert.equal(after.jobs.length,70);assert.equal(after.audios.length,14);assert.equal(after.markers.length,1);assert.deepEqual(after.tours,before.tours);assert.deepEqual(after.links,before.links);for(const key of ['pois','texts','jobs','audios'])for(const old of before[key])assert.ok(after[key].some(r=>JSON.stringify(r)===JSON.stringify(old)));assert.equal((await db.query("SELECT COUNT(*) n FROM AUDIT_LOGS WHERE action='CREATE_POI'"))[0][0].n,8);});
test('changed source after import is not overwritten on replay',async()=>{const {store,db,input}=await fixture();const created=await execute(store,input,true);await db.query("UPDATE POI_TRANSLATIONS SET description='TEST concurrent change' WHERE poi_id=? AND language_code='vi'",[created.poiIds[0]]);await assert.rejects(execute(store,input,true));assert.equal((await db.query("SELECT description FROM POI_TRANSLATIONS WHERE poi_id=? AND language_code='vi'",[created.poiIds[0]]))[0][0].description,'TEST concurrent change');});
module.exports={fixture};
