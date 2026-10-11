'use strict';
// Local artifact generation only. Never imports a connector or executes a workflow.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {bundle}=require('./build-workflows'),base=require('./build-phase2-cloud'),{compact}=require('./workflow-sdk-compact');
const root=path.resolve(__dirname,'..'),DATASET='AUSTRALIA_500_20261011';
const json=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const hash=x=>require('./helpers').sha256(typeof x==='string'?x:JSON.stringify(x));
function structureSdk(w){const s=structuredClone(w);for(const n of s.nodes)if(n.parameters?.jsCode)n.parameters.jsCode='return []; // Runtime SHA256: '+hash(n.parameters.jsCode);return compact(s);}
function graphHash(w){
 const ordered=v=>Array.isArray(v)?v.map(ordered):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).filter(k=>v[k]!==undefined).sort().map(k=>[k,ordered(v[k])])):v;
 const nodes=w.nodes.map(n=>{const copy={...n};for(const k of ['disabled','retryOnFail','alwaysOutputData','executeOnce'])if(copy[k]===false)delete copy[k];if(copy.onError==='stopWorkflow')delete copy.onError;return copy;});
 return hash(ordered({nodes:nodes.sort((a,b)=>a.name.localeCompare(b.name)),connections:w.connections,settings:w.settings,nodeGroups:w.nodeGroups}));
}
function operations(before,after){
 const out=[],settings=['retryOnFail','onError','executeOnce','alwaysOutputData','maxTries','waitBetweenTries'];
 for(const n of after.nodes){const old=before.nodes.find(x=>x.name===n.name);
  if(!old)out.push({type:'addNode',node:Object.fromEntries(['id','name','type','typeVersion','position','parameters','credentials','disabled','notes'].filter(k=>n[k]!==undefined).map(k=>[k,n[k]]))});
  else{assert.equal(n.id,old.id);if(JSON.stringify(old.parameters)!==JSON.stringify(n.parameters))out.push({type:'updateNodeParameters',nodeName:n.name,parameters:n.parameters,replace:true});if(JSON.stringify(old.position)!==JSON.stringify(n.position))out.push({type:'setNodePosition',nodeName:n.name,position:n.position});}
  const changed=Object.fromEntries(settings.filter(k=>n[k]!==undefined&&n[k]!==old?.[k]).map(k=>[k,n[k]]));if(Object.keys(changed).length)out.push({type:'setNodeSettings',nodeName:n.name,settings:changed});
 }
 const links=w=>Object.entries(w.connections).flatMap(([source,ports])=>Object.entries(ports).flatMap(([connectionType,outputs])=>outputs.flatMap((edges,sourceIndex)=>edges.map(e=>({source,sourceIndex,target:e.node,targetIndex:e.index,connectionType})))));
 const a=links(before),b=links(after),key=JSON.stringify;
 for(const e of a)if(!b.some(x=>key(x)===key(e)))out.push({type:'removeConnection',...e});
 for(const n of before.nodes)if(!after.nodes.some(x=>x.name===n.name))out.push({type:'removeNode',nodeName:n.name});
 for(const e of b)if(!a.some(x=>key(x)===key(e)))out.push({type:'addConnection',...e});
 if(JSON.stringify(before.nodeGroups)!==JSON.stringify(after.nodeGroups))out.push({type:'setNodeGroups',nodeGroups:after.nodeGroups});
 const workflowSettings=Object.fromEntries(Object.entries(after.settings).filter(([k,v])=>JSON.stringify(v)!==JSON.stringify(before.settings[k])));
 for(const k of ['saveManualExecutions','saveDataSuccessExecution','saveDataErrorExecution'])if(before.settings[k]!==undefined&&after.settings[k]===undefined)workflowSettings[k]='DEFAULT';
 if(Object.keys(workflowSettings).length)out.push({type:'setWorkflowSettings',settings:workflowSettings});
 return {workflowId:before.id,required_graph_sha256:graphHash(before),expected_graph_sha256:graphHash(after),operations:out};
}
function artifact(dir,name,w){
 const raw=JSON.stringify(w,null,2),sdk=compact(w);fs.writeFileSync(path.join(dir,name+'.json'),raw);fs.writeFileSync(path.join(dir,name+'.sdk.js'),sdk);
 // Structural sidecars deliberately omit runtime code; never deploy them.
 fs.writeFileSync(path.join(dir,name+'.structure.sdk.js'),structureSdk(w));
 return {sha256:hash(w),file_sha256:hash(raw),graph_sha256:graphHash(w),sdk_sha256:hash(sdk),sdk_bytes:Buffer.byteLength(sdk)};
}

