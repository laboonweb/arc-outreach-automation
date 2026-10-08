'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const indexAPI=require('../scripts/parent-batch-index'),intake=require('../scripts/dataset-intake'),runtime=require('../scripts/cloud-research-runtime');
const {ALL_HEADERS}=require('../scripts/dataset-output'),{readTable}=require('../scripts/sheet-grid');
const {makeCloudParent}=require('../scripts/build-workflows');
const projectedIntake=require('../scripts/parent-dataset-intake');
const clone=x=>JSON.parse(JSON.stringify(x)),now='2026-10-06T03:00:00Z';
function sheet(title,sheetId,headerRow,headers,records){return {properties:{title,sheetId,gridProperties:{rowCount:1000,columnCount:300}},data:[{rowData:[...Array.from({length:headerRow-1},()=>({values:[]})),{values:headers.map(formattedValue=>({formattedValue}))},...records.map(r=>({values:headers.map(h=>({formattedValue:String(r[h]??''),userEnteredValue:{stringValue:String(r[h]??'')}}))}))]}]};}
function fixture(){
  const config=clone(require('../config/datasets.json'));Object.assign(config,{batch_size:25,expected_lead_count:689,parent_workflow_id:'SYNTHETIC_PARENT',exa_cost_ceiling_usd:3,tavily_credit_ceiling:150});
  const counts=[250,55,384],snapshots=config.datasets.map((d,i)=>{
    d.spreadsheet_id='synthetic_workbook_'+i;
    const rows=Array.from({length:counts[i]},(_,n)=>({ID:String(n+1),Business:'Business '+i+' '+String(n).padStart(4,'0'),Address:'Test '+i+' '+n,City:i===0?'Sydney NSW':'Manila',Facebook:n===4?'https://facebook.com/shared'+i:'',Notes:'Source text '.repeat(100)}));
    if(i===0){rows[2].Facebook=rows[4].Facebook;rows[3]['Manual decision']='Do not contact';}
    return {spreadsheetId:d.spreadsheet_id,sheets:[sheet(d.primary_sheet,1,d.header_row,['ID','Business','Address','City','Facebook','Notes','Manual decision'],rows),...Object.entries(d.supplemental_sheets).map(([name,h],j)=>sheet(name,j+2,h,['Business','Status','Notes'],[]))]};
  });
  const normalized=intake.normalizeSnapshots(snapshots,config,now),a=normalized.leads.filter(l=>l.dataset_id==='AUSTRALIA');
  const prior=a.slice(0,30).map((l,i)=>({lead_id:l.lead_id,arc_status:i===5?'PARKED':'NEEDS_RESEARCH',research_status:i<2?'COMPLETED':i===6?'PROVIDER_RETRY_REQUIRED':'',manual_status_override:i===7?'NEW':'',research_runtime_hold:i===8?'PHASE2_REVIEW_HISTORY_LOCK':'',evidence_json:JSON.stringify([{type:'unverified_note',excerpt:'Large bounded evidence '.repeat(400)}]),legacy_snapshot_json:'Legacy '.repeat(1000),manual_reset_reason:'Keep owner controls'}));
  snapshots[0].sheets.push(sheet('Arc Research',99,1,[...ALL_HEADERS,...runtime.RUNTIME_FIELDS.filter(f=>!ALL_HEADERS.includes(f))],prior));
  for(let i=1;i<3;i++)snapshots[i].sheets.push(sheet('Arc Research',99,1,ALL_HEADERS,[]));
  const metadata=snapshots.map(s=>({spreadsheetId:s.spreadsheetId,sheets:s.sheets.map(t=>({properties:t.properties}))}));
  snapshots.forEach(s=>s._metadata=metadata.find(m=>m.spreadsheetId===s.spreadsheetId));
  return {config,snapshots,metadata,items:snapshots.map(s=>({json:{data:JSON.stringify(s)}}))};
}
function selectedSnapshot(snapshot,ref){const s=clone(snapshot),output=s.sheets.find(t=>t.properties.title==='Arc Research'),grid=output.data[0].rowData;output.data=[{startRow:0,rowData:[grid[0]]},...(ref.research_row?[{startRow:ref.research_row-1,rowData:[grid[ref.research_row-1]]}]:[])];return s;}

