'use strict';
const {text,yes,sha256,norm}=require('./helpers');
const {approvalGate,followupDue}=require('./outreach-mvp');
const operations=require('./outreach-operations');
const {envelopeFor,scopeFor,guardEnvelope,normalizedReceipt,assertSignature}=require('./composio-zoho');
const q=require('./phase2-cloud-queue');
const REVIEW_STATES=new Set(['UNREVIEWED','APPROVED','NEEDS_EDIT','REJECTED','NEEDS_RESEARCH']);
function hash(d){return sha256(JSON.stringify([d.channel,d.recipient,d.subject||'',d.draft_body]));}
function reviewFor(row){return {reviewer:text(row.reviewer),truthful:yes(row.truthful),recipient_relevant:yes(row.recipient_relevant),consent_reviewed:yes(row.consent_reviewed),suppression_checked:yes(row.suppression_checked),compliance_basis:text(row.compliance_basis)};}
function assertVisible(row,d){if(row.recipient!==d.recipient||row.channel!==d.channel||row.subject!==(d.subject||'')||row.draft_body!==(d.draft_body||'')||row.message_hash!==(d.message_hash||''))throw new Error('EDIT_MUST_BE_REVIEWED_BEFORE_APPROVAL');}
function gate(row,d,research,idx,now){
 require('./outreach-copy').gate(d);
 const original=research.find(r=>r.lead_id===d.lead_id),source=require('./phase2-operator-evidence').effective(original,d,now);if(!source||q.protection(original)||!q.QUALIFIED.has(q.tier(source))||q.blocked(d,idx))throw new Error('CURRENT_SOURCE_OR_LEDGER_PROTECTED');
 const prior=d.cloud_source_snapshot_hash||d.source_snapshot_hash;
 if(prior!==q.sourceHash(original))throw new Error('SOURCE_CHANGED_NEEDS_RESEARCH');
 if(d.operator_workspace){const checks=require('./phase2-operator-evidence').checks(original,d,now);if(!checks.permission||d.channel!=='EMAIL'&&!checks.messaging)throw Error('OPERATOR_VERIFICATION_REQUIRED');if(d.operator_workspace.copy_claims?.length){const issues=require('./phase2-operator-copy').validate(d,source,now);if(issues.length)throw Error('OUTBOUND_CONTENT_BLOCKED:'+issues.join(','));}}
 const current=require('./phase2-eligibility').assess(source,now,d);
 if(!current.eligible||current.strict.issues.length)throw new Error('SEND_EVIDENCE_BLOCKED:'+current.strict.issues.join('|'));
 if(!require('./outreach-mvp').scheduledTime(now,source.timezone).utc)throw new Error('SEND_EVIDENCE_BLOCKED:TIMEZONE_REQUIRED');
 if(current.route.channel!==d.channel||q.routeKey(current.route.channel,current.route.recipient)!==q.routeKey(d.channel,d.recipient))throw new Error('CURRENT_ROUTE_CHANGED');
 if(['DO_NOT_EMAIL','DO_NOT_CONTACT'].includes(source.compliance_status)||['DO_NOT_EMAIL','DO_NOT_CONTACT'].includes(source.acma_status))throw new Error('COMPLIANCE_BLOCKED');
 assertVisible(row,d);if(hash(d)!==d.message_hash)throw new Error('EXACT_CONTENT_APPROVAL_REQUIRED');return source;
}
function adapter(d,idx){
 const sends=d.cloud_manual_sends||[],audit=d.cloud_audit||[];
 return {get:()=>d,all:()=>[d],blocked:x=>idx.suppressedLead.has(x.lead_id)||idx.suppressedRoute.has(q.routeKey(x.channel,x.recipient)),contacted:x=>idx.lead.has(x.lead_id)||idx.route.has(q.routeKey(x.channel,x.recipient)),providerStatus:()=>d.provider_status?{state:d.provider_status,provider_id:d.provider_draft_id,at:d.claimed_at}:null,save:x=>{d=x;},rememberContact:()=>{},db:{prepare(sql){
  if(sql.startsWith('SELECT sent_at FROM manual_sends'))return {get:(key,step)=>sends.find(s=>s.draft_id===key&&s.step===step)};
  if(sql.startsWith('INSERT INTO manual_sends'))return {run:(draft_id,step,sent_at,message_hash,reviewer)=>{sends.push({draft_id,step,sent_at,message_hash,reviewer});d.cloud_manual_sends=sends;}};
  if(sql.startsWith('INSERT INTO audit'))return {run:(at,draft_id,action)=>{audit.push({at,draft_id,action});d.cloud_audit=audit.slice(-100);}};
  throw new Error('UNSUPPORTED_OPERATION_STORE_CALL');
 }}};
}
function apply(row,d,action,review,research,idx,now){
 if(action==='MARK_SENT'&&(review.step||'initial')==='initial'&&d.channel!=='EMAIL'){
  if((d.cloud_manual_sends||[]).some(s=>s.step==='initial'))return d;
  assertVisible(row,d);
  if(d.draft_status!=='MANUAL_SOCIAL_READY'||!operationsInitialApproved(d)||!review.manual_send_confirmation||review.message!==d.draft_body||!review.reviewer||d.sent_at||d.reply_status||q.blocked(d,idx)||d.route_invalid||d.initial_locked||['SENT','REPLIED','PARKED','DISQUALIFIED','DO_NOT_CONTACT'].includes(d.source_state))throw new Error('EXACT_MANUAL_SOCIAL_SEND_CONFIRMATION_REQUIRED');
  d.draft_status='SENT';d.sent_at=now;d.followup_count=0;d.followup_due_at=followupDue(d,now);if(!d.followup_due_at)throw new Error('FOLLOWUP_TIMEZONE_REQUIRED');d.last_contact_at=now;
  d.cloud_manual_sends=[{draft_id:d.draft_key,step:'initial',sent_at:now,message_hash:hash(d),reviewer:review.reviewer}];return d;
 }
 // Recording a confirmed send reuses the original receipt and approval gates.
 // A later research snapshot cannot erase that approved message or receipt.
 if(action==='MARK_SENT'&&(review.step||'initial')==='initial'&&!(d.cloud_manual_sends||[]).some(s=>s.step==='initial')){assertVisible(row,d);if(review.message!==d.draft_body)throw new Error('EXACT_SENT_MESSAGE_REQUIRED');}
 const store=adapter(d,idx);return operations.apply(store,d,action,review,now);
}
function operationsInitialApproved(d){return d.review_status==='APPROVED'&&d.approved_hash===hash(d)&&d.approved_message?.recipient===d.recipient&&d.approved_message?.subject===(d.subject||'')&&d.approved_message?.body===d.draft_body;}
function process(research,queue,locks,options,now=new Date().toISOString()){
 const c=q.config(options),idx=q.indexes(queue,locks,research,now),writes=[],errors=[],due=[],summary={reviewed:0,approved:0,manual_social_ready:0,marked_sent:0,source_writes:0,provider_calls:0};
 for(const {row,d:input} of q.unpack(queue)){
  const d=JSON.parse(JSON.stringify(input));if(c.mode==='VALIDATION'&&!c.allowed_lead_ids.includes(d.lead_id))continue;
  const action=text(row.action).toUpperCase(),requested=text(row.review_status).toUpperCase();
  if(!action&&requested===d.review_status&&!(requested==='APPROVED'&&d.draft_status==='APPROVED'&&d.channel!=='EMAIL'&&yes(row.dm_verified)))continue;
  if(writes.length>=c.cap)continue;
  try{
   if((idx.suppressedLead.has(d.lead_id)||idx.suppressedRoute.has(q.routeKey(d.channel,d.recipient))||idx.suppressedRoute.has(norm(d.recipient)))&&action!=='DO_NOT_CONTACT')throw new Error('PERMANENT_SUPPRESSION');
   if(q.blocked(d,idx)&&!['DO_NOT_CONTACT','REPLIED','PARK','RESCHEDULE','MARK_SENT'].includes(action))throw new Error('PROTECTED_LEDGER');
   if(['CLAIMED','UNKNOWN_PROVIDER_RESULT'].includes(d.provider_status))throw new Error('PROVIDER_RECONCILIATION_REQUIRED');
   if(action==='DO_NOT_CONTACT'){d.draft_status='DO_NOT_CONTACT';d.review_status='REJECTED';d.routing='DO_NOT_CONTACT';d.reply_status='DO_NOT_CONTACT';d.followup_due_at=null;}
   else if(operations.ACTIONS.has(action)){
    const review={...reviewFor(row),step:row.action_step||'initial',manual_send_confirmation:yes(row.manual_send_confirmation),message:row.action_step&&row.action_step!=='initial'?row.followup_message:row.sent_message,note:row.review_note,reason:row.review_note,due_at:row.due_at};
    apply(row,d,action,review,research,idx,now);if(action==='MARK_SENT')summary.marked_sent++;
   }else if(requested==='NEEDS_EDIT'){
    if(!['DRAFT_READY','DRAFT_READY_SEND_BLOCKED','APPROVED'].includes(d.draft_status)||d.provider_status||d.sent_at)throw new Error('EDIT_NOT_ALLOWED');
    if(row.recipient!==d.recipient||row.channel!==d.channel)throw new Error('ROUTE_CHANGE_NOT_ALLOWED');
    const content=require('./outreach-content');
    if(typeof row.draft_body!=='string'||row.draft_body.length>10000)throw content.rejection(['DRAFT_LENGTH']);
    // Notes cannot authorize a new claim. Use current clean verified research.
    const source=research.find(r=>r.lead_id===d.lead_id),e=source&&require('./outreach-copy').structured(source,d.channel,now);
    if(e){
     const sameSource=d.cloud_source_snapshot_hash===q.sourceHash(source);
     // Previously valid wording remains available on an unchanged source.
     // Refresh fact capabilities without replacing its reviewed language map.
     d.copy_evidence=sameSource&&d.copy_evidence?.business_hook?{...d.copy_evidence,verified_business_domains:e.verified_business_domains,manual_facts:e.manual_facts}:e;
    }
    d.subject=d.channel==='EMAIL'?row.subject:'';d.draft_body=row.draft_body;require('./outreach-copy').gate(d);d.draft_core=require('./outreach-copy').core(d.draft_body);d.message_hash=hash(d);d.approved_hash='';delete d.approved_message;d.review_status='UNREVIEWED';d.send_blockers=require('./phase2-eligibility').sendBlockers(source,now,d);d.draft_status=require('./phase2-eligibility').state(d.send_blockers);
   }else if(requested==='APPROVED'){
    gate(row,d,research,idx,now);const review=reviewFor(row);
    if(row.compliance_status==='SAFE_TO_REVIEW'&&review.consent_reviewed&&review.compliance_basis)d.compliance_status='SAFE_TO_REVIEW';
    if(d.channel!=='EMAIL'&&!yes(row.dm_verified))throw new Error('SOCIAL_VERIFICATION_REQUIRED');
    const blockers=require('./phase2-eligibility').sendBlockers(require('./phase2-operator-evidence').effective(research.find(r=>r.lead_id===d.lead_id),d,now),now,d,{...row,...review});if(blockers.includes('AU_COMPLIANCE_REVIEW'))throw new Error('AU_COMPLIANCE_UNRESOLVED');if(blockers.length)throw new Error('SEND_BLOCKED:'+blockers.join('|'));
    const failure=approvalGate({...d,draft_status:'DRAFT_READY'},review);if(failure)throw new Error(failure);d.send_blockers=[];
    d.review=review;d.review_status='APPROVED';d.draft_status='APPROVED';d.approved_hash=d.message_hash;d.approved_message={recipient:d.recipient,subject:d.subject||'',body:d.draft_body};d.approved_at=now;summary.approved++;
    if(d.channel!=='EMAIL'&&yes(row.dm_verified)){d.draft_status='MANUAL_SOCIAL_READY';d.dm_verified_at=now;summary.manual_social_ready++;}
   }else if(['REJECTED','NEEDS_RESEARCH'].includes(requested)){
    if(d.provider_status||d.sent_at)throw new Error('PARK_EXISTING_PROVIDER_OR_SENT_RECORD');d.review_status=requested;d.draft_status=requested==='REJECTED'?'REJECTED':'NEEDS_RESEARCH';
   }else if(!REVIEW_STATES.has(requested))throw new Error('INVALID_REVIEW_STATE');
   else continue;
   writes.push(q.pack(d,{reviewer:row.reviewer||'',review_note:row.review_note||'',reviewed_hash:d.approved_hash||'',truthful:yes(row.truthful),recipient_relevant:yes(row.recipient_relevant),consent_reviewed:yes(row.consent_reviewed),suppression_checked:yes(row.suppression_checked),compliance_basis:row.compliance_basis||'',dm_verified:yes(row.dm_verified)}));summary.reviewed++;
  }catch(e){errors.push({queue_key:d.lead_step_key,business:d.business,error:e.message,...(e.failures?{failures:e.failures}:{})});}
 }
 const dueStore={all:()=>q.unpack(queue).map(x=>x.d),blocked:d=>idx.suppressedLead.has(d.lead_id)||idx.suppressedRoute.has(q.routeKey(d.channel,d.recipient))};
 due.push(...operations.due(dueStore,now).map(d=>({queue_key:d.lead_step_key,business:d.business,step:d.step,followup_due_at:d.followup_due_at,final_message:d.final_message,context_required:d.context_required})));
 return {summary,writes,errors,due};
}
function claim(research,queue,locks,options,execution,connection,now=new Date().toISOString()){
 const c=q.config(options),idx=q.indexes(queue,locks,research,now);
 const requested=queue.filter(row=>JSON.parse(row.payload).operator_provider_request).map(row=>row.queue_key);if(requested.length>1)throw Error('ONE_OPERATOR_HANDOFF_AT_A_TIME');
 for(const {row,d} of q.unpack(queue)){
  if(requested.length&&!requested.includes(row.queue_key))continue;
  // A production manual run must select only the operator's exact handoff.
  // Legacy approvals without a request are never an implicit batch selection.
  // The separately capped, allowlisted validation mode retains its old fixtures.
  if((c.mode==='PRODUCTION'||d.operator_workspace)&&!d.operator_provider_request)continue;
  if(d.operator_provider_request&&d.operator_provider_request.message_hash!==d.approved_hash)continue;
  if(c.mode==='VALIDATION'&&!c.allowed_lead_ids.includes(d.lead_id))continue;
  if(d.channel!=='EMAIL'||d.draft_status!=='APPROVED'||row.review_status!=='APPROVED'||d.provider_status||d.sent_at)continue;
  gate(row,d,research,idx,now);if(!operationsInitialApproved(d)||approvalGate({...d,draft_status:'DRAFT_READY'},d.review||{}))throw new Error('PROVIDER_GATE');
  if(row.compliance_status!==d.compliance_status)throw new Error('COMPLIANCE_REVIEW_CHANGED');
  if(JSON.stringify(reviewFor(row))!==JSON.stringify(d.review))throw new Error('REVIEW_REVOKED_OR_CHANGED');
  const old={payload:row.payload,state:row.state,body:row.draft_body,subject:row.subject,recipient:row.recipient,reviewer:row.reviewer,compliance_basis:row.compliance_basis,compliance_status:row.compliance_status};
  const before=JSON.parse(row.payload);d.claimed_at=now;d.provider_status='CLAIMED';d.draft_status='CLAIMED';d.claim_execution=String(execution);
  if(d.operator_workspace)require('./phase2-operator-lifecycle').audit(d,'PROVIDER_CLAIM',d.review?.reviewer||'Operator',now,before,{execution:String(execution)});
  const envelope=envelopeFor(d,connection,now);guardEnvelope(envelope,scopeFor(d),now);
  return [{...q.pack(d,{reviewer:row.reviewer,reviewed_hash:row.reviewed_hash,claim_execution:String(execution),claim_at:now}),cas:old}];
 }
 return [];
}
function request(row,connection,execution,now=new Date().toISOString()){
 const d=JSON.parse(row.payload);if(row.state!=='CLAIMED'||d.provider_status!=='CLAIMED'||d.claim_execution!==String(execution)||row.claim_execution!==String(execution))throw new Error('PERSISTED_PROVIDER_CLAIM_REQUIRED');
 const envelope=envelopeFor(d,connection,d.claimed_at);return {...guardEnvelope(envelope,scopeFor(d),now),queue_key:d.lead_step_key,claim_execution:String(execution)};
}
function receipt(claimRow,request,response,now=new Date().toISOString()){
 const d=JSON.parse(claimRow.payload),r=normalizedReceipt(request,response);if(r.draft_key!==d.draft_key||r.message_hash!==d.approved_hash||r.claimed_at!==d.claimed_at)throw new Error('PROVIDER_RECEIPT_ASSOCIATION_REQUIRED');
 d.provider_status=r.status;d.draft_status=r.status;if(r.status==='ZOHO_DRAFT_CREATED'){d.provider_draft_id=r.draft_id;d.provider_draft_created_at=now;}else d.provider_reconciliation_required=true;
 if(d.operator_workspace){delete d.operator_provider_request;require('./phase2-operator-lifecycle').audit(d,'PROVIDER_RECEIPT',d.review?.reviewer||'Operator',now,JSON.parse(claimRow.payload),{provider_status:d.provider_status,provider_draft_id:d.provider_draft_id||'',message_hash:r.message_hash});}
 d.sent_at=null;d.followup_due_at=null;return q.pack(d,{claim_execution:d.claim_execution,claim_at:d.claimed_at,reviewer:d.review?.reviewer||'',reviewed_hash:d.approved_hash});
}
module.exports={REVIEW_STATES,hash,reviewFor,assertVisible,gate,adapter,apply,process,claim,request,receipt,operationsInitialApprovedForOperator:operationsInitialApproved};
