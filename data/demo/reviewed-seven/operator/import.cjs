const path=require('node:path');
const fs=require('node:fs/promises');
const pool=require('../../../../backend/config/database');
const Store=require('./demo-data.store.cjs');
const {validateFiles,execute}=require('./import.service.cjs');
(async()=>{
 const mode=process.argv[2],output=process.argv[3];
 if(!['plan','apply'].includes(mode)||!/^[-a-z0-9]+\.json$/.test(output||''))throw Error('INVALID_OPERATOR_ARGUMENTS');
 if(process.env.DB_NAME!=='tcv_demo_review_20261020')throw Error('WRONG_CONFIGURED_DATABASE');
 const bytes=await Promise.all([path.join(__dirname,'../TRANSLATIONS_DRAFT_01.json'),path.join(__dirname,'../DUYET_NOI_DUNG_DRAFT_01_20261023.json'),path.join(__dirname,'../SOURCE_DRAFT03_REVIEWED.json')].map(p=>fs.readFile(p)));
 const files=validateFiles(...bytes),result=await execute(new Store(),files,mode==='apply');
 await fs.writeFile(path.resolve(output),JSON.stringify(result,null,2),{flag:'wx'});
 console.log(JSON.stringify({outcome:result.outcome,output,newJobs:result.newJobs,newTranslations:result.newTranslations,imported:result.results?.filter(r=>r.outcome==='IMPORTED').length,unchanged:result.results?.filter(r=>r.outcome==='UNCHANGED').length}));
})().catch(e=>{console.error(JSON.stringify({code:'DEMO_IMPORT_STOPPED',reason:e.code==='ERR_ASSERTION'?e.message.split('\n')[0]:['WRONG_PHYSICAL_DATABASE','WRONG_CONFIGURED_DATABASE','DATASET_LOCK_UNAVAILABLE'].includes(e.message)?e.message:'OPERATION_UNCONFIRMED'}));process.exitCode=1;}).finally(()=>pool.end());
