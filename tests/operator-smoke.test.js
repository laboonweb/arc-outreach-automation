'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const smoke=require('../scripts/build-operator-smoke');
const c={prefix:'Synthetic bounded smoke',queue_table:'synthetic-queue',lock_table:'synthetic-locks',inbox_table:'synthetic-inbox',inbox_links_table:'synthetic-links'};
const state=smoke.fixtures('2026-10-08T04:00:00.000Z','synthetic-regression');
test('smoke seed has no source/provider network node and retains only synthetic execution data',()=>{
 const w=smoke.control(c,state);assert.equal(w.active,false);assert.ok(w.nodes.every(n=>n.type!=='n8n-nodes-base.httpRequest'));assert.ok(!JSON.stringify(w).includes('sheets.googleapis.com'));
 const reads=w.nodes.filter(n=>n.type==='n8n-nodes-base.dataTable'&&n.parameters.operation==='get');assert.equal(reads.length,4);for(const n of reads){assert.equal(n.parameters.returnAll,false);assert.equal(n.parameters.limit,1);}
 assert.equal(w.settings.saveManualExecutions,true);assert.equal(w.settings.executionTimeout,60);
});
test('native seed guard rejects every populated table before inserts, including incomplete earlier seeding',()=>{
 const w=smoke.control(c,state),guard=w.nodes.find(n=>n.name==='Guard one-time synthetic seed'),names=w.nodes.filter(n=>n.name.startsWith('Check empty synthetic')).map(n=>n.name);
 const run=(populated,intent='SEED')=>vm.runInNewContext(guard.parameters.jsCode.replace('return [{json:', 'globalThis.result=[{json:'),{$:name=>({first:()=>({json:{mode:intent}}),all:()=>[{json:name===populated?{id:1}:{}}]})});
 assert.doesNotThrow(()=>run());for(const name of names)assert.throws(()=>run(name),/SMOKE_TABLES_NOT_EMPTY_DO_NOT_RESEED/);assert.throws(()=>run(undefined,'INTEGRITY'),/SMOKE_SEED_INTENT_REQUIRED/);
 const firstInsert=w.nodes.find(n=>n.name==='Emit exactly eight synthetic leads');assert.ok(w.connections[guard.name].main[0].some(e=>e.node===firstInsert.name));assert.ok(!w.connections['Seed synthetic fixtures?'].main[0].some(e=>e.node===firstInsert.name));
});
test('fixture reads associate all three books and exact requested rows without the browser URL global',()=>{
 const base=require('../scripts/build-phase2-cloud'),diagnostics=require('../scripts/phase2-panel-diagnostics'),registry=base.datasets(),input={queue:state.queue};
 const run=(kind,requests)=>vm.runInNewContext('(function(){'+smoke.fixtureRead(state,kind)+'})()',{$input:{all:()=>requests.map(json=>({json}))}}).map(i=>i.json);
 const all=run('all',base.researchRequests());assert.equal(all.length,3);all.forEach((r,i)=>assert.equal(r.spreadsheetId,registry[i].spreadsheet_id));
 const indices=run('index',diagnostics.indexRequests(input,registry)),requests=diagnostics.exactRequests(input,indices,registry),exact=run('exact',requests);
 assert.doesNotThrow(()=>diagnostics.attach(input,exact,indices,registry,'2026-10-08T04:00:00.000Z'));assert.equal(exact.flatMap(r=>r.valueRanges.slice(1)).length,diagnostics.targets(input).length);
 assert.throws(()=>run('all',[{url:'https://example.org/unexpected'}]),/SMOKE_UNEXPECTED_FIXTURE_URL/);
 assert.throws(()=>run('all',[{url:'https://sheets.googleapis.com/v4/spreadsheets/unlisted/values:batchGet?ranges=x'}]),/SMOKE_UNEXPECTED_FIXTURE_BOOK/);
});
