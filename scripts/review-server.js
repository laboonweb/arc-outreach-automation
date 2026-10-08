'use strict';
const http=require('node:http');const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const {DraftStore}=require('./draft-store');const {summary}=require('./outreach-mvp');
const root=path.resolve(__dirname,'..');const token=crypto.randomBytes(24).toString('hex');
function start({port=4318,dbFile=path.join(root,'private/phase2/draft-queue.sqlite')}={}){
 const store=new DraftStore(dbFile);
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');
  if(!['127.0.0.1:'+port,'localhost:'+port].includes(req.headers.host)){res.writeHead(403);return res.end();}
  try{
   if(req.method==='GET'&&req.url==='/api/queue'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({rows:store.all(),followups:store.due(),summary:summary(store.all()),csrf:token,transport:'MANUAL_EMAIL_QUEUE',sending_enabled:false}));}
   if(req.method==='POST'&&req.url==='/api/action'){
    if(req.headers['x-csrf-token']!==token||req.headers.origin!=='http://'+req.headers.host)throw new Error('REQUEST_REJECTED');
    let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>12000)throw new Error('INPUT_TOO_LARGE');}
    const input=JSON.parse(raw);if(!['APPROVE','REJECT','MARK_SENT','REPLIED','PARK','DO_NOT_CONTACT','RESCHEDULE','BOUNCED','DEAD_ROUTE'].includes(input.action))throw new Error('REVIEW_ACTION_NOT_ALLOWED');
    const result=store.action(input.id,input.action,input.review||{});
    res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(result));
   }
   const files={'/':'review.html','/review.js':'review.js','/review.css':'review.css','/routing':'routing-report.html'},name=files[req.url];
   if(req.method!=='GET'||!name){res.writeHead(404);return res.end();}
   res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(req.url==='/routing'?path.join(root,'private/phase2/operations',name):path.join(root,'review',name)));
  }catch(e){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}));}
 });
 server.on('close',()=>store.close());server.listen(port,'127.0.0.1');return server;
}
if(require.main===module){start();console.log('Arc Draft Review: http://127.0.0.1:4318 (manual actions only; no sending)');}
module.exports={start};
