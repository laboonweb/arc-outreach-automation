'use strict';
const {yes,text,norm}=require('./helpers');
const {buildDraft,selectChannel,facts,CHANNELS}=require('./outreach-mvp');
const {timezoneFor}=require('./timezone');
const {recalculateMachineDuplicates,socialKey}=require('./duplicate-detection');
const {assessTier}=require('./outreach-evidence-tiers');
const ROUTES=['READY_FOR_DRAFT_TIER_A','READY_FOR_DRAFT_TIER_B','MANUAL_SOCIAL_TIER_A','MANUAL_SOCIAL_TIER_B','NEEDS_MANUAL_RESEARCH','PARK','BLOCKED','DO_NOT_CONTACT','ALREADY_CONTACTED'];
const READY_ROUTES=ROUTES.slice(0,4);
function mergeResearch(lead){
 const prior=lead.previous_result||{},row={...prior,...lead};delete row.previous_result;
 for(const key of ['initial_contact_recorded','initial_outreach_blocked','duplicate_review_required'])row[key]=yes(prior[key])||yes(lead[key]);
 row.timezone=timezoneFor(row).timezone||row.timezone||'';return row;
}
function routeLead(row,existing,controls,now){
 const route=selectChannel(row,now),states=[row.arc_status,row.manual_status_override,existing?.draft_status,existing?.source_state];
 const identities=['lead:'+row.lead_id,'route:'+norm(existing?.recipient||route.recipient)];
 const suppressed=controls.suppression.some(x=>identities.includes(x.identity));
 const contacted=controls.contact_locks.some(x=>identities.includes(x.identity));
 let routing='',reason='';
 if(suppressed||states.includes('DO_NOT_CONTACT')||yes(row.suppressed)||row.suppression_status==='DO_NOT_CONTACT'||/UNSUBSCRIBED|COMPLAINT|NOT_INTERESTED|DO_NOT_CONTACT/.test(row.reply_status||existing?.reply_status||'')){routing='DO_NOT_CONTACT';reason='PERMANENT_SUPPRESSION';}
 else if(states.includes('DISQUALIFIED')||row.commercial_quality==='DISQUALIFY'){routing='BLOCKED';reason='EXISTING_DISQUALIFICATION';}
 else if(states.includes('PARKED')||existing?.followups_parked){routing='PARK';reason='REVIEWER_PARKED';}
 else if(contacted||states.some(s=>['SENT','REPLIED','FOLLOW_UP_DUE'].includes(s))||row.dataset_id==='MANILA_LEGACY'||yes(row.initial_contact_recorded)||text(row.sent_at)||text(row.first_contact_at)||text(row.last_reply_at)||existing?.sent_at||existing?.history_contact_at||existing?.last_reply_at){routing='ALREADY_CONTACTED';reason='PROTECTED_OUTREACH_HISTORY';}
 else if(yes(row.duplicate_review_required)||yes(row.initial_outreach_blocked)||existing?.review_status==='REJECTED'||existing?.draft_status==='REJECTED'){routing='BLOCKED';reason=existing?.review_status==='REJECTED'?'REVIEWER_REJECTED':'DUPLICATE_OR_CONTACT_LOCK_REVIEW';}
 else if(['SOURCE_CHANGED_REVIEW_REQUIRED','ROUTE_INVALID','RECONCILIATION_REQUIRED'].includes(existing?.review_status)||existing?.route_invalid){routing='NEEDS_MANUAL_RESEARCH';reason=existing.review_status||'ROUTE_INVALID';}
 let d;
 if(!routing){
  // Keep the approved provider draft byte-for-byte; a routing pass cannot reapprove it.
  if(existing&&['APPROVED','ZOHO_DRAFT_CREATED'].includes(existing.draft_status)&&existing.review_status==='APPROVED')d={...existing,evidence_tier:existing.evidence_tier||'TIER_A_VERIFIED_GAP',tier_evidence_basis:existing.tier_evidence_basis||existing.evidence_summary};
  else d=buildDraft(row,now);
  routing=d.routing;reason=d.route_reason;
  if(routing==='READY_FOR_DRAFT'){const tier=d.evidence_tier==='TIER_B_VERIFIED_OPPORTUNITY'?'B':'A';routing=(d.channel==='EMAIL'?'READY_FOR_DRAFT_TIER_':'MANUAL_SOCIAL_TIER_')+tier;}
 }
 d||={lead_id:row.lead_id,business:row.business_name,country:row.country,channel:route.channel,recipient:route.recipient,commercial_quality:row.commercial_quality||'UNASSESSED',research_confidence:row.research_confidence||'UNKNOWN',compliance_status:row.compliance_status||row.acma_status||'REVIEW_REQUIRED'};
 if(!d.evidence_tier){const a=assessTier(row,facts(row,now),route,now);d.evidence_tier=a.tier;d.tier_issues=a.issues;d.tier_evidence_basis=JSON.stringify([a.identity,a.activity,a.gap||a.opportunity].filter(Boolean));}
 const out={...d,dataset_id:row.dataset_id,routing,route_reason:reason,source_state:row.arc_status||'',duplicate_review_required:yes(row.duplicate_review_required),duplicate_matches_json:row.duplicate_matches_json||'[]',research_required:yes(row.research_required),review_status:existing?.review_status||d.review_status||'UNREVIEWED'};
 if(!routing.startsWith('READY_FOR_DRAFT_TIER_')){out.subject='';out.draft_body='';out.concept_plan='';delete out.message_hash;}
 return out;
}
function routingPass(leads,{drafts=[],suppression=[],contact_locks=[]}={},now=new Date().toISOString()){
 if(new Set(leads.map(r=>r.lead_id)).size!==leads.length)throw new Error('DUPLICATE_SOURCE_LEAD_ID');
 const local=new Map(drafts.map(d=>[d.lead_id,d])),controls={suppression,contact_locks};
 const rows=recalculateMachineDuplicates(leads).map(l=>routeLead(mergeResearch(l),local.get(l.lead_id),controls,now));
 const recipients=new Map();for(const r of rows){if(!r.recipient||r.channel==='NO_ROUTE')continue;const key=r.channel+':'+(r.channel==='FACEBOOK'?socialKey(r.recipient):norm(r.recipient).replace(/\/$/,''));recipients.set(key,[...(recipients.get(key)||[]),r]);}
 const conflicts=[...recipients.values()].filter(group=>new Set(group.map(r=>r.lead_id)).size>1).map(group=>({channel:group[0].channel,recipient:group[0].recipient,lead_ids:group.map(r=>r.lead_id)}));
 for(const group of conflicts)for(const id of group.lead_ids){const r=rows.find(x=>x.lead_id===id);r.recipient_conflict=true;if(READY_ROUTES.includes(r.routing)){r.routing='BLOCKED';r.route_reason='SHARED_RECIPIENT_REVIEW_REQUIRED';r.subject='';r.draft_body='';r.concept_plan='';delete r.message_hash;}}
 const counts=()=>Object.fromEntries(ROUTES.map(k=>[k,0])),totals=counts(),datasets={},channels=Object.fromEntries(READY_ROUTES.map(k=>[k,Object.fromEntries(CHANNELS.map(c=>[c,0]))]));
 for(const r of rows){if(!ROUTES.includes(r.routing))throw new Error('UNKNOWN_ROUTING');totals[r.routing]++;datasets[r.dataset_id]||={total:0,...counts()};datasets[r.dataset_id].total++;datasets[r.dataset_id][r.routing]++;if(channels[r.routing])channels[r.routing][r.channel]++;if(!r.routing.startsWith('READY_FOR_DRAFT_TIER_')&&(r.draft_body||r.subject))throw new Error('COPY_OUTSIDE_READY');}
 return {created_at:now,records:rows,summary:{total_unique_leads:rows.length,routing:totals,datasets,channels,duplicate_warning_leads:rows.filter(r=>r.duplicate_review_required).length,recipient_conflict_groups:conflicts.length,recipient_conflict_leads:rows.filter(r=>r.recipient_conflict).length,conflicts,source_writes:0,provider_calls:0,outreach_sent:0,discovery_requests:0},no_outreach:true};
}
module.exports={ROUTES,READY_ROUTES,mergeResearch,routeLead,routingPass};
