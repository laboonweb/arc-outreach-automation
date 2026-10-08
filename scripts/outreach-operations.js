'use strict';
const {sha256}=require('./helpers');
const {followupDue,scheduledTime,draftIdentity,list}=require('./outreach-mvp');
const ACTIONS=new Set(['MARK_SENT','REPLIED','PARK','RESCHEDULE']);
function count(d){const n=Number(d.sent_at?d.followup_count:d.history_followup_count??d.followup_count??0);if(!Number.isInteger(n)||n<0)throw new Error('FOLLOWUP_HISTORY_REVIEW_REQUIRED');return n;}
function lastContact(d){return d.last_contact_at||d.followup_last_sent_at||d.sent_at||d.history_last_contact_at||d.history_contact_at||'';}
function history(d){return [...list(d.history_snapshot_json),...list(d.conversation_history)];}
function original(d){const entries=history(d);return {subject:d.subject||d.history_original_subject||'',message:d.draft_body||d.history_original_message||'',history:entries};}
function dueDate(d){return d.followup_due_at||(!d.sent_at?d.history_followup_due_at:'')||'';}
function initialApproved(d){const identity=draftIdentity({lead_id:d.lead_id},{channel:d.channel,recipient:d.recipient},d.campaign,d.step);return d.review_status==='APPROVED'&&d.approved_hash===sha256(JSON.stringify([d.channel,d.recipient,d.subject,d.draft_body]))&&d.approved_message?.recipient===d.recipient&&d.approved_message?.subject===d.subject&&d.approved_message?.body===d.draft_body&&Object.keys(identity).every(k=>d[k]===identity[k]);}
function apply(store,d,action,review,now){
 if(!Number.isFinite(Date.parse(now)))throw new Error('INVALID_CONFIRMATION_TIME');
 if(action==='MARK_SENT'){
  const step=review.step||'initial',prior=store.db.prepare('SELECT sent_at FROM manual_sends WHERE draft_id=? AND step=?').get(d.draft_key,step);
  if(prior)return d; // A second click records nothing and never changes scheduling.
  if(!review.manual_send_confirmation)throw new Error('MANUAL_SEND_CONFIRMATION_REQUIRED');
  const reviewer=review.reviewer||d.review?.reviewer;if(!reviewer)throw new Error('REVIEWER_REQUIRED');
  if(step==='initial'){
   const claim=store.providerStatus(d.draft_key);
   if(d.draft_status!=='ZOHO_DRAFT_CREATED'||d.channel!=='EMAIL'||claim?.state!=='ZOHO_DRAFT_CREATED'||!d.provider_draft_id||claim.provider_id!==d.provider_draft_id)throw new Error('VERIFIED_ZOHO_DRAFT_REQUIRED');
   if(!initialApproved(d)||d.sent_at||d.reply_status||d.route_invalid||d.initial_locked||store.contacted(d)||['SENT','REPLIED','PARKED','DISQUALIFIED','DO_NOT_CONTACT'].includes(d.source_state))throw new Error('MANUAL_SEND_GATE');
   d.draft_status='SENT';d.sent_at=now;d.followup_count=0;d.followup_due_at=followupDue(d,now);
   if(!d.followup_due_at)throw new Error('FOLLOWUP_TIMEZONE_REQUIRED');
  }else{
   const n=count(d),expected='followup_'+(n+1),originalMessage=original(d).message||review.original_message;
   if(step!==expected||n>=2||d.followups_parked||d.reply_status||d.history_reply_at||d.route_invalid||!['SENT','FOLLOW_UP_DUE'].includes(d.draft_status==='SENT'?'SENT':d.source_state)||!Number.isFinite(Date.parse(dueDate(d)))||Date.parse(dueDate(d))>Date.parse(now))throw new Error('FOLLOWUP_NOT_DUE');
   if(!review.compliance_basis||!review.consent_reviewed||!originalMessage||!review.message||!d.recipient||d.channel==='NO_ROUTE'||!Number.isFinite(Date.parse(lastContact(d))))throw new Error('FOLLOWUP_CONTEXT_REVIEW_REQUIRED');
   const next=n+1<2?scheduledTime(now,d.timezone,5).utc:'';
   if(n+1<2&&!next)throw new Error('FOLLOWUP_TIMEZONE_REQUIRED');
   d.followup_count=n+1;d.history_followup_count=d.sent_at?d.history_followup_count:n+1;d.followup_last_sent_at=now;d.followup_due_at=next;d.history_followup_due_at=d.sent_at?d.history_followup_due_at:next;
   d.conversation_history=[...list(d.conversation_history),{at:now,step,message:review.message,reviewer,compliance_basis:review.compliance_basis}];
  }
  d.last_contact_at=now;store.rememberContact(d,now);
  store.db.prepare('INSERT INTO manual_sends VALUES (?,?,?,?,?)').run(d.draft_key,step,now,sha256(step==='initial'?d.draft_body:review.message),reviewer);
 }else if(action==='REPLIED'){
  if(d.reply_status==='REPLIED')return d;
  if(!d.sent_at&&!d.history_contact_at&&!['SENT','FOLLOW_UP_DUE','REPLIED'].includes(d.source_state))throw new Error('NO_CONTACT_HISTORY');
  d.draft_status='REPLIED';d.reply_status='REPLIED';d.last_reply_at=now;d.followup_due_at='';d.history_followup_due_at='';
  if(review.note)d.conversation_history=[...list(d.conversation_history),{at:now,event:'REPLIED',note:review.note}];
 }else if(action==='PARK'){
  if(d.followups_parked)return d;
  d.parked_followup_due_at=dueDate(d);d.followups_parked=true;d.parked_at=now;d.parked_reason=review.reason||'';d.followup_due_at='';d.history_followup_due_at='';
  if(!d.sent_at&&!['SENT','FOLLOW_UP_DUE','REPLIED'].includes(d.source_state)){d.draft_status='PARKED';d.routing='PARK';}
 }else if(action==='RESCHEDULE'){
  if(d.reply_status||d.history_reply_at||d.route_invalid||count(d)>=2||(!d.sent_at&&!['SENT','FOLLOW_UP_DUE'].includes(d.source_state)))throw new Error('FOLLOWUP_RESCHEDULE_GATE');
  if(!Number.isFinite(Date.parse(review.due_at))||Date.parse(review.due_at)<=Date.parse(now))throw new Error('FUTURE_DUE_TIME_REQUIRED');
  if(dueDate(d)===new Date(review.due_at).toISOString()&&!d.followups_parked)return d;
  d.followups_parked=false;d.followup_due_at=new Date(review.due_at).toISOString();if(!d.sent_at)d.history_followup_due_at=d.followup_due_at;
 }
 store.save(d);store.db.prepare('INSERT INTO audit(at,draft_id,action) VALUES (?,?,?)').run(now,d.draft_key,action);return d;
}
function due(store,now){return store.all().filter(d=>{
 const state=d.draft_status==='SENT'||(!d.sent_at&&['SENT','FOLLOW_UP_DUE'].includes(d.source_state));
 return state&&!d.followups_parked&&!d.reply_status&&!d.history_reply_at&&!d.route_invalid&&!['DO_NOT_CONTACT','REPLIED','PARKED','REJECTED'].includes(d.draft_status)&&!store.blocked(d)&&count(d)<2&&dueDate(d)&&Date.parse(dueDate(d))<=Date.parse(now);
}).map(d=>{
 const o=original(d),last=lastContact(d),n=count(d),validLast=Number.isFinite(Date.parse(last)),context=!!o.message&&validLast&&!!d.recipient&&d.channel!=='NO_ROUTE';
 const recommendation=context?`Hi ${d.business} team, following up on my earlier message. Would you like to see the specific concept? If it is not relevant, let me know and I will stop.`:'';
 return {...d,queue:'FOLLOW_UP_DUE',step:'followup_'+(n+1),historical:!d.sent_at,original_subject:o.subject,original_message:o.message,last_contact_at:last,days_since_last_contact:validLast?Math.max(0,Math.floor((Date.parse(now)-Date.parse(last))/86400000)):null,followup_count:n,followup_due_at:dueDate(d),conversation_history:o.history,final_message:recommendation,context_required:!context,route_reason:context?d.route_reason:'HISTORY_CONTEXT_REQUIRED: prior message, contact date and route must be reviewed before recording a follow-up.'};
});}
module.exports={ACTIONS,apply,due,lastContact,original};
