'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { OUTPUT_FIELDS } = require('./research-engine');
const { WEBSITE_STATUSES } = require('./website-check');
const root = path.resolve(__dirname, '..');
function bundle(entry = 'research-engine') {
  const modules = [];
  function visit(name) {
    if (modules.includes(name)) return;
    modules.push(name);
    const source = fs.readFileSync(path.join(__dirname, name + '.js'), 'utf8');
    for (const m of source.matchAll(/require\(['"]\.\/([^'"]+)['"]\)/g)) visit(m[1]);
  }
  for(const name of Array.isArray(entry)?entry:[entry])visit(name);
  return 'const __nativeRequire = require;\nconst __factories = {\n' + modules.map(name =>
    JSON.stringify('./' + name) + ': (module, exports, require) => {\n' + fs.readFileSync(path.join(__dirname, name + '.js'), 'utf8') + '\n}'
  ).join(',\n') + '\n};\nconst __cache = {};\nfunction __load(name) {\n' +
    'if (name === "crypto") return __nativeRequire(name);\n' +
    'if (__cache[name]) return __cache[name].exports;\n' +
    'if (!__factories[name]) throw new Error("Unsupported module: " + name);\n' +
    'const mod = {exports: {}}; __cache[name] = mod; __factories[name](mod, mod.exports, __load); return mod.exports;\n}\n' +
    'const arc = __load(' + JSON.stringify('./' + (Array.isArray(entry)?entry[0]:entry)) + ');\n';
}
function node(name, type, version, parameters, x, y, extra = {}) {
  return { id: name.toLowerCase().replace(/\W+/g, '-'), name, type: 'n8n-nodes-base.' + type, typeVersion: version, position: [x, y], parameters, ...extra };
}
function code(name, source, x, y, bundled = true) {
  return node(name, 'code', 2, { mode: 'runOnceForAllItems', jsCode: (bundled ? bundle(typeof bundled === 'string' ? bundled : 'research-engine') : '') + source }, x, y);
}
function discoveryBranch(name,expression,x,y){return node(name,'if',2.2,{conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict',version:2},conditions:[{id:'discovery-provider',leftValue:expression,rightValue:'',operator:{type:'boolean',operation:'true',singleValue:true}}],combinator:'and'},options:{}},x,y);}
function authenticatedProvider(name,provider,credential,x,y){
 const base=provider==='EXA'?'https://api.exa.ai/':'https://api.tavily.com/';
 return node(name,'httpRequest',4.2,{method:'POST',url:'={{ $json.pending.kind === "SEARCH" ? "'+base+'search" : "'+base+(provider==='EXA'?'contents':'extract')+'" }}',authentication:'genericCredentialType',genericAuthType:'httpHeaderAuth',sendHeaders:true,headerParameters:{parameters:[{name:'Content-Type',value:'application/json'},{name:'Accept',value:'application/json'}]},sendBody:true,specifyBody:'json',jsonBody:'={{ $json.pending.body }}',options:{timeout:18000,allowUnauthorizedCerts:false,redirect:{redirect:{followRedirects:false}},response:{response:{fullResponse:true,neverError:true,responseFormat:'text',outputPropertyName:'body'}}}},x,y,{credentials:{httpHeaderAuth:{name:credential}},onError:'continueRegularOutput',retryOnFail:false});
}
function workflow(name, nodes, edges) {
  const connections = {};
  for (const [from, to, output = 0] of edges) {
    connections[from] ||= { main: [] };
    while (connections[from].main.length <= output) connections[from].main.push([]);
    connections[from].main[output].push({ node: to, type: 'main', index: 0 });
  }
  return { name, nodes, connections, active: false, settings: {
    executionOrder: 'v1', saveDataErrorExecution: 'all', saveDataSuccessExecution: 'none',
    saveManualExecutions: false, executionTimeout: 180,
  }, pinData: {}, tags: [] };
}
function makeWorker() {
  return workflow('Arc | Research one lead | V1', [
    node('Research input', 'executeWorkflowTrigger', 1.1, { inputSource: 'passthrough' }, 0, 0),
    code('Initialize discovery', 'const input=$input.first().json; const config={...input.config,email_domain_cache:input.cloud_batch?.batch?.email_domain_cache||[]}; return [{json:arc.startDiscovery(input.lead,config)}];', 0, -400, 'discovery-engine'),
    code('Discovery request context', 'return [{json:arc.nextDiscoveryRequest($input.first().json)}];', 220, -400, 'discovery-engine'),
    node('Has discovery request', 'if', 2.2, {conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict',version:2},conditions:[{id:'discovery-pending',leftValue:'={{ Boolean($json.pending) }}',rightValue:'',operator:{type:'boolean',operation:'true',singleValue:true}}],combinator:'and'},options:{}},440,-400),
    node('Choose discovery endpoint', 'if', 2.2, {conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict',version:2},conditions:[{id:'origin-fallback',leftValue:'={{ $json.pending.kind === "ORIGIN" }}',rightValue:'',operator:{type:'boolean',operation:'true',singleValue:true}}],combinator:'and'},options:{}},660,-560),
    discoveryBranch('Choose email domain request','={{ $json.pending.kind === "EMAIL_DOMAIN" }}',660,-760),
    node('Pace email domain','wait',1.1,{resume:'timeInterval',amount:1,unit:'seconds'},880,-760),
    node('Inspect business email domain','httpRequest',4.2,{method:'GET',url:'={{ $json.pending.target_url }}',authentication:'none',sendHeaders:true,headerParameters:{parameters:[{name:'Accept',value:'text/html,application/xhtml+xml;q=0.9,text/plain;q=0.8,*/*;q=0.5'},{name:'Accept-Language',value:'en-AU,en;q=0.9'},{name:'Accept-Encoding',value:'identity'},{name:'Range',value:'bytes=0-32767'},{name:'User-Agent',value:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'}]},options:{timeout:12000,allowUnauthorizedCerts:false,redirect:{redirect:{followRedirects:false}},response:{response:{fullResponse:true,neverError:true,responseFormat:'text',outputPropertyName:'body'}}}},1100,-760,{onError:'continueRegularOutput',retryOnFail:false}),
    discoveryBranch('Authenticated discovery','={{ Boolean($json.autonomous) }}',880,-480),
    node('Pace authenticated discovery','wait',1.1,{resume:'timeInterval',amount:1,unit:'seconds'},1100,-480),
    discoveryBranch('Choose Exa or Tavily','={{ $json.pending.provider === "EXA" }}',1320,-480),
    authenticatedProvider('Authenticated Exa research','EXA','Arc n8n Research',1540,-560),
    authenticatedProvider('Tavily fallback research','TAVILY','Tavily API',1540,-400),
    node('Read verified public origin', 'httpRequest', 4.2, {method:'GET',url:'={{ $json.pending.target_url }}',authentication:'none',sendHeaders:true,headerParameters:{parameters:[{name:'Accept',value:'text/html'}]},options:{timeout:12000,allowUnauthorizedCerts:false,redirect:{redirect:{followRedirects:false}},response:{response:{fullResponse:true,neverError:true,responseFormat:'text',outputPropertyName:'body'}}}},880,-720,{onError:'continueRegularOutput',retryOnFail:false}),
    node('Discover public evidence', 'httpRequest', 4.2, {method:'POST',url:'={{ $json.pending.url }}',authentication:'none',sendHeaders:true,headerParameters:{parameters:[{name:'Content-Type',value:'application/json'},{name:'Accept',value:'application/json, text/event-stream'},{name:'MCP-Protocol-Version',value:'2024-11-05'}]},sendBody:true,specifyBody:'json',jsonBody:'={{ $json.pending.body }}',options:{timeout:12000,allowUnauthorizedCerts:false,redirect:{redirect:{followRedirects:false}},response:{response:{fullResponse:true,neverError:true,responseFormat:'text',outputPropertyName:'body'}}}},880,-560,{onError:'continueRegularOutput',retryOnFail:false}),
    code('Record discovery evidence', "return [{json:arc.consumeDiscoveryResponse($('Discovery request context').item.json,$input.first().json)}];",880,-560,'discovery-engine'),
    code('Discovery result', 'return [{json:arc.finishDiscovery($input.first().json)}];',660,-320,'discovery-engine'),
    code('Verify discovered identity', 'return [{json:arc.verifyDiscovery($input.first().json)}];',880,-320,'discovery-verifier'),
    code('Initialize research', 'const input = $input.first().json;\nreturn [{json: arc.startResearch(input.lead, input.config)}];', 220, 0),
    code('Request context', 'return [{json: arc.nextRequest($input.first().json)}];', 440, 0),
    node('Has request', 'if', 2.2, { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
      conditions: [{ id: 'pending', leftValue: '={{ Boolean($json.pending) }}', rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' }, options: {} }, 660, 0),
    node('Pace requests', 'wait', 1.1, { resume: 'timeInterval', amount: 1, unit: 'seconds' }, 880, -140),
    node('Fetch public page', 'httpRequest', 4.2, { method: 'GET', url: '={{ $json.pending.url }}', authentication: 'none',
      sendHeaders: true, headerParameters: { parameters: [{ name: 'User-Agent', value: 'ArcResearch/1.0 (reviewed business website checks)' }, { name: 'Accept', value: 'text/html' }] },
      options: { timeout: 15000, allowUnauthorizedCerts: false,
        redirect: { redirect: { followRedirects: false } },
        response: { response: { fullResponse: true, neverError: true, responseFormat: 'text', outputPropertyName: 'body' } } } }, 1100, -140,
      { onError: 'continueRegularOutput', retryOnFail: false }),
    code('Record observation', "const state = $('Request context').item.json;\nreturn [{json: arc.consumeResponse(state, $input.first().json)}];", 1320, -140),
    code('Research result', "const result = arc.finishResearch($input.first().json); const original=$('Research input').first().json;\nreturn [{json:{...result,provider_runtime:$('Discovery result').first().json.discovery,cloud_batch:original.cloud_batch||null}}];", 880, 160),
    discoveryBranch('Cloud batch result','={{ Boolean($json.cloud_batch) }}',1100,160),
    code('Read current output context',"return [{json:arc.workbookRead($input.first().json.cloud_batch)}];",1320,80,'cloud-research-runtime'),
    googleHTTP('Read current Arc and source','GET',1540,80),
    code('Plan immediate upsert',"const result=$('Research result').first().json;return [{json:arc.completion(result,result.provider_runtime,result.cloud_batch,$input.first().json)}];",1760,80,'cloud-research-runtime'),
    googleHTTP('Persist lead in Arc Research','POST',1980,80),
    code('Prepare upsert verification',"return [{json:$('Read current output context').first().json}];",2200,80,false),
    googleHTTP('Verify persisted research','GET',2420,80),
    code('Confirm durable result',"const plan=$('Plan immediate upsert').first().json;const proof=arc.confirm(plan,$input.first().json);return [{json:{cloud_batch:plan.cloud_batch.batch,parent_workflow_id:plan.cloud_batch.parent_workflow_id,proof,summary:arc.summary(plan.cloud_batch.batch),continue_batch:!plan.cloud_batch.batch.stop_reason&&plan.cloud_batch.batch.remaining.length>0}}];",2640,80,'cloud-research-runtime'),
    discoveryBranch('Continue manual batch','={{ $json.continue_batch }}',2860,80),
    node('Continue batch in Cloud','executeWorkflow',1.2,{source:'database',workflowId:{__rl:true,value:'={{ $json.parent_workflow_id }}',mode:'id'},mode:'each',options:{waitForSubWorkflow:false}},3080,0),
    code('Batch summary',"return [{json:$('Confirm durable result').first().json.summary}];",3300,80,false),
  ], [ ['Research input', 'Initialize discovery'], ['Initialize discovery','Discovery request context'],['Discovery request context','Has discovery request'],['Has discovery request','Choose email domain request',0],['Choose email domain request','Pace email domain',0],['Pace email domain','Inspect business email domain'],['Inspect business email domain','Record discovery evidence'],['Choose email domain request','Choose discovery endpoint',1],['Choose discovery endpoint','Read verified public origin',0],['Choose discovery endpoint','Authenticated discovery',1],['Authenticated discovery','Pace authenticated discovery',0],['Authenticated discovery','Discover public evidence',1],['Pace authenticated discovery','Choose Exa or Tavily'],['Choose Exa or Tavily','Authenticated Exa research',0],['Choose Exa or Tavily','Tavily fallback research',1],['Authenticated Exa research','Record discovery evidence'],['Tavily fallback research','Record discovery evidence'],['Read verified public origin','Record discovery evidence'],['Discover public evidence','Record discovery evidence'],['Record discovery evidence','Discovery request context'],['Has discovery request','Discovery result',1],['Discovery result','Verify discovered identity'],['Verify discovered identity','Initialize research'],['Initialize research', 'Request context'], ['Request context', 'Has request'],
    ['Has request', 'Pace requests', 0], ['Pace requests', 'Fetch public page'], ['Fetch public page', 'Record observation'],
    ['Record observation', 'Request context'], ['Has request', 'Research result', 1],['Research result','Cloud batch result'],['Cloud batch result','Read current output context',0],['Read current output context','Read current Arc and source'],['Read current Arc and source','Plan immediate upsert'],['Plan immediate upsert','Persist lead in Arc Research'],['Persist lead in Arc Research','Prepare upsert verification'],['Prepare upsert verification','Verify persisted research'],['Verify persisted research','Confirm durable result'],['Confirm durable result','Continue manual batch'],['Continue manual batch','Continue batch in Cloud',0],['Continue batch in Cloud','Batch summary'],['Continue manual batch','Batch summary',1] ]);
}
function googleHTTP(name, method, x, y) {
  return node(name, 'httpRequest', 4.2, { method, url: '={{ $json.url }}', authentication: 'predefinedCredentialType', nodeCredentialType: 'googleSheetsOAuth2Api',
    ...(method === 'POST' ? { sendBody: true, specifyBody: 'json', jsonBody: '={{ $json.body }}' } : {}),
    options: { timeout: 60000, redirect: { redirect: { followRedirects: false } }, batching: { batch: { batchSize: 1, batchInterval: 1000 } },
      response: { response: { responseFormat: 'json' } } } }, x, y, { retryOnFail: false });
}
function makeParent() {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'config/datasets.json'), 'utf8'));
  const registration = path.join(root, 'config/n8n-workflows.json');
  if (fs.existsSync(registration)) config.research_workflow_id = JSON.parse(fs.readFileSync(registration, 'utf8')).worker_id || config.research_workflow_id;
  return workflow('Arc | Three dataset research | V1', [
    node('Run manually', 'manualTrigger', 1, {}, 0, 0),
    code('Configure', 'return [{json: ' + JSON.stringify(config) + '}];', 220, 0, false),
    code('Prepare workbook reads', "return arc.metadataRequests($input.first().json).map(json => ({json}));", 440, 0, 'dataset-intake'),
    googleHTTP('Read workbook metadata', 'GET', 660, 0),
    code('Prepare source grids', "return arc.gridRequests($input.all().map(i=>i.json), $('Configure').first().json).map(json=>({json}));", 880, 0, 'dataset-intake'),
    googleHTTP('Read source grids', 'GET', 1100, 0),
    code('Normalize all datasets', "const config = $('Configure').first().json; config.datasets = arc.validateRegistry(config);\nconst metadata = $('Read workbook metadata').all().map(i=>i.json);\nconst snapshots = $input.all().map(i=>({...i.json, _metadata: metadata.find(m=>m.spreadsheetId===i.json.spreadsheetId)}));\nreturn [{json: arc.normalizeSnapshots(snapshots, config)}];", 1320, 0, 'dataset-intake'),
    code('Select bounded batch', "const batch = arc.selectBatch($input.first().json, $('Configure').first().json); if (!batch.length) throw new Error('EMPTY_BATCH_WINDOW'); return batch.map(json=>({json}));", 1540, 0, 'dataset-intake'),
    node('One lead at a time', 'splitInBatches', 3, {batchSize: 1, options: {}}, 1760, 0),
    node('Research one lead', 'executeWorkflow', 1.2, { source: 'database', workflowId: { __rl: true, value: "={{ $('Configure').first().json.research_workflow_id }}", mode: 'id' }, mode: 'each', options: {waitForSubWorkflow: true} }, 1980, 180),
    code('Plan Arc Research writes', "return arc.planOutputWrites($input.all().map(i=>i.json), $('Normalize all datasets').first().json, $('Configure').first().json).map(json=>({json}));", 1980, -100, 'dataset-output'),
    node('Dry run', 'if', 2.2, { conditions: { options: {caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2}, conditions: [{id:'dry', leftValue:'={{ $json.dry_run }}', rightValue:'', operator:{type:'boolean',operation:'true',singleValue:true}}], combinator:'and'}, options:{} }, 2200, -100),
    code('Preview only', "return $input.all().map(i=>({json:{dataset_id:i.json.dataset_id, rows:i.json.rows, status:'DRY_RUN_NO_WRITES', sending_enabled:false}}));", 2420, -220, false),
    googleHTTP('Write Arc Research', 'POST', 2420, 60),
    code('Run complete', "return [{json:arc.summarizeRun($('Normalize all datasets').first().json, $('Plan Arc Research writes').all().map(i=>i.json), $('Configure').first().json.dry_run)}];", 2640, -100, 'dataset-summary'),
  ], [['Run manually','Configure'],['Configure','Prepare workbook reads'],['Prepare workbook reads','Read workbook metadata'],['Read workbook metadata','Prepare source grids'],['Prepare source grids','Read source grids'],['Read source grids','Normalize all datasets'],['Normalize all datasets','Select bounded batch'],['Select bounded batch','One lead at a time'],['One lead at a time','Research one lead',1],['Research one lead','One lead at a time'],['One lead at a time','Plan Arc Research writes',0],['Plan Arc Research writes','Dry run'],['Dry run','Preview only',0],['Dry run','Write Arc Research',1],['Preview only','Run complete'],['Write Arc Research','Run complete']]);
}
function makeCloudParent(){
 const config=JSON.parse(fs.readFileSync(path.join(root,'config/datasets.json'),'utf8'));
 const registration=JSON.parse(fs.readFileSync(path.join(root,'config/n8n-workflows.json'),'utf8'));
 Object.assign(config,{dry_run:false,batch_size:25,expected_lead_count:689,exa_cost_ceiling_usd:3,tavily_credit_ceiling:150,research_workflow_id:registration.worker_id,parent_workflow_id:registration.parent_id});
 return workflow('Arc | Three dataset research | V1',[
  node('Run manually','manualTrigger',1,{},0,0),
  node('Batch settings','set',3.4,{mode:'manual',assignments:{assignments:[{id:'batch-size',name:'batch_size',type:'number',value:25},{id:'exa-ceiling',name:'exa_cost_ceiling_usd',type:'number',value:3},{id:'tavily-ceiling',name:'tavily_credit_ceiling',type:'number',value:150}]},includeOtherFields:false,options:{}},220,0,{notes:'Choose batch_size 25, 50 or 100, then Execute workflow. Sequential Cloud continuations stop at this batch. No scheduling or outreach.'}),
  node('Continue research batch','executeWorkflowTrigger',1.1,{inputSource:'passthrough'},0,200),
  code('Configure','const input=$input.first().json;const config='+JSON.stringify(config)+';return [{json:{...config,...input}}];',440,0,false),
  code('Prepare workbook reads','return arc.metadataRequests($input.first().json).map(json=>({json}));',660,0,'dataset-intake'),
  googleHTTP('Read workbook metadata','GET',880,0),
  code('Prepare source grids',"const config=$('Configure').first().json;return arc.gridRequests($input.all().map(i=>i.json),config).map(request=>{if(config.verification||config.bootstrap_receipts?.length||config.upsert_existing_ids?.length)return {json:request};const [base,query]=request.url.split('?');const compact=query.split('&').filter(p=>!(p.startsWith('ranges=')&&decodeURIComponent(p.slice(7))===\"'Arc Research'\"));return {json:{...request,url:base+'?'+compact.join('&')}};});",1100,0,'dataset-intake'),
  node('One workbook at a time','splitInBatches',3,{batchSize:1,options:{}},1320,0),
  {...googleHTTP('Read source grids','GET',1320,0),parameters:{...googleHTTP('Read source grids','GET',1320,0).parameters,options:{...googleHTTP('Read source grids','GET',1320,0).parameters.options,response:{response:{responseFormat:'text',outputPropertyName:'data'}}}}},
  code('Prepare output value read',"const request=$('One workbook at a time').item.json;const dataset=$('Configure').first().json.datasets.find(d=>d.dataset_id===request.dataset_id);return [{json:{url:'https://sheets.googleapis.com/v4/spreadsheets/'+dataset.spreadsheet_id+'/values/'+encodeURIComponent(\"'Arc Research'\")+'?valueRenderOption=FORMATTED_VALUE'}}];",1540,400,false),
  googleHTTP('Read output values','GET',1760,400),
  code('Index one workbook',"return [{json:arc.indexWorkbook($('Read source grids').item,$('Read workbook metadata').all().map(i=>i.json),$('Configure').first().json,undefined,$input.first().json)}];",1980,400,'parent-batch-index'),
  code('Build eligibility index',"return [{json:arc.combineIndex($input.all().map(i=>i.json),$('Configure').first().json)}];",1540,0,'parent-batch-index'),
  code('Select bounded batch',"return [{json:arc.select($input.first().json,$('Configure').first().json,$execution.id)}];",1760,0,'parent-batch-index'),
  discoveryBranch('Import prior completed results','={{ Boolean($json.bootstrap) }}',1980,0),
  code('Plan Arc Research writes',"return arc.bootstrap($('Build eligibility index').first().json.intake,$('Configure').first().json).map(json=>({json}));",2200,-140,'cloud-research-runtime'),
  googleHTTP('Write Arc Research','POST',2420,-140),
  code('Prepare import verification',"return $('Plan Arc Research writes').all().map(i=>({json:{url:i.json.verify_url}}));",2640,-140,false),
  googleHTTP('Read imported results','GET',2860,-140),
  code('Confirm imported results',"const plans=$('Plan Arc Research writes').all().map(i=>i.json);return [{json:{status:'PRIOR_RESULTS_IMPORTED',proofs:$input.all().map(i=>arc.confirm(plans.find(p=>p.source_spreadsheet_id===i.json.spreadsheetId),i.json)),provider_requests:0,sending_enabled:false}}];",3080,-140,'cloud-research-runtime'),
  discoveryBranch('Has eligible lead','={{ Boolean($json.pending) }}',2200,160),
  code('Prepare selected lead read',"return [{json:arc.materializationRead($input.first().json,$('Read workbook metadata').all().map(i=>i.json),$('Configure').first().json)}];",2420,400,'parent-batch-index'),
  {...googleHTTP('Read selected lead source','GET',2640,400),parameters:{...googleHTTP('Read selected lead source','GET',2640,400).parameters,options:{...googleHTTP('Read selected lead source','GET',2640,400).parameters.options,response:{response:{responseFormat:'text',outputPropertyName:'data'}}}}},
  code('Materialize selected lead',"return [{json:arc.materialize($input.first(),$('Select bounded batch').first().json,$('Read workbook metadata').all().map(i=>i.json),$('Configure').first().json)}];",2860,400,'parent-batch-index'),
  node('One lead at a time','splitInBatches',3,{batchSize:1,options:{}},2420,160),
  node('Research one lead','executeWorkflow',1.2,{source:'database',workflowId:{__rl:true,value:"={{ $('Configure').first().json.research_workflow_id }}",mode:'id'},mode:'each',options:{waitForSubWorkflow:false}},2640,240),
  code('Run complete',"const selected=$('Select bounded batch').first().json;if(selected.bootstrap)return $input.all();return [{json:selected.summary?{...selected.summary,metrics:selected.metrics,selected_refs:selected.selected_refs,source_hashes:selected.batch?.source_hashes}:{batch_id:selected.batch.id,status:'DISPATCHED_IN_CLOUD',selected:selected.batch.selected,sending_enabled:false}}];",3300,160,false),
 ],[['Run manually','Batch settings'],['Batch settings','Configure'],['Continue research batch','Configure'],['Configure','Prepare workbook reads'],['Prepare workbook reads','Read workbook metadata'],['Read workbook metadata','Prepare source grids'],['Prepare source grids','One workbook at a time'],['One workbook at a time','Read source grids',1],['Read source grids','Prepare output value read'],['Prepare output value read','Read output values'],['Read output values','Index one workbook'],['Index one workbook','One workbook at a time'],['One workbook at a time','Build eligibility index',0],['Build eligibility index','Select bounded batch'],['Select bounded batch','Import prior completed results'],['Import prior completed results','Plan Arc Research writes',0],['Plan Arc Research writes','Write Arc Research'],['Write Arc Research','Prepare import verification'],['Prepare import verification','Read imported results'],['Read imported results','Confirm imported results'],['Confirm imported results','Run complete'],['Import prior completed results','Has eligible lead',1],['Has eligible lead','Prepare selected lead read',0],['Prepare selected lead read','Read selected lead source'],['Read selected lead source','Materialize selected lead'],['Materialize selected lead','One lead at a time'],['Has eligible lead','Run complete',1],['One lead at a time','Research one lead',1],['Research one lead','Run complete'],['One lead at a time','Run complete',0]]);
}
function sdkValue(value, key = '') {
  if (typeof value === 'string' && value.startsWith('={{')) return 'expr(' + JSON.stringify(value.slice(1)) + ')';
  if (Array.isArray(value)) return '[' + value.map(v=>sdkValue(v)).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value).map(([k,v])=>JSON.stringify(k)+':'+sdkValue(v,k)).join(',') + '}';
  return JSON.stringify(value);
}
function sdk(data) {
  const names = new Map(data.nodes.map((n,i)=>[n.name,'n'+i]));
  let source = "import { workflow, node, trigger, expr, newCredential } from '@n8n/workflow-sdk';\n";
  const entries=[...new Set(data.nodes.flatMap(n=>{const m=n.parameters.jsCode?.match(/\nconst arc = __load\("\.\/([^"\n]+)"\);\n/);return m?[m[1]]:[];}))];
  const common=entries.length?bundle(entries).replace(/const arc = __load\([^\n]+\);\n$/,''):'';
  // A template literal preserves identical Code text with less quote/newline
  // escaping, keeping the bounded worker below the Cloud SDK import ceiling.
  if(common)source+='const codeModules = `'+common.replace(/\\/g,'\\\\').replace(/`/g,'\\`').replace(/\$\{/g,'\\${')+'`;\n';
  const sample = { lead_id:'arc_sample', status:'RESEARCH_ONLY', dry_run:true, autonomous:true, cloud_batch:{batch:{id:'SAMPLE'}},continue_batch:true,bootstrap:false,parent_workflow_id:'CONFIGURE_PARENT',pending:{kind:'SEARCH',provider:'EXA',target_url:'https://example.org/',url:'https://api.exa.ai/search',body:{query:'Synthetic business'}}, url:'https://sheets.googleapis.com/v4/spreadsheets/SAMPLE', body:{requests:[]}, research_workflow_id:'CONFIGURE_WORKER' };
  source+='const sampleOutput = '+JSON.stringify([sample])+';\n';
  for (const n of data.nodes) {
    const {id,type,typeVersion,position,...config} = n;
    let configSource = sdkValue(config);
    if(n.parameters.jsCode){const m=n.parameters.jsCode.match(/\nconst arc = __load\("\.\/([^"\n]+)"\);\n/);if(m){const end=m.index+m[0].length;configSource=configSource.replace(JSON.stringify(n.parameters.jsCode),'codeModules+'+JSON.stringify('const arc = __load("./'+m[1]+'");\n'+n.parameters.jsCode.slice(end)));}}
    if (n.parameters.nodeCredentialType) configSource = configSource.slice(0,-1) + ',credentials:{googleSheetsOAuth2Api:newCredential("Google Sheets OAuth2")}}';
    source += 'const '+names.get(n.name)+' = '+(/Trigger$/.test(type)?'trigger':'node')+'({type:'+JSON.stringify(type)+',version:'+typeVersion+',config:'+configSource+',output:sampleOutput});\n';
  }
  source += 'export default workflow("arc-research",'+JSON.stringify(data.name)+')';
  for (const n of data.nodes) source += '\n.add('+names.get(n.name)+')';
  for (const [from,c] of Object.entries(data.connections)) c.main.forEach((edges,i)=>edges.forEach(e=>{source+='\n.add('+names.get(from)+'.output('+i+').to('+names.get(e.node)+'))';}));
  const members = data.nodes.filter(n=>!/Trigger$/.test(n.type)&&n.name!=='Batch settings').map(n=>names.get(n.name));
  source += '\n.group("Research only",['+members.join(',')+'],{description:"Read supplied sources, preserve history, and produce evidence for human review. No outreach."});\n';
  return source;
}
function makeErrorWorkflow() {
  return workflow('Arc | Research errors | V1', [node('Execution failed', 'errorTrigger', 1, {}, 0, 0),
    code('Safe failure summary', "const e = $input.first().json;\nconst event = {event: 'research_failed', execution_id: e.execution?.id || '', workflow_name: e.workflow?.name || '', last_node: e.execution?.lastNodeExecuted || '', action: 'Inspect failed execution before rerunning. No sending exists in V1.'};\nconsole.error(JSON.stringify(event));\nreturn [{json: event}];", 240, 0, false)
  ], [['Execution failed', 'Safe failure summary']]);
}
function generate() {
  for (const [filename, data] of Object.entries({ 'lead-research.json': makeCloudParent(), 'research-one-lead.json': makeWorker(), 'research-errors.json': makeErrorWorkflow() })) {
    fs.writeFileSync(path.join(root, 'workflows', filename), JSON.stringify(data, null, 2) + '\n');
    fs.writeFileSync(path.join(root, 'workflows', filename.replace('.json','.sdk.js')), sdk(data));
  }
  fs.writeFileSync(path.join(root, 'examples', 'research-headers.csv'), require('./dataset-output').ALL_HEADERS.join(',') + '\n');
  const inputFields = ('lead_id source_record_id business_name industry country city state maps_url website_url facebook_url instagram_url linkedin_url existing_email phone website_ownership_verified timezone_override input_notes approved outreach_status suppressed last_contacted_at next_followup_at campaign_id recipient message_hash message_id sent_at').split(' ');
  for (const prefix of ['activity', 'gap', 'buying_trigger', 'proof', 'contact', 'decision_maker', 'instagram', 'facebook', 'linkedin', 'consent']) {
    inputFields.push(...['verified', 'source_url', 'date', 'evidence'].map(suffix => prefix + '_' + suffix));
  }
  inputFields.push('activity_status', 'gap_unresolved_verified', 'contact_email', 'contact_source_type',
    'decision_maker_name_reviewed', 'decision_maker_role_reviewed', 'instagram_status_reviewed', 'facebook_status_reviewed',
    'linkedin_status_reviewed', 'consent_recipient', 'role_relevance_verified', 'no_solicitation_checked');
  inputFields.push(...[...require('./dataset-intake').REVIEW_FIELDS, 'dataset_id','source_spreadsheet_id','source_sheet','source_row','source_original_id'].filter(f=>!inputFields.includes(f)));
  fs.writeFileSync(path.join(root, 'examples', 'leads-headers.csv'), inputFields.join(',') + '\n');
  fs.writeFileSync(path.join(root, 'schemas', 'lead-input.schema.json'), JSON.stringify({
    $schema: 'https://json-schema.org/draft/2020-12/schema', title: 'Normalized Arc lead input', type: 'object',
    required: ['business_name', 'country'], anyOf: [{ required: ['city'] }, { required: ['source_record_id'] }],
    additionalProperties: true, properties: Object.fromEntries(inputFields.map(field => [field,
      field.endsWith('_verified') || ['suppressed', 'no_solicitation_checked', 'activity_corroborated'].includes(field)
        ? { type: ['string', 'boolean', 'number'] } : { type: 'string', ...(['business_name', 'country', 'city', 'source_record_id'].includes(field) ? { minLength: 1 } : {}) }]))
  }, null, 2) + '\n');
  const numberFields = new Set(['business_status_confidence', 'lead_score', 'confidence_score']);
  const properties = Object.fromEntries(OUTPUT_FIELDS.map(field => [field, { type: numberFields.has(field) ? 'number' : ['research_required', 'pain_verified'].includes(field) ? 'boolean' : field === 'website_http_code' ? ['number', 'string'] : 'string' }]));
  for (const f of ['legacy_status_imported','legacy_recheck_required','legacy_join_review_required','legacy_colour_review_required','initial_contact_recorded','duplicate_review_required','initial_outreach_blocked','research_skipped']) properties[f] = {type:'boolean'};
  properties.website_status.enum = [...new Set([...WEBSITE_STATUSES, 'UNCERTAIN','LIVE_STRONG_SITE','LIVE_SITE_WITH_GAP','BROKEN_SITE','DEAD_DOMAIN','SOCIAL_ONLY','BOOKING_PLATFORM_ONLY','THIRD_PARTY_ONLY'])];
  properties.business_status.enum = ['ACTIVE', 'LIKELY_ACTIVE', 'UNCERTAIN', 'LIKELY_INACTIVE', 'INACTIVE'];
  properties.lead_quality.enum = ['HIGH', 'MEDIUM', 'LOW', 'PARK', 'DISQUALIFY'];
  properties.commercial_quality.enum = ['HIGH','MEDIUM','LOW','DISQUALIFY'];
  properties.contactability.enum = ['STRONG','USABLE','WEAK','NONE'];
  properties.research_confidence.enum = ['HIGH','MEDIUM','LOW'];
  properties.outreach_readiness.enum = ['READY_FOR_REVIEW','NEEDS_RESEARCH','NEEDS_COMPLIANCE_REVIEW','PARK','BLOCKED'];
  properties.compliance_status.enum = ['SAFE_TO_REVIEW','QUESTIONABLE','DO_NOT_EMAIL','NOT_APPLICABLE'];
  properties.acma_status.enum = ['SAFE_TO_REVIEW', 'QUESTIONABLE', 'DO_NOT_EMAIL','NOT_APPLICABLE'];
  properties.recommended_channel.enum = ['EMAIL_CANDIDATE', 'IG_MANUAL', 'FB_MANUAL', 'LINKEDIN_MANUAL', 'WHATSAPP_MANUAL','VIBER_MANUAL','BUSINESS_CONTACT_MANUAL','PARK'];
  properties.lead_id.pattern = '^arc_[a-f0-9]{64}$';
  fs.writeFileSync(path.join(root, 'schemas', 'research-result.schema.json'), JSON.stringify({ $schema: 'https://json-schema.org/draft/2020-12/schema', title: 'Arc V1 research result', type: 'object', additionalProperties: false, required: OUTPUT_FIELDS, properties }, null, 2) + '\n');
}
function generateParent() {
  const data=makeCloudParent();
  fs.writeFileSync(path.join(root,'workflows/lead-research.json'),JSON.stringify(data,null,2)+'\n');
  fs.writeFileSync(path.join(root,'workflows/lead-research.sdk.js'),sdk(data));
}
if (require.main === module) { if(process.argv.includes('--parent-only')){generateParent();console.log('Generated parent research workflow only.');}else{generate();console.log('Generated 3 research workflows, output schema and Research headers.');} }
module.exports = { bundle, makeWorker, makeParent, makeCloudParent, makeErrorWorkflow, generate, generateParent, sdk };
