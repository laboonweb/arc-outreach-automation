'use strict';
// Stage 1 adapters only. Builds local unpublished clones; performs no network.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..'),DIR=path.join(ROOT,'private/operator-stage1');
const base=require('./build-phase2-cloud'),ib=require('./build-phase2-inbox'),q=require('./phase2-cloud-queue'),inbox=require('./phase2-inbox'),{bundle}=require('./build-workflows');
const read=file=>JSON.parse(fs.readFileSync(path.join(ROOT,file),'utf8'));
const json=v=>JSON.stringify(v);
function fixtures(now,runId){
 const existing=require('./phase2-operator-fixtures').seed(now),research=[],queue=[];
 const labels=['S1 Manual email','S2 Manual social','S3 Australia','S4 Historical source','S5 Sent follow-up','S6 Suppressed','S7 Existing mock draft','S8 Capacity and recovery'];
 for(let i=0;i<8;i++){
  const old=i===4?5:i===6?4:null;
  let source=old!==null?structuredClone(existing.research[old]):{evidence_json:'[]',arc_status:'NEEDS_RESEARCH',tier:'TIER_C_NEEDS_RESEARCH',compliance_status:'REVIEW_REQUIRED'};
  Object.assign(source,{lead_id:'arc_'+crypto.createHash('sha256').update(runId+':'+i).digest('hex'),dataset_id:i===2?'AUSTRALIA':'MANILA_AUDIT_QUEUE',business_name:'Synthetic '+labels[i],country:i===2?'Australia':'Philippines',timezone:i===2?'Australia/Sydney':'Asia/Manila'});
  if(i===3)Object.assign(source,{arc_status:'ALREADY_CONTACTED',first_contact_at:new Date(Date.parse(now)-20*86400000).toISOString(),contact_locked:true,history_notes:'SYNTHETIC prior initial outreach; preserve verbatim.'});
  if(i===5)Object.assign(source,{arc_status:'DO_NOT_CONTACT',suppression_status:'DO_NOT_CONTACT'});
  if(i===1||i===2){const sourceUrl='https://example.org/smoke-'+runId+'-'+i;Object.assign(source,{tier:'TIER_B_VERIFIED_OPPORTUNITY',public_email:i===2?'s3@example.org':'',email_source_url:sourceUrl,email_confidence:'HIGH',facebook_url:i===1?'https://www.facebook.com/arc-smoke-'+runId+'-s2':'',facebook_status:i===1?'USABLE':''});source.evidence_json=json(['identity','activity','opportunity','service',...(i===2?['contact']:[])].map(type=>({type,source_url:sourceUrl,observed_at:now,fact_date:now,verification:'DISCOVERY_VERIFIED',excerpt:type==='identity'?source.business_name+' is the identified business.':type==='activity'?'Dated completed pool maintenance work is published.':type==='opportunity'?'Pool service information is spread across separate posts.':type==='service'?'Pool maintenance services are available.':'Published business contact s3@example.org.'})));}
  let d=old!==null?JSON.parse(existing.queue[old].payload):require('./phase2-draft-metadata').metadata(source,now,q.CAMPAIGN);
  const identity=require('./outreach-mvp').draftIdentity(source,{channel:d.channel,recipient:d.recipient},q.CAMPAIGN,d.step||'initial');
  Object.assign(d,identity,{lead_id:source.lead_id,dataset_id:source.dataset_id,business:source.business_name,country:source.country,timezone:source.timezone,cloud_source_snapshot_hash:q.sourceHash(source)});
  if(old===null)Object.assign(d,{subject:'',draft_body:'',draft_core:''});
  if(i===3)Object.assign(d,{draft_status:'PROTECTED',initial_locked:true,history_contact_at:source.first_contact_at});
  if(i===5)Object.assign(d,{draft_status:'DO_NOT_CONTACT',review_status:'REJECTED',initial_locked:true});
  if(i===6){d.provider_draft_id='MOCK_EXISTING_DRAFT_ONLY';d.provider_receipt={synthetic:true,messageId:'MOCK_EXISTING_DRAFT_ONLY'};}
  if(i===4){d.sent_at=new Date(Date.parse(now)-12*86400000).toISOString();d.followup_due_at=new Date(Date.parse(now)-86400000).toISOString();d.sent_message=d.draft_body;d.synthetic_history_label='SYNTHETIC seeded prior send, never sent by smoke test.';}
  research.push(source);queue.push(q.pack(d));
 }
 const locks=[{identity:research[3].lead_id,kind:'INITIAL_CONTACT_LOCK',reason:'SYNTHETIC historical initial contact only',at:now},{identity:research[5].lead_id,kind:'SUPPRESSED',reason:'SYNTHETIC permanent suppression only',at:now}];
 assert.equal(new Set(queue.map(r=>r.queue_key)).size,8);
 return {synthetic_only:true,now,runId,research,queue,locks};
}
function initialize(){
 fs.mkdirSync(DIR,{recursive:true});const file=path.join(DIR,'config.json');
 if(!fs.existsSync(file)){const runId='20261008-'+crypto.randomBytes(3).toString('hex');fs.writeFileSync(file,json({runId,prefix:'Arc Operator Smoke '+runId,secret:crypto.randomBytes(32).toString('hex'),queue_table:'STAGE1_QUEUE',lock_table:'STAGE1_LOCKS',inbox_table:'STAGE1_INBOX',inbox_links_table:'STAGE1_LINKS',sync_workflow:'STAGE1_SYNC',projectId:'CPU2qIgS09cANFUG'}));fs.writeFileSync(path.join(DIR,'fixtures.json'),json(fixtures(new Date().toISOString(),runId)));}
 return JSON.parse(fs.readFileSync(file,'utf8'));
}
function fixtureRead(state,kind){
 const registry=base.datasets(),headers=['lead_id',...new Set(state.research.flatMap(r=>Object.keys(r)).filter(k=>k!=='lead_id'))];
 return 'const registry='+json(registry)+',records='+json(state.research)+',headers='+json(headers)+';return $input.all().map((item,i)=>{const match=/^https:\\/\\/sheets\\.googleapis\\.com\\/v4\\/spreadsheets\\/([^/?#]+)\\/values:batchGet\\?([^#]*)$/.exec(item.json.url);if(!match)throw Error("SMOKE_UNEXPECTED_FIXTURE_URL");const id=match[1],ranges=match[2].split("&").filter(p=>p.startsWith("ranges=")).map(p=>decodeURIComponent(p.slice(7))),d=registry.find(x=>x.spreadsheet_id===id);if(!d)throw Error("SMOKE_UNEXPECTED_FIXTURE_BOOK");const rows=records.filter(x=>x.dataset_id===d.dataset_id),cells=r=>headers.map(k=>r[k]??"");let valueRanges;'+(kind==='index'?'valueRanges=[{range:"\'Arc Research\'!A1:ZZ1",values:[headers]},{range:"\'Arc Research\'!A2:A"+(rows.length+1),values:rows.map(r=>[r.lead_id])}];':kind==='exact'?'valueRanges=ranges.map((range,j)=>{if(j===0)return {range:"\'Arc Research\'!A1:ZZ1",values:[headers]};const m=/!(\\d+):\\d+$/.exec(range),index=Number(m?.[1])-2;if(!rows[index])throw Error("SMOKE_EXACT_FIXTURE_ROW");return {range:"\'Arc Research\'!A"+(index+2)+":ZZ"+(index+2),values:[cells(rows[index])]};});':'valueRanges=[{range:"\'Arc Research\'!A1:ZZ"+(rows.length+1),values:[headers,...rows.map(cells)]}];')+'return {json:{spreadsheetId:id,valueRanges},pairedItem:{item:i}};});';
}
function replacements(c){
 const old=require('./build-phase2-panel').configuration(),connection=read('private/phase2/composio/connection.json');return [[json(connection),json({connected_account_id:'ca_stage1_mock',account_id:'123',region:'com.au'})],['7a5Sp3jrw5ftfEdn',c.zoho_workflow||'STAGE1_ZOHO'],[old.queue_table,c.queue_table],[old.lock_table,c.lock_table],[old.inbox_table,c.inbox_table],[old.inbox_links_table,c.inbox_links_table],[old.sync_workflow,c.sync_workflow],[old.signing_secret,c.secret],[old.panel_url,'https://briann.app.n8n.cloud/webhook-test/arc-smoke-'+c.runId],[old.action_url,'https://briann.app.n8n.cloud/webhook-test/arc-smoke-'+c.runId+'-action']].filter(([a])=>a);
}
function clone(stem,c,state){
 const w=read('private/operator-lifecycle/'+stem+'-local.json'),before=structuredClone(w),pairs=replacements(c);
 const replace=x=>typeof x==='string'?pairs.reduce((s,[a,b])=>s.split(a).join(b),x):Array.isArray(x)?x.map(replace):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,replace(v)])):x;
 const result=replace(w);result.name=c.prefix+' '+stem;result.active=false;result.settings={...result.settings,saveManualExecutions:stem==='panel',saveDataSuccessExecution:stem==='panel'?'all':'none',saveDataErrorExecution:'none',executionTimeout:180};
 delete result.id;delete result.versionId;delete result.activeVersion;delete result.activeVersionId;delete result.pinData;
 for(const n of result.nodes){
  if(n.type==='n8n-nodes-base.httpRequest'){
   let js=n.name==='Composio CREATE_DRAFT only'?'const r=$input.first().json;if(r.request?.arguments?.mode!=="draft")throw Error("SMOKE_DRAFT_ONLY_REQUIRED");const lead=$("Reserve approved provider claim").first().json;if(!'+json(state.research.map(x=>x.lead_id))+'.includes(lead.lead_id))throw Error("SMOKE_PROVIDER_ID_NOT_ALLOWLISTED");return [{json:lead.business_name.includes("S3")?{successful:true,data:{}}:{successful:true,data:{messageId:"MOCK_"+lead.lead_id.slice(-12)},smoke_mock:true}}];':fixtureRead(state,n.name.includes('index')?'index':n.name.includes('exact')?'exact':'all');
   n.type='n8n-nodes-base.code';n.typeVersion=2;n.parameters={mode:'runOnceForAllItems',jsCode:js};delete n.credentials;delete n.onError;delete n.retryOnFail;
  }
  if(n.type==='n8n-nodes-base.webhook'){n.parameters.path='arc-smoke-'+c.runId+(n.parameters.httpMethod==='POST'?'-action':'');assert.equal(n.parameters.authentication,'basicAuth');assert.ok(n.credentials?.httpBasicAuth);}
  if(n.name==='Render operator panel')n.parameters.jsCode=n.parameters.jsCode.replace('html:arc.render','html:"<div style=\\"padding:16px;background:#fff3b0;color:#222\\">SYNTHETIC STAGE 1 ONLY. No real outreach.</div>"+arc.render');
  if(n.parameters?.jsCode)new (Object.getPrototypeOf(async function(){}).constructor)(n.parameters.jsCode);
 }
 assert.deepEqual(result.connections,before.connections);
 const deny=['YIdEUIQrlv6fvfrs','0PCxcIhjgfMIUsKx','LuAliUIL44hW2inO','HOuSU0YrbbMxYVyP','Z3k7nFGP0uJOXRLO','7a5Sp3jrw5ftfEdn','pKhUbAxQ1lefPvd3','api.composio'];for(const id of deny)assert.ok(!json(result).includes(id),'SMOKE_PRODUCTION_REFERENCE:'+id);
 assert.ok(result.nodes.every(n=>n.type!=='n8n-nodes-base.httpRequest'));
 for(const n of result.nodes.filter(n=>n.type==='n8n-nodes-base.dataTable'))assert.ok([c.queue_table,c.lock_table,c.inbox_table,c.inbox_links_table].includes(n.parameters.dataTableId.value));
 return {workflow:result,diffs:result.nodes.filter(n=>json(n)!==json(before.nodes.find(x=>x.name===n.name))).map(n=>({name:n.name,type:n.type}))};
}
function control(c,state){
 const w={name:c.prefix+' control',active:false,nodes:[],connections:{},settings:{...base.SETTINGS,saveManualExecutions:false,saveDataErrorExecution:'none',saveDataSuccessExecution:'none'}},add=n=>(w.nodes.push(n),n),edge=(a,b,index=0)=>{w.connections[a]||={main:[]};w.connections[a].main[index]||=[];w.connections[a].main[index].push({node:b,type:'main',index:0});};
 add(base.manual());add(base.code('Smoke control intent','return [{json:{mode:"SEED",workbook_index:0,phase:"before"}}];'));edge('Run manually','Smoke control intent');
 const gate=add({...ib.sync({}).workflow.nodes.find(n=>n.name==='Run manually'),name:'Seed synthetic fixtures?',type:'n8n-nodes-base.if',typeVersion:2.3,parameters:{conditions:{options:{typeValidation:'strict',version:2},conditions:[{leftValue:'={{ $json.mode === "SEED" }}',operator:{type:'boolean',operation:'true'},rightValue:true}],combinator:'and'},options:{}}});edge('Smoke control intent',gate.name);
 const table=(name,id,cols)=>add(base.table(name,id,'insert',{columns:ib.mapper(cols)}));
 add(base.code('Emit exactly eight synthetic leads','return '+json(state.queue)+'.map(json=>({json}));'));edge(gate.name,'Emit exactly eight synthetic leads');
 table('Seed synthetic Queue',c.queue_table,q.COLUMNS);edge('Emit exactly eight synthetic leads','Seed synthetic Queue');
 add(base.code('Emit exactly two synthetic protections','if($input.all().length!==8)throw Error("SMOKE_SEED_QUEUE_COUNT");return '+json(state.locks)+'.map(json=>({json}));'));edge('Seed synthetic Queue','Emit exactly two synthetic protections');
 table('Seed synthetic protections',c.lock_table,{identity:'string',kind:'string',reason:'string',at:'string'});edge('Emit exactly two synthetic protections','Seed synthetic protections');
 add(base.code('Emit exactly eight Inbox projections',bundle('phase2-inbox')+'if($input.all().length!==2)throw Error("SMOKE_SEED_LOCK_COUNT");return $("Seed synthetic Queue").all().map(i=>({json:arc.project(i.json)}));'));edge('Seed synthetic protections','Emit exactly eight Inbox projections');
 table('Seed synthetic Inbox',c.inbox_table,inbox.COLUMNS);edge('Emit exactly eight Inbox projections','Seed synthetic Inbox');
 add(base.code('Emit exactly eight matching links',bundle('phase2-inbox')+'const queue=$("Seed synthetic Queue").all().map(i=>i.json),rows=$input.all().map(i=>i.json);if(rows.length!==8)throw Error("SMOKE_SEED_INBOX_COUNT");return queue.map(r=>{const view=arc.project(r),matches=rows.filter(x=>x.business_name===view.business_name&&x.channel===view.channel&&x.contact===view.contact);if(matches.length!==1)throw Error("SMOKE_SEED_ASSOCIATION");return {json:{queue_key:r.queue_key,inbox_id:matches[0].id,snapshot:JSON.stringify(view),backend_hash:arc.digest(r)}};});'));edge('Seed synthetic Inbox','Emit exactly eight matching links');
 table('Seed synthetic links',c.inbox_links_table,inbox.LINK_COLUMNS);edge('Emit exactly eight matching links','Seed synthetic links');
 add(base.code('Seed receipt','if($input.all().length!==8)throw Error("SMOKE_SEED_LINK_COUNT");return [{json:{synthetic_only:true,queue:8,inbox:8,links:8,protections:2,row_mutations:26}}];'));edge('Seed synthetic links','Seed receipt');
 // Never bring whole source grids into the trial execution process again.
 // Independent external integrity verification is a separate release gate.
 w.connections[gate.name].main[0]=[];
 let previous=gate.name;const guardNames=[];
 for(const [role,id]of [['Queue',c.queue_table],['protections',c.lock_table],['Inbox',c.inbox_table],['links',c.inbox_links_table]]){
  const name='Check empty synthetic '+role;add(base.table(name,id,'get',{returnAll:false,limit:1}));edge(previous,name);previous=name;guardNames.push(name);
 }
 const guard=add(base.code('Guard one-time synthetic seed','if($("Smoke control intent").first().json.mode!=="SEED")throw Error("SMOKE_SEED_INTENT_REQUIRED");for(const name of '+json(guardNames)+')if($(name).all().some(i=>i.json.id!==undefined))throw Error("SMOKE_TABLES_NOT_EMPTY_DO_NOT_RESEED");return [{json:{synthetic_only:true,seed_allowed:true}}];'));
 edge(previous,guard.name);edge(guard.name,'Emit exactly eight synthetic leads');
 w.settings={...w.settings,saveManualExecutions:true,saveDataErrorExecution:'all',saveDataSuccessExecution:'all',executionTimeout:60};
 w.nodeGroups=[{name:'Check empty synthetic tables',nodeNames:['Smoke control intent',gate.name,...guardNames,guard.name],description:'Read at most one row per staging table. Stop before inserts if any data already exists.'},{name:'Seed only 26 synthetic rows',nodeNames:w.nodes.slice(3,12).map(n=>n.name),description:'Eight allowlisted Queue/Inbox/Links rows and two synthetic protections. No source or provider calls.'}];
 for(let i=0;i<w.nodes.length;i++)w.nodes[i].position=[i*230,0];return w;
}
function hints(sdk){return sdk.replace(/const fixtureOutput=(\[[^\n]+\]);/,(_,raw)=>'const fixtureOutput='+json(JSON.parse(raw).map(x=>({...x,mode:'SEED',identity:'synthetic',kind:'SUPPRESSED',reason:'synthetic',at:'2026-10-08T00:00:00Z'})))+';');}
function build(){const c=initialize(),state=JSON.parse(fs.readFileSync(path.join(DIR,'fixtures.json'),'utf8')),manifest=[];for(const stem of ['panel','zoho','sync','control']){
 const result=stem==='control'?{workflow:control(c,state),diffs:[]}:clone(stem,c,state),w=result.workflow;fs.writeFileSync(path.join(DIR,stem+'.json'),json(w));
 const sdk=hints(require('./workflow-sdk-compact').compact(w));fs.writeFileSync(path.join(DIR,stem+'.sdk.js'),sdk);
 const skeleton=structuredClone(w);for(const n of skeleton.nodes)if(n.parameters?.jsCode)n.parameters.jsCode='throw Error("STAGE1_SETUP_INCOMPLETE");';const setupSdk=hints(require('./workflow-sdk-compact').compact(skeleton));fs.writeFileSync(path.join(DIR,stem+'-setup.sdk.js'),setupSdk);
 manifest.push({stem,name:w.name,nodes:w.nodes.length,sdk_characters:sdk.length,setup_sdk_characters:setupSdk.length,diffs:result.diffs,active:false,published:false});
 }fs.writeFileSync(path.join(DIR,'adapters.json'),json(manifest));return manifest;}
module.exports={initialize,fixtures,fixtureRead,clone,control,build};if(require.main===module)console.log(build().map(({stem,nodes,sdk_characters,setup_sdk_characters})=>({stem,nodes,sdk_characters,setup_sdk_characters})));
