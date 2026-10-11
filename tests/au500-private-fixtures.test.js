'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const bootstrap=require('../scripts/au500-bootstrap'),manual=require('../scripts/au500-manual-intake'),q=require('../scripts/phase2-cloud-queue'),inbox=require('../scripts/phase2-inbox'),diag=require('../scripts/phase2-panel-diagnostics');
const dir=path.join(__dirname,'../private/au500-implementation-20261011'),source=path.join(__dirname,'../private/au500-integration-20261011');
const available=fs.existsSync(path.join(dir,'reference-responses-local.json')),read=f=>JSON.parse(fs.readFileSync(f,'utf8')),now='2026-10-11T10:00:00.000Z';
function fixture(){
 const registry=read(path.join(__dirname,'../config/datasets.json')).datasets,d=registry[3],snapshot=read(path.join(source,d.dataset_id+'.snapshot.json'));
 assert.equal(snapshot.sheet_ids_are_local_fixture_only,true);assert.throws(()=>bootstrap.plan(snapshot,d,now),/NATIVE_METADATA/);
 // These fabricated metadata IDs are local execution fixtures, never deployable artifacts.
 delete snapshot.sheet_ids_are_local_fixture_only;
 for(const t of read(path.join(source,'inventory-private.json')).find(x=>x.dataset===d.dataset_id).tabs.filter(t=>t.content))snapshot.sheets.push({properties:{title:t.sheet,sheetId:snapshot.sheets.length+1,gridProperties:{rowCount:t.rows,columnCount:t.columns}},data:[{rowData:t.content.map(v=>({values:v.map(x=>({formattedValue:String(x??'')}))}))}]});
 const p=bootstrap.plan(snapshot,d,now),responses=registry.slice(0,3).map(d=>{const sheet=read(path.join(source,d.dataset_id+'.snapshot.json')).sheets.find(s=>s.properties.title==='Arc Research'),t=require('../scripts/sheet-grid').readTable(sheet,1);return {spreadsheetId:d.spreadsheet_id,valueRanges:[{values:[t.headers,...t.rows.map(r=>t.headers.map(h=>r.values[h]??''))]}]};});
 responses.push({spreadsheetId:d.spreadsheet_id,valueRanges:[{values:[bootstrap.HEADERS,...p.batches.slice(1).flatMap(b=>b.expected)]}]});
 const prod=read(path.join(source,'production-readonly.json')),queue=read(path.join(dir,'rows-'+read(path.join(dir,'pilot.json')).controls.queue_table+'-before.json')).rows;
 return {registry,d,snapshot,p,responses,research:q.decode(responses,registry),queue,inbox:prod.inbox.rows,links:prod.links.rows,locks:prod.locks.rows,controls:read(path.join(dir,'pilot.json')).controls,refs:read(path.join(dir,'reference-responses-local.json')),specs:read(path.join(dir,'reference-specs.json'))};
}
async function run(w,name,contexts,input){
 const node=w.nodes.find(n=>n.name===name),items=rows=>rows.map(json=>({json}));
 const $=name=>({first:()=>items(contexts[name])[0],all:()=>items(contexts[name])});
 class FixedDate extends Date{constructor(...args){super(...(args.length?args:[now]));}}
 return new (Object.getPrototypeOf(async function(){}).constructor)('require','$','$input','Buffer','Date',node.parameters.jsCode)(name=>{assert.equal(name,'crypto');return require(name);},$,{first:()=>items(input)[0],all:()=>items(input)},Buffer,FixedDate);
}
test('saved 500-row source survives native-shaped bootstrap, current duplicate checks and both pilot Code paths',{skip:!available},async()=>{
 const f=fixture(),before=JSON.stringify({queue:f.queue,inbox:f.inbox,links:f.links,locks:f.locks,snapshot:f.snapshot});
 assert.equal(f.research.length,909);for(const b of f.p.batches)bootstrap.verify(b,{values:b.expected});
 const refs=manual.references(f.refs,f.registry.slice(0,3),f.specs),plan=manual.plan(f.research,f.queue,f.locks,f.controls,now,f.inbox,f.links,refs);assert.equal(plan.writes.length,5);
 const draft=read(path.join(dir,'draft-pilot.json')),contexts={'Batch controls':[f.controls],'Read three Arc Research tabs':f.responses,'Retain queue context':[{queue:f.queue}],'Retain protection context':[{locks:f.locks}],'Pending Inbox copy context':[{inbox:f.inbox}],'Pending Inbox links context':[{links:f.links}]};
 const actual=(await run(draft,'Plan fixed five manual intake',contexts,f.refs.map(r=>({statusCode:200,body:JSON.stringify(r)}))))[0].json;assert.deepEqual(actual,plan);
 const queue=[...f.queue,...plan.writes.map((r,i)=>({...r,id:10000+i}))];contexts['Plan fixed five manual intake']=[actual];assert.equal((await run(draft,'Confirm manual intake durability',contexts,queue))[0].json.persisted,5);
 await assert.rejects(run(draft,'Confirm manual intake durability',contexts,queue.slice(1)),/EXISTING_ROWS_CHANGED/);
 const sync=read(path.join(dir,'sync-pilot.json')),syncContexts={'Inbox controls':[f.controls],'Backend context':[{queue}],'Inbox context':[{inbox:f.inbox}],'Inbox links context':[{links:f.links}]};
 const projection=(await run(sync,'Plan safe Inbox projection',syncContexts,[{}]))[0].json;assert.equal(projection.writes.length,5);
 const views=projection.writes.map((r,i)=>({...Object.fromEntries(inbox.FIELDS.map(k=>[k,r[k]])),id:20000+i})),links=inbox.linkResults(projection,views);syncContexts['Plan safe Inbox projection']=[projection];syncContexts['Associate persisted Inbox rows']=links;
 assert.equal((await run(sync,'Inbox sync result',syncContexts,links.map((r,i)=>({...r,id:30000+i}))))[0].json.projected,5);
 const allInbox=[...f.inbox,...views],allLinks=[...f.links,...links];assert.deepEqual(inbox.sync(queue,allInbox,allLinks,f.controls,[],now).writes,[]);
 assert.deepEqual(inbox.sync(queue,allInbox,allLinks,{mode:'PRODUCTION',cap:'ALL'},[],now).writes,[]);
 assert.throws(()=>manual.plan(f.research,queue,f.locks,f.controls,now,allInbox,allLinks,refs),/EXISTING/);
 assert.equal(diag.targets({queue}).length,27);const indexes=f.responses.map(r=>({spreadsheetId:r.spreadsheetId,valueRanges:[{values:[r.valueRanges[0].values[0]]},{values:r.valueRanges[0].values.slice(1).map(v=>[v[0]])}]}));assert.ok(diag.indexRequests({queue},f.registry).length+diag.exactRequests({queue},indexes,f.registry).length<=8);
 assert.equal(JSON.stringify({queue:f.queue,inbox:f.inbox,links:f.links,locks:f.locks,snapshot:f.snapshot}),before);
 const sizes={offline_only:true,source_grid_bytes:Buffer.byteLength(JSON.stringify(f.snapshot)),output_values_bytes:Buffer.byteLength(JSON.stringify(f.responses[3])),maximum_write_bytes:Math.max(...f.p.batches.map(b=>Buffer.byteLength(JSON.stringify(b.body)))),reference_response_bytes:f.refs.map(r=>Buffer.byteLength(JSON.stringify(r))),queue_bytes:Buffer.byteLength(JSON.stringify(plan.writes)),inbox_bytes:Buffer.byteLength(JSON.stringify(views)),links_bytes:Buffer.byteLength(JSON.stringify(links)),held:27,pilot_ids:f.controls.manual_intake.source_ids,source_hash:f.p.source_hash};
 fs.writeFileSync(path.join(dir,'offline-runtime-results.json'),JSON.stringify(sizes,null,2));
});
