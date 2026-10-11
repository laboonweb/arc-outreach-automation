'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {structureSdk,operations,graphHash}=require('../scripts/build-au500-integration');
const {compact}=require('../scripts/workflow-sdk-compact');
const dir=path.join(__dirname,'../private/au500-implementation-20261011'),available=fs.existsSync(path.join(dir,'manifest.json'));
const read=f=>JSON.parse(fs.readFileSync(path.join(dir,f+'.json'),'utf8'));
function capture(sdk){
 const nodes=[],groups=[];const make=x=>{nodes.push(x);return {...x,output:()=>({to:()=>({})})};};const w={add:()=>w,group:(...g)=>{groups.push(g);return w;}};
 vm.runInNewContext(sdk.replace(/^import \{workflow,node,trigger,expr\} from '@n8n\/workflow-sdk';\r?\n/m,'').replace('export default ','const result='),{node:make,trigger:make,workflow:()=>w,expr:s=>'='+s});return {nodes,groups};
}
test('SDK transport reconstructs byte-identical runtime strings without modifying the workflow',()=>{
 const w={name:'Synthetic SDK preservation',nodes:[{name:'Synthetic',type:'n8n-nodes-base.code',typeVersion:2,parameters:{mode:'runOnceForAllItems',jsCode:'const value="\\n test $x 😀";return [{json:{value}}];'}}],connections:{},nodeGroups:[]};
 assert.equal(capture(compact(w)).nodes[0].config.parameters.jsCode,w.nodes[0].parameters.jsCode);assert.ok(structureSdk(w).length<300000);
});
test('six exact candidates preserve signing, credentials, activation, original group members and unaffected workflows',{skip:!available},()=>{
 for(const role of ['parent','worker','draft','review','sync','panel']){const before=read(role+'-before'),w=read(role+'-candidate');assert.equal(w.active,before.active);assert.deepEqual(w.settings,before.settings);for(const old of before.nodes){const next=w.nodes.find(n=>n.name===old.name);assert.deepEqual(next.credentials,old.credentials);assert.deepEqual(next.position,old.position);if(old.type!=='n8n-nodes-base.code')assert.deepEqual(next,old);}
  for(const group of before.nodeGroups)assert.deepEqual(w.nodeGroups.find(g=>g.id===group.id),group);const captured=capture(compact(w));for(const n of w.nodes.filter(n=>n.parameters?.jsCode))assert.equal(require('../scripts/helpers').sha256(captured.nodes.find(x=>x.config.name===n.name).config.parameters.jsCode),require('../scripts/helpers').sha256(n.parameters.jsCode));
 }
 const z=read('zoho-before');for(const name of ['Select one explicitly approved email','Verify persisted exact-content claim','Composio CREATE_DRAFT only']){const n=z.nodes.find(n=>n.name===name);assert.equal(n.type,'n8n-nodes-base.code');assert.match(n.parameters.jsCode,/throw Error\('AUTOMATED_ZOHO_UNAVAILABLE'\)/);}assert.ok(!z.nodes.some(n=>n.type==='n8n-nodes-base.httpRequest'&&/composio|zoho/i.test(n.parameters.url)));
 const panel=read('panel-candidate');assert.ok(panel.nodes.some(n=>n.name==='Existing Inbox review logic'&&n.parameters.jsCode.includes('"zoho_handoff_disabled":true')));
});
test('manual pilot graph inserts only; its persistence path cannot reach Grounded Copy or refresh another workflow',{skip:!available},()=>{
 const w=read('draft-pilot'),visited=new Set(),todo=['Prepare current duplicate references'];while(todo.length){const name=todo.pop();if(visited.has(name))continue;visited.add(name);for(const port of w.connections[name]?.main||[])for(const e of port)todo.push(e.node);}
 assert.ok(visited.has('Confirm manual intake durability'));assert.ok(!visited.has('Generate bounded grounded copy'));assert.ok(!visited.has('Refresh Outreach Inbox'));const insert=w.nodes.find(n=>n.name==='Insert missing manual records');assert.equal(insert.parameters.operation,'insert');assert.equal(insert.retryOnFail,false);
 const sync=read('sync-pilot');for(const name of ['Upsert Outreach Inbox','Upsert Inbox links'])assert.equal(sync.nodes.find(n=>n.name===name).parameters.operation,'insert');
 const off=read('draft-candidate').nodes.find(n=>n.name==='Batch controls');assert.match(off.parameters.jsCode,/"enabled":false/);
});
test('bootstrap graph has one sequential loop, exact new-book target, source-only preservation and disabled retention',{skip:!available},()=>{
 const w=read('bootstrap-candidate');assert.equal(w.active,false);assert.equal(w.settings.saveDataSuccessExecution,'none');assert.equal(w.nodes.filter(n=>n.type==='n8n-nodes-base.httpRequest'&&n.parameters.method==='POST').length,1);
 assert.equal(w.nodes.find(n=>n.type==='n8n-nodes-base.splitInBatches').parameters.batchSize,1);const after=w.nodes.find(n=>n.name==='Read preserved source after initialization');assert.ok(!after.parameters.url.includes('Arc%20Research'));assert.equal((after.parameters.url.match(/ranges=/g)||[]).length,3);assert.equal(after.parameters.options.response.response.responseFormat,'text');
 assert.ok(!w.nodes.some(n=>/dataTable|executeWorkflow|zoho|exa|tavily/i.test(n.type)));for(const name of ['draft-candidate','draft-pilot','sync-pilot','bootstrap-candidate'])assert.ok(structureSdk(read(name)).length<300000);
});
test('prepared granular deployment operations reproduce each reviewed candidate and restore its baseline',{skip:!available},()=>{
 function apply(before,ops){const w=structuredClone(before);for(const op of ops){const n=w.nodes.find(n=>n.name===op.nodeName);switch(op.type){
  case 'addNode':w.nodes.push(structuredClone(op.node));break;
  case 'updateNodeParameters':n.parameters=structuredClone(op.parameters);break;
  case 'setNodeSettings':Object.assign(n,op.settings);break;
  case 'setNodePosition':n.position=op.position;break;
  case 'removeNode':w.nodes=w.nodes.filter(n=>n.name!==op.nodeName);delete w.connections[op.nodeName];break;
  case 'removeConnection':{const outputs=w.connections[op.source][op.connectionType];outputs[op.sourceIndex]=outputs[op.sourceIndex].filter(e=>e.node!==op.target||e.index!==op.targetIndex);if(outputs.every(o=>!o.length))delete w.connections[op.source];break;}
  case 'addConnection':{w.connections[op.source]||={};const outputs=w.connections[op.source][op.connectionType]||=[];while(outputs.length<=op.sourceIndex)outputs.push([]);outputs[op.sourceIndex].push({node:op.target,index:op.targetIndex,type:op.connectionType});break;}
  case 'setNodeGroups':w.nodeGroups=structuredClone(op.nodeGroups);break;
  case 'setWorkflowSettings':Object.assign(w.settings,op.settings);break;
  default:assert.fail(op.type);
 }}return w;}
 for(const role of ['parent','worker','draft','review','sync','panel']){const before=read(role+'-before'),after=read(role+'-candidate'),ops=operations(before,after);assert.equal(ops.required_graph_sha256,graphHash(before));assert.equal(graphHash(apply(before,ops.operations)),graphHash(after));assert.equal(graphHash(apply(after,operations(after,before).operations)),graphHash(before));}
 for(const role of ['draft','sync']){const before=read(role+'-candidate'),after=read(role+'-pilot');assert.equal(graphHash(apply(before,operations(before,after).operations)),graphHash(after));assert.equal(graphHash(apply(after,operations(after,before).operations)),graphHash(before));}
 const before=read('control-before'),after=read('bootstrap-candidate');assert.equal(graphHash(apply(before,operations(before,after).operations)),graphHash(after));assert.equal(graphHash(apply(after,operations(after,before).operations)),graphHash(before));
});
