'use strict';
const {text,norm,yes,sha256,parsePublicUrl}=require('./helpers');
const {validateEmail}=require('./email-validator');
const {assessTier}=require('./outreach-evidence-tiers');
const {socialKey}=require('./duplicate-detection');
const SIGNATURE='Best,\nBriann Arcala\nFounder, Arc Web Works\n+63 995 530 6231\nbriann@arcwebworks.com\narcwebworks.com';
const CHANNELS=['EMAIL','INSTAGRAM','FACEBOOK','WHATSAPP','VIBER','LINKEDIN','OTHER_MANUAL','NO_ROUTE'];
const FIELDS='lead_id business country channel recipient subject draft_body evidence_summary commercial_quality research_confidence compliance_status draft_status review_status scheduled_local_time timezone sent_at followup_due_at followup_count reply_status'.split(' ');
function list(value){try{const a=typeof value==='string'?JSON.parse(value||'[]'):value;return Array.isArray(a)?a:[];}catch{return [];}}
function clean(value,max=600){return text(value).replace(/[\u0000-\u001f]/g,' ').replace(/[\u2013\u2014]/g,', ').replace(/\s+/g,' ').slice(0,max);}
function facts(row,now=new Date().toISOString()){
 return require('./research-history').currentFacts(row,now).filter(f=>!/^\s*[\[{]/.test(f.excerpt));
}
const {selectChannel}=require('./research-contact-routes');
function lockReason(row){
 if(yes(row.suppressed)||row.suppression_status==='DO_NOT_CONTACT'||row.arc_status==='DO_NOT_CONTACT'||row.manual_status_override==='DO_NOT_CONTACT'||/UNSUBSCRIBED|COMPLAINT|NOT_INTERESTED/.test(row.reply_status||''))return 'DO_NOT_CONTACT';
 if(['SENT','REPLIED','DISQUALIFIED','FOLLOW_UP_DUE'].includes(row.arc_status)||['SENT','REPLIED','DISQUALIFIED'].includes(row.manual_status_override)||['REPLIED','POSITIVE','NEGATIVE','QUESTION','INTERESTED'].includes(row.reply_status)||yes(row.initial_contact_recorded)||yes(row.initial_outreach_blocked)||text(row.sent_at)||text(row.first_contact_at)||text(row.last_reply_at)||row.dataset_id==='MANILA_LEGACY')return 'PROTECTED_HISTORY';
 if(row.compliance_status==='DO_NOT_EMAIL'||row.acma_status==='DO_NOT_EMAIL')return 'BLOCKED';
 if(yes(row.duplicate_review_required)||row.commercial_quality==='DISQUALIFY')return 'BLOCKED';
 if(row.arc_status==='PARKED'||row.manual_status_override==='PARKED')return 'PARK';
 if(['BOUNCED','DEAD_ROUTE'].includes(row.reply_status)||row.route_invalid)return 'INVALID_ROUTE';
 return '';
}
function draftIdentity(row,route,campaign='arc-mvp-v1',step='initial'){
 if(!row.lead_id||!campaign||!step)throw new Error('IDENTITY_REQUIRED');
 const recipient=route.channel==='EMAIL'?norm(route.recipient):text(route.recipient).replace(/\/$/,'').toLowerCase();
 return {draft_key:sha256(JSON.stringify([row.lead_id,route.channel,recipient,campaign,step])),recipient_key:sha256(JSON.stringify([route.channel,recipient,campaign,step])),lead_step_key:sha256(JSON.stringify([row.lead_id,campaign,step])),campaign,step};
}
function localParts(date,timezone){const d=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);return Object.fromEntries(d.map(p=>[p.type,p.value]));}
function atLocal(day,hour,timezone){let value=Date.UTC(day.getUTCFullYear(),day.getUTCMonth(),day.getUTCDate(),hour);for(let i=0;i<3;i++){const p=localParts(new Date(value),timezone);const display=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);value+=Date.UTC(day.getUTCFullYear(),day.getUTCMonth(),day.getUTCDate(),hour)-display;}return new Date(value).toISOString();}
function scheduledTime(now,timezone,businessDays=0){
 if(!timezone)return {utc:'',local:''};
 try{localParts(new Date(now),timezone);}catch{return {utc:'',local:''};}
 const p=localParts(new Date(now),timezone),day=new Date(Date.UTC(+p.year,+p.month-1,+p.day));
 let remaining=businessDays;if(!remaining&&(+p.hour>=10||[0,6].includes(day.getUTCDay())))remaining=1;
 while(remaining>0){day.setUTCDate(day.getUTCDate()+1);if(![0,6].includes(day.getUTCDay()))remaining--;}
 while([0,6].includes(day.getUTCDay()))day.setUTCDate(day.getUTCDate()+1);
 return {utc:atLocal(day,10,timezone),local:day.toISOString().slice(0,10)+' 10:00'};
}
function buildDraft(row,now=new Date().toISOString(),campaign='arc-mvp-v1'){
 const route=selectChannel(row,now),fs=facts(row,now),lock=lockReason(row),assessment=assessTier(row,fs,route,now),gap=assessment.gap,legitimate=assessment.identity,asset=assessment.activity||legitimate;
 let routing='READY_FOR_DRAFT',reason='';
 if(lock){routing=lock==='DO_NOT_CONTACT'?'DO_NOT_CONTACT':lock==='PARK'?'PARK':lock==='INVALID_ROUTE'?'NEEDS_MANUAL_RESEARCH':'BLOCKED';reason=lock;}
 else if(assessment.tier==='TIER_C_NEEDS_RESEARCH'){routing='NEEDS_MANUAL_RESEARCH';reason=assessment.issues.join('|');}
 else if(!row.timezone){routing='NEEDS_MANUAL_RESEARCH';reason='TIMEZONE_REQUIRED';}
 const schedule=scheduledTime(now,row.timezone),identity=draftIdentity(row,route,campaign);
 if(routing==='READY_FOR_DRAFT'&&!schedule.utc){routing='NEEDS_MANUAL_RESEARCH';reason='TIMEZONE_REQUIRED';}
 const out={...identity,...Object.fromEntries(FIELDS.map(k=>[k,''])),lead_id:row.lead_id,business:row.business_name,country:row.country,channel:route.channel,recipient:route.recipient,commercial_quality:row.commercial_quality,research_confidence:row.research_confidence,compliance_status:row.compliance_status||row.acma_status||'REVIEW_REQUIRED',draft_status:routing==='DO_NOT_CONTACT'?'DO_NOT_CONTACT':'NEEDS_RESEARCH',review_status:'UNREVIEWED',scheduled_local_time:routing==='READY_FOR_DRAFT'?schedule.local:'',scheduled_at:routing==='READY_FOR_DRAFT'?schedule.utc:'',timezone:row.timezone||'',followup_count:0,reply_status:row.reply_status||'',routing,route_reason:reason,route_source:route.source,initial_locked:!!lock,created_at:now,concept_plan:'',evidence_summary:JSON.stringify(fs.map(f=>({type:f.type,source_url:f.source_url,observed_at:f.observed_at,fact_date:f.fact_date,excerpt:clean(f.excerpt),verification:f.verification}))),source_snapshot_hash:sha256(JSON.stringify(row)),source_state:row.arc_status||'',history_followup_due_at:row.followup_due_at||'',history_followup_count:row.followup_count||0,history_contact_at:row.first_contact_at||row.sent_at||'',history_reply_at:row.last_reply_at||''};
 out.evidence_tier=assessment.tier;out.tier_issues=assessment.issues;out.tier_evidence_basis=JSON.stringify([assessment.identity,assessment.activity,assessment.gap||assessment.opportunity].filter(Boolean));
 if(routing!=='READY_FOR_DRAFT')return out;
 if(assessment.tier==='TIER_B_VERIFIED_OPPORTUNITY'){
  const presence=clean(assessment.activity.excerpt,350),url=parsePublicUrl(assessment.opportunity.source_url).url;
  const opportunity=`I found your public business information at ${url}. A focused website could bring the published information and enquiry route together in one owned destination.`;
  const mechanism='I could build that around your business-approved service information and a clear contact path.';
  const cta='I already have a specific website concept in mind for this. Open to seeing it?';
  out.subject='An owned website concept for '+clean(row.business_name,90);
  out.draft_body=route.channel==='EMAIL'?`Hi ${clean(row.business_name,140)} team,\n\n${presence}\n\n${opportunity}\n\n${mechanism}\n\n${cta}\n\n${SIGNATURE}\n\nIf you would prefer no further messages from Arc Web Works, reply and I will stop.`:`Hi ${clean(row.business_name,100)} team, I’m Briann from Arc Web Works. ${presence} ${opportunity} ${mechanism} ${cta}`;
  out.concept_plan='A focused owned destination using business-approved public information and the verified enquiry route. This is a written concept, not a completed prototype.';
  out.draft_status='DRAFT_READY';out.message_hash=sha256(JSON.stringify([out.channel,out.recipient,out.subject,out.draft_body]));return out;
 }
 const observation=clean(gap.excerpt||row.pain_point,450),assetText=asset.type==='legitimacy'?`Your business has a public website at ${parsePublicUrl(asset.source_url).host}.`:clean(asset.excerpt,350).split(/ This is | This indicates |,? not HTTP|; HTTP/)[0];
 const proofGap=/testimonial|lorem ipsum|placeholder/i.test(observation);
 out.concept_plan=proofGap?'A project-proof section: business-approved project photos, service labels and a short factual project note, followed by the published enquiry route. Replace placeholder testimonials only with client-approved evidence.':'A focused section presenting the verified business information currently missing or obscured, followed by its published enquiry route. Scope and content require business approval.';
 const consequence='That may make it harder for a visitor to assess the information before enquiring.';
 const mechanism=proofGap?'I could replace those placeholders with a compact project-proof section, using photos and details you approve, followed by a clear enquiry path.':'I can help turn that section into clear, business-approved content with a straightforward enquiry path.';
 const cta='I already have a specific website concept in mind for this. Open to seeing it?';
 if(route.channel==='EMAIL'){
  out.subject='A specific website idea for '+clean(row.business_name,90);
  out.draft_body=`Hi ${clean(row.business_name,140)} team,\n\n${assetText}\n\nI noticed this on the public website: ${observation}\n\n${consequence} ${mechanism}\n\n${cta}\n\n${SIGNATURE}`;
  out.draft_body+='\n\nIf you would prefer no further messages from Arc Web Works, reply and I will stop.';
 }else out.draft_body=`Hi ${clean(row.business_name,100)} team, I’m Briann from Arc Web Works. ${assetText} I noticed: ${observation} ${consequence} ${mechanism} ${cta}`;
 out.draft_status='DRAFT_READY';out.message_hash=sha256(JSON.stringify([out.channel,out.recipient,out.subject,out.draft_body]));return out;
}
function approvalGate(draft,review){
 if(draft.draft_status!=='DRAFT_READY'||draft.routing!=='READY_FOR_DRAFT'||draft.initial_locked)return 'DRAFT_NOT_READY';
 if(!review.reviewer||!review.truthful||!review.recipient_relevant||!review.consent_reviewed||!review.suppression_checked)return 'REVIEW_REQUIRED';
 if(!text(review.compliance_basis))return 'COMPLIANCE_BASIS_REQUIRED';
 if(draft.country==='Australia'&&draft.compliance_status!=='SAFE_TO_REVIEW')return 'AU_COMPLIANCE_UNRESOLVED';
 return '';
}
function followupDue(draft,now=new Date().toISOString()){
 if(draft.draft_status!=='SENT'||!draft.sent_at||draft.reply_status||draft.route_invalid)return '';
 return scheduledTime(draft.sent_at,draft.timezone,5).utc;
}
function summary(rows){const count=f=>rows.reduce((o,r)=>(o[r[f]]=(o[r[f]]||0)+1,o),{});return {leads:rows.length,routing:count('routing'),channels:count('channel'),draft_status:count('draft_status'),drafts:rows.filter(r=>r.draft_body).length,no_outreach:true};}
module.exports={FIELDS,CHANNELS,SIGNATURE,facts,selectChannel,lockReason,draftIdentity,scheduledTime,buildDraft,approvalGate,followupDue,summary,list};