const changedModules=['dataset-intake','phase2-copy-drafting','phase2-inbox'];
function factories(code){const matches=[...code.matchAll(/^"(\.\/[^"\r\n]+)": \(module, exports, require\) => \{\n/gm)];return matches.map((m,i)=>({name:m[1],start:m.index,end:i+1<matches.length?matches[i+1].index-2:code.indexOf('\n};\nconst __cache',m.index)}));}
function refresh(code){
 let out=code;for(const m of factories(code).reverse()){const name=m.name.slice(2);if(!changedModules.includes(name))continue;const source=fs.readFileSync(path.join(__dirname,name+'.js'),'utf8');out=out.slice(0,m.start)+JSON.stringify(m.name)+': (module, exports, require) => {\n'+source+'\n}'+out.slice(m.end);}
 return out;
}
function registries(code,datasets){
 let out=code;const starts=[...out.matchAll(/\[\{"dataset_id":"AUSTRALIA"/g)].map(m=>m.index).reverse();
 for(const start of starts){let end=start+1;for(;end<out.length;end++){if(out[end]!==']')continue;let a;try{a=JSON.parse(out.slice(start,end+1));}catch{continue;}if(a.length!==3||a.map(x=>x.dataset_id).join('|')!=='AUSTRALIA|MANILA_LEGACY|MANILA_AUDIT_QUEUE')break;
   const d=datasets[3],next=a[0].url?{dataset_id:d.dataset_id,url:'https://sheets.googleapis.com/v4/spreadsheets/'+d.spreadsheet_id+'/values:batchGet?ranges='+encodeURIComponent("'Arc Research'")+'&valueRenderOption=UNFORMATTED_VALUE'}:Object.fromEntries(Object.keys(a[0]).map(k=>[k,d[k]]));out=out.slice(0,start)+JSON.stringify([...a,next])+out.slice(end+1);break;
  }
 }
 return out;
}
function edges(w,from,to){w.connections[from]={main:[[{node:to,type:'main',index:0}]]};}
function add(w,n){assert.ok(!w.nodes.some(x=>x.name===n.name));n.id=n.name.toLowerCase().replace(/\W+/g,'-');n.position=[1500,w.nodes.length*80];w.nodes.push(n);return n;}
function intakeBranch(w,specs){
 const c=w.nodes.find(n=>n.name==='Batch controls');c.parameters.jsCode=c.parameters.jsCode.replace('"sync_workflow":','"manual_intake":{"enabled":false,"dataset_id":"'+DATASET+'","source_ids":[]},"sync_workflow":');
 const gate=add(w,{name:'Explicit manual intake?',type:'n8n-nodes-base.if',typeVersion:2.2,parameters:{conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict',version:2},conditions:[{id:'manual-intake',leftValue:'={{ $("Batch controls").first().json.manual_intake.enabled }}',rightValue:'',operator:{type:'boolean',operation:'true',singleValue:true}}],combinator:'and'},options:{}}});
 edges(w,'Read three Arc Research tabs',gate.name);w.connections[gate.name]={main:[[{node:'Prepare current duplicate references',type:'main',index:0}],[{node:'Plan truthful drafts and exclusions',type:'main',index:0}]]};
 const requests=specs.map(s=>({url:'https://sheets.googleapis.com/v4/spreadsheets/'+s.spreadsheet_id+'/values:batchGet?valueRenderOption=UNFORMATTED_VALUE&'+s.tabs.map(t=>'ranges='+encodeURIComponent(t.range)).join('&')}));
 const source=w.nodes.find(n=>n.name==='Read three Arc Research tabs'),read=structuredClone(source);delete read.id;read.name='Read current duplicate references';read.parameters.url='={{ $json.url }}';
 read.parameters.options.response={response:{responseFormat:'text',fullResponse:true}};
 const registry=specs.map(s=>({dataset_id:s.dataset_id,spreadsheet_id:s.spreadsheet_id,country:s.country}));
 const names=[add(w,base.code('Prepare current duplicate references',bundle('au500-manual-intake')+'arc.controls($("Batch controls").first().json);return '+JSON.stringify(requests)+'.map(json=>({json}));')).name,add(w,read).name,
 add(w,base.code('Plan fixed five manual intake',bundle(['au500-manual-intake','phase2-cloud-queue'])+'const q=__load("./phase2-cloud-queue");const research=q.decode($("Read three Arc Research tabs").all().map(i=>i.json),'+JSON.stringify(base.datasets())+');const refs=arc.references($input.all().map(i=>i.json),'+JSON.stringify(registry)+','+JSON.stringify(specs)+');return [{json:arc.plan(research,$("Retain queue context").first().json.queue,$("Retain protection context").first().json.locks,$("Batch controls").first().json,new Date().toISOString(),$("Pending Inbox copy context").first().json.inbox,$("Pending Inbox links context").first().json.links,refs)}];')).name,
 add(w,base.code('Emit missing manual records','return $input.first().json.writes.map(json=>({json,pairedItem:{item:0}}));')).name,
 add(w,{...structuredClone(w.nodes.find(n=>n.name==='Upsert review queue')),name:'Insert missing manual records',id:undefined,parameters:{resource:'row',operation:'insert',dataTableId:structuredClone(w.nodes.find(n=>n.name==='Upsert review queue').parameters.dataTableId),columns:base.columns(),options:{optimizeBulk:false}},retryOnFail:false,onError:'stopWorkflow'}).name,
 add(w,{...structuredClone(w.nodes.find(n=>n.name==='Read durable review queue')),name:'Read persisted manual records',id:undefined,executeOnce:true}).name,
 add(w,base.code('Confirm manual intake durability',bundle('au500-manual-intake')+'return [{json:arc.persisted($("Plan fixed five manual intake").first().json,$("Retain queue context").first().json.queue,$input.all().map(i=>i.json).filter(r=>r.queue_key))}];')).name];
 names.slice(0,-1).forEach((n,i)=>edges(w,n,names[i+1]));w.nodeGroups.push({id:'au500-manual-intake',name:'Fixed manual source intake',description:'Create five absent held records, verify durable content and stop. No copy, provider or automatic Inbox refresh.',nodeNames:names});
}
function patch(before,role,datasets,specs){
 const w=structuredClone(before),diff=[];
 for(const n of w.nodes){if(!n.parameters?.jsCode)continue;const old=n.parameters.jsCode;n.parameters.jsCode=registries(refresh(old),datasets);if(n.parameters.jsCode!==old)diff.push(n.name);}
 if(role==='parent'){const n=w.nodes.find(n=>n.name==='Configure'),m=/const config=(\{[\s\S]*\});return/.exec(n.parameters.jsCode);assert.ok(m);const c=JSON.parse(m[1]);assert.equal(c.datasets.length,4);assert.equal(c.expected_lead_count,689);c.expected_lead_count=1189;n.parameters.jsCode=n.parameters.jsCode.replace(m[1],JSON.stringify(c));if(!diff.includes(n.name))diff.push(n.name);}
 if(role==='draft'){intakeBranch(w,specs);diff.push('Batch controls',...w.nodes.filter(n=>!before.nodes.some(x=>x.name===n.name)).map(n=>n.name));}
 for(const n of w.nodes)if(n.parameters?.jsCode)new (Object.getPrototypeOf(async function(){}).constructor)(n.parameters.jsCode);
 for(const n of before.nodes){const next=w.nodes.find(x=>x.name===n.name);assert.deepEqual(next.credentials,n.credentials);assert.deepEqual(next.position,n.position);}
 assert.equal(w.active,before.active);assert.deepEqual(w.settings,before.settings);if(role!=='draft'){assert.deepEqual(w.connections,before.connections);assert.deepEqual(w.nodeGroups,before.nodeGroups);}
 return {workflow:w,changed_nodes:[...new Set(diff)]};
}
function bootstrapGraph(control,dataset){
 const b=structuredClone(control);const url='https://sheets.googleapis.com/v4/spreadsheets/'+dataset.spreadsheet_id;
 const fields='spreadsheetId,properties,sheets(properties,data(startRow,startColumn,rowData(values(formattedValue,userEnteredValue,hyperlink,effectiveFormat(backgroundColor,backgroundColorStyle)))),merges,conditionalFormats,basicFilter,filterViews,protectedRanges)';
 const sourceGet=url+'?includeGridData=true&prettyPrint=false&fields='+encodeURIComponent(fields)+'&'+['Summary','500 Sharp ICPs','Method & Compliance'].map(t=>'ranges='+encodeURIComponent("'"+t+"'")).join('&');
 const nodes=[base.manual(),base.read('Read new workbook metadata',url+'?fields=spreadsheetId,properties,sheets.properties'),base.code('Require uninitialized exact workbook','const r=$input.first().json;if(r.spreadsheetId!=='+JSON.stringify(dataset.spreadsheet_id)+'||r.sheets.length!==3||r.sheets.some(s=>s.properties.title==="Arc Research"))throw Error("AU500_METADATA_STOP");return [{json:{url:'+JSON.stringify(sourceGet)+'}}];'),base.read('Read complete new source','={{ $json.url }}'),base.code('Plan held source initialization',bundle('au500-bootstrap')+'return [{json:arc.plan($input.first().json,'+JSON.stringify(dataset)+')}];'),base.code('Emit sequential initialization batches','return $input.first().json.batches.map(json=>({json,pairedItem:{item:0}}));'),{name:'One 25-row batch at a time',type:'n8n-nodes-base.splitInBatches',typeVersion:3,parameters:{batchSize:1,options:{}}},
 {...base.read('Write only new Arc Research','={{ $json.url }}'),parameters:{...base.read('x','x').parameters,method:'POST',sendBody:true,specifyBody:'json',jsonBody:'={{ $json.body }}',url:'={{ $json.url }}'}},base.code('Prepare exact chunk verification','const r=$input.first().json;if(r.spreadsheetId!=='+JSON.stringify(dataset.spreadsheet_id)+')throw Error("AU500_WRITE_ASSOCIATION_STOP");return [{json:{url:$("One 25-row batch at a time").item.json.verify_url}}];'),base.read('Read exact persisted chunk','={{ $json.url }}'),base.code('Verify chunk before advancing',bundle('au500-bootstrap')+'return [{json:arc.verify($("One 25-row batch at a time").item.json,$input.first().json)}];'),base.read('Read preserved source after initialization',sourceGet),base.code('Confirm source and initialization',bundle('au500-bootstrap')+'const after=arc.response($input.first().json),before=$("Plan held source initialization").first().json;if(arc.sourceHash(after)!==before.source_hash)throw Error("AU500_SOURCE_PRESERVATION_STOP");return [{json:{records:500,columns:221,batches:21,hold:"MANUAL_ONLY_SOURCE_INTAKE",source_hash:before.source_hash,source_writes:0,provider_calls:0}}];')];
 for(const n of nodes)if(['Read complete new source','Read preserved source after initialization'].includes(n.name))n.parameters.options.response={response:{responseFormat:'text',fullResponse:true}};
 b.nodes=nodes.map((n,i)=>{const old=control.nodes.find(x=>x.name===n.name);return {...old,...n,id:old?.id||n.name.toLowerCase().replace(/\W+/g,'-'),position:[i*240,0]};});b.connections={};nodes.slice(0,6).forEach((n,i)=>edges(b,n.name,nodes[i+1].name));b.connections[nodes[6].name]={main:[[{node:nodes[11].name,type:'main',index:0}],[{node:nodes[7].name,type:'main',index:0}]]};for(let i=7;i<10;i++)edges(b,nodes[i].name,nodes[i+1].name);edges(b,nodes[10].name,nodes[6].name);edges(b,nodes[11].name,nodes[12].name);b.active=false;b.nodeGroups=[{id:'au500-bootstrap',name:'Initialize held source',description:'New output only. Sequential bounded writes and independent readback; source tabs remain untouched.',nodeNames:nodes.slice(1).map(n=>n.name)}];b.settings={...control.settings,...base.SETTINGS,executionTimeout:180};return b;
}
function recoveryGraph(control,dataset,reviewed){
 const w=bootstrapGraph(control,dataset),source=w.nodes.find(n=>n.name==='Read complete new source');
 source.parameters.url=w.nodes.find(n=>n.name==='Read preserved source after initialization').parameters.url;
 const output=base.read('Read existing initialization values','={{ $json.url }}');output.parameters.options.response={response:{responseFormat:'text',fullResponse:true}};
 const prepare=base.code('Prepare independent output read','const m=$("Read new workbook metadata").first().json;if(m.spreadsheetId!=='+JSON.stringify(dataset.spreadsheet_id)+'||!Array.isArray(m.sheets))throw Error("AU500_RECOVERY_METADATA");const exists=m.sheets.some(s=>s.properties.title==="Arc Research");return [{json:{exists,url:'+JSON.stringify('https://sheets.googleapis.com/v4/spreadsheets/'+dataset.spreadsheet_id+'/values/'+encodeURIComponent("'Arc Research'!A1:HM501")+'?valueRenderOption=FORMULA')+'}}];');
 const gate={name:'Existing output?',type:'n8n-nodes-base.if',typeVersion:2.2,parameters:{conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict',version:2},conditions:[{id:'existing-output',leftValue:'={{ $json.exists }}',rightValue:'',operator:{type:'boolean',operation:'true',singleValue:true}}],combinator:'and'},options:{}}};
 const verify=base.code('Independent initialization receipt',bundle('au500-recovery')+'const m=$("Read new workbook metadata").first().json,s=$("Read complete new source").first().json,has=$("Prepare independent output read").first().json.exists;return [{json:arc.receipt(arc.reconcile(m,s,has?$input.first().json:null,'+JSON.stringify(dataset)+','+JSON.stringify(reviewed)+'))}];');
 const nodes=[w.nodes.find(n=>n.name==='Run manually'),w.nodes.find(n=>n.name==='Read new workbook metadata'),source,prepare,gate,output,verify];
 w.nodes=nodes.map((n,i)=>({...n,id:n.id||n.name.toLowerCase().replace(/\W+/g,'-'),position:[i*240,0]}));w.connections={};for(let i=0;i<4;i++)edges(w,nodes[i].name,nodes[i+1].name);
 w.connections[gate.name]={main:[[{node:output.name,type:'main',index:0}],[{node:verify.name,type:'main',index:0}]]};edges(w,output.name,verify.name);
 w.nodeGroups=[{id:'au500-reconciliation',name:'Read-only initialization reconciliation',description:'Exact source mapping and complete held output verification. No writes, retries, providers or source changes.',nodeNames:nodes.slice(1).map(n=>n.name)}];
 w.settings={...w.settings,saveManualExecutions:true,saveDataSuccessExecution:'all',saveDataErrorExecution:'all'};return w;
}
function completionGraph(control,dataset,reviewed,writeCeiling=21){
 assert.ok(Number.isInteger(writeCeiling)&&writeCeiling>=0&&writeCeiling<=21);
 const recovery=require('./au500-recovery'),bootstrap=require('./au500-bootstrap');
 // Range hashing and batch verification must not load the entire research engine on every loop.
 const lib='const MAX_RESPONSE='+bootstrap.MAX_RESPONSE+';const sha256=s=>require("crypto").createHash("sha256").update(s).digest("hex");const bootstrap={response:'+bootstrap.response.toString()+',HEADERS:'+JSON.stringify(bootstrap.HEADERS)+'};const chunks='+recovery.chunks.toString()+';const assemble='+recovery.assemble.toString()+';const verify='+recovery.verify.toString()+';const receipt='+recovery.receipt.toString()+';const arc={chunks,assemble,verify,receipt};\n';
 const w=recoveryGraph(control,dataset,reviewed),planner=bundle('au500-recovery'),args=JSON.stringify(dataset),review=JSON.stringify(reviewed);
 const http=(name,url)=>{const n=base.read(name,url);n.parameters.options.response={response:{responseFormat:'text',fullResponse:true}};return n;};
 const nodes=[base.manual(),w.nodes.find(n=>n.name==='Read new workbook metadata'),
 base.code('Prepare bounded source before',lib+'return arc.chunks($input.first().json,'+args+').map(json=>({json}));'),
 http('Read bounded source before','={{ $json.url }}'),
 base.code('Assemble source and prepare output',lib+'const m=$("Read new workbook metadata").first().json;const source=arc.assemble(m,$input.all().map(i=>i.json),$("Prepare bounded source before").all().map(i=>i.json),'+args+');return [{json:{source,exists:m.sheets.some(s=>s.properties.title==="Arc Research"),url:'+JSON.stringify('https://sheets.googleapis.com/v4/spreadsheets/'+dataset.spreadsheet_id+'/values/'+encodeURIComponent("'Arc Research'!A1:HM501")+'?valueRenderOption=FORMULA')+'}}];'),
 w.nodes.find(n=>n.name==='Existing output?'),w.nodes.find(n=>n.name==='Read existing initialization values'),
 base.code('Plan independently missing output',planner+'const c=$("Assemble source and prepare output").first().json;const plan=arc.reconcile($("Read new workbook metadata").first().json,c.source.snapshot,c.exists?$input.first().json:null,'+args+','+review+');if(plan.batches.length>'+writeCeiling+')throw Error("AU500_RECOVERY_WRITE_BUDGET");return [{json:plan}];'),
 {...w.nodes.find(n=>n.name==='Existing output?'),id:undefined,name:'Missing output batches?',parameters:{...w.nodes.find(n=>n.name==='Existing output?').parameters,conditions:{...w.nodes.find(n=>n.name==='Existing output?').parameters.conditions,conditions:[{id:'missing-output',leftValue:'={{ $json.batches.length > 0 }}',rightValue:'',operator:{type:'boolean',operation:'true',singleValue:true}}]}}},
 base.code('Emit only absent recovery batches','return $input.first().json.batches.map(json=>({json,pairedItem:{item:0}}));'),
 {name:'One missing batch at a time',type:'n8n-nodes-base.splitInBatches',typeVersion:3,parameters:{batchSize:1,options:{}}},
 {...base.read('Write only verified missing output','={{ $json.url }}'),parameters:{...base.read('x','x').parameters,method:'POST',sendBody:true,specifyBody:'json',jsonBody:'={{ $json.body }}',url:'={{ $json.url }}'}},
 base.code('Require write association and prepare verification','const r=$input.first().json,p=$("Plan independently missing output").first().json,b=$("One missing batch at a time").item.json;if(r.spreadsheetId!=='+JSON.stringify(dataset.spreadsheet_id)+')throw Error("AU500_RECOVERY_WRITE_ASSOCIATION");if(b.body.requests.some(q=>q.addSheet)&&(!r.replies?.[0]?.addSheet||r.replies[0].addSheet.properties.sheetId!==p.planned_sheet_id||r.replies[0].addSheet.properties.title!=="Arc Research"))throw Error("AU500_RECOVERY_CREATED_SHEET");return [{json:{url:b.verify_url}}];'),
 http('Read durable missing batch','={{ $json.url }}'),
 base.code('Record verified recovery batch',lib+'return [{json:arc.verify($("One missing batch at a time").item.json,$input.first().json)}];'),
 base.read('Read workbook metadata after completion',w.nodes.find(n=>n.name==='Read new workbook metadata').parameters.url),
 base.code('Prepare bounded source after',lib+'return arc.chunks($input.first().json,'+args+').map(json=>({json}));'),
 http('Read bounded source after','={{ $json.url }}'),
 base.code('Assemble preserved source after',lib+'const source=arc.assemble($("Read workbook metadata after completion").first().json,$input.all().map(i=>i.json),$("Prepare bounded source after").all().map(i=>i.json),'+args+');if(source.coverage_hash!==$("Assemble source and prepare output").first().json.source.coverage_hash)throw Error("AU500_RECOVERY_SOURCE_CHANGED");return [{json:{source,url:'+JSON.stringify('https://sheets.googleapis.com/v4/spreadsheets/'+dataset.spreadsheet_id+'/values/'+encodeURIComponent("'Arc Research'!A1:HM501")+'?valueRenderOption=FORMULA')+'}}];'),
 http('Read full durable initialization','={{ $json.url }}'),
 base.code('Verify complete durable initialization',planner+'const after=$("Assemble preserved source after").first().json.source,r=arc.reconcile($("Read workbook metadata after completion").first().json,after.snapshot,$input.first().json,'+args+','+review+');if(r.state!=="COMPLETE"||r.records!==500||r.batches.length)throw Error("AU500_RECOVERY_INCOMPLETE");return [{json:{...arc.receipt(r),source_coverage_hash:after.coverage_hash,source_ranges:after.source_ranges,verified_batches:$("Plan independently missing output").first().json.batches.length}}];'),
 base.code('Initialization completion receipt',lib+'const r=$input.first().json;return [{json:r.batches?{...arc.receipt(r),source_coverage_hash:$("Assemble source and prepare output").first().json.source.coverage_hash,source_ranges:$("Assemble source and prepare output").first().json.source.source_ranges,verified_batches:0}:r}];')];
 // The shared output-read nodes must refer to the bounded source context.
 nodes[5].parameters.conditions.conditions[0].leftValue='={{ $json.exists }}';nodes[6].parameters.url='={{ $json.url }}';
 w.nodes=nodes.map((n,i)=>({...n,id:control.nodes.find(x=>x.name===n.name)?.id||n.id||n.name.toLowerCase().replace(/\W+/g,'-'),position:[i*240,0]}));w.connections={};for(let i=0;i<5;i++)edges(w,nodes[i].name,nodes[i+1].name);
 w.connections[nodes[5].name]={main:[[{node:nodes[6].name,type:'main',index:0}],[{node:nodes[7].name,type:'main',index:0}]]};edges(w,nodes[6].name,nodes[7].name);edges(w,nodes[7].name,nodes[8].name);
 w.connections[nodes[8].name]={main:[[{node:nodes[9].name,type:'main',index:0}],[{node:nodes[21].name,type:'main',index:0}]]};edges(w,nodes[9].name,nodes[10].name);
 w.connections[nodes[10].name]={main:[[{node:nodes[15].name,type:'main',index:0}],[{node:nodes[11].name,type:'main',index:0}]]};for(let i=11;i<14;i++)edges(w,nodes[i].name,nodes[i+1].name);edges(w,nodes[14].name,nodes[10].name);for(let i=15;i<21;i++)edges(w,nodes[i].name,nodes[i+1].name);
 w.nodeGroups=[{id:'au500-completion',name:'Verify and complete missing held output',description:'Bounded source coverage, absent-only batches, independent durable readbacks and source preservation. No existing-row or provider writes.',nodeNames:nodes.slice(1).map(n=>n.name)}];return w;
}
function build(dir){
 const config=json(path.join(root,'config/datasets.json')),datasets=config.datasets;assert.equal(datasets.length,4);
 const specs=json(path.join(dir,'reference-specs.json')),manifest={dataset_id:DATASET,baseline_checkpoint:'82afa23',workflows:{},budget:{cloud_executions:4,google_gets:39,google_batch_updates:21,data_table_inserts:15,existing_row_updates:0,provider_calls:0}};
 const deploy={};
 for(const role of ['parent','worker','draft','review','sync','panel']){const before=json(path.join(dir,role+'-before.json')),result=patch(before,role,datasets,specs),w=result.workflow;manifest.workflows[role]={workflow_id:w.id,baseline_version:before.versionId,active:before.active,...artifact(dir,role+'-candidate',w),changed_nodes:result.changed_nodes};deploy[role]=operations(before,w);}
 for(const role of ['copy','zoho']){const before=json(path.join(dir,role+'-before.json'));manifest.workflows[role]={workflow_id:before.id,baseline_version:before.versionId,sha256:hash(before),unchanged:true};}
 const pilot=json(path.join(dir,'pilot.json'));for(const role of ['draft','sync']){const w=json(path.join(dir,role+'-candidate.json')),control=w.nodes.find(n=>n.name===(role==='draft'?'Batch controls':'Inbox controls'));const c={...pilot.controls};if(role==='draft'){
  control.parameters.jsCode='return [{json:'+JSON.stringify(c)+'}];';
  w.nodes.find(n=>n.name==='Read current duplicate references').parameters.options.response={response:{responseFormat:'json'}};
 }else{
  control.parameters.jsCode='return [{json:{...'+JSON.stringify(c)+',feedback:[]}}];';const plan=w.nodes.find(n=>n.name==='Plan safe Inbox projection');plan.parameters.jsCode=bundle(['phase2-inbox','au500-manual-intake'])+'const c=$("Inbox controls").first().json,queue=$("Backend context").first().json.queue,inbox=$("Inbox context").first().json.inbox,links=$("Inbox links context").first().json.links;const plan=arc.sync(queue,inbox,links,c,[]);__load("./au500-manual-intake").projection(plan,queue,inbox,links,c);return [{json:plan}];';for(const name of ['Upsert Outreach Inbox','Upsert Inbox links']){const n=w.nodes.find(n=>n.name===name);n.parameters.operation='insert';delete n.parameters.filters;delete n.parameters.matchType;assert.ok(!n.retryOnFail&&!n.onError);}
  const result=w.nodes.find(n=>n.name==='Inbox sync result');result.parameters.jsCode='const p=$("Plan safe Inbox projection").first().json;const expected=$("Associate persisted Inbox rows").all().map(i=>i.json),rows=$input.all().map(i=>i.json);if(rows.length!==5||rows.some(r=>!Number.isInteger(r.id)||!expected.some(e=>e.queue_key===r.queue_key&&e.inbox_id===r.inbox_id&&e.snapshot===r.snapshot&&e.backend_hash===r.backend_hash)))throw Error("AU500_LINK_PERSISTENCE_STOP");return [{json:p.summary}];';
 }
 const details=artifact(dir,role+'-pilot',w);manifest.workflows[role].pilot=details;const candidate=json(path.join(dir,role+'-candidate.json'));deploy[role+'-pilot']=operations(candidate,w);deploy[role+'-restore']=operations(w,candidate);}
 const control=json(path.join(dir,'control-before.json')),bootstrap=bootstrapGraph(control,datasets[3]);manifest.bootstrap={...artifact(dir,'bootstrap-candidate',bootstrap),target_workflow:bootstrap.id,baseline_version:control.versionId};deploy.bootstrap=operations(control,bootstrap);deploy['bootstrap-restore']=operations(bootstrap,control);
 for(const role of ['parent','worker','draft','review','sync','panel'])deploy[role+'-rollback']=operations(json(path.join(dir,role+'-candidate.json')),json(path.join(dir,role+'-before.json')));
 const payload=JSON.stringify(deploy,null,2);fs.writeFileSync(path.join(dir,'deployment-operations.json'),payload);manifest.operations_file_sha256=hash(payload);fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2));return manifest;
}
module.exports={patch,bootstrapGraph,recoveryGraph,completionGraph,build,hash,graphHash,operations,structureSdk};
if(require.main===module)console.log(JSON.stringify(build(path.resolve(process.argv[2])),null,2));