test('an explicit targeted retry selects one completed held lead and passes only its scoped reason to the worker',()=>{
 const f=fixture(),first=indexAPI.buildIndex(f.items,f.metadata,f.config,now).records.find(r=>r.research_status==='COMPLETED'&&!r.protected_reason),config={...f.config,targeted_retry:{lead_id:first.lead_id,reason:'ACTIVITY_UNRESOLVED'}},idx=indexAPI.buildIndex(f.items,f.metadata,config,now),selected=indexAPI.select(idx,config,'RETRY',now);
 assert.equal(selected.batch.selected,1);assert.equal(selected.batch.remaining.length,0);assert.equal(selected.selected_ref.lead_id,first.lead_id);
 const snapshot=selectedSnapshot(f.snapshots.find(s=>s.spreadsheetId===first.source_spreadsheet_id),selected.selected_ref),worker=indexAPI.materialize(snapshot,selected,f.metadata,config,now);assert.equal(worker.config.discovery.retry_reason,'ACTIVITY_UNRESOLVED');
 assert.throws(()=>indexAPI.select(idx,{...config,targeted_retry:{lead_id:first.lead_id,reason:'FULL_RESEARCH'}},'BAD',now),/TARGETED_RETRY_CONFIGURATION/);
 const protectedRow=idx.records.find(r=>r.protected_reason);assert.throws(()=>indexAPI.select(idx,{...config,targeted_retry:{lead_id:protectedRow.lead_id,reason:'ACTIVITY_UNRESOLVED'}},'LOCKED',now),/NOT_ELIGIBLE/);
});
test('689-row compact selection matches the old protected eligibility, retry order and exact worker lead',()=>{
 const f=fixture(),original=JSON.stringify(f.snapshots),legacy=intake.normalizeSnapshots(f.snapshots,f.config,now),index=indexAPI.buildIndex(f.items,f.metadata,f.config,now);
 assert.equal(index.records.length,689);assert.equal(index.metrics.records_before_selection,689);
 assert.ok(!JSON.stringify(index).includes('Large bounded evidence'));assert.ok(!JSON.stringify(index).includes('Legacy Legacy'));assert.ok(!JSON.stringify(index).includes('rowData'));
 assert.ok(Buffer.byteLength(JSON.stringify(index))<Buffer.byteLength(JSON.stringify(legacy))/5);
 for(const size of [25,50,100]){
  const config={...f.config,batch_size:size},old=runtime.select(legacy,config,'same',now),fresh=indexAPI.select(index,config,'same',now);
  assert.equal(fresh.batch.selected,size);assert.deepEqual(fresh.batch,old.batch);assert.equal(fresh.selected_ref.lead_id,old.lead.lead_id);
  const snap=selectedSnapshot(f.snapshots.find(s=>s.spreadsheetId===fresh.selected_ref.source_spreadsheet_id),fresh.selected_ref),worker=indexAPI.materialize({json:{data:JSON.stringify(snap)}},fresh,f.metadata,config,now);
  assert.deepEqual(worker.lead,old.lead);assert.deepEqual(worker.config,old.config);assert.deepEqual(worker.cloud_batch,old.cloud_batch);
  assert.deepEqual(Object.keys(worker),['lead','config','cloud_batch']);assert.ok(!worker.batch);
 }
 assert.equal(JSON.stringify(f.snapshots),original);
});
test('25 preprocessing records stop before materialization, provider calls or writes',()=>{
 const f=fixture(),idx=indexAPI.buildIndex(f.items,f.metadata,f.config,now),out=indexAPI.select(idx,{...f.config,preprocessing_only:true},'PRE',now);
 assert.equal(out.pending,false);assert.equal(out.selected_refs.length,25);assert.equal(out.batch.remaining.length,25);assert.equal(out.summary.provider_requests,0);assert.equal(out.summary.source_writes,0);
 assert.ok(!out.lead&&!out.cloud_batch);assert.ok(out.metrics.selection_bytes<20000);
 const p=makeCloudParent();assert.equal(p.connections['Has eligible lead'].main[1][0].node,'Run complete');assert.equal(p.connections['Materialize selected lead'].main[0][0].node,'One lead at a time');
 assert.equal(p.nodes.find(n=>n.name==='Read source grids').parameters.options.response.response.responseFormat,'text');
});
test('exactly two lead cap, compact continuation, completion skip and source/owner changes stop dispatch',()=>{
 const f=fixture(),idx=indexAPI.buildIndex(f.items,f.metadata,f.config,now),ids=idx.records.filter(r=>r.eligible).slice(0,2).map(r=>r.lead_id),config={...f.config,validation_lead_ids:ids};
 const first=indexAPI.select(idx,config,'TWO',now);assert.equal(first.batch.selected,2);assert.equal(first.batch.remaining.length,1);
 first.batch.processed.push({lead_id:first.selected_ref.lead_id,status:'COMPLETED'});const second=indexAPI.select(idx,{...f.config,cloud_batch:clone(first.batch)},'CONT',now);assert.equal(second.selected_ref.lead_id,ids[1]);assert.equal(second.batch.remaining.length,0);
 second.batch.processed.push({lead_id:ids[1],status:'COMPLETED'});const done=indexAPI.select(idx,{...f.config,cloud_batch:second.batch},'DONE',now);assert.equal(done.pending,false);assert.equal(done.summary.processed,2);
 assert.throws(()=>indexAPI.select(idx,{...f.config,validation_lead_ids:[...ids,'third']},'BAD',now),/VALIDATION_CAP/);
 const fresh=indexAPI.select(idx,config,'CHECK',now),snap=selectedSnapshot(f.snapshots.find(s=>s.spreadsheetId===fresh.selected_ref.source_spreadsheet_id),fresh.selected_ref);
 const url=new URL(indexAPI.materializationRead(fresh,f.metadata,f.config).url);assert.ok(url.searchParams.getAll('ranges').includes("'Arc Research'!1:1"));assert.ok(!url.searchParams.getAll('ranges').includes("'Arc Research'"));
 const changed=clone(snap);changed.sheets[0].data[0].rowData[f.config.datasets[0].header_row].values[1].formattedValue='Changed source';assert.throws(()=>indexAPI.materialize(changed,fresh,f.metadata,config,now),/SOURCE_CHANGED/);
 const output=snap.sheets.find(s=>s.properties.title==='Arc Research'),col=readTable(output,1).headers.indexOf('manual_status_override');output.data[1].rowData[0].values[col].formattedValue='DO_NOT_CONTACT';assert.throws(()=>indexAPI.materialize(snap,fresh,f.metadata,config,now),/OUTPUT_CHANGED/);
 const dup=clone(idx);dup.source_hashes[f.config.datasets[0].spreadsheet_id]='different';assert.throws(()=>indexAPI.select(dup,{...f.config,cloud_batch:clone(first.batch)},'BAD',now),/SOURCE_CHANGED_DURING_BATCH/);
});
test('selected ID normalization validates the whole source identity universe',()=>{
 const f=fixture(),s=clone(f.snapshots[0]),rows=s.sheets[0].data[0].rowData,h=f.config.datasets[0].header_row;rows[h+20].values[0].formattedValue=rows[h+21].values[0].formattedValue;
 assert.throws(()=>projectedIntake.normalizeDataset(s,f.config.datasets[0],now,{selected_ids:new Set(['unselected'])}),/DUPLICATE_SOURCE_ID/);
});
test('values-only Arc read produces identical selection, prior row hash and source integrity hash',()=>{
 const f=fixture(),parts=f.snapshots.map(s=>{
  const output=s.sheets.find(t=>t.properties.title==='Arc Research'),table=readTable(output,1);
  const values={values:[table.headers,...table.rows.map(r=>table.headers.map(h=>r.values[h]||''))]},source=clone(s);source.sheets=source.sheets.filter(t=>t.properties.title!=='Arc Research');
  return indexAPI.indexWorkbook({json:{data:JSON.stringify(source)}},f.metadata,f.config,now,values);
 });
 const idx=indexAPI.combineIndex(parts,f.config),full=indexAPI.buildIndex(f.items,f.metadata,f.config,now);
 assert.deepEqual(idx.records,full.records);assert.deepEqual(idx.source_hashes,full.source_hashes);
 const chosen=indexAPI.select(idx,f.config,'VALUES',now),snap=selectedSnapshot(f.snapshots.find(s=>s.spreadsheetId===chosen.selected_ref.source_spreadsheet_id),chosen.selected_ref);
 assert.equal(indexAPI.materialize(snap,chosen,f.metadata,f.config,now).lead.lead_id,chosen.selected_ref.lead_id);
});

