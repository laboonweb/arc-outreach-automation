'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const panel=require('./phase2-panel'),inbox=require('./phase2-inbox'),{assets}=require('./build-phase2-panel'),{seed}=require('./phase2-operator-fixtures');
const DIR=path.join(__dirname,'../private/operator-lifecycle');
function project(state,now=new Date().toISOString()){
 return {...state,rows:state.queue.map((row,i)=>({...inbox.project(row,now),id:i+1})),links:state.queue.map((row,i)=>({queue_key:row.queue_key,inbox_id:i+1,snapshot:JSON.stringify(inbox.project(row,now)),backend_hash:inbox.digest(row)}))};
}
function persist(file,state){const temp=file+'.tmp';const bytes=JSON.stringify(state,null,2);fs.writeFileSync(temp,bytes,{mode:0o600});const fd=fs.openSync(temp,'r+');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(temp,file);}
function start({port=4321,file=path.join(DIR,'local-fixture-state.json'),restricted=false}={}){
 fs.mkdirSync(path.dirname(file),{recursive:true});if(!fs.existsSync(file))persist(file,{...seed(),secret:crypto.randomBytes(32).toString('hex')});
 let state=JSON.parse(fs.readFileSync(file,'utf8'));if(state.synthetic_only!==true||!state.research.every(r=>/Fixture$/.test(r.business_name)))throw Error('SYNTHETIC_PREVIEW_ONLY');
 const server=http.createServer(async(req,res)=>{
  const base='http://127.0.0.1:'+server.address().port;
  res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.headers.host!=='127.0.0.1:'+server.address().port){res.writeHead(403);return res.end('Loopback preview only.');}
  let feedback=[],notice='Local preview. All records and provider receipts are synthetic. Saves persist on this computer; no live workflow or provider is called.';
  try{
   if(req.method==='POST'&&req.url==='/action'){
    // no-referrer emits Origin:null on native form POSTs. Fetch Metadata must
    // still establish same-origin; the signed, expiring row token is mandatory.
    if(req.headers.origin!==base&&!(req.headers.origin==='null'&&req.headers['sec-fetch-site']==='same-origin'))throw Error('PANEL_INPUT_NOT_ALLOWED');let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>60000)throw Error('PANEL_INVALID_TEXT');}
    const fields=new URLSearchParams(raw);if(new Set(fields.keys()).size!==[...fields.keys()].length)throw Error('PANEL_INPUT_NOT_ALLOWED');const body=Object.fromEntries(fields),now=new Date().toISOString(),view=project(state,now);
    const result=panel.process(body,state.research,state.queue,state.locks,view.rows,view.links,{operator_lifecycle_required:true,...(restricted?{zoho_handoff_disabled:true}:{})},state.secret,now);feedback=result.errors;
    if(result.writes.length){const saved=result.writes[0],existing=state.queue.find(row=>row.queue_key===saved.queue_key);if(existing.payload!==saved.cas_payload)throw Error('BACKEND_ACTION_WRITE_CONFLICT');const next={...state,queue:state.queue.map(row=>row.queue_key===saved.queue_key?saved:row)};persist(file,next);state=next;notice=result.notice||'Verification outcome saved in local audit history.';}
   }else if(req.method!=='GET'||req.url!=='/'){res.writeHead(404);return res.end('Not found.');}
  }catch(error){feedback=[{error:error.message}];}
  const view=project(state),diagnosticsByKey={};for(const row of state.queue){const d=JSON.parse(row.payload),source=state.research.find(s=>s.lead_id===d.lead_id);diagnosticsByKey[row.queue_key]=require('./research-diagnostics').diagnose(require('./phase2-operator-evidence').effective(source,d,new Date().toISOString()),new Date().toISOString(),d);if(d.operator_workspace){const evaluation=require('./phase2-operator-lifecycle').evaluate(source,d,new Date().toISOString());diagnosticsByKey[row.queue_key].missing_or_stale=evaluation.missing;diagnosticsByKey[row.queue_key].send_blockers=evaluation.blockers;diagnosticsByKey[row.queue_key].operator_evaluation=evaluation;}}
  res.end(panel.render(view.rows,view.links,state.queue,{secret:state.secret,url:base+'/action',readUrl:base+'/',...assets(),feedback,notice,diagnosticsByKey,preview:true,zoho_handoff_disabled:restricted}));
 });server.listen(port,'127.0.0.1');return server;
}
module.exports={project,persist,start};if(require.main===module){start();console.log('Durable synthetic operator preview: http://127.0.0.1:4321/');}
