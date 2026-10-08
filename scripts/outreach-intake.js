'use strict';
const {buildDraft,summary}=require('./outreach-mvp');
function decodeSelected(responses,selection){
 const rows=[];
 for(const response of responses){
  const input=response.body||response;if(!input.valueRanges||!input.spreadsheetId)throw new Error('INVALID_SHEETS_RESPONSE');
  const group=selection.find(s=>s.spreadsheet_id===input.spreadsheetId);if(!group)throw new Error('UNEXPECTED_WORKBOOK');
  const headers=input.valueRanges[0]?.values?.[0];if(!headers||!headers.includes('lead_id')||!headers.includes('evidence_json'))throw new Error('ARC_RESEARCH_HEADER_MISMATCH');
  for(let i=0;i<group.cases.length;i++){const values=input.valueRanges[i+1]?.values?.[0];if(!values)throw new Error('MISSING_SELECTED_ROW');const row=Object.fromEntries(headers.map((h,j)=>[h,values[j]??'']));if(row.lead_id!==group.cases[i].lead_id)throw new Error('SELECTED_ROW_MOVED_REVIEW_REQUIRED');rows.push(row);}
 }
 if(rows.length!==10||new Set(rows.map(r=>r.lead_id)).size!==10)throw new Error('FIXED_TEN_REQUIRED');
 return rows;
}
function preview(responses,selection,now=new Date().toISOString()){const rows=decodeSelected(responses,selection),drafts=rows.map(r=>buildDraft(r,now));return {created_at:now,records:rows,drafts,summary:summary(drafts),sending_enabled:false,source_writes:0,provider_calls:0};}
module.exports={decodeSelected,preview};
