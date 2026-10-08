'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {bundle}=require('./build-workflows');
const SETTINGS={executionOrder:'v1',timezone:'Asia/Manila',saveManualExecutions:false,saveDataSuccessExecution:'none',saveDataErrorExecution:'none',executionTimeout:180};
const GOOGLE={id:'UQzrFhk94U9e5MyD',name:'Google Sheets account'};
function code(name,jsCode){return {name,type:'n8n-nodes-base.code',typeVersion:2,parameters:{mode:'runOnceForAllItems',jsCode},...(name==='Compare source hashes'?{output:[{identity:'source',kind:'INTEGRITY_BASELINE',reason:'fixture-hash',at:'2026-10-06T00:00:00Z'}]}:{})};}
function manual(){return {name:'Run manually',type:'n8n-nodes-base.manualTrigger',typeVersion:1,parameters:{}};}
function read(name,url){return {name,type:'n8n-nodes-base.httpRequest',typeVersion:4.2,parameters:{method:'GET',url,authentication:'predefinedCredentialType',nodeCredentialType:'googleSheetsOAuth2Api',options:{timeout:60000,allowUnauthorizedCerts:false,redirect:{redirect:{followRedirects:false}},batching:{batch:{batchSize:1,batchInterval:300}},response:{response:{responseFormat:'json'}}}},credentials:{googleSheetsOAuth2Api:GOOGLE},retryOnFail:false};}
function serialize(value){
 if(typeof value==='string'&&value.startsWith('={{'))return 'expr('+JSON.stringify(value.slice(1))+')';
 if(Array.isArray(value))return '['+value.map(serialize).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.entries(value).filter(([,v])=>v!==undefined).map(([k,v])=>JSON.stringify(k)+':'+serialize(v)).join(',')+'}';
 return JSON.stringify(value);
}
function linear(name,nodes,groups=[]){
 const connections={};nodes.forEach((n,i)=>{n.position=[i*240,0];if(i<nodes.length-1)connections[n.name]={main:[[{node:nodes[i+1].name,type:'main',index:0}]]};});
 let sdk="import {workflow,node,trigger,expr} from '@n8n/workflow-sdk';\n";
 sdk+=nodes.map((n,i)=>'const stage'+i+' = '+(n.type.endsWith('.manualTrigger')?'trigger':'node')+'({type:'+JSON.stringify(n.type)+',version:'+n.typeVersion+',config:'+serialize({...n,type:undefined,typeVersion:undefined,position:undefined,output:undefined})+',output:'+JSON.stringify(n.output||[{}])+'});').join('\n');
 sdk+='\nexport default workflow('+JSON.stringify(name.toLowerCase().replace(/\W+/g,'-'))+','+JSON.stringify(name)+').add(stage0)'+nodes.slice(1).map((_,i)=>'.to(stage'+(i+1)+')').join('');
 for(const g of groups)sdk+='.group('+JSON.stringify(g.name)+',['+g.indices.map(i=>'stage'+i).join(',')+'],{description:'+JSON.stringify(g.description)+'})';
 sdk+=';';return {workflow:{name,active:false,nodes,connections,settings:SETTINGS},sdk};
}
function datasets(){return JSON.parse(fs.readFileSync(path.join(__dirname,'../config/datasets.json'),'utf8')).datasets.map(({dataset_id,spreadsheet_id,country})=>({dataset_id,spreadsheet_id,country}));}
function researchRequests(registry=datasets()){return registry.map(d=>({dataset_id:d.dataset_id,url:'https://sheets.googleapis.com/v4/spreadsheets/'+d.spreadsheet_id+'/values:batchGet?ranges='+encodeURIComponent("'Arc Research'")+'&valueRenderOption=UNFORMATTED_VALUE'}));}
function inspector(){
 return linear('Arc | Phase 2 | Draft Queue',[
 manual(),{...code('Prepare Arc Research reads','return '+JSON.stringify(researchRequests())+'.map(json=>({json}));'),output:[{url:'https://sheets.googleapis.com/v4/spreadsheets/example/values:batchGet',dataset_id:'AUSTRALIA'}]},
 read('Read three Arc Research tabs','={{ $json.url }}'),
 code('Inspect current qualified pool',bundle('phase2-cloud-queue')+'return [{json:arc.inspect($input.all().map(i=>i.json),'+JSON.stringify(datasets())+')}];')
 ],[{name:'Research intake',indices:[1,2,3],description:'Read Arc Research only and inspect eligibility. No source or queue writes.'}]);
}
function save(result,stem){const dir=path.join(__dirname,'../private/phase2/cloud');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,stem+'.json'),JSON.stringify(result.workflow,null,2));fs.writeFileSync(path.join(dir,stem+'.sdk.js'),result.sdk);return dir;}
function table(name,id,operation='get',parameters={}){
 const common={resource:'row',operation,dataTableId:{__rl:true,mode:'list',value:id,cachedResultName:name.includes('protection')?'Arc Phase 2 Protection Ledger':'Arc Phase 2 Review Queue'}};
 return {name,type:'n8n-nodes-base.dataTable',typeVersion:1.1,parameters:{...common,...(operation==='get'?{returnAll:true}:{}),...parameters},...(operation==='get'?{alwaysOutputData:true,executeOnce:true}:{})};
}
function columns(){return {mappingMode:'defineBelow',value:Object.fromEntries(Object.keys(require('./phase2-cloud-queue').COLUMNS).map(k=>[k,'={{ $json.'+k+' }}'])),schema:Object.entries(require('./phase2-cloud-queue').COLUMNS).map(([id,type])=>({id,displayName:id,required:false,defaultMatch:false,display:true,type,canBeUsedToMatch:true}))};}
function intake(c){return [manual(),{...code('Batch controls','return [{json:'+JSON.stringify(c)+'}];'),output:[c]},
 table('Read durable review queue',c.queue_table),
 code('Retain queue context','return [{json:{queue:$input.all().map(i=>i.json).filter(r=>r.queue_key)}}];'),
 table('Read protection ledger',c.lock_table),
 code('Retain protection context','return [{json:{locks:$input.all().map(i=>i.json).filter(r=>r.identity)}}];'),
 {...code('Prepare Arc Research reads','return '+JSON.stringify(researchRequests())+'.map(json=>({json}));'),output:[{url:researchRequests()[0].url}]},
 read('Read three Arc Research tabs','={{ $json.url }}')];}
