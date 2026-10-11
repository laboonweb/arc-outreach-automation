'use strict';
// Pure plans only. Native nodes own every read and write.
const intake=require('./dataset-intake'),{ALL_HEADERS}=require('./dataset-output');
const {RUNTIME_FIELDS}=require('./cloud-research-runtime');
const {sheetRecord}=require('./research-engine'),{text,sha256}=require('./helpers');
const DATASET='AUSTRALIA_500_20261011',HOLD='MANUAL_ONLY_SOURCE_INTAKE';
const HEADERS=[...ALL_HEADERS,...RUNTIME_FIELDS];
const MAX_RESPONSE=8*1024*1024,MAX_WRITE=2*1024*1024;
function response(raw){
 let r=raw.body??(raw.statusCode!==undefined?raw.data:undefined)??raw;
 if(typeof r==='string'){if(Buffer.byteLength(r)>MAX_RESPONSE)throw Error('AU500_RESPONSE_TOO_LARGE');r=JSON.parse(r);}
 if(Buffer.byteLength(JSON.stringify(r))>MAX_RESPONSE)throw Error('AU500_RESPONSE_TOO_LARGE');
 if(raw.statusCode&&raw.statusCode!==200)throw Error('AU500_RESPONSE_FAILED');
 return r;
}
function sourceHash(snapshot){return sha256(JSON.stringify({spreadsheetId:snapshot.spreadsheetId,properties:snapshot.properties,sheets:snapshot.sheets.filter(s=>s.properties.title!=='Arc Research')}));}
function initial(lead){
 return {...lead,website_url:'',public_email:'',decision_maker_name:'',decision_maker_role:'',decision_maker_source:'',website_status:'',website_final_url:'',website_evidence:'',website_check_status:'',business_status:'',email_subject:'',email_draft:'',dm_draft:'',checked_at:'',last_researched_at:'',research_version:'',evidence_json:'[]',activity_evidence:'[]',errors_json:'[]',research_required:true,arc_status:'NEEDS_RESEARCH',outreach_readiness:'NEEDS_RESEARCH',commercial_basis:'TIER_C_NEEDS_RESEARCH',acma_status:'REVIEW_REQUIRED',compliance_status:'REVIEW_REQUIRED',research_status:'NEEDS_RESEARCH',tier:'TIER_C_NEEDS_RESEARCH',provider_status:'',verified_domain:'',verified_email:'',verified_social_routes:'',activity_confidence:'',identity_confidence:'',observed_at:'',queue_route:'NEEDS_RESEARCH',research_batch_id:'',batch_summary_json:'',research_runtime_hold:HOLD};
}
function cell(value){
 if(typeof value==='boolean')return {userEnteredValue:{boolValue:value}};
 if(typeof value==='number')return {userEnteredValue:{numberValue:value}};
 if(text(value).length>45000)throw Error('AU500_CELL_TOO_LARGE');
 return {userEnteredValue:{stringValue:text(value)}};
}
function plan(raw,dataset,now=new Date().toISOString()){
 const snapshot=response(raw);
 if(snapshot.sheet_ids_are_local_fixture_only)throw Error('AU500_NATIVE_METADATA_REQUIRED');
 if(dataset.dataset_id!==DATASET||dataset.country!=='Australia'||dataset.acma_applies!==true||dataset.primary_sheet!=='500 Sharp ICPs'||dataset.header_row!==5||dataset.output_sheet!=='Arc Research'||snapshot.spreadsheetId!==dataset.spreadsheet_id)throw Error('AU500_SOURCE_CONFIGURATION_MISMATCH');
 if(snapshot.sheets?.some(s=>s.properties.title==='Arc Research'))throw Error('AU500_OUTPUT_ALREADY_EXISTS_RECONCILE');
 if(snapshot.sheets?.length!==3||!['Summary','500 Sharp ICPs','Method & Compliance'].every(t=>snapshot.sheets.some(s=>s.properties.title===t&&Number.isInteger(s.properties.sheetId))))throw Error('AU500_SOURCE_COVERAGE_REQUIRED');
 const primary=snapshot.sheets.find(s=>s.properties.title===dataset.primary_sheet),table=require('./sheet-grid').readTable(primary,5);
 if(table.headers.length!==55||table.rows.length!==500||table.rows.some((r,i)=>r.source_row!==i+6))throw Error('AU500_SOURCE_SHAPE_CHANGED');
 const leads=require('./duplicate-detection').detectDuplicates(intake.normalizeDataset(snapshot,dataset,now).leads);
 if(leads.length!==500||leads.some(r=>!/^0x[\da-f]+:0x[\da-f]+$/i.test(r.source_original_id)||r.arc_status!=='NEEDS_RESEARCH'||r.initial_contact_recorded)||new Set(leads.map(r=>r.source_original_id)).size!==500)throw Error('AU500_SOURCE_IDENTITIES_OR_HISTORY_CHANGED');
 const sheetId=Math.max(...snapshot.sheets.map(s=>s.properties.sheetId))+1;
 if(!Number.isInteger(sheetId)||sheetId<0||sheetId>=2147483647)throw Error('AU500_OUTPUT_ID_INVALID');
 const rows=leads.map(initial).map(r=>({...sheetRecord(r),...Object.fromEntries(RUNTIME_FIELDS.map(k=>[k,r[k]]))}));
 const target='https://sheets.googleapis.com/v4/spreadsheets/'+dataset.spreadsheet_id;
 const batches=[{url:target+':batchUpdate',body:{requests:[{addSheet:{properties:{sheetId,title:'Arc Research',gridProperties:{rowCount:501,columnCount:HEADERS.length}}}},{updateCells:{start:{sheetId,rowIndex:0,columnIndex:0},rows:[{values:HEADERS.map(cell)}],fields:'userEnteredValue'}}],includeSpreadsheetInResponse:false},verify_url:target+'/values/'+encodeURIComponent("'Arc Research'!A1:HM1")+'?valueRenderOption=UNFORMATTED_VALUE',expected:[HEADERS]}];
 for(let i=0;i<rows.length;i+=25){const values=rows.slice(i,i+25).map(r=>HEADERS.map(h=>r[h]??''));batches.push({url:target+':batchUpdate',body:{requests:[{updateCells:{start:{sheetId,rowIndex:i+1,columnIndex:0},rows:values.map(v=>({values:v.map(cell)})),fields:'userEnteredValue'}}],includeSpreadsheetInResponse:false},verify_url:target+'/values/'+encodeURIComponent("'Arc Research'!A"+(i+2)+':HM'+(i+values.length+1))+'?valueRenderOption=UNFORMATTED_VALUE',expected:values});}
 for(const b of batches)if(Buffer.byteLength(JSON.stringify(b.body))>MAX_WRITE)throw Error('AU500_WRITE_TOO_LARGE');
 return {dataset_id:DATASET,source_hash:sourceHash(snapshot),output_sheet_id:sheetId,rows,batches};
}
function verify(expected,raw){
 const r=response(raw);
 if(!Array.isArray(r.values)||r.values.length!==expected.expected.length||r.values.some((v,i)=>JSON.stringify(HEADERS.map((h,j)=>v[j]??''))!==JSON.stringify(expected.expected[i])))throw Error('AU500_PERSISTENCE_MISMATCH');
 return {rows:r.values.length,sha256:sha256(JSON.stringify(expected.expected))};
}
module.exports={DATASET,HOLD,HEADERS,MAX_RESPONSE,MAX_WRITE,response,sourceHash,initial,cell,plan,verify};
