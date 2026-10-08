'use strict';
// Static localhost GET preview. It cannot accept a review action or write data.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const q=require('./phase2-cloud-queue'),inbox=require('./phase2-inbox'),panel=require('./phase2-panel'),h=require('./research-history'),diagnostics=require('./research-diagnostics'),{assets}=require('./build-phase2-panel');
const dir=path.join(__dirname,'../private/integrity-audit'),read=name=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
function build(){
 const tables=read('tables-live-before.json'),old=JSON.parse(fs.readFileSync(path.join(dir,'../production-release/tables-before.json'),'utf8')),byId=new Map(),now=read('audit-context.json').snapshot_at;
 // Each file is one capped read. Retain only queue-associated rows for preview.
 const ids=new Set(tables.queue.rows.map(r=>r.lead_id));for(let i=0;i<18;i++)for(const row of read('page-'+i+'.json'))if(ids.has(row.lead_id))byId.set(row.lead_id,row);
 const checkHistory=read('operational-check-history.json');
 const queue=tables.queue.rows.map(row=>{const source=byId.get(row.lead_id);if(!source)return row;const d=JSON.parse(row.payload),checks=checkHistory.filter(f=>f.lead_id===source.lead_id);
  d.research_diagnostics=diagnostics.diagnose(source,now,d,checks);d.why_this_lead=diagnostics.summary(d.research_diagnostics);d.evidence_summary=JSON.stringify(h.allFacts(source));
  if(row.state==='NEEDS_RESEARCH'&&!d.research_diagnostics.evidence_eligible)d.route_reason=d.research_diagnostics.protection||d.research_diagnostics.missing_or_stale.join('|');
  const historical=old.queue.rows.find(r=>r.lead_id===row.lead_id);if(historical){const p=JSON.parse(historical.payload);if(p.draft_body)d.copy_history=[...(d.copy_history||[]),{subject:p.subject,draft_body:p.draft_body,message_hash:p.message_hash,copy_checked_at:p.copy_checked_at,copy_version:p.copy_version,historical_only:true}];}
  return {...row,payload:JSON.stringify(d)};
 });
 const rows=queue.map((r,i)=>({...inbox.project(r,now),id:i+1})),links=queue.map((r,i)=>({queue_key:r.queue_key,inbox_id:i+1,snapshot:JSON.stringify(inbox.project(r,now)),backend_hash:inbox.digest(r)}));
 const html=panel.render(rows,links,queue,{secret:crypto.randomBytes(32).toString('hex'),url:'http://127.0.0.1:4371/action-disabled',readUrl:'http://127.0.0.1:4371/',...assets(),preview:true,notice:'Read-only integrity preview. These diagnostic projections are local copies; production records are unchanged.',now:Date.parse(now)});
 fs.writeFileSync(path.join(dir,'panel-preview.html'),html);return html;
}
function start(){const html=build(),server=http.createServer((req,res)=>{res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','text/html; charset=utf-8');if(req.method!=='GET'||req.url!=='/'){res.writeHead(405);res.end('This preview is read-only.');return;}res.end(fs.readFileSync(path.join(dir,'panel-preview.html'),'utf8'));});server.listen(4371,'127.0.0.1');return server;}
module.exports={build,start};if(require.main===module){start();console.log('Read-only integrity preview: http://127.0.0.1:4371/');}
