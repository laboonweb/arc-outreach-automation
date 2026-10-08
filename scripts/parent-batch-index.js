'use strict';
// Parent-only memory boundary. Native HTTP owns all I/O. Raw grids never leave
// this index construction, and only one selected row is richly materialized.
const intake = require('./parent-dataset-intake');
const runtime = require('./cloud-research-runtime');
const {readTable} = require('./sheet-grid');
const {detectDuplicates,recalculateMachineDuplicates} = require('./duplicate-detection');
const {protectedReason} = require('./autonomous-discovery');
const {mergeResearch,routeLead} = require('./operational-routing');
const {publicIdentifiers} = require('./research-fallback-query');
const {text,sha256} = require('./helpers');

const DUPLICATE_FIELDS = ('lead_id dataset_id country business_name phone website_url maps_url source_original_id address facebook_url instagram_url linkedin_url source_url initial_contact_recorded legacy_join_review_required arc_status duplicate_matches_json duplicate_review_required initial_outreach_blocked manual_duplicate_review_required').split(' ');
const LOCK_FIELDS = ('arc_status commercial_quality initial_contact_recorded initial_outreach_blocked legacy_join_review_required first_contact_at last_reply_at sent_at suppressed suppression_status manual_status_override identity_status_reviewed review_status association_verified legitimacy_verified activity_verified contact_verified gap_verified research_status research_runtime_hold last_researched_at duplicate_matches_json duplicate_review_required manual_duplicate_review_required facebook_url').split(' ');
const pick = (row,fields) => Object.fromEntries(fields.filter(k=>row[k]!==undefined).map(k=>[k,row[k]]));
const bytes = value => Buffer.byteLength(JSON.stringify(value),'utf8');
function parseGrid(item) {
  const raw=item?.json||item;
  const value=typeof raw.data==='string'?JSON.parse(raw.data):raw;
  if(!value.spreadsheetId||!Array.isArray(value.sheets))throw Error('INVALID_SOURCE_GRID_RESPONSE');
  return value;
}
function indexWorkbook(item,metadata,config,now=new Date().toISOString(),outputValues) {
  const started=Date.now(),snapshot=parseGrid(item),datasets=intake.validateRegistry(config),dataset=datasets.find(d=>d.spreadsheet_id===snapshot.spreadsheetId);
  if(!dataset)throw Error('SOURCE_WORKBOOK_ASSOCIATION_FAILURE');
  if(config.verification||config.bootstrap_receipts?.length||config.upsert_existing_ids?.length){snapshot._metadata=metadata.find(m=>m.spreadsheetId===snapshot.spreadsheetId);return {maintenance:true,context:intake.normalizeDataset(snapshot,dataset,now)};}
  if(outputValues){
    const values=typeof outputValues.data==='string'?JSON.parse(outputValues.data):outputValues;
    if(!Array.isArray(values.values))throw Error('INVALID_OUTPUT_VALUE_RESPONSE');
    const properties=metadata.find(m=>m.spreadsheetId===snapshot.spreadsheetId)?.sheets.find(s=>s.properties.title===dataset.output_sheet)?.properties;
    if(!properties||snapshot.sheets.some(s=>s.properties.title===dataset.output_sheet))throw Error('OUTPUT_VALUE_ASSOCIATION_FAILURE');
    snapshot.sheets.push({properties,data:[{rowData:values.values.map(row=>({values:row.map(v=>({formattedValue:typeof v==='boolean'?(v?'TRUE':'FALSE'):String(v)}))}))}]});
  }
  const source_hash=runtime.sourceHash(snapshot);
  if(config.expected_snapshot_hashes?.[snapshot.spreadsheetId]&&sha256(JSON.stringify(snapshot.sheets))!==config.expected_snapshot_hashes[snapshot.spreadsheetId])throw Error('PRE_PATCH_SOURCE_SNAPSHOT_CHANGED');
  if(config.expected_source_hashes?.[snapshot.spreadsheetId]&&source_hash!==config.expected_source_hashes[snapshot.spreadsheetId])throw Error('SOURCE_INTEGRITY_FAILURE');
  const outputRows=new Map(),output=snapshot.sheets.find(s=>s.properties.title===dataset.output_sheet);
  if(output)for(const r of readTable(output,1).rows){const id=r.values.lead_id;if(!id||outputRows.has(id))throw Error('DUPLICATE_OR_EMPTY_OUTPUT_ID');outputRows.set(id,r.source_row);}
  const projected=intake.normalizeDataset(snapshot,dataset,now,{include_legacy_snapshot:false,project:lead=>{
    // Routing's evidence assessment is independent of duplicate/contact locks.
    // Assess one temporary row, then apply the unchanged global duplicate rules
    // on the compact projections. The final locks must ALL pass before selection.
    const candidate={...lead,duplicate_review_required:false,initial_outreach_blocked:false,duplicate_matches_json:'[]',previous_result:{...lead.previous_result,duplicate_review_required:false,initial_outreach_blocked:false,duplicate_matches_json:'[]'}};
    const prior=lead.previous_result||{};
    const retry=config.targeted_retry?.lead_id===lead.lead_id;
    const routing=!protectedReason(candidate)&&!text(prior.research_runtime_hold)&&(retry||!text(prior.research_status)||prior.research_status==='PROVIDER_RETRY_REQUIRED')?routeLead(mergeResearch(candidate),undefined,{suppression:[],contact_locks:[]},now).routing:'';
    return {...pick(lead,[...DUPLICATE_FIELDS,...LOCK_FIELDS,'source_spreadsheet_id','source_sheet','source_row']),previous_result:pick(prior,LOCK_FIELDS),previous_result_hash:sha256(JSON.stringify(prior)),research_row:outputRows.get(lead.lead_id)||0,_routing:routing};
  }});
  return {dataset_id:dataset.dataset_id,source_spreadsheet_id:snapshot.spreadsheetId,source_hash,records:projected.leads,metrics:{output_rows:outputRows.size,source_read_bytes:typeof (item.json||item).data==='string'?Buffer.byteLength((item.json||item).data,'utf8'):bytes(snapshot),output_value_bytes:outputValues?bytes(outputValues):0,eligibility_index_ms:Date.now()-started}};
}
function combineIndex(parts,config){
  const started=Date.now(),datasets=intake.validateRegistry(config);
  if(parts.length!==datasets.length)throw Error('INCOMPLETE_DATASET_SNAPSHOT');
  if(parts.some(p=>p.maintenance)){if(!parts.every(p=>p.maintenance))throw Error('MIXED_MAINTENANCE_INDEX');const contexts=datasets.map(d=>parts.find(p=>p.context.dataset.dataset_id===d.dataset_id)?.context);if(contexts.some(c=>!c))throw Error('MISSING_DATASET');return {maintenance:true,intake:{contexts,leads:detectDuplicates(contexts.flatMap(c=>c.leads))}};}
  if(new Set(parts.map(p=>p.source_spreadsheet_id)).size!==datasets.length||datasets.some(d=>!parts.some(p=>p.source_spreadsheet_id===d.spreadsheet_id&&p.dataset_id===d.dataset_id)))throw Error('SOURCE_WORKBOOK_ASSOCIATION_FAILURE');
  const source_hashes=Object.fromEntries(parts.map(p=>[p.source_spreadsheet_id,p.source_hash])),rows=datasets.flatMap(d=>parts.find(p=>p.dataset_id===d.dataset_id).records);
  if(new Set(rows.map(r=>r.lead_id)).size!==rows.length)throw Error('SOURCE_ID_INTEGRITY_FAILURE');
  if(config.expected_lead_count&&rows.length!==config.expected_lead_count)throw Error('SOURCE_COUNT_CHANGED');
  const selectedDuplicates=recalculateMachineDuplicates(detectDuplicates(rows)),routedDuplicates=recalculateMachineDuplicates(selectedDuplicates);
  const records=selectedDuplicates.map((current,i)=>{
    const prior=current.previous_result,reason=protectedReason(current),retry=config.targeted_retry?.lead_id===current.lead_id,eligible=!reason&&!protectedReason(routedDuplicates[i])&&!text(prior.research_runtime_hold)&&(retry||!text(prior.research_status)||prior.research_status==='PROVIDER_RETRY_REQUIRED')&&current._routing==='NEEDS_MANUAL_RESEARCH';
    return {...pick(current,['lead_id','dataset_id','source_spreadsheet_id','source_sheet','source_row','business_name','previous_result_hash','research_row']),research_status:prior.research_status||'',last_researched_at:prior.last_researched_at||'',eligible,protected_reason:reason,
      duplicate_state:eligible?{...pick(current,['duplicate_review_required','duplicate_matches_json','duplicate_group_key','initial_outreach_blocked','duplicate_recalculated']),previous_result:pick(prior,['duplicate_review_required','duplicate_matches_json','initial_outreach_blocked'])}:undefined};
  });
  const result={records,source_hashes,metrics:{records_before_selection:records.length,eligible_records:records.filter(r=>r.eligible).length,output_rows_by_dataset:Object.fromEntries(parts.map(p=>[p.dataset_id,p.metrics.output_rows])),source_read_bytes:parts.reduce((n,p)=>n+p.metrics.source_read_bytes,0),output_value_bytes:parts.reduce((n,p)=>n+(p.metrics.output_value_bytes||0),0),eligibility_index_ms:parts.reduce((n,p)=>n+p.metrics.eligibility_index_ms,0)+Date.now()-started,index_bytes:0}};
  result.metrics.index_bytes=bytes(result);return result;
}
function buildIndex(items,metadata,config,now=new Date().toISOString()) {return combineIndex(items.map(item=>indexWorkbook(item,metadata,config,now)),config);}

