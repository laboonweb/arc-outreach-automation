'use strict';
// The Phase 2 copy boundary packages the existing eligibility contract without
// invoking the shared Phase 1 helper's legacy text templates.
const {text,sha256}=require('./helpers');
const {FIELDS,facts,selectChannel,lockReason,scheduledTime,draftIdentity}=require('./outreach-mvp');
const {assessTier}=require('./outreach-evidence-tiers');
function metadata(row,now,campaign){
 const route=selectChannel(row,now),fs=facts(row,now),lock=lockReason(row),assessment=assessTier(row,fs,route,now);
 let routing='READY_FOR_DRAFT',reason='';
 if(lock){routing=lock==='DO_NOT_CONTACT'?'DO_NOT_CONTACT':lock==='PARK'?'PARK':lock==='INVALID_ROUTE'?'NEEDS_MANUAL_RESEARCH':'BLOCKED';reason=lock;}
 else if(assessment.tier==='TIER_C_NEEDS_RESEARCH'){routing='NEEDS_MANUAL_RESEARCH';reason=assessment.issues.join('|');}
 else if(!row.timezone){routing='NEEDS_MANUAL_RESEARCH';reason='TIMEZONE_REQUIRED';}
 const schedule=scheduledTime(now,row.timezone),identity=draftIdentity(row,route,campaign);
 if(routing==='READY_FOR_DRAFT'&&!schedule.utc){routing='NEEDS_MANUAL_RESEARCH';reason='TIMEZONE_REQUIRED';}
 return {...identity,...Object.fromEntries(FIELDS.map(k=>[k,''])),lead_id:row.lead_id,business:row.business_name,country:row.country,channel:route.channel,recipient:route.recipient,commercial_quality:row.commercial_quality,research_confidence:row.research_confidence,compliance_status:row.compliance_status||row.acma_status||'REVIEW_REQUIRED',draft_status:routing==='DO_NOT_CONTACT'?'DO_NOT_CONTACT':'NEEDS_RESEARCH',review_status:'UNREVIEWED',scheduled_local_time:routing==='READY_FOR_DRAFT'?schedule.local:'',scheduled_at:routing==='READY_FOR_DRAFT'?schedule.utc:'',timezone:row.timezone||'',followup_count:0,reply_status:row.reply_status||'',routing,route_reason:reason,route_source:route.source,initial_locked:!!lock,created_at:now,concept_plan:'',evidence_summary:JSON.stringify(fs.map(f=>({type:f.type,source_url:f.source_url,observed_at:f.observed_at,fact_date:f.fact_date,excerpt:text(f.excerpt).replace(/\s+/g,' ').trim().slice(0,500),verification:f.verification}))),source_snapshot_hash:sha256(JSON.stringify(row)),source_state:row.arc_status||'',history_followup_due_at:row.followup_due_at||'',history_followup_count:row.followup_count||0,history_contact_at:row.first_contact_at||row.sent_at||'',history_reply_at:row.last_reply_at||'',evidence_tier:assessment.tier,tier_issues:assessment.issues,tier_evidence_basis:JSON.stringify([assessment.identity,assessment.activity,assessment.gap||assessment.opportunity].filter(Boolean))};
}
module.exports={metadata};