function queue(c){
 return linear('Arc | Phase 2 | Draft Queue',[...intake(c),
 code('Plan truthful drafts and exclusions',bundle('phase2-cloud-queue')+'const rows=arc.decode($input.all().map(i=>i.json),'+JSON.stringify(datasets())+');return [{json:arc.plan(rows,$("Retain queue context").first().json.queue,$("Retain protection context").first().json.locks,$("Batch controls").first().json)}];'),
 {...code('Emit queue upserts','return $input.first().json.writes.map(json=>({json,pairedItem:{item:0}}));'),output:[Object.fromEntries(Object.entries(require('./phase2-cloud-queue').COLUMNS).map(([k,t])=>[k,t==='boolean'?false:t==='number'?0:'fixture']))]},
 table('Upsert review queue',c.queue_table,'upsert',{matchType:'allConditions',filters:{conditions:[{keyName:'queue_key',condition:'eq',keyValue:'={{ $json.queue_key }}'}]},columns:columns()}),
 code('Queue result','const plan=$("Plan truthful drafts and exclusions").first().json;const rows=$input.all();if(rows.length!==plan.writes.length)throw new Error("QUEUE_WRITE_COUNT_MISMATCH");return [{json:{...plan.summary,queue_rows_written:rows.length,sent:false,followup_due_at:null}}];')
 ],[{name:'Cloud intake',indices:[1,2,3,4,5,6,7],description:'Read Cloud approvals, locks and three Arc Research tabs. Source workbooks stay read-only.'},{name:'Evidence and review queue',indices:[8,9,10,11],description:'Create truthful drafts, protect existing work and upsert unreviewed queue items. No provider action.'}]);
}
function reviewer(c){return linear('Arc | Phase 2 | Review actions and follow-ups',[...intake(c),
 code('Validate review actions',bundle('phase2-cloud-review')+'const q=__load("./phase2-cloud-queue");const rows=q.decode($input.all().map(i=>i.json),'+JSON.stringify(datasets())+');return [{json:arc.process(rows,$("Retain queue context").first().json.queue,$("Retain protection context").first().json.locks,$("Batch controls").first().json)}];'),
 {...code('Emit reviewed updates','return $input.first().json.writes.map(json=>({json,pairedItem:{item:0}}));'),output:[Object.fromEntries(Object.entries(require('./phase2-cloud-queue').COLUMNS).map(([k,t])=>[k,t==='boolean'?false:t==='number'?0:'fixture']))]},
 table('Save review actions',c.queue_table,'upsert',{matchType:'allConditions',filters:{conditions:[{keyName:'queue_key',condition:'eq',keyValue:'={{ $json.queue_key }}'}]},columns:columns()}),
 code('Review action result','const p=$("Validate review actions").first().json;return [{json:{...p.summary,errors:p.errors,due:p.due,queue_rows_written:$input.all().length}}];')
 ],[{name:'Cloud intake',indices:[1,2,3,4,5,6,7],description:'Read current research, protections and review decisions. No research writes.'},{name:'Manual review and recorded sends',indices:[8,9,10,11],description:'Apply explicit approval, editing and MARK_SENT. Reuse follow-up policy. No provider or send action.'}]);}
