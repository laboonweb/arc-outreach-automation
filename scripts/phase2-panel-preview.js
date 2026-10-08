'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const panel=require('./phase2-panel'),inbox=require('./phase2-inbox'),{NAMES}=require('./phase2-panel-validation'),{assets}=require('./build-phase2-panel');
function start({port=4320,file=path.join(__dirname,'../private/phase2/panel/preview-data.json')}={}){
 const original=JSON.parse(fs.readFileSync(file,'utf8')),secret=crypto.randomBytes(32).toString('hex');let state=structuredClone(original);
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Type','text/html; charset=utf-8');
  if(req.headers.host!=='127.0.0.1:'+port){res.writeHead(403);return res.end('Local validation only.');}
  let feedback=[],notice='';
  try{
   if(req.method==='POST'&&req.url==='/action'){
    // The in-app browser uses an opaque frame origin. Signed, short-lived form
    // tokens still bind every decision to the exact rendered validation copy.
    if(!['http://127.0.0.1:'+port,'null'].includes(req.headers.origin))throw new Error('PANEL_INPUT_NOT_ALLOWED');let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>30000)throw new Error('PANEL_INVALID_TEXT');}
    const body=Object.fromEntries(new URLSearchParams(raw)),row=state.rows.find(r=>r.id===Number(body.id));if(!row||!NAMES.has(row.business_name))throw new Error('VALIDATION_SAMPLE_ONLY');
    const result=panel.process(body,state.research,state.queue,state.locks,state.rows,state.links,{},secret),saved=result.writes[0];feedback=result.errors;
    if(saved){state.queue=state.queue.map(r=>r.queue_key===saved.queue_key?{...saved,id:r.id,createdAt:r.createdAt,updatedAt:r.updatedAt}:r);const link=state.links.find(l=>l.queue_key===saved.queue_key),current=state.rows.find(r=>r.id===link.inbox_id),projected={...inbox.project(saved),id:current.id};state.rows=state.rows.map(r=>r.id===current.id?projected:r);state.links=state.links.map(l=>l.queue_key===saved.queue_key?{...l,backend_hash:inbox.digest(saved),snapshot:JSON.stringify(inbox.project(saved))}:l);notice='Validation decision passed on a copy. Live ledger unchanged.';}
   }else if(req.method==='GET'&&req.url==='/reset'){state=structuredClone(original);notice='Validation copies reset. Live ledger unchanged.';}
   else if(req.method!=='GET'||req.url!=='/'){res.writeHead(404);return res.end('Not found.');}
  }catch(e){feedback=[{error:e.message}];}
  res.end(panel.render(state.rows,state.links,state.queue,{secret,url:'http://127.0.0.1:'+port+'/action',readUrl:'http://127.0.0.1:'+port+'/',...assets(),feedback,notice,preview:true}));
 });server.listen(port,'127.0.0.1');return server;
}
module.exports={start};
if(require.main===module){start();console.log('Arc panel validation preview: http://127.0.0.1:4320. Actions affect in-memory copies only.');}
