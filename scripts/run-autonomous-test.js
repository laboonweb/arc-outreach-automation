'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {runDiscovery}=require('./discovery-engine'),{verifyDiscovery}=require('./discovery-verifier'),{runResearch}=require('./research-engine');
const {exaTransport}=require('./discovery-transport'),{safeGet}=require('./safe-http'),{protectedReason}=require('./autonomous-discovery');
const {integrity,controls}=require('./run-operational-routing');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'private/autonomous-research');
function check(){const baseline=JSON.parse(fs.readFileSync(path.join(dir,'baseline.json')));for(const [f,h] of Object.entries(baseline.hashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex'),h,'FROZEN_COMPONENT_CHANGED:'+f);return integrity();}
function routing(result){return result.research_required?'NEEDS_MANUAL_RESEARCH':(result.contact_route_type==='EMAIL'?'READY_FOR_DRAFT_TIER_':'MANUAL_SOCIAL_TIER_')+(result.commercial_basis==='TIER_A_VERIFIED_GAP'?'A':'B');}
async function run({limit=30,replay=false}={}){
 throw Error('AUTHENTICATED_V2_REQUIRES_N8N_NATIVE_HTTP: use the inactive research worker with existing Header Auth credentials. Anonymous MCP and cached replay are not valid authenticated benchmark runs.');
 const selection=JSON.parse(fs.readFileSync(path.join(dir,'selection.json')));assert.equal(selection.cases.length,30);fs.mkdirSync(path.join(dir,'results'),{recursive:true});fs.mkdirSync(path.join(dir,'public-observations'),{recursive:true});
 const live=JSON.parse(fs.readFileSync(path.join(dir,'live-baseline.json')));assert.equal(live.leads.length,30);assert.deepEqual(selection.cases.map(r=>r.lead_id).sort(),live.leads.map(r=>r.lead_id).sort());
 const guard=path.join(dir,'RUNNING');const fd=fs.openSync(guard,'wx');fs.writeSync(fd,String(process.pid));let done=0;
 try{check();for(const selected of selection.cases){
  if(done>=limit)break;const outPath=path.join(dir,'results',selected.lead_id+'.json');if(fs.existsSync(outPath)&&!replay)continue;
  const fresh=live.leads.find(r=>r.lead_id===selected.lead_id);if(protectedReason(fresh))throw Error('FRESH_PROTECTED_STATUS:'+fresh.lead_id);
  const local=controls();if(local.drafts.some(d=>d.lead_id===selected.lead_id&&(d.provider_draft_id||d.sent_at||d.review_status!=='UNREVIEWED'))||local.suppression.some(s=>s.identity==='lead:'+selected.lead_id)||local.contact_locks.some(s=>s.identity==='lead:'+selected.lead_id))throw Error('LOCAL_REVIEW_LOCK');
  const row={...selected,...fresh,routing:'NEEDS_MANUAL_RESEARCH'},now=new Date().toISOString(),before=JSON.stringify(row),cachePath=path.join(dir,'public-observations',row.lead_id+'.json');
  const cache=replay?JSON.parse(fs.readFileSync(cachePath)):[],observed=[];let cursor=0;
  const config={discovery:{enabled:true,provider_approved:true,mode:'AUTONOMOUS_V2'}};
  let discovery;
  if(replay){const engine=require('./autonomous-discovery'),state=engine.start(row,config,cache[0]?.observed_at||now);for(const old of cache){state.requests++;if(old.request.kind==='SEARCH')state.searches++;else state.reads++;state.pending={...old.request,attempt:state.requests};engine.consume(state,old.response);}discovery=engine.finish(state);}
  else discovery=await runDiscovery(row,config,async request=>{
   if(cursor++)await new Promise(resolve=>setTimeout(resolve,1000));let response;
   try{response=request.kind==='ORIGIN'?await safeGet(request.target_url):await exaTransport(request);}catch(e){response={error:{code:e.code||'NETWORK_ERROR',message:e.message||'Network request failed'}};}
   observed.push({request:{kind:request.kind,target_url:request.target_url||'',query:request.body?.params?.arguments?.query||''},response,observed_at:new Date().toISOString()});
   fs.writeFileSync(cachePath,JSON.stringify(observed));return response;
  },now);
  const verified=verifyDiscovery(discovery),result=await runResearch(verified.lead,verified.config,()=>{throw Error('SECOND_CRAWL_BLOCKED');},now);
  assert.equal(JSON.stringify(row),before,'INPUT_MUTATION');assert.equal(result.email_draft,'');assert.equal(result.dm_draft,'');assert.ok(discovery.discovery.requests<=9);check();
  const report={lead_id:row.lead_id,business:row.business_name,dataset:row.dataset_id,before:'NEEDS_MANUAL_RESEARCH',after:routing(result),result,discovery:discovery.discovery,completed_at:new Date().toISOString(),replay};fs.writeFileSync(outPath,JSON.stringify(report,null,2));done++;
  console.log(JSON.stringify({completed:fs.readdirSync(path.join(dir,'results')).filter(f=>f.endsWith('.json')).length,business:row.business_name,after:report.after,searches:discovery.discovery.searches,pages:discovery.discovery.pages_fetched,errors:discovery.discovery.errors.length}));
  if(!replay&&discovery.discovery.provider_status==='PROVIDER_PAUSED'){console.log('BATCH_PAUSED_PROVIDER_UNAVAILABLE');break;}
 }}finally{fs.closeSync(fd);fs.unlinkSync(guard);}return done;
}
if(require.main===module){const limit=Number(process.argv.find(a=>a.startsWith('--limit='))?.split('=')[1]||30);run({limit,replay:process.argv.includes('--replay')}).catch(e=>{console.error(e.stack);process.exitCode=1;});}
module.exports={run,routing,check};