function handoff(c,connection){
 const names=[...intake(c),
 code('Select one explicitly approved email',bundle('phase2-cloud-review')+'const q=__load("./phase2-cloud-queue");const rows=q.decode($input.all().map(i=>i.json),'+JSON.stringify(datasets())+');return arc.claim(rows,$("Retain queue context").first().json.queue,$("Retain protection context").first().json.locks,$("Batch controls").first().json,$execution.id,'+JSON.stringify(connection)+').map(json=>({json}));'),
 table('Reserve approved provider claim',c.queue_table,'update',{matchType:'allConditions',filters:{conditions:[{keyName:'queue_key',condition:'eq',keyValue:'={{ $json.queue_key }}'},{keyName:'state',condition:'eq',keyValue:'={{ $json.cas.state }}'},{keyName:'review_status',condition:'eq',keyValue:'APPROVED'},{keyName:'payload',condition:'eq',keyValue:'={{ $json.cas.payload }}'},{keyName:'draft_body',condition:'eq',keyValue:'={{ $json.cas.body }}'},{keyName:'subject',condition:'eq',keyValue:'={{ $json.cas.subject }}'},{keyName:'recipient',condition:'eq',keyValue:'={{ $json.cas.recipient }}'}]},columns:columns()}),
 code('Verify persisted exact-content claim',bundle('phase2-cloud-review')+'const rows=$input.all();if(rows.length!==1)throw new Error("ONE_PERSISTED_CLAIM_REQUIRED");return [{json:arc.request(rows[0].json,'+JSON.stringify(connection)+',$execution.id)}];'),
 {name:'Composio CREATE_DRAFT only',type:'n8n-nodes-base.httpRequest',typeVersion:4.2,parameters:{method:'POST',url:require('./composio-zoho').ENDPOINT,authentication:'genericCredentialType',genericAuthType:'httpHeaderAuth',sendBody:true,contentType:'json',specifyBody:'json',jsonBody:'={{ $json.request }}',options:{timeout:30000,allowUnauthorizedCerts:false,redirect:{redirect:{followRedirects:false}},response:{response:{neverError:true,responseFormat:'json'}}}},credentials:{httpHeaderAuth:{id:'pKhUbAxQ1lefPvd3',name:'Composio API'}},retryOnFail:false,onError:'continueRegularOutput'},
 code('Record unsent provider receipt',bundle('phase2-cloud-review')+'return [{json:arc.receipt($("Reserve approved provider claim").first().json,$("Verify persisted exact-content claim").first().json,$input.first().json)}];'),
 table('Persist provider result',c.queue_table,'update',{matchType:'allConditions',filters:{conditions:[{keyName:'queue_key',condition:'eq',keyValue:'={{ $json.queue_key }}'},{keyName:'state',condition:'eq',keyValue:'CLAIMED'},{keyName:'claim_execution',condition:'eq',keyValue:'={{ $json.claim_execution }}'}]},columns:columns()}),
 code('Unsent Zoho result','return $input.all().map(i=>({json:{state:i.json.state,provider_draft_id:i.json.provider_draft_id,sent:i.json.sent,sent_at:i.json.sent_at,followup_due_at:i.json.followup_due_at}}));')];
 names[8].output=[{...Object.fromEntries(Object.entries(require('./phase2-cloud-queue').COLUMNS).map(([k,t])=>[k,t==='boolean'?false:t==='number'?0:'fixture'])),cas:{state:'APPROVED',payload:'fixture',body:'fixture',subject:'fixture',recipient:'fixture'}}];
 names[8].output[0].cas={...names[8].output[0].cas,reviewer:'Fixture reviewer',compliance_basis:'Fixture evidence',compliance_status:'SAFE_TO_REVIEW'};
 names[9].parameters.filters.conditions.push(...['truthful','recipient_relevant','consent_reviewed','suppression_checked'].map(keyName=>({keyName,condition:'isTrue'})),...['reviewer','compliance_basis','compliance_status'].map(keyName=>({keyName,condition:'eq',keyValue:'={{ $json.cas.'+keyName+' }}'})));
 names[10].output=[{request:{arguments:{mode:'draft',mailFormat:'html'}},draft_key:'fixture',message_hash:'fixture',claimed_at:'2026-10-06T00:00:00Z'}];
 names[12].output=[Object.fromEntries(Object.entries(require('./phase2-cloud-queue').COLUMNS).map(([k,t])=>[k,t==='boolean'?false:t==='number'?0:'fixture']))];
 return linear('Arc | Phase 2 | Approved Zoho handoff',names,[{name:'Cloud approval intake',indices:[1,2,3,4,5,6,7],description:'Read current source protection and approvals. Select at most one email.'},{name:'Approved unsent provider draft',indices:[8,9,10,11,12,13,14],description:'Reserve the exact approved content, CREATE_DRAFT only, store receipt. Never set SENT.'}]);
}
function integrity(c,index=0){
 const registry=JSON.parse(fs.readFileSync(path.join(__dirname,'../config/datasets.json'),'utf8')).datasets;
 const requests=registry.slice(index,index+1).map(d=>({url:'https://sheets.googleapis.com/v4/spreadsheets/'+d.spreadsheet_id+'/values:batchGet?valueRenderOption=FORMULA&dateTimeRenderOption=SERIAL_NUMBER&'+[d.primary_sheet,...Object.keys(d.supplemental_sheets),...d.reference_sheets].map(title=>'ranges='+encodeURIComponent("'"+title.replace(/'/g,"''")+"'")).join('&')}));
 return linear('Arc | Phase 2 | Source integrity validation',[manual(),table('Read protection ledger',c.lock_table),code('Retain integrity baseline','return [{json:{baselines:$input.all().map(i=>i.json).filter(r=>r.kind==="INTEGRITY_BASELINE")}}];'),{...code('Prepare source-only grids','return '+JSON.stringify(requests)+'.map(json=>({json}));'),output:[requests[0]]},read('Read source values and formats','={{ $json.url }}'),
 code('Compare source hashes','const crypto=require("crypto"),seen=new Set(),baselines=$("Retain integrity baseline").first().json.baselines;const rows=$input.all().map(i=>{const r=i.json.body||i.json;if(r.error)return {identity:"PHASE2_INTEGRITY_ERROR",kind:"INTEGRITY_ERROR",reason:JSON.stringify({code:r.error.code,message:String(r.error.message).slice(0,300)}),at:new Date().toISOString()};if(!r.spreadsheetId||!Array.isArray(r.valueRanges)||r.valueRanges.some(v=>v.range.includes("Arc Research"))||seen.has(r.spreadsheetId))throw new Error("SOURCE_ONLY_VALUES_REQUIRED");seen.add(r.spreadsheetId);const digest=crypto.createHash("sha256").update(JSON.stringify(r.valueRanges)).digest("hex"),identity="PHASE2_SOURCE_VALUES:"+r.spreadsheetId,old=baselines.find(b=>b.identity===identity);if(old&&old.reason!==digest)throw new Error("SOURCE_VALUES_OR_FORMULAS_CHANGED");return {identity:old?"PHASE2_CHECK_VALUES:"+r.spreadsheetId:identity,kind:old?"INTEGRITY_VERIFIED":"INTEGRITY_BASELINE",reason:digest,at:new Date().toISOString()};});if(rows.length!==1)throw new Error("ONE_SOURCE_WORKBOOK_REQUIRED");return rows.map(json=>({json}));'),
 table('Record source hash validation',c.lock_table,'upsert',{matchType:'allConditions',filters:{conditions:[{keyName:'identity',condition:'eq',keyValue:'={{ $json.identity }}'}]},columns:{mappingMode:'defineBelow',value:{identity:'={{ $json.identity }}',kind:'={{ $json.kind }}',reason:'={{ $json.reason }}',at:'={{ $json.at }}'},schema:['identity','kind','reason','at'].map(id=>({id,displayName:id,type:'string',required:false,display:true}))}})
 ]);
}
function migration(c,sourceById){
 return linear('Arc | Phase 2 | Existing review migration',[
 manual(),table('Read existing review state',c.queue_table),
 {...code('Preserve unsent review source baseline','const sourceHashes='+JSON.stringify(sourceById)+';return $input.all().filter(i=>sourceHashes[i.json.lead_id]).map(i=>{const row=i.json,d=JSON.parse(row.payload);if(d.review_status!=="UNREVIEWED"||d.draft_status!=="DRAFT_READY"||d.provider_status||d.sent_at||d.initial_locked)throw new Error("UNREVIEWED_UNSENT_MIGRATION_ONLY");const old=row.payload;d.cloud_source_snapshot_hash=sourceHashes[d.lead_id];return {json:{...row,payload:JSON.stringify(d),previous_payload:old}};});'),output:[{queue_key:'fixture',payload:'fixture',previous_payload:'fixture'}]},
 table('Annotate existing review item',c.queue_table,'update',{matchType:'allConditions',filters:{conditions:[{keyName:'queue_key',condition:'eq',keyValue:'={{ $json.queue_key }}'},{keyName:'payload',condition:'eq',keyValue:'={{ $json.previous_payload }}'}]},columns:{mappingMode:'defineBelow',value:{payload:'={{ $json.payload }}'},schema:[{id:'payload',displayName:'payload',type:'string',required:false,display:true}]}})
 ]);
}
module.exports={SETTINGS,GOOGLE,code,manual,read,linear,datasets,researchRequests,inspector,save,table,columns,intake,queue,reviewer,handoff,integrity,migration};
if(require.main===module){const c=JSON.parse(fs.readFileSync(process.argv[2]||'private/phase2/cloud/config.json','utf8'));const reviews=c.mode==='PRODUCTION'?{...c,cap:'ALL'}:c;save(queue(c),'draft-queue');save(reviewer(reviews),'review-actions');const connection=JSON.parse(fs.readFileSync('private/phase2/composio/connection.json','utf8'));save(handoff(reviews,connection),'approved-zoho');console.log('Generated Cloud Phase 2 workflows. No network requests or queue mutations.');}