function select(index,config,executionId,now=new Date().toISOString()) {
  if(index.maintenance)return runtime.select(index.intake,config,executionId,now);
  const started=Date.now(),size=Number(config.batch_size??25);
  if(![25,50,100].includes(size))throw Error('INVALID_BATCH_SIZE_USE_25_50_100');
  let batch=config.cloud_batch;
  if(!batch){
    let pool=index.records.filter(r=>r.eligible);
    if(config.targeted_retry){const t=config.targeted_retry;if(config.validation_lead_ids||!/^arc_[a-f0-9]{64}$/.test(t.lead_id)||!require('./research-retry').SCOPES[t.reason])throw Error('TARGETED_RETRY_CONFIGURATION_REQUIRED');pool=pool.filter(r=>r.lead_id===t.lead_id);if(pool.length!==1)throw Error('TARGETED_RETRY_LEAD_NOT_ELIGIBLE');}
    else if(config.validation_lead_ids){if(config.validation_lead_ids.length!==2||new Set(config.validation_lead_ids).size!==2)throw Error('VALIDATION_CAP_EXACTLY_2');pool=config.validation_lead_ids.map(id=>pool.find(r=>r.lead_id===id));if(pool.some(r=>!r))throw Error('VALIDATION_LEAD_NOT_ELIGIBLE');}
    else pool.sort((a,b)=>Number(b.research_status==='PROVIDER_RETRY_REQUIRED')-Number(a.research_status==='PROVIDER_RETRY_REQUIRED'));
    const selected=pool.slice(0,config.targeted_retry?1:config.validation_lead_ids?2:size);
    batch={id:'arc_batch_'+executionId,selected:selected.length,remaining:selected.map(r=>r.lead_id),processed:[],skipped:[],source_hashes:index.source_hashes,cost_limits:{exa_usd:Number(config.exa_cost_ceiling_usd??3),tavily_credits:Number(config.tavily_credit_ceiling??150)},provider_circuits:{},started_at:now};
  }
  if(!batch.id||batch.selected>100||!Array.isArray(batch.remaining)||!Array.isArray(batch.processed)||new Set([...batch.remaining,...batch.processed.map(r=>r.lead_id),...(batch.skipped||[])]).size!==batch.selected)throw Error('BATCH_CONFIGURATION_INTEGRITY_FAILURE');
  for(const [id,h]of Object.entries(batch.source_hashes))if(index.source_hashes[id]!==h)throw Error('SOURCE_CHANGED_DURING_BATCH');
  const usage=runtime.summary(batch),metrics={...index.metrics,batch_selection_ms:Date.now()-started,selected:batch.selected,selection_bytes:0};
  if(usage.exa_cost_usd+0.03>batch.cost_limits.exa_usd||usage.tavily_credits+2>batch.cost_limits.tavily_credits)return {batch,pending:false,summary:runtime.summary(batch,'STOPPED','COST_CEILING_RESERVE'),metrics};
  const selected_refs=batch.remaining.map(id=>{const r=index.records.find(x=>x.lead_id===id);if(!r)throw Error('QUEUED_LEAD_MISSING');return pick(r,['lead_id','dataset_id','source_sheet','source_row']);});
  if(config.preprocessing_only===true){const out={pending:false,batch,selected_refs,metrics,summary:{status:'PREPROCESSING_VALIDATED',selected:batch.selected,sending_enabled:false,source_writes:0,provider_requests:0}};metrics.selection_bytes=bytes(out);return out;}
  let ref;
  while(batch.remaining.length&&!ref){const id=batch.remaining.shift(),candidate=index.records.find(r=>r.lead_id===id);if(!candidate)throw Error('QUEUED_LEAD_MISSING');if(candidate.eligible)ref=candidate;else batch.skipped.push(id);}
  if(!ref)return {batch,pending:false,summary:runtime.summary(batch,'COMPLETE'),metrics};
  batch.current_lead_id=ref.lead_id;
  const out={pending:true,batch,selected_ref:ref,metrics};metrics.batch_selection_ms=Date.now()-started;metrics.selection_bytes=bytes(out);return out;
}
function materializationRead(selection,metadata,config){
  const ref=selection.selected_ref,dataset=config.datasets.find(d=>d.dataset_id===ref.dataset_id);
  if(!selection.pending||!dataset||dataset.spreadsheet_id!==ref.source_spreadsheet_id)throw Error('SELECTED_ROW_PROVENANCE_FAILURE');
  const request=intake.gridRequests(metadata,config).find(r=>r.dataset_id===dataset.dataset_id),[base,query]=request.url.split('?');
  const parts=query.split('&').filter(p=>!(p.startsWith('ranges=')&&decodeURIComponent(p.slice(7))==="'Arc Research'"));
  parts.push('ranges='+encodeURIComponent("'Arc Research'!1:1"));
  if(ref.research_row)parts.push('ranges='+encodeURIComponent("'Arc Research'!"+ref.research_row+':'+ref.research_row));
  return {url:base+'?'+parts.join('&')};
}
function materialize(item,selection,metadata,config,now=new Date().toISOString()){
  const snapshot=parseGrid(item),ref=selection.selected_ref,batch=selection.batch,dataset=config.datasets.find(d=>d.dataset_id===ref.dataset_id);
  if(snapshot.spreadsheetId!==ref.source_spreadsheet_id||runtime.sourceHash(snapshot)!==batch.source_hashes[snapshot.spreadsheetId])throw Error('SOURCE_CHANGED_BEFORE_DISPATCH');
  const raw=intake.normalizeDataset(snapshot,dataset,now,{selected_ids:new Set([ref.lead_id])}).leads;
  if(raw.length!==1||raw[0].source_row!==ref.source_row||raw[0].source_sheet!==ref.source_sheet)throw Error('SELECTED_ROW_PROVENANCE_FAILURE');
  if(sha256(JSON.stringify(raw[0].previous_result||{}))!==ref.previous_result_hash)throw Error('SELECTED_OUTPUT_CHANGED_BEFORE_DISPATCH');
  const d=ref.duplicate_state,lead={...raw[0],...pick(d,['duplicate_review_required','duplicate_matches_json','duplicate_group_key','initial_outreach_blocked','duplicate_recalculated']),previous_result:{...raw[0].previous_result,...d.previous_result}};
  if(protectedReason(lead)||text(lead.previous_result.research_runtime_hold)||text(lead.previous_result.research_status)&&lead.previous_result.research_status!=='PROVIDER_RETRY_REQUIRED'&&config.targeted_retry?.lead_id!==lead.lead_id)throw Error('SELECTED_LEAD_LOCK_CHANGED');
  if(routeLead(mergeResearch(lead),undefined,{suppression:[],contact_locks:[]},now).routing!=='NEEDS_MANUAL_RESEARCH')throw Error('SELECTED_LEAD_ROUTING_CHANGED');
  const usage=runtime.summary(batch),merged=mergeResearch(lead);merged.previous_result=lead.previous_result;merged.routing='NEEDS_MANUAL_RESEARCH';merged.public_business_identifiers=publicIdentifiers(merged);
  // Preserve the frozen worker contract. The batch appears exactly once.
  return {lead:merged,config:{allowed_hosts:dataset.allowed_hosts||[],discovery:{enabled:true,provider_approved:true,mode:'AUTONOMOUS_V2',require_cost_metadata:true,remaining_exa_cost_usd:batch.cost_limits.exa_usd-usage.exa_cost_usd,remaining_tavily_credits:batch.cost_limits.tavily_credits-usage.tavily_credits,provider_circuits:batch.provider_circuits,...(config.targeted_retry?.lead_id===lead.lead_id?{retry_reason:config.targeted_retry.reason}:{})}},cloud_batch:{batch,dataset,workbook_metadata:metadata.find(m=>m.spreadsheetId===snapshot.spreadsheetId),registry:config.datasets,parent_workflow_id:config.parent_workflow_id}};
}
module.exports={indexWorkbook,combineIndex,buildIndex,select,materializationRead,materialize,parseGrid};
