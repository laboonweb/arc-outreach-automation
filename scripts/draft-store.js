'use strict';
const {DatabaseSync}=require('node:sqlite');
const {sha256,norm}=require('./helpers');
const {approvalGate,followupDue,scheduledTime,draftIdentity}=require('./outreach-mvp');
const {validateEmail}=require('./email-validator');
const {assertSignature}=require('./composio-zoho');
const operations=require('./outreach-operations');
class DraftStore{
 constructor(filename){this.db=new DatabaseSync(filename);this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS drafts (id TEXT PRIMARY KEY, lead_step TEXT UNIQUE NOT NULL, recipient_step TEXT UNIQUE NOT NULL, payload TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS suppression (identity TEXT PRIMARY KEY, reason TEXT NOT NULL, at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS contact_locks (identity TEXT PRIMARY KEY, at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, at TEXT NOT NULL, draft_id TEXT NOT NULL, action TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS provider_claims (draft_id TEXT PRIMARY KEY, state TEXT NOT NULL, provider_id TEXT, at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS manual_sends (draft_id TEXT NOT NULL, step TEXT NOT NULL, sent_at TEXT NOT NULL, message_hash TEXT NOT NULL, reviewer TEXT NOT NULL, PRIMARY KEY(draft_id,step));`);}
 transaction(fn){this.db.exec('BEGIN IMMEDIATE');try{const value=fn();this.db.exec('COMMIT');return value;}catch(e){this.db.exec('ROLLBACK');throw e;}}
 close(){this.db.close();}
 all(){return this.db.prepare('SELECT payload FROM drafts ORDER BY rowid').all().map(r=>JSON.parse(r.payload));}
 get(id){const row=this.db.prepare('SELECT payload FROM drafts WHERE id=?').get(id);if(!row)throw new Error('DRAFT_NOT_FOUND');return JSON.parse(row.payload);}
 blocked(d){return !!this.db.prepare('SELECT identity FROM suppression WHERE identity IN (?,?)').get('lead:'+d.lead_id,'route:'+norm(d.recipient));}
 contacted(d){return !!this.db.prepare('SELECT identity FROM contact_locks WHERE identity IN (?,?)').get('lead:'+d.lead_id,'route:'+norm(d.recipient));}
 rememberContact(d,at){for(const id of ['lead:'+d.lead_id,'route:'+norm(d.recipient)].filter(x=>x!=='route:'))this.db.prepare('INSERT OR IGNORE INTO contact_locks VALUES (?,?)').run(id,at);}
 import(rows){return this.transaction(()=>{
  const result={inserted:0,existing:0,duplicates:0,rerouted:0};
  for(const input of rows){let d={...input};
   if(d.routing==='DO_NOT_CONTACT')for(const id of ['lead:'+d.lead_id,'route:'+norm(d.recipient)].filter(x=>x!=='route:'))this.db.prepare('INSERT OR IGNORE INTO suppression VALUES (?,?,?)').run(id,'SOURCE_DO_NOT_CONTACT',d.created_at);
   if(['SENT','REPLIED'].includes(d.source_state)||d.history_contact_at)this.rememberContact(d,d.history_contact_at||d.created_at);
   if(this.contacted(d)){d.routing='BLOCKED';d.initial_locked=true;d.route_reason='EXISTING_CONTACT_LOCK';d.draft_status='NEEDS_RESEARCH';d.draft_body='';d.subject='';}
   if(this.blocked(d))d={...d,draft_status:'DO_NOT_CONTACT',routing:'DO_NOT_CONTACT',draft_body:'',subject:'',review_status:'SUPPRESSED'};
   const existing=this.db.prepare('SELECT id,payload FROM drafts WHERE id=? OR lead_step=? OR recipient_step=?').get(d.draft_key,d.lead_step_key,d.channel==='NO_ROUTE'?d.draft_key:d.recipient_key);
   if(existing){if(existing.id===d.draft_key){result.existing++;const old=JSON.parse(existing.payload);
    if(d.routing==='DO_NOT_CONTACT'){old.draft_status='DO_NOT_CONTACT';old.routing='DO_NOT_CONTACT';old.followup_due_at='';old.review_status='SUPPRESSED';this.save(old);}
    else if(old.review_status==='UNREVIEWED'&&['DRAFT_READY','NEEDS_RESEARCH'].includes(old.draft_status)){this.save(d);}
    else if(old.source_snapshot_hash!==d.source_snapshot_hash&&['DRAFT_READY','APPROVED','ZOHO_DRAFT_CREATED'].includes(old.draft_status)){old.review_status='SOURCE_CHANGED_REVIEW_REQUIRED';if(old.draft_status!=='ZOHO_DRAFT_CREATED')old.draft_status='NEEDS_RESEARCH';old.routing='NEEDS_MANUAL_RESEARCH';this.save(old);}
   }else {const old=JSON.parse(existing.payload);
    if(old.channel==='NO_ROUTE'&&old.lead_step_key===d.lead_step_key&&old.review_status==='UNREVIEWED'&&old.draft_status==='NEEDS_RESEARCH'&&!old.sent_at){this.db.prepare('UPDATE drafts SET id=?,recipient_step=?,payload=? WHERE id=?').run(d.draft_key,d.channel==='NO_ROUTE'?d.draft_key:d.recipient_key,JSON.stringify(d),existing.id);result.rerouted++;}
    else result.duplicates++;
   }continue;}
   this.db.prepare('INSERT INTO drafts VALUES (?,?,?,?)').run(d.draft_key,d.lead_step_key,d.channel==='NO_ROUTE'?d.draft_key:d.recipient_key,JSON.stringify(d));result.inserted++;
  }return result;
 });}
 save(d){this.db.prepare('UPDATE drafts SET payload=? WHERE id=?').run(JSON.stringify(d),d.draft_key);}
 action(id,action,review={},now=new Date().toISOString()) {return this.transaction(()=>{
  const d=this.get(id);
  if(this.blocked(d)&&action!=='DO_NOT_CONTACT')throw new Error('PERMANENT_SUPPRESSION');
  if(d.draft_status==='DO_NOT_CONTACT'&&action!=='DO_NOT_CONTACT')throw new Error('PERMANENT_SUPPRESSION');
  if(operations.ACTIONS.has(action))return operations.apply(this,d,action,review,now);
  if(action==='APPROVE'){
   if(this.contacted(d))throw new Error('EXISTING_CONTACT_LOCK');
   const error=approvalGate(d,review);if(error)throw new Error(error);
   const hash=sha256(JSON.stringify([d.channel,d.recipient,d.subject,d.draft_body]));
   if(hash!==d.message_hash)throw new Error('CONTENT_CHANGED_REVIEW_REQUIRED');
   d.review=review;d.review_status='APPROVED';d.draft_status='APPROVED';d.approved_hash=hash;d.approved_at=now;
   d.approved_message={recipient:d.recipient,subject:d.subject,body:d.draft_body};
  }else if(action==='REJECT'){
   if(!['DRAFT_READY','APPROVED'].includes(d.draft_status))throw new Error('INVALID_TRANSITION');d.draft_status='REJECTED';d.review_status='REJECTED';
  }else if(action==='SENT'){
   if(!['APPROVED','ZOHO_DRAFT_CREATED'].includes(d.draft_status)||d.review_status!=='APPROVED'||d.approved_hash!==sha256(JSON.stringify([d.channel,d.recipient,d.subject,d.draft_body])))throw new Error('EXACT_CONTENT_APPROVAL_REQUIRED');
   if(['CLAIMED','UNKNOWN_PROVIDER_RESULT'].includes(this.providerStatus(id)?.state))throw new Error('PROVIDER_RECONCILIATION_REQUIRED');
   if(!review.manual_send_confirmation)throw new Error('MANUAL_SEND_CONFIRMATION_REQUIRED');
   d.draft_status='SENT';d.sent_at=now;d.followup_due_at=followupDue(d,now);
   this.rememberContact(d,now);
  }else if(action==='REPLIED'){
   if(d.draft_status!=='SENT')throw new Error('INVALID_TRANSITION');d.draft_status='REPLIED';d.reply_status='REPLIED';d.followup_due_at='';
  }else if(action==='DO_NOT_CONTACT'){
   for(const identity of ['lead:'+d.lead_id,'route:'+norm(d.recipient)].filter(x=>x!=='route:'))this.db.prepare('INSERT OR IGNORE INTO suppression VALUES (?,?,?)').run(identity,'DO_NOT_CONTACT',now);
   for(const other of this.all().filter(x=>x.lead_id===d.lead_id||x.recipient&&norm(x.recipient)===norm(d.recipient))){other.draft_status='DO_NOT_CONTACT';other.routing='DO_NOT_CONTACT';other.reply_status='DO_NOT_CONTACT';other.followup_due_at='';other.review_status='SUPPRESSED';this.save(other);}
   d.draft_status='DO_NOT_CONTACT';d.routing='DO_NOT_CONTACT';d.reply_status='DO_NOT_CONTACT';d.followup_due_at='';d.review_status='SUPPRESSED';
  }else if(['BOUNCED','DEAD_ROUTE'].includes(action)){
   if(!['SENT','APPROVED','ZOHO_DRAFT_CREATED'].includes(d.draft_status))throw new Error('INVALID_TRANSITION');d.route_invalid=true;d.reply_status=action;d.followup_due_at='';d.draft_status='NEEDS_RESEARCH';d.routing='NEEDS_MANUAL_RESEARCH';d.review_status='ROUTE_INVALID';
  }else if(action==='FOLLOWUP_SENT'){
   if(d.draft_status!=='SENT'||d.reply_status||d.route_invalid||!d.followup_due_at||Date.parse(d.followup_due_at)>Date.parse(now))throw new Error('FOLLOWUP_NOT_DUE');
   if(!review.manual_send_confirmation||!review.reviewer||!review.compliance_basis)throw new Error('FOLLOWUP_REVIEW_REQUIRED');
   if(d.followup_count>=2)throw new Error('FOLLOWUP_LIMIT');d.followup_count++;d.followup_last_sent_at=now;
   d.followup_due_at=d.followup_count>=2?'':scheduledTime(now,d.timezone,5).utc;
  }else throw new Error('UNKNOWN_ACTION');
  this.save(d);this.db.prepare('INSERT INTO audit(at,draft_id,action) VALUES (?,?,?)').run(now,id,action);return d;
 });}
 due(now=new Date().toISOString()){
  return operations.due(this,now);
 }
 providerStatus(id){return this.db.prepare('SELECT state,provider_id,at FROM provider_claims WHERE draft_id=?').get(id)||null;}
 approvedEmail(id){
  const d=this.get(id),identity=draftIdentity({lead_id:d.lead_id},{channel:d.channel,recipient:d.recipient},d.campaign,d.step),approved=d.approved_message;
  if(this.blocked(d)||this.contacted(d)||d.draft_status!=='APPROVED'||d.review_status!=='APPROVED'||d.sent_at||d.history_contact_at||['SENT','REPLIED','DISQUALIFIED','PARKED','DO_NOT_CONTACT'].includes(d.source_state)||d.route_invalid||d.reply_status||d.channel!=='EMAIL'||!validateEmail(d.recipient).valid||
   d.approved_hash!==sha256(JSON.stringify([d.channel,d.recipient,d.subject,d.draft_body]))||!approved||approved.recipient!==d.recipient||approved.subject!==d.subject||approved.body!==d.draft_body||
   Object.keys(identity).some(k=>d[k]!==identity[k])||approvalGate({...d,draft_status:'DRAFT_READY'},d.review||{}))throw new Error('PROVIDER_GATE');
  assertSignature(d.draft_body);return d;
 }
 claimProvider(id,now=new Date().toISOString()){return this.transaction(()=>{const d=this.approvedEmail(id);if(this.providerStatus(id))throw new Error('PROVIDER_ALREADY_CLAIMED: reconciliation required; no retry');this.db.prepare('INSERT INTO provider_claims VALUES (?,?,?,?)').run(id,'CLAIMED',null,now);return d;});}
 providerResult(id,state,providerId='',now=new Date().toISOString()){return this.transaction(()=>{
  if(!['ZOHO_DRAFT_CREATED','UNKNOWN_PROVIDER_RESULT'].includes(state))throw new Error('INVALID_PROVIDER_STATE');
  const claim=this.providerStatus(id),d=this.get(id);if(!claim)throw new Error('PROVIDER_CLAIM_REQUIRED');
  if(state==='ZOHO_DRAFT_CREATED'&&(typeof providerId!=='string'||!providerId.trim()))throw new Error('PROVIDER_ID_REQUIRED');
  if(claim.state==='ZOHO_DRAFT_CREATED'){if(state==='ZOHO_DRAFT_CREATED'&&providerId===claim.provider_id)return d;throw new Error('PROVIDER_RESULT_CONFLICT');}
  if(!['CLAIMED','UNKNOWN_PROVIDER_RESULT'].includes(claim.state))throw new Error('INVALID_PROVIDER_TRANSITION');
  this.db.prepare('UPDATE provider_claims SET state=?,provider_id=? WHERE draft_id=?').run(state,providerId||null,id);
  d.provider_status=state;
  if(state==='ZOHO_DRAFT_CREATED'){
   d.provider_draft_id=providerId;d.provider_draft_created_at=now;
   if(d.draft_status==='APPROVED'){
    d.draft_status='ZOHO_DRAFT_CREATED';d.sent_at=null;d.followup_due_at=null;
    if(d.review_status==='RECONCILIATION_REQUIRED')d.review_status='APPROVED';
   }
  }else if(d.draft_status==='APPROVED')d.review_status='RECONCILIATION_REQUIRED';
  this.save(d);this.db.prepare('INSERT INTO audit(at,draft_id,action) VALUES (?,?,?)').run(now,id,state);return d;
 });}
}
module.exports={DraftStore};
