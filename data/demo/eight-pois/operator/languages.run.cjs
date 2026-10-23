const path=require('node:path'),fs=require('node:fs/promises');
const pool=require('../../../../backend/config/database');const {Store,TARGET}=require('./store.cjs');const {input:baseInput}=require('./run.cjs');
const {loadLanguages,inspectLanguages,executeLanguages}=require('./languages.service.cjs');
const Media=require('../../../../backend/adapters/local-media'),{inspectWav}=require('../../../../backend/utils/pcm-wav'),{hash}=require('./service.cjs');
async function input(){return loadLanguages(await fs.readFile(path.resolve(__dirname,'../languages-five.json')),await fs.readFile(path.resolve(__dirname,'../languages-five-authorization.json')),await baseInput());}
async function main(){
 const [mode,output]=process.argv.slice(2);if(!['plan','apply','render','inventory'].includes(mode)||!/^[-a-z0-9]+\.json$/.test(output||''))throw Error('INVALID_OPERATOR_ARGUMENTS');if(process.env.DB_NAME!==TARGET)throw Error('WRONG_CONFIGURED_DATABASE');
 const data=await input(),store=new Store();let result;
 if(['plan','apply'].includes(mode))result=await executeLanguages(store,data,mode==='apply');
 else{
  const read=()=>store.transaction(async state=>{const s=await state.snapshot();inspectLanguages(s,data);return s;});
  let snapshot=await read();
  if(mode==='render'){
   const {items}=inspectLanguages(snapshot,data),Piper=require('../../../../backend/adapters/piper-tts'),{getPiperConfig}=require('../../../../backend/config/piper'),{PipelineService}=require('../../../../backend/services/pipeline.service');
   assertAllTexts(items);const settings=getPiperConfig(),tts=new Piper(settings);await tts.assertConfigured();const pipeline=new PipelineService(undefined,{tts,audioTimeoutMs:settings.timeoutMs});
   for(const row of items){const job=snapshot.jobs.find(j=>j.job_id===row.jobId);if(job.status==='COMPLETED')continue;const r=await pipeline.runJob(row.jobId);if(!r.completed)throw Error('AUDIO_JOB_NOT_COMPLETED');console.log(JSON.stringify({jobId:row.jobId,poiId:row.poiId,languageCode:row.code,outcome:'COMPLETED'}));}
   snapshot=await read();
  }
  const media=new Media(),files=[];
  for(const a of snapshot.audios){if(a.status!=='AVAILABLE')throw Error('AUDIO_NOT_AVAILABLE');const bytes=await media.get(a.file_url.split('/').pop()),wav=inspectWav(bytes);if(wav.fileSize!==a.file_size||Math.ceil(wav.duration)!==a.duration)throw Error('AUDIO_METADATA_CONFLICT');const t=snapshot.texts.find(t=>t.translation_id===a.translation_id);files.push({poiId:t.poi_id,languageCode:t.language_code,audioId:a.audio_id,sha256:hash(bytes),...wav});}
  result={outcome:mode.toUpperCase(),snapshot,files};
 }
 await fs.writeFile(path.resolve(output),JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify({outcome:result.outcome,missingTexts:result.missingTexts,imported:result.results?.filter(r=>r.outcome==='IMPORTED').length,unchanged:result.results?.filter(r=>r.outcome==='UNCHANGED').length,files:result.files?.length,output}));
}
function assertAllTexts(items){if(items.some(i=>!i.exists))throw Error('REVIEWED_TEXT_REQUIRED');}
if(require.main===module)main().catch(e=>{console.error(JSON.stringify({code:'FIVE_LANG_OPERATION_STOPPED',reason:e.code==='ERR_ASSERTION'?e.message.split('\n')[0]:['WRONG_CONFIGURED_DATABASE','AUDIO_JOB_NOT_COMPLETED','REVIEWED_TEXT_REQUIRED'].includes(e.message)?e.message:'OPERATION_UNCONFIRMED'}));process.exitCode=1;}).finally(()=>pool.end());
module.exports={input};