test('parent read preparation runs without URL globals in the Cloud Code sandbox',()=>{
 const vm=require('node:vm'),f=fixture(),p=makeCloudParent(),index=indexAPI.buildIndex(f.items,f.metadata,f.config,now),selection=indexAPI.select(index,f.config,'SANDBOX',now);
 const refs=name=>name==='Configure'?{first:()=>({json:f.config})}:{all:()=>f.metadata.map(json=>({json}))};
 const run=(name,input)=>vm.runInNewContext('(function(){'+p.nodes.find(n=>n.name===name).parameters.jsCode+'})()',{$:refs,$input:input,Buffer,require});
 const requests=run('Prepare source grids',{all:()=>f.metadata.map(json=>({json}))});
 assert.equal(requests.length,3);for(const r of requests)assert.ok(!new URL(r.json.url).searchParams.getAll('ranges').includes("'Arc Research'"));
 const request=run('Prepare selected lead read',{first:()=>({json:selection})});
 assert.ok(new URL(request[0].json.url).searchParams.getAll('ranges').includes("'Arc Research'!1:1"));
});

test('explicit maintenance retains the canonical full snapshot and normalization',()=>{
 const f=fixture(),config={...f.config,upsert_existing_ids:['maintenance-only']};
 const old=intake.normalizeSnapshots(f.snapshots,config,now),fresh=indexAPI.buildIndex(f.items,f.metadata,config,now);
 assert.equal(fresh.maintenance,true);assert.deepEqual(fresh.intake,old);
 const vm=require('node:vm'),code=makeCloudParent().nodes.find(n=>n.name==='Prepare source grids').parameters.jsCode;
 const requests=vm.runInNewContext('(function(){'+code+'})()',{$:()=>({first:()=>({json:config})}),$input:{all:()=>f.metadata.map(json=>({json}))},Buffer,require});
 for(const r of requests)assert.ok(new URL(r.json.url).searchParams.getAll('ranges').includes("'Arc Research'"));
});
