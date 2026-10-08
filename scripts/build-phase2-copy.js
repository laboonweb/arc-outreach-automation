'use strict';
const fs=require('node:fs'),path=require('node:path');
const base=require('./build-phase2-cloud'),inbox=require('./build-phase2-inbox'),{bundle}=require('./build-workflows');
const copy=require('./outreach-copy');
const dir=path.join(__dirname,'../private/phase2/copy-quality');
function edge(w,from,to,index=0){w.connections[from]||={main:[]};w.connections[from].main[index]||=[];w.connections[from].main[index].push({node:to,type:'main',index:0});}
function gate(name,expression){return {name,type:'n8n-nodes-base.if',typeVersion:2.3,parameters:{conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict',version:2},conditions:[{leftValue:expression,rightValue:true,operator:{type:'boolean',operation:'true'}}],combinator:'and'},options:{}}};}
function worker(){
 const w={name:'Arc | Phase 2 | Grounded copy worker',active:false,nodes:[
  {name:'Draft input',type:'n8n-nodes-base.executeWorkflowTrigger',typeVersion:1.2,parameters:{inputSource:'passthrough'}},
  base.code('Compose from verified facts',bundle('phase2-copy-drafting')+'const items=$input.all();if(items.length!==1||!items[0].json.d||items[0].json.needs_draft&&!items[0].json.evidence)throw new Error("ONE_CLEAN_JOB_REQUIRED");return [{json:arc.composeJob(items[0].json)}];'),
  base.code('Finish validated copy',bundle('phase2-copy-drafting')+'return [{json:arc.finish($input.first().json)}];')
 ],connections:{},settings:{...base.SETTINGS,executionTimeout:30}};
 edge(w,'Draft input','Compose from verified facts');edge(w,'Compose from verified facts','Finish validated copy');
 w.nodes.forEach((n,i)=>{n.position=[i*230,0];n.output=[{needs_draft:true,evidence:{},queue_key:'fixture',previous:null}];});
 w.nodeGroups=[{name:'Grounded zero-cost composer',nodeNames:['Compose from verified facts','Finish validated copy'],description:'Two local attempts using verified facts and reviewed website journeys. Validate before return. No model, APIs, queue writes or sending.'}];
 const result=inbox.finish(w),shared=bundle('phase2-copy-drafting');
 for(const n of w.nodes.filter(n=>n.parameters.jsCode?.startsWith(shared)))result.sdk=result.sdk.replace(JSON.stringify(n.parameters.jsCode),'sharedCopyBundle+'+JSON.stringify(n.parameters.jsCode.slice(shared.length)));
 result.sdk='const sharedCopyBundle='+JSON.stringify(shared)+';\n'+result.sdk;return result;
}
function patchQueue(original,c,workerId){
 const w=structuredClone(original.workflow||original);w.active=false;
 const extra=[base.table('Read pending Inbox copy',c.inbox_table),base.code('Pending Inbox copy context','return [{json:{inbox:$input.all().map(i=>i.json).filter(r=>r.id)}}];'),base.table('Read pending Inbox links',c.inbox_links_table),base.code('Pending Inbox links context','return [{json:{links:$input.all().map(i=>i.json).filter(r=>r.queue_key)}}];')];
 w.nodes.push(...extra);w.connections['Retain protection context']={main:[[{node:extra[0].name,type:'main',index:0}]]};for(let i=0;i<extra.length-1;i++)edge(w,extra[i].name,extra[i+1].name);edge(w,extra.at(-1).name,'Prepare Arc Research reads');
 const planner=w.nodes.find(n=>n.name==='Plan truthful drafts and exclusions');planner.parameters={mode:'runOnceForAllItems',jsCode:bundle('phase2-copy-drafting')+'const q=__load("./phase2-cloud-queue");const rows=q.decode($input.all().map(i=>i.json),'+JSON.stringify(base.datasets())+');return [{json:arc.plan(rows,$("Retain queue context").first().json.queue,$("Retain protection context").first().json.locks,$("Batch controls").first().json,new Date().toISOString(),$("Pending Inbox copy context").first().json.inbox,$("Pending Inbox links context").first().json.links)}];'};
 w.nodes.find(n=>n.name==='Batch controls').parameters={mode:'runOnceForAllItems',jsCode:'return [{json:'+JSON.stringify(c)+'}];'};
 w.nodes.find(n=>n.name==='Emit queue upserts').parameters={mode:'runOnceForAllItems',jsCode:'const p=$input.first().json;return p.jobs.length?p.jobs.map(json=>({json,pairedItem:{item:0}})):[{json:{no_work:true}}];'};
 w.nodes.find(n=>n.name==='Queue updates needed?').parameters.conditions.conditions[0].leftValue='={{ !$json.no_work }}';
 const loop={name:'Draft one at a time',type:'n8n-nodes-base.splitInBatches',typeVersion:3,parameters:{batchSize:1,options:{}}};
 const execute={name:'Generate bounded grounded copy',type:'n8n-nodes-base.executeWorkflow',typeVersion:1.4,parameters:{source:'database',mode:'once',workflowId:{__rl:true,mode:'list',value:workerId,cachedResultName:'Arc | Phase 2 | Grounded copy worker'},options:{waitForSubWorkflow:true}}};
 const existing=gate('Existing safe draft?','={{ Boolean($json.previous) }}');
 const update=base.table('Replace exact unreviewed copy',c.queue_table,'update',{matchType:'allConditions',filters:{conditions:[{keyName:'queue_key',condition:'eq',keyValue:'={{ $json.queue_key }}'},{keyName:'payload',condition:'eq',keyValue:'={{ $json.cas_payload }}'},...['state','review_status','subject','draft_body','provider_status','provider_draft_id','approved_hash','reviewed_hash','action','reviewer','compliance_basis','claim_execution','sent','suppression_status'].map(k=>({keyName:k,condition:'eq',keyValue:'={{ $json.previous.'+k+' }}'}))]},columns:base.columns()});update.alwaysOutputData=true;update.retryOnFail=false;
 const verify=base.code('Verify exact draft persistence','const expected=$("Generate bounded grounded copy").item.json,rows=$input.all().map(i=>i.json).filter(r=>r.queue_key);if(rows.length!==1||rows[0].queue_key!==expected.queue_key||rows[0].payload!==expected.payload)throw new Error("COPY_WRITE_CONFLICT_STOP");return [{json:{...expected.copy_result,queue_key:expected.queue_key}}];');
 const upsert=w.nodes.find(n=>n.name==='Upsert review queue');upsert.retryOnFail=false;upsert.alwaysOutputData=true;
 w.nodes.push(loop,execute,existing,update,verify);
 w.connections['Queue updates needed?']={main:[[{node:loop.name,type:'main',index:0}],[{node:'Refresh Outreach Inbox',type:'main',index:0}]]};
 edge(w,loop.name,'Queue result',0);edge(w,loop.name,execute.name,1);edge(w,execute.name,existing.name);edge(w,existing.name,update.name);edge(w,existing.name,upsert.name,1);edge(w,update.name,verify.name);w.connections[upsert.name]={main:[[{node:verify.name,type:'main',index:0}]]};edge(w,verify.name,loop.name);
 w.nodes.find(n=>n.name==='Queue result').parameters={mode:'runOnceForAllItems',jsCode:'const results=$input.all().map(i=>i.json);return [{json:{...$("Plan truthful drafts and exclusions").first().json.summary,valid_drafts:results.filter(r=>r.state==="DRAFT_READY").length,reclassified_needs_research:results.filter(r=>r.state==="NEEDS_RESEARCH").length,results,emails_sent:0,dms_sent:0,source_writes:0,zoho_drafts:0}}];'};
 w.nodeGroups=[{name:'Cloud intake',nodeNames:['Batch controls','Read durable review queue','Retain queue context','Read protection ledger','Retain protection context',...extra.map(n=>n.name),'Prepare Arc Research reads','Read three Arc Research tabs'],description:'Read research, protections and pending operator work. Source workbooks stay read-only.'},{name:'Evidence and review queue',nodeNames:['Plan truthful drafts and exclusions','Emit queue upserts','Queue updates needed?','Draft one at a time','Generate bounded grounded copy','Existing safe draft?','Replace exact unreviewed copy','Upsert review queue','Verify exact draft persistence','Queue result','Refresh Outreach Inbox'],description:'Bounded zero-cost copy, exact-content backfill and quality gate. Preserve approvals and history; no provider or sending.'}];
 const sample=Object.fromEntries(Object.entries(require('./phase2-cloud-queue').COLUMNS).map(([k,t])=>[k,t==='boolean'?false:t==='number'?0:'fixture']));w.nodes.forEach((n,i)=>{n.position=[i*230,0];n.output=[{...sample,url:'https://sheets.googleapis.com/v4/spreadsheets/example',model_input:'fixture',previous:sample,no_work:false,needs_llm:true,cas_payload:'fixture'}];});return inbox.finish(w);
}
function save(result,stem){fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,stem+'.json'),JSON.stringify(result.workflow,null,2));fs.writeFileSync(path.join(dir,stem+'.sdk.js'),result.sdk);}
module.exports={worker,patchQueue,save};
if(require.main===module){save(worker(),'copy-worker');}
