const {createHash}=require('node:crypto');
const TranslationStore=require('../../../../backend/stores/translation.store');
const AuditStore=require('../../../../backend/stores/audit_log.store');
class Store{
 constructor(db,target){
  if(target!=='tcv_demo_review_20261020'&&!(process.env.NODE_ENV==='test'&&/^tcv_staging_test_[a-f0-9]{32}$/.test(target||'')))throw Error('WRONG_DEMO15_TARGET');
  this.db=db;this.target=target;
 }
 async transaction(work){
  const c=await this.db.getConnection();let locked=false,begun=false,discard=false;
  const lock=createHash('sha256').update(this.target+':TCV_DEMO_POIS_V1').digest('hex');
  try{
   const [[actual]]=await c.query('SELECT DATABASE() AS name');if(actual.name!==this.target)throw Error('WRONG_PHYSICAL_DATABASE');
   discard=true;const [[answer]]=await c.query('SELECT GET_LOCK(?,5) AS acquired',[lock]);discard=false;
   if(Number(answer.acquired)!==1)throw Error('DEMO15_LOCK_UNAVAILABLE');locked=true;
   await c.beginTransaction();begun=true;
   const translations=new TranslationStore(this.db);translations.transactions={transaction:fn=>fn(c)};
   const state={translations,
    snapshot:async()=>{
     const tables={};
     for(const [table,order]of Object.entries({POIS:'poi_id',CONTENT_JOBS:'job_id',POI_TRANSLATIONS:'translation_id',AUDIOS:'audio_id',LANGUAGES:'code',TOURS:'tour_id',TOUR_POIS:'tour_id,sequence_no'}))tables[table]=(await c.query('SELECT * FROM '+table+' ORDER BY '+order+' FOR UPDATE'))[0];
     const [actors]=await c.query("SELECT user_id AS userId,role,status,locked_until FROM USERS WHERE role='ADMIN' AND status='ACTIVE' AND (locked_until IS NULL OR locked_until<=UTC_TIMESTAMP()) ORDER BY user_id LIMIT 1 FOR UPDATE");
     return {database:actual.name,tables,actor:actors[0]};
    },
    addLanguage:row=>c.query('INSERT INTO LANGUAGES(code,name,is_active) VALUES(?,?,1)',[row.code,row.name]),
    addJob:(poiId,code,version)=>c.query("INSERT INTO CONTENT_JOBS(poi_id,language_code,source_version,status) VALUES(?,?,?,'PENDING')",[poiId,code,version]),
    publishAudio:async file=>{
     const [rows]=await c.query("SELECT translation_id FROM POI_TRANSLATIONS WHERE poi_id=? AND language_code=? AND source_version=? AND status='READY' FOR UPDATE",[file.poiId,file.languageCode,file.sourceVersion]);
     if(rows.length!==1)throw Error('READY_TEXT_REQUIRED');
     await c.query("INSERT INTO AUDIOS(translation_id,file_url,duration,file_size,source_version,status) VALUES(?,?,?,?,?,'AVAILABLE')",[rows[0].translation_id,'/api/media/audio/'+file.key,file.duration,file.fileSize,file.sourceVersion]);
     const [changed]=await c.query("UPDATE CONTENT_JOBS SET status='COMPLETED',error_message=NULL WHERE poi_id=? AND language_code=? AND source_version=? AND status='PENDING' AND claim_id IS NULL AND lease_expires_at IS NULL",[file.poiId,file.languageCode,file.sourceVersion]);
     if(changed.affectedRows!==1)throw Error('JOB_CHANGED_NO_PUBLICATION');
    },
    audit:(actor,details)=>new AuditStore(this.db).create({userId:actor.userId,action:'SEED_APPROVED_DEMO',resourceType:'DEMO_DATASET',resourceId:'TCV_DEMO_15_LANG_EXTENSION_V1',details:JSON.stringify(details)},c)
   };
   const result=await work(state);await c.commit();begun=false;return result;
  }catch(error){if(begun)try{await c.rollback();}catch{discard=true;}throw error;}
  finally{if(locked)try{const [[r]]=await c.query('SELECT RELEASE_LOCK(?) AS released',[lock]);if(Number(r.released)!==1)discard=true;}catch{discard=true;}if(discard)c.destroy();else c.release();}
 }
}
module.exports={Store};
