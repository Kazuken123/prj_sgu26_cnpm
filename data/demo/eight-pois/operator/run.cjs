const path=require('node:path'),fs=require('node:fs/promises');
const pool=require('../../../../backend/config/database');const {Store,TARGET}=require('./store.cjs');const {load,execute,inspect,hash}=require('./service.cjs');
const Media=require('../../../../backend/adapters/local-media');const {inspectWav}=require('../../../../backend/utils/pcm-wav');
async function input(){return load(...await Promise.all(['../approved.json','../SOURCE_DRAFT02_APPROVED.md','../../reviewed-seven/SOURCE_DRAFT03_REVIEWED.json','../approval.json'].map(p=>fs.readFile(path.resolve(__dirname,p)))));}
async function main(){
 const [mode,output]=process.argv.slice(2);if(!['plan','apply','render','inventory'].includes(mode)||!/^[-a-z0-9]+\.json$/.test(output||''))throw Error('INVALID_OPERATOR_ARGUMENTS');
 if(process.env.DB_NAME!==TARGET)throw Error('WRONG_CONFIGURED_DATABASE');
 const data=await input(),store=new Store();let result;
 if(['plan','apply'].includes(mode))result=await execute(store,data,mode==='apply');
 else{
  let snapshot=await store.transaction(async state=>{const s=await state.snapshot();inspect(s,data);return s;});
  const marker=snapshot.markers.length?JSON.parse(snapshot.markers[0].details):null;
  if(mode==='render'){
   if(!marker)throw Error('DATASET_NOT_IMPORTED');
   const Piper=require('../../../../backend/adapters/piper-tts'),{getPiperConfig}=require('../../../../backend/config/piper'),{PipelineService}=require('../../../../backend/services/pipeline.service');
   const settings=getPiperConfig(),tts=new Piper(settings);await tts.assertConfigured();const pipeline=new PipelineService(undefined,{tts,audioTimeoutMs:settings.timeoutMs});
   for(const j of snapshot.jobs.filter(j=>marker.poiIds.includes(j.poi_id)&&['vi','en'].includes(j.language_code))){
    if(j.status==='COMPLETED')continue;if(j.status!=='PENDING')throw Error('EXPLICIT_RETRY_REQUIRED');
    const r=await pipeline.runJob(j.job_id);if(!r.completed)throw Error('AUDIO_JOB_NOT_COMPLETED');console.log(JSON.stringify({jobId:j.job_id,poiId:j.poi_id,languageCode:j.language_code,outcome:'COMPLETED'}));
   }
   snapshot=await store.transaction(async state=>{const s=await state.snapshot();inspect(s,data);return s;});
  }
  const media=new Media(),files=[];
  for(const audio of snapshot.audios){if(audio.status!=='AVAILABLE')throw Error('AUDIO_NOT_AVAILABLE');const bytes=await media.get(audio.file_url.split('/').pop()),wav=inspectWav(bytes);if(wav.fileSize!==audio.file_size||Math.ceil(wav.duration)!==audio.duration)throw Error('AUDIO_METADATA_CONFLICT');const text=snapshot.texts.find(t=>t.translation_id===audio.translation_id);files.push({poiId:text.poi_id,languageCode:text.language_code,audioId:audio.audio_id,sha256:hash(bytes),...wav});}
  result={outcome:mode.toUpperCase(),snapshot,files};
 }
 await fs.writeFile(path.resolve(output),JSON.stringify(result,null,2),{flag:'wx'});
 console.log(JSON.stringify({outcome:result.outcome,poiIds:result.poiIds,output,files:result.files?.length}));
}
if(require.main===module)main().catch(e=>{console.error(JSON.stringify({code:'EIGHT_POI_OPERATION_STOPPED',reason:e.code==='ERR_ASSERTION'?e.message.split('\n')[0]:['WRONG_DATABASE','WRONG_CONFIGURED_DATABASE','EXPLICIT_RETRY_REQUIRED','AUDIO_JOB_NOT_COMPLETED'].includes(e.message)?e.message:'OPERATION_UNCONFIRMED'}));process.exitCode=1;}).finally(()=>pool.end());
module.exports={input};
