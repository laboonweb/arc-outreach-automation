'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {normalizeSnapshots,metadataRequests,gridRequests,validateRegistry,selectBatch} = require('../scripts/dataset-intake');
const {ALL_HEADERS,planOutputWrites} = require('../scripts/dataset-output');
const {runResearch,OUTPUT_FIELDS} = require('../scripts/research-engine');
const {readTable,colourHex} = require('../scripts/sheet-grid');
const {detectDuplicates} = require('../scripts/duplicate-detection');
const {interpretHistory,reconcileStatus} = require('../scripts/legacy-status');
const {makeParent,makeWorker} = require('../scripts/build-workflows');
const clone = x=>JSON.parse(JSON.stringify(x));
const now = '2026-10-03T03:00:00Z';
function sheet(title,id,header,records) {
  const headers = [...new Set(records.flatMap(Object.keys))];
  const rows = Array.from({length:header-1},()=>({values:[]}));
  rows.push({values:headers.map(formattedValue=>({formattedValue}))});
  for(const r of records) rows.push({values:headers.map(h=>({formattedValue:String(r[h]??'')}))});
  return {properties:{title,sheetId:id,gridProperties:{rowCount:1000,columnCount:300}},data:[{rowData:rows}]};
}
function fixture() {
  const config=clone(require('../config/datasets.example.json'));
  config.limit_per_dataset=5;
  config.datasets.forEach((d,i)=>{d.spreadsheet_id='synthetic_workbook_'+i;d.all_leads_previously_contacted=false;});
  const snapshots=config.datasets.map((d,i)=>({spreadsheetId:d.spreadsheet_id,sheets:[
    sheet(d.primary_sheet,1,d.header_row,i===0?[
      {ID:'1',Business:'Red Clinic',City:'Werribee VIC'}, {ID:'2',Business:'Green Clinic',City:'Perth WA'},
      {ID:'3',Business:'Yellow Clinic',City:'Adelaide SA'}, {ID:'4',Business:'White Clinic',City:'Sydney NSW'}
    ]: i===1?[{Rank:'1',Business:'Shared Cafe','City / Location':'Makati',Facebook:'https://facebook.com/sharedcafe'}, {Rank:'2',Business:'No History Cafe','City / Location':'Manila'}]:[
      {ID:'1',Business:'Shared Cafe',Address:'One Test Road',Socials:'https://facebook.com/sharedcafe','Manual decision':'Unreviewed'},
      {ID:'2',Business:'Second Clinic',Address:'Two Test Road','Manual decision':'Unreviewed'}]),
    ...Object.entries(d.supplemental_sheets).map(([title,header],j)=>sheet(title,j+2,header,title==='Follow Up'?
      [{Prospect:'Shared Cafe','First touch':'Email','Follow-up channel':'Messenger',Status:'Follow up if >=2-3 days'}]:[{Business:'Unmatched reference',Notes:'Reference only'}]))
  ]}));
  const rows=snapshots[0].sheets[0].data[0].rowData;
  for(const [i,rgb] of [[0,{red:1}],[1,{red:78/255,green:167/255,blue:46/255}],[2,{red:1,green:1}]]) rows[5+i].values[1].effectiveFormat={backgroundColorStyle:{rgbColor:rgb}};
  return {config,snapshots};
}
function applyPlan(snapshot,plan) {
  for(const request of plan.body.requests) {
    if(request.addSheet) snapshot.sheets.push({properties:clone(request.addSheet.properties),data:[{rowData:[]}]});
    if(request.appendDimension) {const p=request.appendDimension;const s=snapshot.sheets.find(s=>s.properties.sheetId===p.sheetId);s.properties.gridProperties[p.dimension==='ROWS'?'rowCount':'columnCount']+=p.length;}
    if(request.insertDimension) {const p=request.insertDimension.range;const s=snapshot.sheets.find(s=>s.properties.sheetId===p.sheetId);const length=p.endIndex-p.startIndex;s.properties.gridProperties.columnCount+=length;for(const row of s.data[0].rowData){row.values.splice(p.startIndex,0,...Array.from({length},()=>({})));}}
    if(request.updateCells) {const p=request.updateCells;const s=snapshot.sheets.find(s=>s.properties.sheetId===p.start.sheetId);s.data[0] ||= {rowData:[]};const rows=s.data[0].rowData;
      p.rows.forEach((row,k)=>{const index=p.start.rowIndex+k;rows[index] ||= {values:[]};row.values.forEach((cell,j)=>{rows[index].values[p.start.columnIndex+j]=clone(cell);});});}
  }
}
test('registry validates three distinct workbooks and formatted read masks',()=>{
  const {config,snapshots}=fixture();assert.equal(metadataRequests(config).length,3);
  const unconfigured=clone(config);unconfigured.datasets[0].spreadsheet_id='AUSTRALIA_SPREADSHEET_ID';
  assert.throws(()=>validateRegistry(unconfigured),/CONFIGURE_SPREADSHEET/);
  const bad=clone(config);bad.datasets[1].spreadsheet_id=bad.datasets[0].spreadsheet_id;assert.throws(()=>validateRegistry(bad),/SEPARATE/);
  for(const request of gridRequests(snapshots,config)){const u=new URL(request.url);const f=u.searchParams.get('fields');assert.equal((f.match(/\(/g)||[]).length,(f.match(/\)/g)||[]).length);assert.match(f,/effectiveFormat/);assert.ok(!u.searchParams.getAll('ranges').includes("'Summary'"));}
});
test('real header positions, initial colours, history and cross-dataset duplicate locks',()=>{
  const {config,snapshots}=fixture();const intake=normalizeSnapshots(snapshots,config,now);
  assert.deepEqual(intake.leads.slice(0,4).map(l=>l.arc_status),['DISQUALIFIED','SENT','PARKED','NEEDS_RESEARCH']);
  const shared=intake.leads.filter(l=>l.business_name==='Shared Cafe');assert.equal(shared.length,2);assert.ok(shared.every(l=>l.duplicate_review_required&&l.initial_outreach_blocked));
  assert.equal(shared[0].arc_status,'SENT');assert.equal(shared[0].first_contact_channel,'Email');assert.equal(shared[0].followup_due_at,'');
  assert.equal(shared[1].arc_status,'NEEDS_RESEARCH');assert.equal(shared[1].initial_contact_recorded,false);
  assert.equal(intake.leads[0].source_row,6);
  assert.equal(colourHex({effectiveFormat:{backgroundColorStyle:{themeColor:'ACCENT_6'}}},{themeColors:[{colorType:'ACCENT_6',color:{rgbColor:{red:78/255,green:167/255,blue:46/255}}}]}),'4EA72E');
});
test('terminal states never revive; documented reset permits research, source suppression wins',()=>{
  for(const arc_status of ['DISQUALIFIED','SENT','PARKED','REPLIED','DO_NOT_CONTACT']) assert.equal(reconcileStatus({}, {arc_status},'READY_DM'),arc_status);
  const previous={arc_status:'DISQUALIFIED',legacy_status_imported:true,manual_status_override:'NEEDS_RESEARCH',manual_reset_at:now,manual_reset_reason:'Reviewed business again'};
  assert.equal(reconcileStatus({status_signals:[{kind:'colour',status:'DISQUALIFIED'}]},previous,'READY_DM'),'READY_DM');
  assert.equal(reconcileStatus({status_signals:[{status:'DO_NOT_CONTACT'}]},previous,'READY_DM'),'DO_NOT_CONTACT');
  assert.equal(interpretHistory([{sheet:'CRM',values:{'Send Status':'Not sent',Response:'No reply'}}],now).initial_contact_recorded,false);
  const due=interpretHistory([{sheet:'Follow Up',values:{'First touch':'Email','Follow-up Date':'2026-10-01'}}],now);assert.equal(due.status,'FOLLOW_UP_DUE');
});
test('owner-confirmed legacy contacts lock every lead and preserve explicit disqualification without inventing history',()=>{
  const {config,snapshots}=fixture();const legacy=config.datasets[1];legacy.all_leads_previously_contacted=true;
  const noHistory=snapshots[1].sheets[0].data[0].rowData[6];
  let intake=normalizeSnapshots(snapshots,config,now);let leads=intake.leads.filter(l=>l.dataset_id==='MANILA_LEGACY');
  assert.ok(leads.every(l=>l.initial_contact_recorded&&l.initial_outreach_blocked));
  assert.equal(leads[1].arc_status,'SENT');assert.equal(leads[1].first_contact_at,'');assert.equal(leads[1].first_contact_channel,'');
  assert.match(leads[1].legacy_snapshot_json,/Owner confirmation/);
  const primary=snapshots[1].sheets[0];primary.data[0].rowData[4].values.push({formattedValue:'Manual decision'});
  noHistory.values.push({formattedValue:'Disqualified'});
  leads=normalizeSnapshots(snapshots,config,now).leads.filter(l=>l.dataset_id==='MANILA_LEGACY');
  assert.equal(leads[1].arc_status,'DISQUALIFIED');assert.equal(leads[1].skip_research,true);assert.equal(leads[1].initial_contact_recorded,true);
});
test('PH social-only qualification requires neither email, decision-maker nor trigger',async()=>{
  const fact=p=>({[p+'_verified']:true,[p+'_date']:'2026-10-01',[p+'_source_url']:'https://facebook.com/synthetic',[p+'_evidence']:'Synthetic documented review'});
  const lead={business_name:'Synthetic Cafe',country:'Philippines',city:'Manila',dataset_id:'MANILA_AUDIT_QUEUE',facebook_url:'https://facebook.com/synthetic',facebook_status_reviewed:'USABLE',activity_status:'ACTIVE',gap_unresolved_verified:true,no_website_verified:true,...fact('activity'),...fact('gap'),...fact('legitimacy'),...fact('business_case'),...fact('facebook'),...fact('proof')};
  const r=await runResearch(lead,{},()=>{throw Error('No network expected');},now);
  assert.equal(r.lead_quality,'HIGH');assert.equal(r.recommended_channel,'FB_MANUAL');assert.equal(r.arc_status,'READY_DM');assert.equal(r.acma_status,'NOT_APPLICABLE');assert.equal(r.website_status,'SOCIAL_ONLY');assert.equal(r.public_email,'');assert.equal(r.decision_maker_name,'');assert.equal(r.buying_trigger,'');
});
test('source evidence surfaces website candidates without silently verifying or allowlisting them',async()=>{
  const {config,snapshots}=fixture();const primary=snapshots[2].sheets[0];
  primary.data[0].rowData[4].values.push({formattedValue:'Email source'});
  primary.data[0].rowData[5].values.push({formattedValue:'https://synthetic-construction.example/'});
  let lead=normalizeSnapshots(snapshots,config,now).leads.find(l=>l.dataset_id==='MANILA_AUDIT_QUEUE');
  assert.ok(JSON.parse(lead.website_candidates_json).includes('https://synthetic-construction.example/'));assert.equal(lead.website_url,'');
  config.datasets[2].allowed_hosts=['synthetic-construction.example'];
  lead=normalizeSnapshots(snapshots,config,now).leads.find(l=>l.dataset_id==='MANILA_AUDIT_QUEUE');
  assert.equal(lead.website_url,'https://synthetic-construction.example/');assert.equal(lead.website_association_verified,undefined);
  let calls=0;const result=await runResearch(lead,{allowed_hosts:[]},()=>{calls++;},now);
  assert.equal(calls,0);assert.equal(result.website_association,'UNVERIFIED');assert.equal(result.research_required,true);
});
test('output upserts twice without touching sources, formats or reviewer columns',async()=>{
  const {config,snapshots}=fixture();const sourceBefore=JSON.stringify(snapshots);let calls=0;
  let intake=normalizeSnapshots(snapshots,config,now);
  const results=await Promise.all(intake.leads.map(l=>runResearch(l,{},()=>{calls++;},now)));assert.equal(calls,0);
  assert.equal(results[0].research_skipped,true);assert.equal(results[1].arc_status,'SENT');
  for(const plan of planOutputWrites(results,intake,config)) applyPlan(snapshots.find(s=>s.spreadsheetId===plan.source_spreadsheet_id),plan);
  const out=snapshots[0].sheets.at(-1);const reviewIndex=ALL_HEADERS.indexOf('manual_reset_reason');out.data[0].rowData[1].values[reviewIndex]={userEnteredValue:{stringValue:'Keep this review'}};
  const count=out.data[0].rowData.length;intake=normalizeSnapshots(snapshots,config,now);
  for(const plan of planOutputWrites(results,intake,config)) applyPlan(snapshots.find(s=>s.spreadsheetId===plan.source_spreadsheet_id),plan);
  assert.equal(out.data[0].rowData.length,count);assert.equal(out.data[0].rowData[1].values[reviewIndex].userEnteredValue.stringValue,'Keep this review');
  assert.equal(JSON.stringify(snapshots.map(s=>({...s,sheets:s.sheets.filter(t=>t.properties.title!=='Arc Research')}))),sourceBefore);
  assert.throws(()=>planOutputWrites([results[0],results[0]],intake,config),/DUPLICATE_RESULT/);
  assert.throws(()=>planOutputWrites([{...results[0],source_spreadsheet_id:'wrong'}],intake,config),/UNKNOWN_RESULT/);
});
test('source sorting and conversion preserve lead identity; duplicate checks retain protection',()=>{
  const {config,snapshots}=fixture();const a=normalizeSnapshots(snapshots,config,now);
  const rows=snapshots[0].sheets[0].data[0].rowData;[rows[5],rows[8]]=[rows[8],rows[5]];snapshots[0].spreadsheetId='converted_different_id';snapshots[0].dataset_id='AUSTRALIA';
  const b=normalizeSnapshots(snapshots,config,now);assert.equal(a.leads[0].lead_id,b.leads[3].lead_id);
  assert.equal(detectDuplicates([{lead_id:'one',country:'Australia',initial_outreach_blocked:true}])[0].initial_outreach_blocked,true);
});
test('schema extension inserts columns before reviewer data and migrates only once',async()=>{
 const {config,snapshots}=fixture(),intake=normalizeSnapshots(snapshots,config,now),lead=intake.leads[3];
 const result=await runResearch(lead,{},()=>{throw Error('No network');},now);
 const extra=require('../scripts/qualification').DIMENSION_FIELDS.length,oldFields=OUTPUT_FIELDS.slice(0,-extra);
 const oldHeaders=[...oldFields,'manual_status_override','manual_reset_reason','custom_owner_note'];
 const old={properties:{title:'Arc Research',sheetId:91,gridProperties:{rowCount:100,columnCount:oldHeaders.length}},data:[{rowData:[{values:oldHeaders.map(stringValue=>({userEnteredValue:{stringValue}}))},{values:oldHeaders.map(f=>({userEnteredValue:{stringValue:f==='manual_reset_reason'?'Keep existing review':f==='custom_owner_note'?'Keep custom':String(result[f]??'')}}))}]}]};
 snapshots[0].sheets.push(old);const sourceBefore=JSON.stringify(snapshots[0].sheets.filter(s=>s.properties.title!=='Arc Research'));
 const updated=normalizeSnapshots(snapshots,config,now),plans=planOutputWrites([result],updated,config);
 assert.equal(plans[0].body.requests.filter(r=>r.insertDimension).length,1);applyPlan(snapshots[0],plans[0]);
 let table=readTable(old,1);assert.equal(table.rows[0].values.manual_reset_reason,'Keep existing review');assert.equal(table.rows[0].values.custom_owner_note,'Keep custom');assert.equal(table.rows[0].values.commercial_quality,result.commercial_quality);
 const again=planOutputWrites([result],normalizeSnapshots(snapshots,config,now),config);assert.equal(again[0].body.requests.filter(r=>r.insertDimension).length,0);applyPlan(snapshots[0],again[0]);
 table=readTable(old,1);assert.equal(table.rows.length,1);assert.equal(table.rows[0].values.custom_owner_note,'Keep custom');assert.equal(JSON.stringify(snapshots[0].sheets.filter(s=>s.properties.title!=='Arc Research')),sourceBefore);
});
async function simulate(workflow,initial,io,start){
  const previous=new Map(),batches=new Map();let current=start||workflow.nodes[0].name,items=initial,turns=0;
  while(current){if(++turns>250)throw Error('Nonterminating graph');const n=workflow.nodes.find(n=>n.name===current);let branch=0;
    if(n.type.endsWith('.code')){items=new vm.Script('(function(){'+n.parameters.jsCode+'})()').runInNewContext({require:n=>{assert.equal(n,'crypto');return require('node:crypto');},console:{log(){}},$input:{first:()=>items[0],all:()=>items},$:name=>({first:()=>previous.get(name)[0],all:()=>previous.get(name),item:previous.get(name)?.[0]})},{timeout:3000});items=clone(items);}
    else if(n.type.endsWith('.httpRequest'))items=await io(n,items);
    else if(n.type.endsWith('.if'))branch=(n.name==='Dry run'?items[0].json.dry_run:items[0].json.pending)?0:1;
    else if(n.type.endsWith('.executeWorkflow'))items=(await simulate(makeWorker(),items,io)).items;
    else if(n.type.endsWith('.splitInBatches')){if(!batches.has(n.name))batches.set(n.name,{todo:[...items],done:[]});else batches.get(n.name).done.push(...items);const b=batches.get(n.name);if(b.todo.length){branch=1;items=[b.todo.shift()];}else{branch=0;items=b.done;}}
    previous.set(n.name,items);current=workflow.connections[n.name]?.main[branch]?.[0]?.node;
  }return {items,previous};
}
test('generated three-dataset parent executes dry-run and two idempotent write runs with mock Google I/O',async()=>{
  const {config,snapshots}=fixture();const parent=makeParent();const before=JSON.stringify(snapshots);let writes=0;
  const io=async(n,items)=>Promise.all(items.map(async item=>{const id=new URL(item.json.url).pathname.split('/').pop().replace(':batchUpdate','');const s=snapshots.find(s=>s.spreadsheetId===id);assert.ok(s);if(n.name==='Write Arc Research'){writes++;applyPlan(s,item.json);return {json:{spreadsheetId:id,replies:[]}};}return {json:clone(s)};}));
  const execute=async()=>{parent.nodes.find(n=>n.name==='Configure').parameters.jsCode='return [{json:'+JSON.stringify(config)+'}];';return simulate(parent,[{json:{}}],io);};
  const dry=await execute();assert.equal(writes,0);assert.equal(JSON.stringify(snapshots),before);assert.equal(dry.items[0].json.datasets,3);
  config.dry_run=false;await execute();await execute();assert.equal(writes,6);
  assert.deepEqual(snapshots.map(s=>readTable(s.sheets.find(t=>t.properties.title==='Arc Research'),1).rows.length),[4,2,2]);
});
