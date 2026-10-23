const pool = require('../../../../backend/config/database');
const {createHash} = require('node:crypto');
const TranslationStore = require('../../../../backend/stores/translation.store');
class DemoDataStore {
  constructor(db=pool) { this.db=db; }
  async transaction(work) {
    const c=await this.db.getConnection(); let begun=false, locked=false, discard=false;
    const lock=createHash('sha256').update('tcv_demo_review_20261020:TCV_DEMO_POIS_V1').digest('hex');
    try {
      const [[target]]=await c.query('SELECT DATABASE() AS name');
      if(target.name!=='tcv_demo_review_20261020') throw Error('WRONG_PHYSICAL_DATABASE');
      discard=true;const [[answer]]=await c.query('SELECT GET_LOCK(?,5) AS acquired',[lock]);discard=false;
      if(Number(answer.acquired)!==1) throw Error('DATASET_LOCK_UNAVAILABLE');locked=true;
      await c.beginTransaction();begun=true;
      const translations=new TranslationStore(this.db);
      // All existing importReviewed calls participate in this outer transaction.
      translations.transactions={transaction: fn=>fn(c)};
      const state={
        snapshot: async()=>{
          const read=async sql=>(await c.query(sql))[0];
          return {
            database:target.name,
            pois:await read('SELECT * FROM POIS ORDER BY poi_id FOR UPDATE'),
            translations:await read('SELECT * FROM POI_TRANSLATIONS ORDER BY translation_id FOR UPDATE'),
            audios:await read('SELECT * FROM AUDIOS ORDER BY audio_id FOR UPDATE'),
            jobs:await read('SELECT * FROM CONTENT_JOBS ORDER BY job_id FOR UPDATE'),
            languages:await read('SELECT * FROM LANGUAGES ORDER BY code FOR UPDATE'),
            tours:await read('SELECT * FROM TOURS ORDER BY tour_id FOR UPDATE'),
            links:await read('SELECT * FROM TOUR_POIS ORDER BY tour_id,sequence_no FOR UPDATE'),
            markers:await read("SELECT details FROM AUDIT_LOGS WHERE action='SEED_APPROVED_DEMO' AND resource_type='DEMO_DATASET' AND resource_id='TCV_DEMO_POIS_V1' ORDER BY log_id FOR UPDATE"),
            actors:await read("SELECT user_id AS userId,role,status,locked_until FROM USERS WHERE role='ADMIN' AND status='ACTIVE' ORDER BY user_id FOR UPDATE"),
            imports:await read("SELECT log_id,resource_id,details FROM AUDIT_LOGS WHERE action='IMPORT_REVIEWED_TRANSLATION' ORDER BY log_id")
          };
        },
        insertLanguage: (code,name)=>c.query('INSERT INTO LANGUAGES(code,name,is_active) VALUES(?,?,1)',[code,name]),
        insertJob:(poiId,code,version)=>c.query("INSERT INTO CONTENT_JOBS(poi_id,language_code,source_version,status) VALUES(?,?,?,'PENDING')",[poiId,code,version]),
        translationStore:translations
      };
      const value=await work(state);await c.commit();begun=false;return value;
    } catch(e) { if(begun)try{await c.rollback();}catch{discard=true;}throw e; }
    finally {
      if(locked)try{const [[r]]=await c.query('SELECT RELEASE_LOCK(?) AS released',[lock]);if(Number(r.released)!==1)discard=true;}catch{discard=true;}
      if(discard)c.destroy();else c.release();
    }
  }
}
module.exports=DemoDataStore;
