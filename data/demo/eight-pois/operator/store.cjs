const pool=require('../../../../backend/config/database');
const {createHash}=require('node:crypto');
const PoiStore=require('../../../../backend/stores/poi.store');
const TranslationStore=require('../../../../backend/stores/translation.store');
const AuditStore=require('../../../../backend/stores/audit_log.store');
const TARGET='tcv_demo_review_20261020',DATASET='TCV_DEMO_EIGHT_POIS_V1';
class Store{
 constructor(db=pool,{target=TARGET}={}){
  if(target!==TARGET&&!(process.env.NODE_ENV==='test'&&/^tcv_eight_test_[a-f0-9]{32}$/.test(target)))throw Error('INVALID_TARGET');
  this.db=db;this.target=target;
 }
 async transaction(work){
  const c=await this.db.getConnection();let locked=false,begun=false,discard=false;
  const lock=createHash('sha256').update(this.target+':TCV_DEMO_POIS_V1').digest('hex');
  try{
   const [[actual]]=await c.query('SELECT DATABASE() AS name');if(actual.name!==this.target)throw Error('WRONG_DATABASE');
   discard=true;const [[answer]]=await c.query('SELECT GET_LOCK(?,5) AS acquired',[lock]);discard=false;
   if(Number(answer.acquired)!==1)throw Error('DATASET_LOCK_UNAVAILABLE');locked=true;
   await c.beginTransaction();begun=true;
   const poiStore=new PoiStore(this.db),translationStore=new TranslationStore(this.db);
   poiStore.transactions=translationStore.transactions={transaction:fn=>fn(c)};
   const state={poiStore,translationStore,
    snapshot:async()=>{
     const read=async sql=>(await c.query(sql))[0];
     const marker=async id=>(await c.query("SELECT details FROM AUDIT_LOGS WHERE action='SEED_APPROVED_DEMO' AND resource_type='DEMO_DATASET' AND resource_id=? ORDER BY log_id FOR UPDATE",[id]))[0];
     return {database:actual.name,pois:await read('SELECT * FROM POIS ORDER BY poi_id FOR UPDATE'),
      texts:await read('SELECT * FROM POI_TRANSLATIONS ORDER BY translation_id FOR UPDATE'),
      audios:await read('SELECT * FROM AUDIOS ORDER BY audio_id FOR UPDATE'),
      jobs:await read('SELECT * FROM CONTENT_JOBS ORDER BY job_id FOR UPDATE'),
      languages:await read('SELECT * FROM LANGUAGES ORDER BY code FOR UPDATE'),
      tours:await read('SELECT * FROM TOURS ORDER BY tour_id FOR UPDATE'),
      links:await read('SELECT * FROM TOUR_POIS ORDER BY tour_id,sequence_no FOR UPDATE'),
      actors:await read("SELECT user_id AS userId,role,status,locked_until FROM USERS WHERE role='ADMIN' AND status='ACTIVE' ORDER BY user_id FOR UPDATE"),
      rootMarkers:await marker('TCV_DEMO_POIS_V1'),markers:await marker(DATASET)};
    },
    audit:(actor,details)=>new AuditStore(this.db).create({userId:actor.userId,action:'SEED_APPROVED_DEMO',resourceType:'DEMO_DATASET',resourceId:DATASET,details:JSON.stringify(details)},c)
   };
   const result=await work(state);await c.commit();begun=false;return result;
  }catch(e){if(begun)try{await c.rollback();}catch{discard=true;}throw e;}
  finally{if(locked)try{const [[r]]=await c.query('SELECT RELEASE_LOCK(?) AS released',[lock]);if(Number(r.released)!==1)discard=true;}catch{discard=true;}if(discard)c.destroy();else c.release();}
 }
}
module.exports={Store,TARGET,DATASET};
