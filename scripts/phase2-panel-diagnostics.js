'use strict';
// Read-only view hydration. The original queue, Inbox, links and their signed
// hashes remain authoritative. These requests never write a projection.
const {diagnose}=require('./research-diagnostics');
const ID=/^arc_[a-f0-9]{64}$/;
const PAGE=20,MAX_HELD=100;
function targets(input){
 const keys=new Set(),out=[];
 for(const row of input.queue){if(keys.has(row.queue_key))throw Error('DUPLICATE_QUEUE_KEY');keys.add(row.queue_key);const d=JSON.parse(row.payload);if(d.lead_id!==row.lead_id||d.lead_step_key!==row.queue_key)throw Error('QUEUE_IDENTITY_MISMATCH');
  // Contacted/provider-linked history does not consume the bounded initial
  // qualification read page merely because it now contains an operator audit.
  const operatorTarget=d.operator_workspace&&!d.sent_at&&!d.history_contact_at&&!d.provider_status&&!d.provider_draft_id&&!d.initial_locked&&!['PROTECTED','DO_NOT_CONTACT','REJECTED','PARKED','DISQUALIFIED'].includes(d.draft_status);
  if(['NEEDS_RESEARCH','NEEDS_COPY','DRAFT_READY','DRAFT_READY_SEND_BLOCKED','NEEDS_REVIEW'].includes(row.state)||operatorTarget||!String(row.draft_body||'').trim())out.push({lead_id:row.lead_id,queue_key:row.queue_key});
 }
 if(out.length>MAX_HELD)throw Error('PANEL_HELD_PAGE_REQUIRED');return out;
}
function url(book,ranges){return 'https://sheets.googleapis.com/v4/spreadsheets/'+book+'/values:batchGet?valueRenderOption=UNFORMATTED_VALUE&'+ranges.map(r=>'ranges='+encodeURIComponent("'Arc Research'!"+r)).join('&');}
function indexRequests(input,registry){targets(input);return registry.map(d=>({url:url(d.spreadsheet_id,['1:1','A2:A'])}));}
function indexRows(responses,registry){
 const seen=new Set(),out=[];
 for(const raw of responses){const r=raw.body||raw,d=registry.find(x=>x.spreadsheet_id===r.spreadsheetId);if(!d||seen.has(d.dataset_id)||r.valueRanges?.length!==2)throw Error('PANEL_INDEX_ASSOCIATION_FAILURE');seen.add(d.dataset_id);
  const headers=r.valueRanges[0].values?.[0];if(!headers||headers[0]!=='lead_id'||new Set(headers).size!==headers.length||!['dataset_id','business_name','evidence_json','arc_status'].every(k=>headers.includes(k)))throw Error('PANEL_RESEARCH_HEADER_MISMATCH');
  const ids=new Set();for(const [i,cells]of (r.valueRanges[1].values||[]).entries()){if(!cells[0])continue;if(!ID.test(cells[0])||ids.has(cells[0]))throw Error('PANEL_INDEX_ID_MISMATCH');ids.add(cells[0]);out.push({lead_id:cells[0],row:i+2,dataset_id:d.dataset_id,spreadsheet_id:d.spreadsheet_id});}
 }
 if(seen.size!==registry.length)throw Error('PANEL_INDEX_WORKBOOK_MISSING');return out;
}
function exactRequests(input,responses,registry){
 const index=indexRows(responses,registry),selected=[];
 for(const t of targets(input)){const matches=index.filter(x=>x.lead_id===t.lead_id);if(matches.length!==1)throw Error('PANEL_EXACT_LEAD_ASSOCIATION_REQUIRED');if(!selected.some(x=>x.lead_id===t.lead_id))selected.push(matches[0]);}
 const requests=[];for(const d of registry){const rows=selected.filter(x=>x.dataset_id===d.dataset_id);for(let i=0;i<rows.length;i+=PAGE){const page=rows.slice(i,i+PAGE);requests.push({url:url(d.spreadsheet_id,['1:1',...page.map(x=>x.row+':'+x.row)])});}}
 // A header-only response keeps n8n's render path alive when no leads are held.
 return requests.length?requests:[{url:url(registry[0].spreadsheet_id,['1:1'])}];
}
function attach(input,responses,indexResponses,registry,now=new Date().toISOString(),checkHistory=[]){
 if(!Array.isArray(checkHistory)||checkHistory.some(f=>f.type!=='research_check_attempt'||!ID.test(f.lead_id)||!Number.isFinite(Date.parse(f.observed_at))))throw Error('PANEL_CHECK_HISTORY_INVALID');
 const index=indexRows(indexResponses,registry),held=targets(input),wanted=new Set(held.map(x=>x.lead_id)),seen=new Set(),diagnosticsByKey={};
 for(const raw of responses){const r=raw.body||raw,d=registry.find(x=>x.spreadsheet_id===r.spreadsheetId);if(!d||!r.valueRanges?.length||r.valueRanges.length>PAGE+1)throw Error('PANEL_EXACT_RESPONSE_REQUIRED');const headers=r.valueRanges[0].values?.[0];if(!headers||headers[0]!=='lead_id'||new Set(headers).size!==headers.length)throw Error('PANEL_RESEARCH_HEADER_MISMATCH');
  for(const v of r.valueRanges.slice(1)){const m=/!([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(v.range),cells=v.values?.[0];if(!m||m[2]!==m[4]||v.values?.length!==1||!cells)throw Error('PANEL_EXACT_ROW_REQUIRED');const row=Object.fromEntries(headers.map((h,i)=>[h,cells[i]??''])),expected=index.find(x=>x.spreadsheet_id===r.spreadsheetId&&x.row===Number(m[2]));if(!expected||row.lead_id!==expected.lead_id||row.dataset_id!==d.dataset_id||!wanted.has(row.lead_id)||seen.has(row.lead_id))throw Error('PANEL_EXACT_LEAD_ASSOCIATION_REQUIRED');seen.add(row.lead_id);
   for(const t of held.filter(x=>x.lead_id===row.lead_id)){const backend=input.queue.find(x=>x.queue_key===t.queue_key),d=JSON.parse(backend.payload);diagnosticsByKey[t.queue_key]=diagnose(require('./phase2-operator-evidence').effective(row,d,now),now,d,checkHistory.filter(f=>f.lead_id===row.lead_id));if(d.operator_workspace){const evaluation=require('./phase2-operator-lifecycle').evaluate(row,d,now);diagnosticsByKey[t.queue_key].missing_or_stale=evaluation.missing;diagnosticsByKey[t.queue_key].send_blockers=evaluation.blockers;diagnosticsByKey[t.queue_key].operator_evaluation=evaluation;}}
  }
 }
 if(seen.size!==wanted.size)throw Error('PANEL_HELD_RECORD_MISSING');return {...input,diagnosticsByKey};
}
module.exports={PAGE,MAX_HELD,targets,indexRequests,indexRows,exactRequests,attach};
