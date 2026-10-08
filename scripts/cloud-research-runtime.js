'use strict';
// Pure Cloud control/persistence logic. All I/O belongs to native n8n nodes.
const intakeAPI=require('./dataset-intake');
const {OUTPUT_FIELDS}=require('./research-engine');
const {readTable}=require('./sheet-grid');
const {text,yes,sha256,parsePublicUrl}=require('./helpers');
const {protectedReason}=require('./autonomous-discovery');
const {recalculateMachineDuplicates}=require('./duplicate-detection');
const {routingPass,mergeResearch}=require('./operational-routing');
const {publicIdentifiers}=require('./research-fallback-query');
const RUNTIME_FIELDS=('research_status tier provider_status verified_domain verified_email verified_social_routes activity_confidence identity_confidence observed_at queue_route research_batch_id batch_summary_json research_runtime_hold').split(' ');
const HISTORY_FIELDS=new Set(('legacy_status legacy_colour legacy_status_imported legacy_snapshot_json legacy_recheck_required legacy_join_review_required legacy_colour_review_required first_contact_at first_contact_channel followup_due_at followup_channel followup_count last_reply_at reply_status initial_contact_recorded initial_outreach_blocked duplicate_review_required duplicate_matches_json duplicate_group_key suppression_status').split(' '));
// Sheets omits trailing empty cells before a write and returns {} padding after
// later columns receive values. Both represent an empty cell; preserve every
// actual value, formula and format property in the integrity comparison.
function protectedCell(value){return value&&Object.keys(value).length?value:null;}
function sourceHash(snapshot){return sha256(JSON.stringify((snapshot.sheets||[]).filter(s=>s.properties.title!=='Arc Research')));}
function validateIntake(intake,config){
 if(new Set(intake.leads.map(l=>l.lead_id)).size!==intake.leads.length)throw Error('SOURCE_ID_INTEGRITY_FAILURE');
 if(config.expected_lead_count&&intake.leads.length!==config.expected_lead_count)throw Error('SOURCE_COUNT_CHANGED');
 const hashes=Object.fromEntries(intake.contexts.map(c=>[c.snapshot.spreadsheetId,sourceHash(c.snapshot)]));
 for(const [id,hash]of Object.entries(config.expected_snapshot_hashes||{}))if(sha256(JSON.stringify(intake.contexts.find(c=>c.snapshot.spreadsheetId===id)?.snapshot.sheets))!==hash)throw Error('PRE_PATCH_SOURCE_SNAPSHOT_CHANGED');
 for(const [id,hash]of Object.entries(config.expected_source_hashes||{}))if(hashes[id]!==hash)throw Error('SOURCE_INTEGRITY_FAILURE');
 return hashes;
}
function select(intake,config,executionId,now=new Date().toISOString()){
 const hashes=validateIntake(intake,config),size=Number(config.batch_size??25);
 if(![25,50,100].includes(size))throw Error('INVALID_BATCH_SIZE_USE_25_50_100');
 if(config.verification){
  const v=config.verification,rows=v.completed_ids.map(id=>intake.leads.find(l=>l.lead_id===id)?.previous_result);
  if(rows.some(r=>!r||r.research_status!=='COMPLETED'))throw Error('VALIDATION_RESEARCH_NOT_COMPLETE');
  for(const [id,at]of Object.entries(v.preserved_timestamps||{}))if(intake.leads.find(l=>l.lead_id===id)?.previous_result.last_researched_at!==at)throw Error('COMPLETED_LEAD_RESEARCHED_AGAIN');
  const last=rows.at(-1),report=JSON.parse(last.batch_summary_json||'{}');
  if(v.expected_processed!==undefined&&(report.processed!==v.expected_processed||report.status!=='COMPLETE'))throw Error('VALIDATION_BATCH_NOT_FINISHED');
  const prior=JSON.parse(intake.leads.find(l=>l.lead_id===v.seed_reference_id)?.previous_result.batch_summary_json||'{}');
  for(const [id,h]of Object.entries(prior.source_hashes||{}))if(hashes[id]!==h)throw Error('VALIDATION_SOURCE_CHANGED');
  if(!prior.source_hashes||Object.keys(prior.source_hashes).length!==3)throw Error('VALIDATION_SOURCE_PROOF_MISSING');
  return {pending:false,summary:{...report,status:'VALIDATED',completed_ids:v.completed_ids,source_unchanged:true,prior_completed_not_researched_again:true}};
 }
 if(config.bootstrap_receipts?.length||config.upsert_existing_ids?.length)return {bootstrap:true,config,source_hashes:hashes};
 const leads=recalculateMachineDuplicates(intake.leads),routed=routingPass(leads,{},now).records,byRoute=new Map(routed.map(r=>[r.lead_id,r.routing]));
 const eligible=l=>!protectedReason(l)&&!text(l.previous_result?.research_runtime_hold)&&(!text(l.previous_result?.research_status)||l.previous_result.research_status==='PROVIDER_RETRY_REQUIRED')&&byRoute.get(l.lead_id)==='NEEDS_MANUAL_RESEARCH';
 let batch=config.cloud_batch;
 if(!batch){
  let pool=leads.filter(eligible);
  if(config.validation_lead_ids){if(config.validation_lead_ids.length>2)throw Error('VALIDATION_CAP_2');pool=config.validation_lead_ids.map(id=>pool.find(l=>l.lead_id===id));if(pool.some(l=>!l))throw Error('VALIDATION_LEAD_NOT_ELIGIBLE');}
  else pool.sort((a,b)=>Number(b.previous_result?.research_status==='PROVIDER_RETRY_REQUIRED')-Number(a.previous_result?.research_status==='PROVIDER_RETRY_REQUIRED'));
  const selected=pool.slice(0,config.validation_lead_ids?2:size);
  batch={id:'arc_batch_'+executionId,selected:selected.length,remaining:selected.map(l=>l.lead_id),processed:[],skipped:[],source_hashes:hashes,cost_limits:{exa_usd:Number(config.exa_cost_ceiling_usd??3),tavily_credits:Number(config.tavily_credit_ceiling??150)},provider_circuits:{},started_at:now};
 }
 if(!batch.id||batch.selected>100||!Array.isArray(batch.remaining)||!Array.isArray(batch.processed)||new Set([...batch.remaining,...batch.processed.map(r=>r.lead_id),...(batch.skipped||[])]).size!==batch.selected)throw Error('BATCH_CONFIGURATION_INTEGRITY_FAILURE');
 for(const [id,h]of Object.entries(batch.source_hashes))if(hashes[id]!==h)throw Error('SOURCE_CHANGED_DURING_BATCH');
 const usage=summary(batch);if(usage.exa_cost_usd+0.03>batch.cost_limits.exa_usd||usage.tavily_credits+2>batch.cost_limits.tavily_credits)return {batch,pending:false,summary:summary(batch,'STOPPED','COST_CEILING_RESERVE')};
 let lead;
 while(batch.remaining.length&&!lead){const id=batch.remaining.shift(),candidate=leads.find(l=>l.lead_id===id);if(!candidate)throw Error('QUEUED_LEAD_MISSING');if(eligible(candidate))lead=candidate;else batch.skipped.push(id);}
 if(!lead)return {batch,pending:false,summary:summary(batch,'COMPLETE')};
 const dataset=config.datasets.find(d=>d.dataset_id===lead.dataset_id),context=intake.contexts.find(c=>c.dataset.dataset_id===lead.dataset_id);
 const merged=mergeResearch(lead);merged.previous_result=lead.previous_result;merged.routing='NEEDS_MANUAL_RESEARCH';merged.public_business_identifiers=publicIdentifiers(merged);
 batch.current_lead_id=lead.lead_id;
 return {pending:true,batch,lead:merged,config:{allowed_hosts:dataset.allowed_hosts||[],discovery:{enabled:true,provider_approved:true,mode:'AUTONOMOUS_V2',require_cost_metadata:true,remaining_exa_cost_usd:batch.cost_limits.exa_usd-usage.exa_cost_usd,remaining_tavily_credits:batch.cost_limits.tavily_credits-usage.tavily_credits,provider_circuits:batch.provider_circuits}},cloud_batch:{batch,dataset,workbook_metadata:context.snapshot._metadata,registry:config.datasets,parent_workflow_id:config.parent_workflow_id}};
}
function workbookRead(context){
 const config={datasets:context.registry};
 const metadata=context.registry.map(d=>d.dataset_id===context.dataset.dataset_id?context.workbook_metadata:{spreadsheetId:d.spreadsheet_id,sheets:[d.primary_sheet,...Object.keys(d.supplemental_sheets)].map(title=>({properties:{title}}))});
 return intakeAPI.gridRequests(metadata,config).find(r=>r.dataset_id===context.dataset.dataset_id);
}
function decorate(result,d,batch){
 if(result.lead_id!==batch.current_lead_id||result.email_draft||result.dm_draft||result.email_subject)throw Error('RESULT_ID_OR_COPY_INTEGRITY_FAILURE');
 const official=(d.identities||[]).filter(i=>i.status==='AUTO_VERIFIED_OFFICIAL'),route=d.selected_route,fatal=(d.errors||[]).some(e=>e.batch_fatal)||Object.values(d.provider_circuits||{}).some(c=>c.open),ready=!fatal&&d.provider_status!=='PROVIDER_RETRY_REQUIRED'&&!yes(result.research_required)&&/^TIER_[AB]_/.test(result.commercial_basis);
 const socials=(d.routes||[]).filter(r=>['FACEBOOK','INSTAGRAM','LINKEDIN'].includes(r.channel)&&['PUBLIC_VERIFIED','MANUAL_SOCIAL_CANDIDATE'].includes(r.status));
 const provider_status=fatal?'PROVIDER_RETRY_REQUIRED':d.provider_status;
 const out={...result,research_status:provider_status==='PROVIDER_RETRY_REQUIRED'?'PROVIDER_RETRY_REQUIRED':'COMPLETED',tier:result.commercial_basis,provider_status,verified_domain:official.find(i=>i.source_type==='WEBSITE')?.url?parsePublicUrl(official.find(i=>i.source_type==='WEBSITE').url).host:'',verified_email:(d.routes||[]).find(r=>r.channel==='EMAIL'&&r.status==='PUBLIC_VERIFIED')?.recipient||'',verified_social_routes:JSON.stringify(socials),activity_confidence:d.activity?.confidence||0,identity_confidence:Math.max(0,...official.map(i=>Number(i.score)||0)),observed_at:d.observed_at,last_researched_at:result.last_researched_at||d.observed_at,queue_route:ready&&route?.channel==='EMAIL'?'READY_FOR_DRAFT':ready&&socials.some(r=>r.recipient===route?.recipient)?'MANUAL_SOCIAL_CANDIDATE':'NEEDS_MANUAL_RESEARCH',research_batch_id:batch.id};
 const row={lead_id:out.lead_id,tier:out.tier,status:out.research_status,queue_route:out.queue_route,email:!!out.verified_email,domain:!!out.verified_domain,social_candidates:out.queue_route==='MANUAL_SOCIAL_CANDIDATE'?1:0,exa_requests:(d.attempts||[]).filter(a=>a.provider==='EXA').length,tavily_requests:(d.attempts||[]).filter(a=>a.provider==='TAVILY').length,exa_cost_usd:Number(d.cost_dollars)||0,tavily_credits:Number(d.tavily_credits)||0,provider_errors:(d.errors||[]).length,ambiguous_identities:(d.ambiguous_matches||[]).length?1:0,observed_at:d.observed_at};
 if(batch.processed.some(r=>r.lead_id===row.lead_id))throw Error('LEAD_COMPLETION_DUPLICATED');batch.processed.push(row);batch.provider_circuits=d.provider_circuits||{};
 const usage=summary(batch),costStop=usage.exa_cost_usd>batch.cost_limits.exa_usd||usage.tavily_credits>batch.cost_limits.tavily_credits,reason=fatal?'SYSTEMIC_PROVIDER_FAILURE':costStop?'COST_CEILING_EXCEEDED':batch.remaining.length&&(usage.exa_cost_usd+0.03>batch.cost_limits.exa_usd||usage.tavily_credits+2>batch.cost_limits.tavily_credits)?'COST_CEILING_RESERVE':'';
 batch.stop_reason=reason;batch.status=reason?'STOPPED':batch.remaining.length?'RUNNING':'COMPLETE';out.batch_summary_json=JSON.stringify(summary(batch,batch.status,reason));
 // Compact observations only; each next lead must establish its own association.
 if(d.domain_facts?.length){const domains=require('./email-domain');batch.email_domain_cache||=[];for(const f of d.domain_facts){const i=batch.email_domain_cache.findIndex(o=>o.candidate_domain===f.candidate_domain);if(i<0)batch.email_domain_cache.push(domains.observationOnly(f));else if(Date.parse(f.observed_at)>Date.parse(batch.email_domain_cache[i].observed_at))batch.email_domain_cache[i]=domains.observationOnly(f);}batch.email_domain_cache=batch.email_domain_cache.slice(-domains.LIMITS.cache);}
 const preserved=require('./research-history').mergeRows(result,out,d.observed_at);Object.assign(out,preserved);
 const facts=JSON.parse(out.evidence_json||'[]');facts.push({type:'research_runtime_receipt',source_url:'https://api.exa.ai/search',observed_at:d.observed_at,excerpt:provider_status,batch_id:batch.id,...row,provider_errors:d.errors||[],attempts:d.attempts||[]});out.evidence_json=JSON.stringify(facts);
 return out;
}
function summary(batch,status=batch.status||'RUNNING',stop_reason=batch.stop_reason||''){
 const rows=batch.processed||[],complete=rows.filter(r=>r.status==='COMPLETED'),sum=k=>rows.reduce((n,r)=>n+(Number(r[k])||0),0);
 return {batch_id:batch.id,status,stop_reason,selected:batch.selected,processed:rows.length,successful:complete.length,provider_retry:rows.length-complete.length,skipped:(batch.skipped||[]).length,remaining:batch.remaining?.length||0,tier_a:complete.filter(r=>r.tier==='TIER_A_VERIFIED_GAP').length,tier_b:complete.filter(r=>r.tier==='TIER_B_VERIFIED_OPPORTUNITY').length,tier_c:complete.filter(r=>r.tier==='TIER_C_NEEDS_RESEARCH').length,verified_emails:sum('email'),verified_domains:sum('domain'),manual_social_candidates:sum('social_candidates'),exa_requests:sum('exa_requests'),exa_cost_usd:sum('exa_cost_usd'),tavily_requests:sum('tavily_requests'),tavily_credits:sum('tavily_credits'),provider_errors:sum('provider_errors'),ambiguous_identities:sum('ambiguous_identities'),source_hashes:batch.source_hashes||{},sending_enabled:false,source_writes:0};
}
function cell(value){if(typeof value==='boolean')return {userEnteredValue:{boolValue:value}};if(typeof value==='number'&&Number.isFinite(value))return {userEnteredValue:{numberValue:value}};const s=String(value??'');if(s.length>45000)throw Error('OUTPUT_CELL_TOO_LARGE');return {userEnteredValue:{stringValue:s}};}
function planRows(results,snapshot,dataset){
 if(dataset.output_sheet!=='Arc Research'||snapshot.spreadsheetId!==dataset.spreadsheet_id)throw Error('UNSAFE_OUTPUT_WORKBOOK');
 const sheet=snapshot.sheets.find(s=>s.properties.title==='Arc Research');if(!sheet)throw Error('EXISTING_ARC_RESEARCH_REQUIRED');
 const table=readTable(sheet,1),headers=[...table.headers];
 if(!OUTPUT_FIELDS.every((f,i)=>headers[i]===f))throw Error('OUTPUT_SCHEMA_MISMATCH');
 const ids=new Map();for(const r of table.rows){if(!r.values.lead_id||ids.has(r.values.lead_id))throw Error('DUPLICATE_OR_EMPTY_OUTPUT_ID');ids.set(r.values.lead_id,r);}
 const missing=RUNTIME_FIELDS.filter(f=>!headers.includes(f));if(headers.some((f,i)=>!f&&i<headers.length-1))throw Error('OUTPUT_HEADER_HOLE');
 const requests=[],sheetId=sheet.properties.sheetId,start=headers.length;headers.push(...missing);
 if(headers.length>(sheet.properties.gridProperties.columnCount||0))requests.push({appendDimension:{sheetId,dimension:'COLUMNS',length:headers.length-(sheet.properties.gridProperties.columnCount||0)}});
 if(missing.length)requests.push({updateCells:{start:{sheetId,rowIndex:0,columnIndex:start},rows:[{values:missing.map(cell)}],fields:'userEnteredValue'}});
 let nextRow=Math.max(1,...table.rows.map(r=>r.source_row));const seen=new Set(),expected=[];
 for(const result of results){
  if(seen.has(result.lead_id)||result.dataset_id!==dataset.dataset_id||result.source_spreadsheet_id!==snapshot.spreadsheetId)throw Error('RESULT_PROVENANCE_MISMATCH');seen.add(result.lead_id);
  const old=ids.get(result.lead_id),index=old?old.source_row-1:nextRow++;
  if(old&&protectedReason({...old.values,previous_result:old.values})&&!result.hold_only)throw Error('CURRENT_OUTPUT_REVIEW_OR_HISTORY_LOCK');
  if(result.hold_only&&!old)throw Error('HOLD_ROW_MUST_EXIST');
  const values=result.hold_only||result.rewrite_only?{...result}:require('./research-history').mergeRows(old?.values||{},result);for(const f of HISTORY_FIELDS)values[f]=old?.values[f]??result[f]??'';
  if(old&&['SENT','REPLIED','FOLLOW_UP_DUE','DO_NOT_CONTACT','PARKED','DISQUALIFIED'].includes(old.values.arc_status))values.arc_status=old.values.arc_status;
  // Never rewrite reviewer controls or unrelated owner columns. Existing protected
  // history cells, including formulas and formatting, are not written at all.
  for(const f of result.hold_only?['research_runtime_hold']:result.rewrite_only?['research_status','tier']:[...OUTPUT_FIELDS,...RUNTIME_FIELDS]){if(old&&HISTORY_FIELDS.has(f)||values[f]===undefined)continue;requests.push({updateCells:{start:{sheetId,rowIndex:index,columnIndex:headers.indexOf(f)},rows:[{values:[cell(values[f])]}],fields:'userEnteredValue'}});}
  expected.push(result.hold_only?{lead_id:values.lead_id,research_runtime_hold:values.research_runtime_hold}:{lead_id:values.lead_id,research_status:values.research_status,tier:values.tier,provider_status:values.provider_status,queue_route:values.queue_route,research_batch_id:values.research_batch_id,last_researched_at:values.last_researched_at,evidence_json:values.evidence_json});
 }
 if(nextRow>(sheet.properties.gridProperties.rowCount||0))requests.unshift({appendDimension:{sheetId,dimension:'ROWS',length:nextRow-(sheet.properties.gridProperties.rowCount||0)}});
 if(requests.some(r=>(r.updateCells?.start.sheetId??r.appendDimension?.sheetId)!==sheetId||r.updateCells&&r.updateCells.fields!=='userEnteredValue'))throw Error('SOURCE_WRITE_BLOCKED');
 const owned=new Set([...OUTPUT_FIELDS.filter(f=>!HISTORY_FIELDS.has(f)),...RUNTIME_FIELDS]);
 const protected_hash=sha256(JSON.stringify(table.rows.map(r=>({id:r.values.lead_id,cells:table.headers.map((f,i)=>owned.has(f)?null:{header:f,cell:protectedCell(r.cells[i])})}))));
 return {url:`https://sheets.googleapis.com/v4/spreadsheets/${snapshot.spreadsheetId}:batchUpdate`,body:{requests,includeSpreadsheetInResponse:false},expected,expected_row_count:table.rows.length+results.filter(r=>!ids.has(r.lead_id)).length,protected_hash,source_hash:sourceHash(snapshot),protected_headers:table.headers.filter(f=>!owned.has(f)),protected_ids:table.rows.map(r=>r.values.lead_id),dataset_id:dataset.dataset_id,source_spreadsheet_id:snapshot.spreadsheetId};
}
function confirm(plan,snapshot){
 if(sourceHash(snapshot)!==plan.source_hash)throw Error('SOURCE_CHANGED_AFTER_WRITE');
 const table=readTable(snapshot.sheets.find(s=>s.properties.title==='Arc Research'),1),records=table.rows;
 if(records.length!==plan.expected_row_count)throw Error('UPSERT_ROW_COUNT_CHANGED');
 for(const x of plan.expected){const found=records.filter(r=>r.values.lead_id===x.lead_id);if(found.length!==1)throw Error('UPSERT_ID_INTEGRITY_FAILURE');for(const [k,v]of Object.entries(x))if(text(found[0].values[k])!==text(v))throw Error('UPSERT_VALUE_INTEGRITY_FAILURE:'+k);}
 const existing=records.filter(r=>plan.protected_ids.includes(r.values.lead_id));
 const hash=sha256(JSON.stringify(existing.map(r=>({id:r.values.lead_id,cells:plan.protected_headers.map(f=>({header:f,cell:protectedCell(r.cells[table.headers.indexOf(f)])}))}))));
 // Use the same projection shape as the pre-write receipt, without machine holes.
 if(plan.protected_values_hash&&hash!==plan.protected_values_hash)throw Error('PROTECTED_OUTPUT_CHANGED');
 return {confirmed:plan.expected.length,source_unchanged:true,lead_ids:plan.expected.map(r=>r.lead_id)};
}
function protectPlan(plan,snapshot){const table=readTable(snapshot.sheets.find(s=>s.properties.title==='Arc Research'),1);plan.protected_values_hash=sha256(JSON.stringify(table.rows.map(r=>({id:r.values.lead_id,cells:plan.protected_headers.map(f=>({header:f,cell:protectedCell(r.cells[table.headers.indexOf(f)])}))}))));return plan;}
function completion(result,d,context,snapshot){
 const current=intakeAPI.normalizeDataset(snapshot,context.dataset).leads.find(l=>l.lead_id===result.lead_id);
 if(!current||protectedReason(current)||text(current.previous_result?.research_runtime_hold))throw Error('SOURCE_OR_REVIEW_LOCK_CHANGED');
 if(sourceHash(snapshot)!==context.batch.source_hashes[snapshot.spreadsheetId])throw Error('SOURCE_CHANGED_BEFORE_WRITE');
 const out=decorate(result,d,context.batch),plan=protectPlan(planRows([out],snapshot,context.dataset),snapshot);
 return {...plan,cloud_batch:context,result:out};
}
function bootstrap(intake,config){
 const batch={id:'arc_import_prior_receipts',selected:config.bootstrap_receipts?.length||0,remaining:[],processed:[],skipped:[],source_hashes:validateIntake(intake,config),cost_limits:{exa_usd:3,tavily_credits:150}};
 const results=(config.bootstrap_receipts||[]).map(r=>{const lead=intake.leads.find(l=>l.lead_id===r.result.lead_id);if(!lead||protectedReason(lead))throw Error('BOOTSTRAP_PROVENANCE_OR_LOCK_FAILURE');batch.current_lead_id=lead.lead_id;return decorate({...r.result,source_spreadsheet_id:lead.source_spreadsheet_id},r.discovery,batch);});
 for(const id of config.upsert_existing_ids||[]){const lead=intake.leads.find(l=>l.lead_id===id);if(!lead||lead.previous_result?.research_status!=='COMPLETED')throw Error('UPSERT_TEST_COMPLETION_MISSING');results.push({...lead.previous_result,source_spreadsheet_id:lead.source_spreadsheet_id,dataset_id:lead.dataset_id,rewrite_only:true});}
 for(const id of config.runtime_hold_lead_ids||[]){const lead=intake.leads.find(l=>l.lead_id===id);if(!lead||results.some(r=>r.lead_id===id))throw Error('HOLD_PROVENANCE_FAILURE');results.push({lead_id:id,dataset_id:lead.dataset_id,source_spreadsheet_id:lead.source_spreadsheet_id,research_runtime_hold:'PHASE2_REVIEW_HISTORY_LOCK',hold_only:true});}
 return intake.contexts.filter(c=>results.some(r=>r.dataset_id===c.dataset.dataset_id)).map(c=>({...protectPlan(planRows(results.filter(r=>r.dataset_id===c.dataset.dataset_id),c.snapshot,c.dataset),c.snapshot),verify_url:intakeAPI.gridRequests(intake.contexts.map(x=>x.snapshot._metadata),config).find(r=>r.dataset_id===c.dataset.dataset_id).url,bootstrap:true}));
}
module.exports={RUNTIME_FIELDS,sourceHash,validateIntake,select,workbookRead,decorate,summary,planRows,confirm,protectPlan,completion,bootstrap};
