'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const base=require('./build-phase2-cloud'),build=require('./build-phase2-inbox'),{bundle}=require('./build-workflows');
const dir=path.join(__dirname,'../private/phase2/panel');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
function configuration(){
 fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,'config.json');
 if(!fs.existsSync(file))fs.writeFileSync(file,JSON.stringify({...read(path.join(dir,'../inbox/config.json')),panel_url:'https://briann.app.n8n.cloud/webhook/arc-outreach-review',action_url:'https://briann.app.n8n.cloud/webhook/arc-outreach-review-action',authentication:'basicAuth',signing_secret:crypto.randomBytes(32).toString('hex')},null,2));
 return read(file);
}
function edge(w,from,to,index=0){w.connections[from]||={main:[]};w.connections[from].main[index]||=[];w.connections[from].main[index].push({node:to,type:'main',index:0});}
function context(name,key,filter){return base.code(name,'return [{json:{'+key+':$input.all().map(i=>i.json).filter(r=>r.'+filter+')}}];');}
function reads(c,suffix=''){return [base.table('Read panel ledger'+suffix,c.queue_table),context('Panel ledger'+suffix,'queue','queue_key'),base.table('Read panel protections'+suffix,c.lock_table),context('Panel protections'+suffix,'locks','identity'),base.table('Read panel Inbox'+suffix,c.inbox_table),context('Panel Inbox'+suffix,'inbox','id'),base.table('Read panel links'+suffix,c.inbox_links_table),context('Panel links'+suffix,'links','queue_key')];}
function assets(){return {css:fs.readFileSync(path.join(__dirname,'../review/panel.css'),'utf8'),js:fs.readFileSync(path.join(__dirname,'../review/panel.js'),'utf8')};}
function getContexts(suffix=''){return ['Panel ledger','Panel protections','Panel Inbox','Panel links'].map(n=>'$('+JSON.stringify(n+suffix)+').first().json');}
function embeddedRefresh(c){
 const {signing_secret,basic_auth_credential,panel_url,action_url,authentication,panel_workflow_id,panel_validation_workflow_id,...syncConfig}=c;
 const original=build.sync(syncConfig).workflow,nodes=original.nodes.filter(n=>!n.type.endsWith('Trigger')).map(n=>({...n,parameters:structuredClone(n.parameters)}));
 nodes.find(n=>n.name==='Plan safe Inbox projection').output=[{summary:{projected:0},writes:[]}];
 const gate={name:'Inbox projection needed?',type:'n8n-nodes-base.if',typeVersion:2.3,parameters:{conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict',version:2},conditions:[{leftValue:'={{ Boolean($json.writes.length) }}',rightValue:true,operator:{type:'boolean',operation:'true'}}],combinator:'and'},options:{}}};
 const skip=base.code('Keep unchanged Inbox projection','return [{json:$("Plan safe Inbox projection").first().json.summary}];');
 const done=base.code('Panel refresh complete','return $input.all();');
 const w={connections:structuredClone(original.connections)};delete w.connections['Run manually'];delete w.connections['Refresh after Phase 2'];
 w.connections['Plan safe Inbox projection']={main:[[{node:gate.name,type:'main',index:0}]]};
 edge(w,gate.name,'Emit Inbox projections');edge(w,gate.name,skip.name,1);edge(w,'Inbox sync result',done.name);edge(w,skip.name,done.name);
 return {nodes:[...nodes,gate,skip,done],connections:w.connections,start:'Inbox controls',end:done.name};
}
function compactSdk(result){
 // Intern the identical frozen factory source in the SDK only. Runtime Code
 // node strings are unchanged; this keeps the SDK under n8n's size ceiling.
 const source=bundle('phase2-inbox'),start=source.indexOf('const __factories = {\n')+'const __factories = {\n'.length,end=source.indexOf('\n};\nconst __cache');
 const shared=source.slice(start,end);let sdk=result.sdk;
 for(const n of result.workflow.nodes.filter(n=>n.type==='n8n-nodes-base.code'&&n.parameters.jsCode.includes(shared))){const code=n.parameters.jsCode,parts=code.split(shared);sdk=sdk.replace(JSON.stringify(code),parts.map(p=>JSON.stringify(p)).join('+sharedInboxFactories+'));}
 result.sdk='const sharedInboxFactories='+JSON.stringify(shared)+';\n'+sdk;return result;
}
function panel(c=configuration()){
 const w={name:'Arc | Phase 2 | Outreach Review Panel',active:false,settings:{executionOrder:'v1',timezone:'Asia/Manila',executionTimeout:180},nodes:[],connections:{}};
 const webhook=(name,path,method)=>({name,type:'n8n-nodes-base.webhook',typeVersion:2.1,parameters:{httpMethod:method,path,authentication:'basicAuth',responseMode:'responseNode',options:{allowedOrigins:method==='POST'?'https://briann.app.n8n.cloud,null':'https://briann.app.n8n.cloud',ignoreBots:true}},...(c.basic_auth_credential?{credentials:{httpBasicAuth:c.basic_auth_credential}}:{})});
 const cfg={...c,signing_secret:undefined};
 const [Q,L,I,M]=getContexts(),[Qr,Lr,Ir,Mr]=getContexts(' refreshed');
 const ingress=base.code('Panel request','return [{json:$input.first().json.request}];');
 const determine=base.code('Determine panel request','return [{json:{no_work:$("Panel request").first().json.method!=="POST"}}];');
 const choose={name:'Apply operator decision?',type:'n8n-nodes-base.if',typeVersion:2.3,parameters:{conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict',version:2},conditions:[{leftValue:'={{ !$json.no_work }}',rightValue:true,operator:{type:'boolean',operation:'true'}}],combinator:'and'},options:{}}};
 const research=[base.code('Prepare panel research reads','return '+JSON.stringify(base.researchRequests())+'.map(json=>({json}));'),base.read('Read panel Arc Research','={{ $json.url }}')];
 const apply=base.code('Existing Inbox review logic',bundle('phase2-panel')+'const q=__load("./phase2-cloud-queue");const research=q.decode($input.all().map(i=>i.json),'+JSON.stringify(base.datasets())+');const p=arc.process($("Panel request").first().json.body,research,'+Q+'.queue,'+L+'.locks,'+I+'.inbox,'+M+'.links,'+JSON.stringify({...cfg,operator_lifecycle_required:true})+','+JSON.stringify(c.signing_secret)+');return [{json:p}];');
 const emit=base.code('Emit one review update','const p=$input.first().json;return p.writes.length?p.writes.map(json=>({json,pairedItem:{item:0}})):[{json:{no_work:true}}];');
 const writeGate={...JSON.parse(JSON.stringify(choose)),name:'Review update permitted?'};
 const save=base.table('Save existing reviewed record',c.queue_table,'update',{matchType:'allConditions',filters:{conditions:[{keyName:'queue_key',condition:'eq',keyValue:'={{ $json.queue_key }}'},{keyName:'payload',condition:'eq',keyValue:'={{ $json.cas_payload }}'}]},columns:base.columns()});save.alwaysOutputData=true;save.retryOnFail=false;
 const verify=base.code('Verify review persistence','const p=$("Existing Inbox review logic").first().json,rows=$input.all().map(i=>i.json).filter(r=>r.queue_key);if(p.writes.length!==1||rows.length!==1||rows[0].queue_key!==p.writes[0].queue_key||rows[0].payload!==p.writes[0].payload)throw new Error("BACKEND_ACTION_WRITE_CONFLICT");return [{json:{feedback:[]}}];');
 const emitInbox=base.code('Emit reviewed Inbox command','const p=$("Existing Inbox review logic").first().json,old=$("Panel Inbox").first().json.inbox.find(r=>r.id===p.operator_input.id);if(!old)throw new Error("INBOX_MAPPING_RECONCILIATION_REQUIRED");return [{json:{...p.operator_input,cas_inbox:old}}];');
 const inboxFixture=Object.fromEntries(require('./phase2-inbox').FIELDS.map(k=>[k,'fixture']));emitInbox.output=[{...inboxFixture,id:1,cas_inbox:{...inboxFixture,id:1}}];
 const saveInbox=base.table('Save existing Inbox command',c.inbox_table,'update',{matchType:'allConditions',filters:{conditions:[{keyName:'id',condition:'eq',keyValue:'={{ $json.id }}'},...require('./phase2-inbox').FIELDS.map(keyName=>({keyName,condition:'eq',keyValue:'={{ $json.cas_inbox.'+keyName+' }}'}))]},columns:build.mapper(require('./phase2-inbox').COLUMNS)});saveInbox.alwaysOutputData=true;saveInbox.retryOnFail=false;
 const verifyInbox=base.code('Verify reviewed Inbox command','const p=$("Existing Inbox review logic").first().json,rows=$input.all().map(i=>i.json).filter(r=>r.id),fields='+JSON.stringify(require('./phase2-inbox').FIELDS)+';if(rows.length!==1||rows[0].id!==p.operator_input.id||fields.some(k=>rows[0][k]!==p.operator_input[k]))throw new Error("INBOX_COMMAND_WRITE_CONFLICT");return [{json:{feedback:[]}}];');
 const sync=embeddedRefresh(c);
 const refreshed=reads(c,' refreshed');
 const after=base.code('Refreshed render context','const p=$("Existing Inbox review logic").first().json;return [{json:{...'+Qr+',...'+Ir+',...'+Mr+',feedback:p.errors||[],notice:p.notice||"Review saved. No email or DM was sent."}}];');
 const before=base.code('Current render context','const p=$("Panel request").first().json;let feedback=[];if(p.method==="POST")feedback=$("Existing Inbox review logic").first().json.errors;return [{json:{...'+Q+',...'+I+',...'+M+',feedback}}];');
 const a=assets();
 const render=base.code('Render operator panel','');
 // Keep one absolute action URL for forms and the read URL for refresh links.
 render.parameters.jsCode=bundle('phase2-panel-view')+'const input=$input.first().json;return [{json:{html:arc.render(input.inbox,input.links,input.queue,{...'+JSON.stringify({secret:c.signing_secret,url:c.action_url,readUrl:c.panel_url,...a})+',feedback:input.feedback,notice:input.notice,diagnosticsByKey:input.diagnosticsByKey})}}];';
 const respond={name:'Show review panel',type:'n8n-nodes-base.respondToWebhook',typeVersion:1.5,parameters:{respondWith:'text',responseBody:'={{ $json.html }}',options:{responseCode:200,responseHeaders:{entries:[{name:'Content-Type',value:'text/html; charset=utf-8'},{name:'Cache-Control',value:'no-store'},{name:'Referrer-Policy',value:'no-referrer'},{name:'X-Content-Type-Options',value:'nosniff'}]}}}};
 // n8n renders HTML in an opaque sandbox. Permit that origin on POST only.
 // Reject unsigned/expired POSTs before reading or returning any private data.
 const start=[webhook('Open review panel','arc-outreach-review','GET'),base.code('Read request','return [{json:{request:{method:"GET",body:{}}}}];'),webhook('Submit review decision','arc-outreach-review-action','POST'),base.code('Decision request',bundle('phase2-panel-controls')+'const body=$input.first().json.body;arc.verifyToken(body?.token,'+JSON.stringify(c.signing_secret)+');return [{json:{request:{method:"POST",body}}}];')];
 w.nodes=[...start,ingress,...reads(c),determine,choose,...research,apply,emit,writeGate,save,verify,emitInbox,saveInbox,verifyInbox,...sync.nodes,...refreshed,after,before,render,respond];
 edge(w,start[0].name,start[1].name);edge(w,start[1].name,ingress.name);edge(w,start[2].name,start[3].name);edge(w,start[3].name,ingress.name);
 const intake=[ingress,...w.nodes.slice(5,13),determine,choose];for(let i=0;i<intake.length-1;i++)edge(w,intake[i].name,intake[i+1].name);
 edge(w,choose.name,research[0].name);edge(w,choose.name,before.name,1);
 const review=[...research,apply,emit,writeGate,save,verify,emitInbox,saveInbox,verifyInbox];for(let i=0;i<review.length-1;i++)edge(w,review[i].name,review[i+1].name);
 edge(w,verifyInbox.name,sync.start);Object.assign(w.connections,sync.connections);edge(w,sync.end,refreshed[0].name);
 const display=[...refreshed,after,render,respond];for(let i=0;i<display.length-1;i++)edge(w,display[i].name,display[i+1].name);
 edge(w,writeGate.name,before.name,1);edge(w,before.name,render.name);
 for(let i=0;i<w.nodes.length;i++)w.nodes[i].position=[(i%8)*240,Math.floor(i/8)*260];
 w.nodeGroups=[{name:'Read authoritative review records',nodeNames:[ingress,...w.nodes.slice(5,13),determine].map(n=>n.name),description:'Read the canonical ledger, protections, Inbox and stable row links.'},{name:'Review one decision and show the panel',nodeNames:[choose,...research,apply,emit,writeGate,save,verify,emitInbox,saveInbox,verifyInbox,...sync.nodes,...refreshed,after,before,render,respond].map(n=>n.name),description:'GET renders only. POST reuses Inbox gates, saves one matching record and command, then refreshes. No provider or send nodes.'}];
 require('./build-integrity-patch').panelReads(w);
 render.output=[{html:'<html>Validation fixture</html>'}];
 return compactSdk(build.finish(w));
}
function validation(c=configuration()){
 const nodes=[base.manual(),...reads(c),base.code('Prepare validation research reads','return '+JSON.stringify(base.researchRequests())+'.map(json=>({json}));'),base.read('Read validation Arc Research','={{ $json.url }}'),base.code('Bounded panel validation',bundle('phase2-panel-validation')+'const q=__load("./phase2-cloud-queue");const research=q.decode($input.all().map(i=>i.json),'+JSON.stringify(base.datasets())+');return [{json:arc.run(research,$("Panel ledger").first().json.queue,$("Panel protections").first().json.locks,$("Panel Inbox").first().json.inbox,$("Panel links").first().json.links)}];')];
 const w=base.linear('Arc | Phase 2 | Review Panel safety validation',nodes).workflow;delete w.settings.saveManualExecutions;delete w.settings.saveDataErrorExecution;delete w.settings.saveDataSuccessExecution;
 w.nodeGroups=[{name:'Read existing outreach records',nodeNames:nodes.slice(1,9).map(n=>n.name),description:'Read-only canonical ledger, protections and Inbox associations.'},{name:'Bounded in-memory UX validation',nodeNames:nodes.slice(9).map(n=>n.name),description:'Simulate operator actions only on copies of the seven named records. No writes or provider calls.'}];return build.finish(w);
}
function save(result,stem){fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,stem+'.json'),JSON.stringify(result.workflow,null,2));fs.writeFileSync(path.join(dir,stem+'.sdk.js'),result.sdk);}
module.exports={configuration,panel,validation,assets,save,embeddedRefresh,compactSdk};
if(require.main===module){const c=configuration();if(process.argv.includes('--validation'))save(validation(c),'panel-validation');else save(panel(c),'panel');console.log('Generated inactive review panel. No live state changed.');}
