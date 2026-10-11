'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const intake=require('../scripts/dataset-intake'),bootstrap=require('../scripts/au500-bootstrap'),manual=require('../scripts/au500-manual-intake'),copy=require('../scripts/phase2-copy-drafting'),inbox=require('../scripts/phase2-inbox'),q=require('../scripts/phase2-cloud-queue');
const now='2026-10-11T10:00:00.000Z',clone=structuredClone;
function fixture(){
 const config=clone(require('../config/datasets.example.json'));const old=config.datasets.slice(0,3);
 const d={dataset_id:bootstrap.DATASET,spreadsheet_id:'synthetic_au500_workbook',primary_sheet:'500 Sharp ICPs',header_row:5,supplemental_sheets:{},reference_sheets:['Summary','Method & Compliance'],output_sheet:'Arc Research',country:'Australia',acma_applies:true,allowed_hosts:[]};
 const headers=['ID','Business','Phone','City','Classification','Website Status',...Array.from({length:49},(_,i)=>'Source '+i)];
 const rows=Array.from({length:4},()=>({values:[]}));rows.push({values:headers.map(formattedValue=>({formattedValue}))});
 for(let i=1;i<=500;i++)rows.push({values:headers.map((h,j)=>({formattedValue:j===0?'0xabc:0x'+i.toString(16):j===1?'Synthetic AU firm '+i:j===2?'041'+String(i).padStart(7,'0'):j===3?'Sydney NSW':j===4?'A+':j===5?'No owned website verified':''}))});
 const snapshot={spreadsheetId:d.spreadsheet_id,sheets:[{properties:{sheetId:1,title:d.primary_sheet,gridProperties:{rowCount:505,columnCount:55}},data:[{rowData:rows}]},...d.reference_sheets.map((title,i)=>({properties:{sheetId:i+2,title,gridProperties:{rowCount:1,columnCount:1}},data:[{rowData:[{values:[{formattedValue:'Synthetic only'}]}]}]}))]};
 const p=bootstrap.plan(snapshot,d,now),options={mode:'VALIDATION',cap:5,campaign:q.CAMPAIGN,operator:'Synthetic operator',manual_intake:{enabled:true,dataset_id:d.dataset_id,source_ids:p.rows.slice(0,5).map(r=>r.source_original_id)},allowed_lead_ids:p.rows.slice(0,5).map(r=>r.lead_id)};
 return {config:{...config,datasets:[...old,d]},d,snapshot,p,options,refs:[{Business:'Unrelated synthetic firm',country:'Philippines'}]};
}
test('four source registry preserves exact legacy entries and refuses identity/count/output collisions',()=>{
 const f=fixture();assert.equal(intake.validateRegistry(f.config).length,4);assert.equal(intake.validateRegistry({...f.config,datasets:f.config.datasets.slice(0,3)}).length,3);
 for(const change of [c=>c.datasets[3].dataset_id=c.datasets[0].dataset_id,c=>c.datasets[3].dataset_id='',c=>c.datasets[3].spreadsheet_id=c.datasets[0].spreadsheet_id,c=>c.datasets[3].output_sheet=c.datasets[3].primary_sheet,c=>c.datasets.push(c.datasets[3])]){const c=clone(f.config);change(c);assert.throws(()=>intake.validateRegistry(c));}
});
test('500-row bootstrap contains complete 221-column literal-only plans in twenty 25-row batches',()=>{
 const f=fixture(),before=JSON.stringify(f.snapshot);assert.equal(f.p.rows.length,500);assert.equal(bootstrap.HEADERS.length,221);assert.equal(f.p.batches.length,21);
 const target=f.p.output_sheet_id;for(const [i,b] of f.p.batches.entries()){assert.ok(Buffer.byteLength(JSON.stringify(b.body))<bootstrap.MAX_WRITE);assert.ok(b.url.includes(f.d.spreadsheet_id));for(const r of b.body.requests){if(r.addSheet){assert.equal(i,0);assert.equal(r.addSheet.properties.title,'Arc Research');}if(r.updateCells){assert.equal(r.updateCells.start.sheetId,target);assert.equal(r.updateCells.fields,'userEnteredValue');if(i)assert.equal(r.updateCells.rows.length,25);}}bootstrap.verify(b,{values:b.expected});}
 assert.equal(JSON.stringify(f.snapshot),before);assert.equal(new Set(f.p.rows.map(r=>r.lead_id)).size,500);
 for(const r of f.p.rows){assert.equal(r.research_runtime_hold,bootstrap.HOLD);assert.equal(r.arc_status,'NEEDS_RESEARCH');assert.equal(r.public_email,'');assert.equal(r.email_draft,'');assert.equal(r.dm_draft,'');assert.equal(r.checked_at,'');assert.equal(r.evidence_json,'[]');assert.equal(r.acma_status,'REVIEW_REQUIRED');assert.match(r.legacy_snapshot_json,/A\+/);}
});
test('bootstrap fails closed for partial source coverage, wrong native identity, preexisting output and ambiguous persistence',()=>{
 const f=fixture();for(const modify of [s=>s.sheet_ids_are_local_fixture_only=true,s=>s.sheets.pop(),s=>s.spreadsheetId='wrong_book',s=>s.sheets.push({properties:{title:'Arc Research',sheetId:8}}),s=>s.sheets[0].data[0].rowData.pop()]){const s=clone(f.snapshot);modify(s);assert.throws(()=>bootstrap.plan(s,f.d,now));}
 assert.throws(()=>bootstrap.verify(f.p.batches[1],{values:f.p.batches[1].expected.slice(1)}),/PERSISTENCE/);
 assert.throws(()=>bootstrap.response({value:'x'.repeat(bootstrap.MAX_RESPONSE)}),/TOO_LARGE/);
 const b=clone(f.p.batches[1]);b.expected[0][0]='wrong';assert.throws(()=>bootstrap.verify(b,{values:f.p.batches[1].expected}),/PERSISTENCE/);
});
test('manual intake defaults off while ordinary evidence-qualified drafting remains unchanged',()=>{
 const f=fixture(),p=copy.plan(f.p.rows,[],[],{mode:'PRODUCTION',cap:25},now);assert.equal(p.jobs.length,0);
 assert.throws(()=>manual.plan(f.p.rows,[],[],{...f.options,manual_intake:{enabled:false}},now,[],[],f.refs),/DISABLED/);
});
test('all 500 durable holds exclude even targeted retry from provider dispatch',()=>{
 const f=fixture(),context={dataset:f.d,snapshot:f.snapshot},leads=f.p.rows.map(r=>({...r,previous_result:{...r}}));
 const selected=require('../scripts/cloud-research-runtime').select({contexts:[context],leads},{datasets:[f.d],batch_size:25,expected_lead_count:500,targeted_retry:{lead_id:leads[0].lead_id}},'synthetic-only',now);
 assert.equal(selected.pending,false);assert.equal(selected.summary.processed,0);
});
test('exact five fixed source IDs create audited Australian NO_ROUTE placeholders and isolated Inbox links',()=>{
 const f=fixture(),p=copy.plan(f.p.rows,[],[],f.options,now,[],[],f.refs);assert.equal(p.writes.length,5);
 const queue=p.writes.map((r,i)=>({...r,id:i+1}));manual.persisted(p,[],queue);
 for(const r of queue){const d=JSON.parse(r.payload);assert.equal(r.state,'NEEDS_RESEARCH');assert.equal(r.channel,'NO_ROUTE');assert.equal(r.recipient,'');assert.equal(r.subject,'');assert.equal(r.approved_hash,'');assert.equal(d.operator_workspace.audit.length,1);assert.equal(inbox.market(r),'Australia');}
 const projection=inbox.sync(queue,[],[],f.options,[],now);manual.projection(projection,queue,[],[],f.options);assert.equal(projection.writes.length,5);
 const views=projection.writes.map((r,i)=>({...r,id:10+i})),links=inbox.linkResults(projection,views);assert.equal(links.length,5);
 assert.deepEqual(inbox.sync(queue,views,links,f.options,[],now).writes,[]);
 assert.throws(()=>manual.plan(f.p.rows,queue,[],f.options,now,views,links,f.refs),/EXISTING/);
 assert.throws(()=>manual.persisted(p,[],queue.slice(1)),/CHANGED/);
 const changed=clone(queue);changed[0].payload+=' ';assert.throws(()=>manual.persisted(p,[],changed),/PERSISTENCE/);
});
test('intake rejects unfixed lists, wrong sources, missing holds, unresolved duplicates and protected states',()=>{
 const f=fixture();for(const alter of [o=>o.manual_intake.source_ids.pop(),o=>o.manual_intake.source_ids[1]=o.manual_intake.source_ids[0],o=>o.manual_intake.dataset_id='AUSTRALIA',o=>o.allowed_lead_ids[0]='wrong',o=>o.operator='']){const o=clone(f.options);alter(o);assert.throws(()=>manual.plan(f.p.rows,[],[],o,now,[],[],f.refs));}
 for(const patch of [{research_runtime_hold:''},{source_row:419},{source_row:433},{arc_status:'SENT'},{provider_draft_id:'synthetic-provider'},{duplicate_review_required:true},{initial_contact_recorded:true}]){const rows=clone(f.p.rows);Object.assign(rows[0],patch);assert.throws(()=>manual.plan(rows,[],[],f.options,now,[],[],f.refs));}
});
test('cross-source business, phone, decimal Maps CID, email, social and suppression matches refuse intake',()=>{
 const f=fixture(),r=f.p.rows[0],cid=BigInt('0x1').toString();
 for(const ref of [{Business:r.business_name},{Phone:r.phone,country:'Australia'},{Business:'Other',Maps:'https://maps.google.com/?cid='+cid}])assert.throws(()=>manual.plan(f.p.rows,[],[],f.options,now,[],[],[ref]),/DUPLICATE/);
 const locks=[{kind:'SUPPRESSION',identity:'lead:'+r.lead_id}];assert.throws(()=>manual.plan(f.p.rows,[],locks,f.options,now,[],[],f.refs),/LOCK/);
 const a=manual.keys({business_name:'Alpha',country:'Australia',public_email:'test@example.org',facebook_url:'https://m.facebook.com/profile.php?id=17'}),b=manual.keys({business_name:'Beta',country:'Australia',recipient:'test@example.org',facebook_url:'https://facebook.com/profile.php?id=17'});assert.equal(manual.matches(a,b),true);
});
test('current reference reads reject wrong workbook, missing tabs, truncated rows or changed headers',()=>{
 const registry=['a','b','c'].map((id,i)=>({dataset_id:id,spreadsheet_id:'synthetic_'+i,country:'Australia'}));const specs=registry.map(d=>({dataset_id:d.dataset_id,tabs:[{range:'References!A1:B2',headers:['Business','Phone'],rows:1}]})),responses=registry.map(d=>({spreadsheetId:d.spreadsheet_id,valueRanges:[{range:'References!A1:B2',values:[['Business','Phone'],['Other','']]}]}));assert.equal(manual.references(responses,registry,specs).length,3);
 for(const modify of [r=>r.pop(),r=>r[0].spreadsheetId='wrong',r=>r[0].valueRanges[0].values.pop(),r=>r[0].valueRanges[0].values[0][0]='Changed']){const r=clone(responses);modify(r);assert.throws(()=>manual.references(r,registry,specs));}
});
test('held diagnostic capacity is retained at 100 and ambiguous or existing projections are refused',()=>{
 const f=fixture(),p=manual.plan(f.p.rows,[],[],f.options,now,[],[],f.refs),queue=p.writes.map((r,i)=>({...r,id:i+1})),projection=inbox.sync(queue,[],[],f.options,[],now);
 const bad=clone(projection);bad.writes[0].match_keys=['id'];assert.throws(()=>manual.projection(bad,queue,[],[],f.options),/NEW_PROJECTION/);
 const held=Array.from({length:101},(_,i)=>({queue_key:'held'+i,lead_id:'held'+i,state:'NEEDS_RESEARCH',payload:JSON.stringify({lead_id:'held'+i,lead_step_key:'held'+i})}));assert.throws(()=>require('../scripts/phase2-panel-diagnostics').targets({queue:held}),/PANEL_HELD_PAGE_REQUIRED/);
});
module.exports={fixture};
