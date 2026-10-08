'use strict';
const {text,yes,norm,sha256,parsePublicUrl}=require('./helpers');
const {facts,selectChannel,lockReason,list,draftIdentity,SIGNATURE}=require('./outreach-mvp');
const {metadata}=require('./phase2-draft-metadata');
const {socialKey}=require('./duplicate-detection');
const {renderDraftHtml,FOOTER}=require('./composio-zoho');
const QUALIFIED=new Set(['TIER_A_VERIFIED_GAP','TIER_B_VERIFIED_OPPORTUNITY']);
const CAMPAIGN='arc-mvp-v1';
const COLUMNS={};
for(const k of 'queue_key draft_key lead_id business_name dataset_id tier channel platform recipient subject draft_body draft_html evidence_basis source_urls compliance_status suppression_status duplicate_status campaign step created_at review_status state sent_at followup_due_at reply_status action reviewer compliance_basis review_note due_at message_hash approved_hash reviewed_hash payload provider_status provider_draft_id claim_execution claim_at action_step followup_message sent_message'.split(' '))COLUMNS[k]='string';
for(const k of 'sent truthful recipient_relevant consent_reviewed suppression_checked dm_verified manual_send_confirmation'.split(' '))COLUMNS[k]='boolean';
COLUMNS.followup_count='number';
function decode(responses,registry){
 const rows=[],seen=new Set(),books=new Set();
 for(const response of responses){const r=response.body||response,d=registry.find(x=>x.spreadsheet_id===r.spreadsheetId);if(!d||books.has(d.dataset_id))throw new Error('UNEXPECTED_OR_DUPLICATE_WORKBOOK');books.add(d.dataset_id);
  const values=r.valueRanges?.[0]?.values,headers=values?.[0];
  if(!headers||!['lead_id','business_name','evidence_json','arc_status'].every(k=>headers.includes(k))||new Set(headers).size!==headers.length)throw new Error('ARC_RESEARCH_HEADER_MISMATCH');
  for(const cells of values.slice(1)){if(!cells.some(x=>text(x)))continue;const row=Object.fromEntries(headers.map((h,i)=>[h,cells[i]??'']));if(!/^arc_[a-f0-9]{64}$/.test(row.lead_id)||seen.has(row.lead_id)||row.dataset_id!==d.dataset_id)throw new Error('RESEARCH_ID_OR_PROVENANCE_MISMATCH');seen.add(row.lead_id);rows.push(row);}
 }
 if(books.size!==registry.length)throw new Error('MISSING_WORKBOOK');return rows;
}
function tier(row){return row.evidence_tier||row.commercial_tier||row.qualification_tier||row.tier||(QUALIFIED.has(row.commercial_basis)?row.commercial_basis:'');}
function protection(row){
 const states=[row.arc_status,row.manual_status_override,row.draft_status,row.review_status,row.queue_route,row.outreach_readiness];
 if(states.some(s=>['ALREADY_CONTACTED','SENT','BLOCKED','PARK','PARKED','DISQUALIFIED','DO_NOT_CONTACT','ZOHO_DRAFT_CREATED'].includes(s)))return 'PROTECTED_'+states.find(s=>['ALREADY_CONTACTED','SENT','BLOCKED','PARK','PARKED','DISQUALIFIED','DO_NOT_CONTACT','ZOHO_DRAFT_CREATED'].includes(s));
 if(yes(row.contact_locked)||yes(row.duplicate_contact_lock)||text(row.provider_draft_id))return 'CONTACT_OR_PROVIDER_LOCK';
 return lockReason(row);
}
function inspect(responses,registry,now=new Date().toISOString()){
 const rows=decode(responses,registry),tiers={},routes={},states={},headers=responses.map(r=>({spreadsheet_id:(r.body||r).spreadsheetId,fields:(r.body||r).valueRanges[0].values[0]}));
 for(const row of rows){for(const [bag,key] of [[tiers,tier(row)||'NO_TIER'],[routes,row.queue_route||'NO_ROUTE'],[states,protection(row)||'UNPROTECTED']])bag[key]=(bag[key]||0)+1;}
 const candidates=rows.filter(r=>QUALIFIED.has(tier(r))&&!protection(r)).slice(0,5);
 return {at:now,rows_read:rows.length,tiers,routes,protections:states,headers,candidates,source_writes:0,queue_writes:0,provider_calls:0,sent:false};
}
const {routeKey,verifiedCandidate}=require('./research-contact-routes');
function prepareDraft(row,now,campaign=CAMPAIGN,prior={}){
 const eligibility=require('./phase2-eligibility'),a=eligibility.assess(row,now,prior);
 if(!a.eligible)return null;
 const route=a.route,d=metadata(row,now,campaign);
 Object.assign(d,draftIdentity(row,route,campaign),{channel:route.channel,recipient:route.recipient,route_source:route.source||'',routing:'READY_FOR_DRAFT',initial_locked:false,evidence_tier:a.tier,tier:a.tier,tier_issues:[],route_reason:'',dataset_id:row.dataset_id,business_name:row.business_name,manual_social_candidate:route.channel!=='EMAIL',source_snapshot_hash:sourceHash(row),created_at:now,evidence_summary:JSON.stringify(a.facts),tier_evidence_basis:JSON.stringify([a.identity,a.gap||a.opportunity].filter(Boolean)),draft_eligibility:{version:'draft-send-1',eligible:true,basis_ids:[a.identity,a.gap||a.opportunity].filter(Boolean).map(require('./research-history').identity)}});
 d.source_urls=JSON.stringify([...new Set(a.facts.map(f=>f.source_url))]);
 d.send_blockers=eligibility.sendBlockers(row,now,d);
 const schedule=require('./outreach-mvp').scheduledTime(now,row.timezone);
 d.scheduled_at=d.send_blockers.length?'':schedule.utc;d.scheduled_local_time=d.send_blockers.length?'':schedule.local;
 const copy=require('./outreach-copy'),e=copy.structured(row,d.channel,now);
 if(!e)return null;const preview=copy.preview(e);if(!preview)return null;
 d.copy_evidence=e;d.why_this_lead=copy.why(e);d.suggested_compliance_basis=e.suggested_compliance_basis||'';d.subject=d.channel==='EMAIL'?preview.subject||'':'';d.draft_core=preview.draft;d.draft_body=d.channel==='EMAIL'?copy.finalEmail(preview.draft):preview.draft;d.draft_status=eligibility.state(d.send_blockers);
 d.message_hash=sha256(JSON.stringify([d.channel,d.recipient,d.subject,d.draft_body]));d.sent_at=null;d.followup_due_at=null;return d;
}
function sourceHash(row){return sha256(JSON.stringify(Object.fromEntries(Object.keys(row).sort().map(k=>[k,row[k]??'']))));}
function pack(d,extra={}){
 if(['DRAFT_READY','DRAFT_READY_SEND_BLOCKED'].includes(d.draft_status))try{require('./outreach-copy').gate(d);}catch(e){d=d.operator_workspace?{...d,draft_status:'NEEDS_COPY',routing:'NEEDS_COPY',copy_issues:[e.message]}:{...d,subject:'',draft_body:'',message_hash:'',draft_status:'NEEDS_COPY',routing:'NEEDS_COPY',route_reason:'OUTBOUND_CONTENT_BLOCKED',copy_issues:[e.message]};}
 const out=Object.fromEntries(Object.entries(COLUMNS).map(([k,t])=>[k,t==='boolean'?false:t==='number'?0:null]));
 Object.assign(out,{queue_key:d.lead_step_key,draft_key:d.draft_key,lead_id:d.lead_id,business_name:d.business_name||d.business,dataset_id:d.dataset_id||'',tier:d.tier||d.evidence_tier||'',channel:d.channel,platform:d.channel==='EMAIL'?'ZOHO':d.channel,recipient:d.recipient,subject:d.subject||'',draft_body:d.draft_body||'',draft_html:d.channel==='EMAIL'&&d.draft_body?renderDraftHtml(d.draft_body):'',evidence_basis:d.tier_evidence_basis||d.evidence_summary||'[]',source_urls:d.source_urls||JSON.stringify([...new Set(list(d.evidence_summary).map(f=>f.source_url))]),compliance_status:d.compliance_status||'REVIEW_REQUIRED',suppression_status:d.draft_status==='DO_NOT_CONTACT'?'DO_NOT_CONTACT':'CLEAR',duplicate_status:'CLEAR',campaign:d.campaign,step:d.step,created_at:d.created_at,review_status:d.review_status,state:d.draft_status,sent:d.draft_status==='SENT'||!!d.sent_at,sent_at:d.sent_at||null,followup_due_at:d.followup_due_at||null,followup_count:Number(d.followup_count||0),reply_status:d.reply_status||'',message_hash:d.message_hash||'',approved_hash:d.approved_hash||'',provider_status:d.provider_status||'',provider_draft_id:d.provider_draft_id||'',claim_at:d.claimed_at||'',payload:JSON.stringify(d)},extra);
 return out;
}
function unpack(rows){return rows.filter(r=>r.queue_key).map(r=>{const d=JSON.parse(r.payload);if(d.lead_step_key!==r.queue_key||d.draft_key!==r.draft_key||d.lead_id!==r.lead_id)throw new Error('QUEUE_IDENTITY_MISMATCH');if(r.state!==d.draft_status||r.sent!==(d.draft_status==='SENT'||!!d.sent_at)||(r.provider_status||'')!==(d.provider_status||'')||(r.provider_draft_id||'')!==(d.provider_draft_id||''))throw new Error('MACHINE_STATE_MISMATCH');return {row:r,d};});}
function indexes(queue,locks,research,now){
 const lead=new Set(),route=new Set(),suppressedLead=new Set(),suppressedRoute=new Set();
 for(const l of locks){if(l.kind==='SUPPRESSION'){(l.identity.startsWith('lead:')?suppressedLead:suppressedRoute).add(l.identity.slice(l.identity.indexOf(':')+1));}else if(l.kind==='CONTACT'){(l.identity.startsWith('lead:')?lead:route).add(l.identity.slice(l.identity.indexOf(':')+1));}}
 for(const {d,row} of unpack(queue)){if(d.sent_at||d.history_contact_at||d.initial_locked&&d.route_reason==='EXISTING_CONTACT_LOCK'){lead.add(d.lead_id);if(d.recipient)route.add(routeKey(d.channel,d.recipient));}
  if(['DO_NOT_CONTACT','SUPPRESSED'].includes(row.review_status)||['DO_NOT_CONTACT','SUPPRESSED'].includes(row.suppression_status)||d.draft_status==='DO_NOT_CONTACT'){suppressedLead.add(d.lead_id);if(d.recipient)suppressedRoute.add(routeKey(d.channel,d.recipient));}}
 for(const r of research){const p=protection(r);if(p==='DO_NOT_CONTACT'||p==='PROTECTED_DO_NOT_CONTACT'){suppressedLead.add(r.lead_id);if(r.public_email)suppressedRoute.add(norm(r.public_email));}
  if(r.initial_contact_recorded===true||yes(r.initial_contact_recorded)||text(r.first_contact_at)||['SENT','ALREADY_CONTACTED','REPLIED'].includes(r.arc_status)||r.dataset_id==='MANILA_LEGACY'){lead.add(r.lead_id);const selected=selectChannel(r,now);if(selected.recipient)route.add(routeKey(selected.channel,selected.recipient));}}
 return {lead,route,suppressedLead,suppressedRoute};
}
function reservationKey(d){return d.recipient?routeKey(d.channel,d.recipient):'unrouted:'+d.lead_id;}
function blocked(d,idx){return idx.suppressedLead.has(d.lead_id)||idx.suppressedRoute.has(routeKey(d.channel,d.recipient))||idx.suppressedRoute.has(norm(d.recipient))||idx.lead.has(d.lead_id)||idx.route.has(routeKey(d.channel,d.recipient))||idx.route.has(norm(d.recipient));}
function config(c){const cap=c.cap===null||c.cap==='ALL'?Number.MAX_SAFE_INTEGER:Number(c.cap);if(![5,25,50,100,Number.MAX_SAFE_INTEGER].includes(cap))throw new Error('CAP_MUST_BE_ALL_25_50_100_OR_VALIDATION_5');if(c.mode==='VALIDATION'&&(!Array.isArray(c.allowed_lead_ids)||!c.allowed_lead_ids.length||c.allowed_lead_ids.length>5))throw new Error('FIXED_MAX_FIVE_VALIDATION_REQUIRED');if(!['VALIDATION','PRODUCTION'].includes(c.mode))throw new Error('MODE_REQUIRED');return {...c,cap:c.mode==='VALIDATION'?Math.min(cap,5):cap,campaign:c.campaign||CAMPAIGN};}
function plan(research,queue,locks,options,now=new Date().toISOString()){
 const c=config(options),existing=unpack(queue),idx=indexes(queue,locks,research,now),writes=[],reserved=new Set(),summary={research_rows:research.length,qualified:0,protected:0,existing_drafts:0,suppressed_or_contact_locked:0,duplicate_recipients:0,needs_research:0,compliance_blocked:0,selected:0,email_drafts:0,social_drafts:0,inserted:0,updated_placeholders:0,source_writes:0,zoho_drafts:0,emails_sent:0,dms_sent:0};
 for(const r of research){if(c.mode==='VALIDATION'&&!c.allowed_lead_ids.includes(r.lead_id))continue;if(protection(r)){summary.protected++;continue;}if(!require('./phase2-eligibility').assess(r,now).eligible){summary.needs_research++;continue;}summary.qualified++;
  const prior=existing.find(x=>x.d.lead_id===r.lead_id&&(x.d.campaign===c.campaign&&x.d.step==='initial'||x.d.provider_draft_id||['CLAIMED','UNKNOWN_PROVIDER_RESULT','ZOHO_DRAFT_CREATED','SENT','APPROVED'].includes(x.d.draft_status)));
  const placeholder=prior&&!prior.d.operator_workspace&&!prior.d.draft_body&&prior.d.review_status==='UNREVIEWED'&&prior.d.draft_status==='NEEDS_RESEARCH'&&!prior.d.initial_locked&&!prior.d.provider_status&&!prior.d.history_contact_at&&!prior.d.sent_at;
  if(prior&&!placeholder){summary.existing_drafts++;continue;}
  const d=prepareDraft(r,now,c.campaign);if(!d){summary.needs_research++;continue;}
  if(placeholder&&prior.d.channel!=='NO_ROUTE'&&(prior.d.channel!==d.channel||routeKey(prior.d.channel,prior.d.recipient)!==routeKey(d.channel,d.recipient))){summary.existing_drafts++;continue;}
  if(['DO_NOT_EMAIL','DO_NOT_CONTACT'].includes(d.compliance_status)){summary.compliance_blocked++;continue;}
  if(blocked(d,idx)){summary.suppressed_or_contact_locked++;continue;}
  const rk=reservationKey(d);if(existing.some(x=>x.d.lead_id!==d.lead_id&&reservationKey(x.d)===rk)||reserved.has(rk)){summary.duplicate_recipients++;continue;}
  if(writes.length>=c.cap)continue;reserved.add(rk);
  if(prior){d.created_at=prior.d.created_at;d.cloud_previous_placeholder_key=prior.d.draft_key;summary.updated_placeholders++;}else summary.inserted++;
  writes.push(pack(d));summary.selected++;summary[d.channel==='EMAIL'?'email_drafts':'social_drafts']++;
 }
 return {summary,writes};
}
module.exports={QUALIFIED,CAMPAIGN,COLUMNS,decode,tier,protection,inspect,verifiedCandidate,prepareDraft,sourceHash,pack,unpack,indexes,blocked,reservationKey,routeKey,config,plan};
