const fs=require('node:fs'),path=require('node:path');
async function main(){
 const args=process.argv.slice(2),apply=args.includes('--apply'),flags=args.filter(a=>a!=='--apply');
 if(args.filter(a=>a==='--apply').length>1||flags.length!==2||flags[0]!=='--database'||flags[1]!=='tcv_demo_review_20261020')throw Error('EXPLICIT_DEMO_TARGET_REQUIRED');
 require('node:module').createRequire(path.join(__dirname,'../../../../backend/package.json'))('dotenv').config({quiet:true});if(process.env.DB_NAME!==flags[1])throw Error('DATABASE_CONFIGURATION_MISMATCH');
 const pool=require('../../../../backend/config/database');
 try{
  const {Store}=require('./store.cjs'),{load,execute}=require('./service.cjs');
  const input=load(fs.readFileSync(path.join(__dirname,'../extension.json')),fs.readFileSync(path.join(__dirname,'../authorization.json')),fs.readFileSync(path.join(__dirname,'../../../staging/dataset.json')));
  console.log(JSON.stringify(await execute(new Store(pool,flags[1]),input,{apply})));
 }finally{await pool.end();}
}
if(require.main===module)main().catch(()=>{console.error(JSON.stringify({outcome:'STOPPED',code:'DEMO15_RECONCILIATION_REQUIRED_NO_BLIND_RETRY'}));process.exitCode=1;});
module.exports={main};
