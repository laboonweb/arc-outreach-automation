'use strict';
const fs=require('node:fs'),path=require('node:path');
const base=require('./build-phase2-cloud');
const {bundle}=require('./build-workflows');
const inbox=require('./phase2-inbox');
const dir=path.join(__dirname,'../private/phase2/inbox');
const readJson=file=>JSON.parse(fs.readFileSync(path.join(dir,file),'utf8').replace(/^\uFEFF/,''));
function serialize(value){
 if(typeof value==='string'&&value.startsWith('={{'))return 'expr('+JSON.stringify(value.slice(1))+')';
 if(Array.isArray(value))return '['+value.map(serialize).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.entries(value).filter(([,v])=>v!==undefined).map(([k,v])=>JSON.stringify(k)+':'+serialize(v)).join(',')+'}';
 return JSON.stringify(value);
}
function finish(w){
 const nodes=w.nodes;
 const backendSample=Object.fromEntries(Object.entries(require('./phase2-cloud-queue').COLUMNS).map(([k,t])=>[k,t==='boolean'?false:t==='number'?0:'fixture']));
 let sdk="import {workflow,node,trigger,expr} from '@n8n/workflow-sdk';\n";
 sdk+=nodes.map((n,i)=>'const stage'+i+' = '+(/Trigger$/.test(n.type)?'trigger':'node')+'({type:'+JSON.stringify(n.type)+',version:'+n.typeVersion+',config:'+serialize({name:n.name,parameters:n.parameters,credentials:n.credentials,alwaysOutputData:n.alwaysOutputData,executeOnce:n.executeOnce,onError:n.onError,retryOnFail:n.retryOnFail,notes:n.notes})+',output:'+JSON.stringify(n.output||[{...backendSample,url:'https://example.org/',request:{arguments:{mode:'draft',mailFormat:'html'}},cas_payload:'fixture',cas:{state:'APPROVED',payload:'fixture',body:'fixture',subject:'fixture',recipient:'fixture',reviewer:'Fixture',compliance_basis:'Fixture',compliance_status:'NOT_APPLICABLE'},business_name:'Fixture',market:'Manila',channel:'EMAIL',contact:'fixture@example.org',subject:'Fixture subject',draft:'Fixture body',why_this_lead:'Fixture evidence',compliance:'NOT_APPLICABLE',action:'NONE',notes:'',send_status:'DRAFT_READY',inbox_id:1,id:1,snapshot:'fixture',backend_hash:'fixture',match_keys:['id','id','id'],match_values:[1,1,1],no_work:false}])+'});').join('\n');
 sdk+='\nexport default workflow('+JSON.stringify(w.name.toLowerCase().replace(/\W+/g,'-'))+','+JSON.stringify(w.name)+')';
 for(let i=0;i<nodes.length;i++)sdk+='.add(stage'+i+')';
 for(const [from,connection] of Object.entries(w.connections))for(let output=0;output<connection.main.length;output++)for(const edge of connection.main[output])sdk+='.add(stage'+nodes.findIndex(n=>n.name===from)+'.output('+output+').to(stage'+nodes.findIndex(n=>n.name===edge.node)+'))';
 for(const group of w.nodeGroups||[])sdk+='.group('+JSON.stringify(group.name)+',['+group.nodeNames.map(name=>'stage'+nodes.findIndex(n=>n.name===name)).join(',')+'],{description:'+JSON.stringify(group.description)+'})';
 return {workflow:w,sdk:sdk+';'};
}
function mapper(columns,prefix=''){return {mappingMode:'defineBelow',value:Object.fromEntries(Object.keys(columns).map(k=>[k,'={{ $json.'+prefix+k+' }}'])),schema:Object.entries(columns).map(([id,type])=>({id,displayName:id,type,required:false,display:true,defaultMatch:false,canBeUsedToMatch:true}))};}
function table(name,id,operation='get',params={}){const n=base.table(name,id,operation,params);n.parameters.dataTableId.cachedResultName=name.includes('links')?'Arc Phase 2 Inbox Links':name.includes('Inbox')?'Arc Phase 2 Outreach Inbox':'Arc Phase 2 Review Queue';return n;}
function context(name,key,filter){return base.code(name,'return [{json:{'+key+':$input.all().map(i=>i.json).filter(r=>r.'+filter+')}}];');}
function callSync(c){return {name:'Refresh Outreach Inbox',type:'n8n-nodes-base.executeWorkflow',typeVersion:1.4,parameters:{source:'database',mode:'once',workflowId:{__rl:true,mode:'list',value:c.sync_workflow,cachedResultName:'Arc | Phase 2 | Sync Outreach Inbox'},options:{waitForSubWorkflow:true}},executeOnce:true};}
function edge(w,from,to,index=0){w.connections[from]||={main:[]};w.connections[from].main[index]||=[];w.connections[from].main[index].push({node:to,type:'main',index:0});}
function unlink(w,from,to){const conn=w.connections[from];if(conn)for(const edges of conn.main)for(let i=edges.length-1;i>=0;i--)if(edges[i].node===to)edges.splice(i,1);}
function gate(name){return {name,type:'n8n-nodes-base.if',typeVersion:2.3,parameters:{conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict',version:2},conditions:[{leftValue:'={{ !$json.no_work }}',rightValue:true,operator:{type:'boolean',operation:'true'}}],combinator:'and'},options:{}}};}
function sync(c){
 const result=base.linear('Arc | Phase 2 | Sync Outreach Inbox',[
  base.manual(),base.code('Inbox controls','return [{json:{...'+JSON.stringify(c)+',feedback:$input.first().json.feedback||[]}}];'),
  table('Read backend review ledger',c.queue_table),context('Backend context','queue','queue_key'),
  table('Read Outreach Inbox',c.inbox_table),context('Inbox context','inbox','id'),
  table('Read Inbox links',c.inbox_links_table),context('Inbox links context','links','queue_key'),
  base.code('Plan safe Inbox projection',bundle('phase2-inbox')+'const c=$("Inbox controls").first().json;return [{json:arc.sync($("Backend context").first().json.queue,$("Inbox context").first().json.inbox,$("Inbox links context").first().json.links,c,c.feedback)}];'),
  base.code('Emit Inbox projections','return $input.first().json.writes.map(json=>({json,pairedItem:{item:0}}));'),
  table('Upsert Outreach Inbox',c.inbox_table,'upsert',{matchType:'allConditions',filters:{conditions:[0,1,2].map(i=>({keyName:'={{ $json.match_keys['+i+'] }}',condition:'eq',keyValue:'={{ $json.match_values['+i+'] }}'}))},columns:mapper(inbox.COLUMNS)}),
  base.code('Associate persisted Inbox rows',bundle('phase2-inbox')+'return arc.linkResults($("Plan safe Inbox projection").first().json,$input.all().map(i=>i.json)).map(json=>({json,pairedItem:{item:0}}));'),
  table('Upsert Inbox links',c.inbox_links_table,'upsert',{matchType:'allConditions',filters:{conditions:[{keyName:'queue_key',condition:'eq',keyValue:'={{ $json.queue_key }}'}]},columns:mapper(inbox.LINK_COLUMNS)}),
  base.code('Inbox sync result','const p=$("Plan safe Inbox projection").first().json;if($input.all().length!==p.writes.length)throw new Error("INBOX_LINK_WRITE_COUNT_MISMATCH");return [{json:p.summary}];')
 ]).workflow;
 const child={name:'Refresh after Phase 2',type:'n8n-nodes-base.executeWorkflowTrigger',typeVersion:1.2,parameters:{inputSource:'passthrough'},position:[0,240]};result.nodes.push(child);edge(result,child.name,'Inbox controls');
 result.nodeGroups=[{name:'Read canonical records',nodeNames:result.nodes.slice(1,8).map(n=>n.name),description:'Read the ledger, Inbox and private row mapping. No backend outreach state is changed.'},{name:'Project human review fields',nodeNames:result.nodes.slice(8,14).map(n=>n.name),description:'Preserve pending edits, update the same Inbox rows and save their backend-only associations.'}];
 return finish(result);
}
function controls(c,kind){
 if(c.mode!=='PRODUCTION')return c;
 const {allowed_lead_ids,...production}=c;
 return {...production,cap:kind==='draft'?25:'ALL'};
}
function patch(c,original,kind){
 c=controls(c,kind);
 const w=JSON.parse(JSON.stringify(original.workflow||original));w.nodes=w.nodes.map(n=>({...n}));w.active=false;
 if(c.mode==='PRODUCTION')w.nodes.find(n=>n.name==='Batch controls').parameters={mode:'runOnceForAllItems',jsCode:'return [{json:'+JSON.stringify(c)+'}];'};
 const previous=w.nodes.find(n=>n.name==='Retain protection context');
 if(kind==='review'){
  w.nodes.find(n=>n.name==='Batch controls').parameters={mode:'runOnceForAllItems',jsCode:'return [{json:'+JSON.stringify(c)+'}];'};
  const extra=[table('Read Outreach Inbox actions',c.inbox_table),context('Operator Inbox context','inbox','id'),table('Read Inbox action links',c.inbox_links_table),context('Operator link context','links','queue_key')];
  w.nodes.push(...extra);unlink(w,previous.name,'Prepare Arc Research reads');
  let from=previous.name;for(const n of extra){edge(w,from,n.name);from=n.name;}edge(w,from,'Prepare Arc Research reads');
  w.nodes.find(n=>n.name==='Validate review actions').parameters={mode:'runOnceForAllItems',jsCode:bundle('phase2-inbox')+'const q=__load("./phase2-cloud-queue");const rows=q.decode($input.all().map(i=>i.json),'+JSON.stringify(base.datasets())+');return [{json:arc.process(rows,$("Retain queue context").first().json.queue,$("Retain protection context").first().json.locks,$("Operator Inbox context").first().json.inbox,$("Operator link context").first().json.links,{...$("Batch controls").first().json,operator:"Briann"})}];'};
  const save=w.nodes.find(n=>n.name==='Save review actions');save.parameters.operation='update';save.parameters.filters={conditions:[{keyName:'queue_key',condition:'eq',keyValue:'={{ $json.queue_key }}'},{keyName:'payload',condition:'eq',keyValue:'={{ $json.cas_payload }}'}]};save.alwaysOutputData=true;
  w.nodes.find(n=>n.name==='Review action result').parameters={mode:'runOnceForAllItems',jsCode:'const p=$("Validate review actions").first().json,rows=$input.all().map(i=>i.json).filter(r=>r.queue_key);if(rows.length!==p.writes.length||p.writes.some(w=>!rows.some(r=>r.queue_key===w.queue_key&&r.payload===w.payload)))throw new Error("BACKEND_ACTION_WRITE_CONFLICT");return [{json:{...p.summary,errors:p.errors,feedback:p.errors,due:p.due,queue_rows_written:rows.length}}];'};
  bridge(w,c,'Validate review actions','Emit reviewed updates','Save review actions','Review action result');
  const intake=w.nodeGroups.find(g=>g.name==='Cloud intake');intake.nodeNames.push(...extra.map(n=>n.name));
 }else if(kind==='draft')bridge(w,c,'Plan truthful drafts and exclusions','Emit queue upserts','Upsert review queue','Queue result');
 else if(kind==='zoho'){w.nodes.push(callSync(c));edge(w,'Unsent Zoho result','Refresh Outreach Inbox');}
 const order=(original.workflow||original).nodes.map(n=>n.name);
 if(kind==='review')order.splice(order.indexOf('Prepare Arc Research reads'),0,'Read Outreach Inbox actions','Operator Inbox context','Read Inbox action links','Operator link context');
 if(kind!=='zoho')order.splice(order.indexOf(kind==='review'?'Save review actions':'Upsert review queue'),0,kind==='review'?'Review updates needed?':'Queue updates needed?');
 order.push('Refresh Outreach Inbox');w.nodes.sort((a,b)=>order.indexOf(a.name)-order.indexOf(b.name));
 for(let i=0;i<w.nodes.length;i++)w.nodes[i].position=[i*230,0];
 // Preserve the existing frames; include the new control and refresh nodes in
 // their respective connected stages so the saved canvas remains reviewable.
 const main=w.nodeGroups.find(g=>/review queue|recorded sends|provider draft/i.test(g.name));
 if(main){for(const n of w.nodes.filter(n=>n.name==='Queue updates needed?'||n.name==='Review updates needed?'||n.name==='Refresh Outreach Inbox'))if(!main.nodeNames.includes(n.name))main.nodeNames.push(n.name);}
 return finish(w);
}
function bridge(w,c,plan,emit,save,result){
 const isReview=plan==='Validate review actions';
 w.nodes.find(n=>n.name===emit).parameters={mode:'runOnceForAllItems',jsCode:'const p=$input.first().json;return p.writes.length?p.writes.map(json=>({json,pairedItem:{item:0}})):[{json:{no_work:true,feedback:p.errors||[]}}];'};
 const decision=gate(isReview?'Review updates needed?':'Queue updates needed?');w.nodes.push(decision,callSync(c));unlink(w,emit,save);edge(w,emit,decision.name);edge(w,decision.name,save);edge(w,decision.name,'Refresh Outreach Inbox',1);edge(w,result,'Refresh Outreach Inbox');
}
function save(result,stem){fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,stem+'.json'),JSON.stringify(result.workflow,null,2));fs.writeFileSync(path.join(dir,stem+'.sdk.js'),result.sdk);}
function validation(c){
 const w=base.reviewer(c).workflow;w.nodes=w.nodes.slice(0,8);w.connections={};
 for(let i=0;i<w.nodes.length-1;i++)edge(w,w.nodes[i].name,w.nodes[i+1].name);
 const added=[table('Read Outreach Inbox validation',c.inbox_table),context('Inbox validation context','inbox','id'),table('Read Inbox links validation',c.inbox_links_table),context('Link validation context','links','queue_key'),base.code('Validate existing records without writes',bundle('phase2-inbox-validation')+'const q=__load("./phase2-cloud-queue");const research=q.decode($("Read three Arc Research tabs").all().map(i=>i.json),'+JSON.stringify(base.datasets())+');return [{json:arc.run(research,$("Retain queue context").first().json.queue,$("Retain protection context").first().json.locks,$("Inbox validation context").first().json.inbox,$("Link validation context").first().json.links,$("Batch controls").first().json)}];')];
 let prev=w.nodes.at(-1);for(const n of added){edge(w,prev.name,n.name);w.nodes.push(n);prev=n;}
 w.name='Arc | Phase 2 | Inbox safety validation';w.nodeGroups=[{name:'Read-only sample validation',nodeNames:w.nodes.slice(1).map(n=>n.name),description:'Read five existing records; simulate decisions in memory only. No table or provider writes.'}];
 return finish(w);
}
function generate(c=readJson('config.json')){save(sync(controls(c,'sync')),'inbox-sync');if(c.sync_workflow){for(const [kind,file] of [['review','review-before.json'],['draft','draft-before.json'],['zoho','zoho-before.json']])save(patch(c,readJson(file),kind),'inbox-'+kind);}return c;}
module.exports={sync,patch,finish,mapper,callSync,controls,generate,save,validation};
if(require.main===module){if(process.argv.includes('--validation'))save(validation(readJson('validation-config.json')),'inbox-validation');else generate();}
