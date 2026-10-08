'use strict';
// One-off, manual recovery of exactly the reviewed held-lead drafts. This
// reuses the existing native writer and its complete compare-and-save filters.
const fs=require('node:fs'),path=require('node:path'),{bundle}=require('./build-workflows'),{finish}=require('./build-phase2-inbox');
const dir=path.join(__dirname,'../private/draft-send-separation'),proof=JSON.parse(fs.readFileSync(path.join(dir,'cloud-proof.json'),'utf8'));
const w=JSON.parse(fs.readFileSync(path.join(dir,'draft-patch.json'),'utf8')).workflow;
delete w.id;delete w.versionId;delete w.activeVersionId;delete w.activeVersion;
w.name='Arc | Draft separation | Exact eleven-draft backfill';w.active=false;
const tables=JSON.parse(fs.readFileSync(path.join(dir,'tables-before.json'),'utf8'));
const q=require('./phase2-cloud-queue'),scope=Object.keys(proof.source_hashes).filter(id=>{const context=JSON.parse(fs.readFileSync(path.join(dir,'audit-context.json'),'utf8'));return context.held.some(r=>r.lead_id===id&&!q.protection(r));});
if(scope.length!==127)throw Error('EXACT_UNPROTECTED_SCOPE_REQUIRED');
const hash=r=>q.sourceHash(Object.fromEntries(Object.entries(r).filter(([k])=>!['id','createdAt','updatedAt'].includes(k))));
const baseline=Object.fromEntries(Object.entries(tables).map(([k,v])=>[k,v.rows.map(r=>({id:r.id,hash:hash(r)}))]));
const expected=proof.ready.map(r=>({lead_id:r.lead_id,message_hash:r.message_hash}));
const universeHash=q.sourceHash({universe:Object.entries(proof.source_hashes).sort((a,b)=>a[0].localeCompare(b[0]))});
w.nodes.find(n=>n.name==='Plan truthful drafts and exclusions').parameters.jsCode=bundle('phase2-copy-drafting')+`
const q=__load('./phase2-cloud-queue'),rows=q.decode($input.all().map(i=>i.json),${JSON.stringify(require('./build-phase2-cloud').datasets())});
const scope=${JSON.stringify(scope)},universeHash=${JSON.stringify(universeHash)},baseline=${JSON.stringify(baseline)},expected=${JSON.stringify(expected)},now=new Date().toISOString();
const tables={queue:$('Retain queue context').first().json.queue,locks:$('Retain protection context').first().json.locks,inbox:$('Pending Inbox copy context').first().json.inbox,links:$('Pending Inbox links context').first().json.links};
if(rows.length!==409)throw Error('SOURCE_UNIVERSE_CHANGED');
if(q.sourceHash({universe:rows.map(r=>[r.lead_id,q.sourceHash(r)]).sort((a,b)=>a[0].localeCompare(b[0]))})!==universeHash)throw Error('SOURCE_CHANGED_STOP');
for(const [key,prior] of Object.entries(baseline)){if(tables[key].length!==prior.length)throw Error('TABLE_CHANGED_STOP:'+key);for(const old of prior){const r=tables[key].find(x=>x.id===old.id);if(!r||q.sourceHash(Object.fromEntries(Object.entries(r).filter(([k])=>!['id','createdAt','updatedAt'].includes(k))))!==old.hash)throw Error('TABLE_CHANGED_STOP:'+key);}}
const selected=rows.filter(r=>scope.includes(r.lead_id));if(selected.length!==127||selected.some(q.protection))throw Error('HELD_SCOPE_CHANGED');
const plan=arc.plan(selected,tables.queue,tables.locks,{...$('Batch controls').first().json,cap:'ALL'},now,tables.inbox,tables.links),idx=q.indexes(tables.queue,tables.locks,rows,now);
plan.jobs=plan.jobs.filter(j=>{const saved=arc.finish(arc.composeJob(j),now);if(!['DRAFT_READY','DRAFT_READY_SEND_BLOCKED'].includes(saved.state))return false;const match=expected.find(x=>x.lead_id===saved.lead_id);if(!match||match.message_hash!==saved.message_hash||q.blocked(JSON.parse(saved.payload),idx))throw Error('RECOVERY_COPY_CHANGED_STOP');return true;});
if(plan.jobs.length!==11||plan.jobs.filter(j=>!j.previous?.draft_body).length!==8)throw Error('EXACT_ELEVEN_DRAFTS_REQUIRED');
plan.summary={...plan.summary,selected:11,additional_usable_drafts:8,source_writes:0,protected_backend_writes:0,approvals:0,mark_sent:0};return [{json:plan}];`;
const sample=Object.fromEntries(Object.entries(q.COLUMNS).map(([k,t])=>[k,t==='boolean'?false:t==='number'?0:'fixture']));
for(const n of w.nodes){delete n.bundle_entry;delete n.code_suffix;n.output=[{...sample,previous:sample,cas_payload:'fixture',url:'https://sheets.googleapis.com/v4/spreadsheets/fixture/values:batchGet',no_work:false}];if(n.type==='n8n-nodes-base.code')new (Object.getPrototypeOf(async function(){}).constructor)(n.parameters.jsCode);}
w.nodeGroups[1].description='Recover exactly eleven unreviewed drafts, eight additional messages, from existing held research. Compare source and all four review tables before writing; preserve the original exact-content filters. No approval, sending or provider action.';
const result=finish(w);if(result.sdk.length>300000)throw Error('SDK_SIZE_LIMIT:'+result.sdk.length);
fs.writeFileSync(path.join(dir,'backfill.sdk.js'),result.sdk);fs.writeFileSync(path.join(dir,'backfill.json'),JSON.stringify(w));
console.log(JSON.stringify({nodes:w.nodes.length,sdk_bytes:result.sdk.length,unprotected_scope:scope.length,drafts:11,additional:8}));
