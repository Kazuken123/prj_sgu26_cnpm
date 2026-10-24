const fs=require('node:fs'),path=require('node:path');
async function main(){
 const args=process.argv.slice(2),apply=args.includes('--apply'),values=args.filter(a=>a!=='--apply');
 if(args.filter(a=>a==='--apply').length>1||values.length!==4||values[0]!=='--database'||values[1]!=='tcv_demo_review_20261020'||values[2]!=='--media-root'||!path.isAbsolute(values[3]))throw Error('EXPLICIT_DEMO_AND_PRIVATE_MEDIA_REQUIRED');
 require('node:module').createRequire(path.join(__dirname,'../../../../backend/package.json'))('dotenv').config({quiet:true});if(process.env.DB_NAME!==values[1])throw Error('DATABASE_CONFIGURATION_MISMATCH');
 const pool=require('../../../../backend/config/database');
 try{
  const {Store}=require('./store.cjs'),{load,execute}=require('./service.cjs');
  const input=load(fs.readFileSync(path.join(__dirname,'../extension.json')),fs.readFileSync(path.join(__dirname,'../authorization.json')),fs.readFileSync(path.join(__dirname,'../../../staging/dataset.json')));
  const media=new(require('../../../../backend/adapters/local-media'))({root:values[3]});
  console.log(JSON.stringify(await execute(new Store(pool,values[1]),input,{apply,media})));
 }finally{await pool.end();}
}
if(require.main===module)main().catch(()=>{console.error(JSON.stringify({outcome:'STOPPED',code:'DEMO15_PUBLICATION_NOT_CONFIRMED_RECONCILE'}));process.exitCode=1;});
module.exports={main};
