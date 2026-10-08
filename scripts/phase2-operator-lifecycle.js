'use strict';
const {text,sha256}=require('./helpers'),q=require('./phase2-cloud-queue'),r=require('./phase2-cloud-review'),h=require('./research-history'),e=require('./phase2-operator-evidence'),copy=require('./outreach-copy');
const ACTIONS=new Set(['SAVE_REEVALUATE','REQUEST_REVIEW','REQUEST_ZOHO','REPLIED','RESCHEDULE','DISMISS_FOLLOWUP','MARK_FOLLOWUP_SENT','CORRECT_CLASSIFICATION','SAVE_HISTORY_EVIDENCE']);
function protectedReason(source,d,queue,locks,now){
 const idx=q.indexes(queue,locks,source?[source]:[],now);
 if(idx.suppressedLead.has(d.lead_id)||idx.suppressedRoute.has(q.routeKey(d.channel,d.recipient))||idx.suppressedRoute.has(text(d.recipient).toLowerCase()))return 'PERMANENT_SUPPRESSION';
 if(d.provider_status||d.provider_draft_id)return 'PROVIDER_LINKED';
 if(d.sent_at||d.history_contact_at||d.initial_locked||q.blocked(d,idx)||q.protection(source||{}))return 'PROTECTED_HISTORY_OR_SOURCE';
 if(['REJECTED','DO_NOT_CONTACT','PARKED','DISQUALIFIED'].includes(d.draft_status))return 'PROTECTED_DECISION';
 return '';
}
function evaluate(source,d,now){
 const row=e.effective(source,d,now);if(!row)return {status:'NEEDS_RESEARCH',blockers:['SOURCE_RECORD_REQUIRED'],copy_issues:[],next:'Restore the matching source record.'};
 const a=require('./phase2-eligibility').assess(row,now,d),checks=e.checks(source,d,now),blockers=require('./phase2-eligibility').sendBlockers(row,now,d,checks),issues=[];
 if(d.operator_workspace){if(!checks.permission)blockers.push('OPERATOR_PERMISSION_REQUIRED');if(d.channel!=='EMAIL'&&!checks.messaging)blockers.push('MESSAGING_AVAILABILITY_UNVERIFIED');}
 try{if(d.operator_workspace?.copy_claims?.length)issues.push(...require('./phase2-operator-copy').validate(d,row,now));else{const candidate={...d,copy_evidence:copy.structured(row,d.channel,now)||d.copy_evidence};if(!candidate.copy_evidence)issues.push('OPERATOR_COPY_CLAIM_REQUIRED');else copy.gate(candidate);}}catch(error){issues.push(...(error.message.startsWith('OUTBOUND_CONTENT_BLOCKED:')?error.message.split(':')[1].split(','):[error.message]));}
 const missing=[...new Set([...a.issues,...a.strict.issues,...blockers])];
 const status=!a.eligible?'NEEDS_RESEARCH':issues.length?'NEEDS_COPY':blockers.length?'DRAFT_READY_SEND_BLOCKED':'DRAFT_READY';
 return {status,blockers:[...new Set(blockers)],missing,copy_issues:[...new Set(issues)],evidence_ids:h.currentFacts(row,now).map(h.identity),checked_at:now,next:status==='NEEDS_RESEARCH'?'Record the missing verified observations.':status==='NEEDS_COPY'?'Save or correct the message and its supporting factual statements.':blockers.length?'Resolve the listed evidence and permission checks.':'Request review, read the saved message, then approve.',tier:a.strict.tier};
}
function audit(d,event,reviewer,now,before,details={}){
 const workspace=d.operator_workspace||={version:1,evidence:[],audit:[],copy_claims:[]};
 const events=workspace.audit||=[];if(events.length>=1000)throw Error('OPERATOR_AUDIT_ARCHIVE_REQUIRED');
 const previous=events.at(-1)?.event_hash||'';
 const entry={at:now,event,reviewer,from:before.draft_status,to:d.draft_status,evidence_refs:workspace.evaluation?.evidence_ids||[],changes:details,previous_hash:previous};
 entry.event_hash=sha256(JSON.stringify(entry));events.push(entry);
 if(JSON.stringify(workspace).length>180000)throw Error('OPERATOR_HISTORY_ARCHIVE_REQUIRED');
}
function extra(row){return Object.fromEntries(['reviewer','review_note','reviewed_hash','truthful','recipient_relevant','consent_reviewed','suppression_checked','compliance_basis','dm_verified','claim_execution','claim_at'].map(k=>[k,row[k]]));}
function process(input,body,research,queue,locks,rows,links,options,now){
 const link=links.find(l=>l.inbox_id===input.id),row=queue.find(x=>x.queue_key===link.queue_key),before=JSON.parse(row.payload),d=JSON.parse(row.payload),source=research.find(x=>x.lead_id===d.lead_id),reviewer=text(body.reviewer);
 if(!reviewer||reviewer.length>100)throw Error('OPERATOR_REVIEWER_REQUIRED');
 const action=input.action,reason=protectedReason(source,d,queue,locks,now),historyActions=new Set(['REPLIED','RESCHEDULE','DISMISS_FOLLOWUP','MARK_FOLLOWUP_SENT','MARK_SENT','DO_NOT_CONTACT','SAVE_HISTORY_EVIDENCE']);
 if(reason&&!historyActions.has(action))throw Error(reason);
 if(reason==='PERMANENT_SUPPRESSION'&&action!=='DO_NOT_CONTACT')throw Error(reason);
 if(['CLAIMED','UNKNOWN_PROVIDER_RESULT'].includes(d.provider_status)&&action!=='DO_NOT_CONTACT')throw Error('PROVIDER_RECONCILIATION_REQUIRED');
 let saved,changes={};
 if(['SAVE_REEVALUATE','EDIT','CORRECT_CLASSIFICATION'].includes(action)){
  d.operator_workspace||={version:1,evidence:[],audit:[],copy_claims:[]};
  const snapshots=d.operator_workspace.research_snapshots||=[];
  if(source&&!snapshots.some(s=>s.hash===q.sourceHash(source)))snapshots.push({hash:q.sourceHash(source),at:now,evidence_json:source.evidence_json||'[]',activity_evidence:source.activity_evidence||'[]',prior_queue_evidence:d.evidence_summary||'[]',prior_classification:{tier:d.tier,issues:d.tier_issues,diagnostics:d.research_diagnostics}});
  if(snapshots.length>20)throw Error('OPERATOR_RESEARCH_ARCHIVE_REQUIRED');
  let observation;if(body.evidence){const raw=JSON.parse(body.evidence);observation=e.validate(raw,source||d,reviewer,now);if(observation.supersedes&&!h.allFacts(e.effective(source,d,now)).some(f=>observation.supersedes.includes(h.identity(f))))throw Error('OPERATOR_CORRECTION_REFERENCE_REQUIRED');if(action==='CORRECT_CLASSIFICATION'&&observation.type!=='classification_review')throw Error('OPERATOR_CORRECTION_REFERENCE_REQUIRED');if(!d.operator_workspace.evidence.some(f=>f.observation_id===observation.observation_id))d.operator_workspace.evidence.push(observation);changes.observation=observation;}
  else if(action==='CORRECT_CLASSIFICATION')throw Error('OPERATOR_CORRECTION_REFERENCE_REQUIRED');
  if(body.copy_claims!==undefined){const claims=JSON.parse(body.copy_claims);if(!Array.isArray(claims)||claims.length>25||claims.some(c=>!c||Object.keys(c).some(k=>!['statement','evidence_id'].includes(k))||typeof c.statement!=='string'||c.statement.length>160||!/^[a-f0-9]{64}$/.test(c.evidence_id)))throw Error('OPERATOR_COPY_CLAIM_INVALID');d.operator_workspace.copy_claims=claims;}
  const effective=e.effective(source,d,now),route=require('./phase2-eligibility').route(effective||{},now,d);
  if(route.channel!=='NO_ROUTE'&&(route.channel!==d.channel||q.routeKey(route.channel,route.recipient)!==q.routeKey(d.channel,d.recipient))){
   if(d.approved_hash)throw Error('OPERATOR_ROUTE_REVIEW_REQUIRED');
   const identity=require('./outreach-mvp').draftIdentity({lead_id:d.lead_id},route,d.campaign,d.step);if(identity.lead_step_key!==d.lead_step_key)throw Error('QUEUE_IDENTITY_MISMATCH');
   if(queue.some(x=>x.queue_key!==row.queue_key&&q.routeKey(x.channel,x.recipient)===q.routeKey(route.channel,route.recipient))||q.blocked({...d,channel:route.channel,recipient:route.recipient},q.indexes(queue,locks,research,now)))throw Error('DUPLICATE_OR_PROTECTED_ROUTE');
   changes.route={before:{channel:d.channel,recipient:d.recipient},after:route};Object.assign(d,identity,{channel:route.channel,recipient:route.recipient,route_source:route.source,route_invalid:false});
  }
  changes.copy={before:{subject:d.subject,body:d.draft_body},after:{subject:d.channel==='EMAIL'?input.subject:'',body:input.draft}};
  d.subject=d.channel==='EMAIL'?input.subject:'';d.draft_body=d.channel==='EMAIL'&&input.draft.trim()?copy.finalEmail(input.draft):input.draft;d.draft_core=copy.core(d.draft_body);d.message_hash=r.hash(d);
  d.approved_hash='';delete d.approved_message;delete d.approved_at;delete d.review;delete d.dm_verified_at;delete d.operator_provider_request;d.review_status='UNREVIEWED';
  d.cloud_source_snapshot_hash=source?q.sourceHash(source):d.cloud_source_snapshot_hash;d.timezone=effective?.timezone||d.timezone;
  d.evidence_summary=JSON.stringify(effective?h.allFacts(effective):[]);d.source_urls=JSON.stringify(effective?[...new Set(h.allFacts(effective).map(f=>f.source_url))]:[]);d.copy_evidence=effective?copy.structured(effective,d.channel,now):null;
  d.operator_workspace.evaluation=evaluate(source,d,now);d.send_blockers=d.operator_workspace.evaluation.blockers;d.draft_status=d.operator_workspace.evaluation.status;d.tier=d.operator_workspace.evaluation.tier;d.routing=['DRAFT_READY','DRAFT_READY_SEND_BLOCKED'].includes(d.draft_status)?'READY_FOR_DRAFT':d.draft_status;
  const checks=e.checks(source,d,now);if(checks.permission)d.compliance_status='SAFE_TO_REVIEW';d.copy_status=d.operator_workspace.evaluation.copy_issues.length?'WORKING':'VALID';
  saved=q.pack(d,{...extra(row),reviewer,review_note:input.notes,reviewed_hash:'',truthful:false,recipient_relevant:false,consent_reviewed:false,suppression_checked:false,compliance_basis:''});
 }else if(action==='SAVE_HISTORY_EVIDENCE'){
  if(!d.sent_at&&!d.history_contact_at)throw Error('NO_CONTACT_HISTORY');
  const observation=e.validate(JSON.parse(body.evidence||'null'),source||d,reviewer,now);if(!['permission','messaging','contact','timezone'].includes(observation.type))throw Error('PROTECTED_HISTORY_OR_SOURCE');
  if(['permission','messaging','contact'].includes(observation.type)&&(observation.channel!==d.channel||q.routeKey(observation.channel,observation.recipient)!==q.routeKey(d.channel,d.recipient)))throw Error('PROTECTED_ROUTE_CHANGE');
  d.operator_workspace||={version:1,evidence:[],audit:[],copy_claims:[]};d.operator_workspace.evidence.push(observation);if(observation.type==='timezone')d.timezone=observation.value;changes.observation=observation;saved=q.pack(d,{...extra(row),reviewer,review_note:input.notes});
 }else if(action==='REQUEST_REVIEW'||action==='REQUEST_ZOHO'){
  const result=evaluate(source,d,now);if(result.status!=='DRAFT_READY')throw Error('OPERATOR_STILL_BLOCKED:'+ [...result.blockers,...result.copy_issues].join('|'));
  if(input.subject!==(d.subject||'')||input.draft!==(d.draft_body||''))throw Error('EDIT_MUST_BE_REVIEWED_BEFORE_APPROVAL');
  if(action==='REQUEST_ZOHO'){if(d.channel!=='EMAIL'||d.draft_status!=='APPROVED'||!r.operationsInitialApprovedForOperator(d))throw Error('EXPLICIT_APPROVAL_REQUIRED');if(queue.some(x=>x.queue_key!==row.queue_key&&JSON.parse(x.payload).operator_provider_request))throw Error('ONE_OPERATOR_HANDOFF_AT_A_TIME');d.operator_provider_request={reviewer,at:now,message_hash:d.approved_hash};}
  if(action==='REQUEST_ZOHO')r.gate(row,d,research,q.indexes(queue,locks,research,now),now);
  else {if(!['DRAFT_READY','DRAFT_READY_SEND_BLOCKED','NEEDS_REVIEW'].includes(d.draft_status))throw Error('OPERATOR_REVIEW_STATE_REQUIRED');d.draft_status='NEEDS_REVIEW';}
  d.operator_workspace||={version:1,evidence:[],audit:[],copy_claims:[]};d.operator_workspace.evaluation=result;saved=q.pack(d,{...extra(row),reviewer,review_note:input.notes});
 }else if(['REPLIED','RESCHEDULE','DISMISS_FOLLOWUP','MARK_FOLLOWUP_SENT'].includes(action)){
  const operation=action==='DISMISS_FOLLOWUP'?'PARK':action==='MARK_FOLLOWUP_SENT'?'MARK_SENT':action;
  if(!text(input.notes)&&['REPLIED','DISMISS_FOLLOWUP'].includes(action))throw Error('OPERATOR_HISTORY_NOTE_REQUIRED');
  const index=q.indexes(queue,locks,research,now),checks=e.checks(source,d,now);
  if(action==='MARK_FOLLOWUP_SENT'){
   const restricted=source&&['arc_status','manual_status_override','queue_route','outreach_readiness','acma_status','compliance_status','suppression_status'].some(k=>['DO_NOT_EMAIL','DO_NOT_CONTACT','SUPPRESSED','DISQUALIFIED','BLOCKED','PARK','PARKED'].includes(source[k]));
   const route=require('./phase2-eligibility').route(e.effective(source,d,now)||{},now,d);
   if(restricted||['DO_NOT_EMAIL','DO_NOT_CONTACT'].includes(d.compliance_status))throw Error('COMPLIANCE_BLOCKED');
   if(!body.sent_confirmed||!checks.permission||d.channel!=='EMAIL'&&!checks.messaging||route.channel!==d.channel||q.routeKey(route.channel,route.recipient)!==q.routeKey(d.channel,d.recipient)||!text(body.followup_message)||body.followup_message.length>10000)throw Error('FOLLOWUP_CONTEXT_REVIEW_REQUIRED');
  }
  if(action==='MARK_FOLLOWUP_SENT'){const content=require('./outreach-content'),issues=copy.leakage('',body.followup_message);if(copy.FORBIDDEN.test(body.followup_message))issues.push('FORBIDDEN_CLAIM');if(issues.length)throw content.rejection(issues);}
  const due=body.due_at&&!/Z$|[+-]\d\d:\d\d$/.test(body.due_at)?body.due_at+'Z':body.due_at;
  const priorHistory=(d.conversation_history||[]).length;
  r.apply(row,d,operation,{reviewer,note:input.notes,reason:input.notes,due_at:due,step:action==='MARK_FOLLOWUP_SENT'?'followup_'+(Number(d.followup_count||0)+1):'initial',message:body.followup_message,manual_send_confirmation:body.sent_confirmed==='on'||body.sent_confirmed===true,consent_reviewed:!!checks.permission,compliance_basis:checks.permission?.excerpt||''},research,index,now);
  if(action==='REPLIED'){if((d.conversation_history||[]).length===priorHistory)d.conversation_history=[...(d.conversation_history||[]),{at:now,event:'REPLIED',note:input.notes,reviewer}];else d.conversation_history.at(-1).reviewer=reviewer;}
  changes.history={note:input.notes,due_at:body.due_at||'',message:body.followup_message||''};saved=q.pack(d,{...extra(row),reviewer,review_note:input.notes});
 }else{
  let cmd=input;
  if(action==='APPROVE'){
   if(!d.operator_workspace)throw Error('OPERATOR_VERIFICATION_REQUIRED');
   if(d.operator_workspace){const checks=e.checks(source,d,now),evaluation=evaluate(source,d,now);if(!checks.permission||d.channel!=='EMAIL'&&!checks.messaging||evaluation.status!=='DRAFT_READY')throw Error('OPERATOR_STILL_BLOCKED:'+ [...evaluation.blockers,...evaluation.copy_issues].join('|'));cmd={...input,compliance:'SAFE_TO_CONTACT',notes:input.notes+'\n'+checks.permission.excerpt+(checks.messaging?'\nMESSAGING VERIFIED':'')};}
  }
  const scoped=rows.map(x=>x.id===input.id?cmd:{...x,action:'NONE'}),result=require('./phase2-inbox').process(research,queue,locks,scoped,links,{...options,mode:'PRODUCTION',cap:'ALL',operator:reviewer},now);
  if(result.errors.length)throw require('./outreach-content').restore(result.errors[0]);saved=result.writes[0];if(!saved)throw Error('ACTION_DID_NOT_TRANSITION');Object.assign(d,JSON.parse(saved.payload));
 }
 // Existing operation adapters have bounded legacy audit projections. Retain
 // their full pre-command history when entering the operator-controlled path.
 if(before.cloud_audit?.length){const seen=new Set(before.cloud_audit.map(x=>JSON.stringify(x)));d.cloud_audit=[...before.cloud_audit,...(d.cloud_audit||[]).filter(x=>!seen.has(JSON.stringify(x)))];}
 audit(d,action,reviewer,now,before,{...changes,notes:{before:row.review_note||'',after:input.notes},verification:d.operator_workspace?.evaluation||null});
 d.cloud_inbox_action={inbox_id:input.id,fingerprint:require('./phase2-inbox').fingerprint(input),action,at:now,result_hash:r.hash(d)};
 saved.payload=JSON.stringify(d);saved.cas_payload=row.payload;
 return {summary:{reviewed:1,source_writes:0,provider_calls:0,emails_sent:0,dms_sent:0},writes:[saved],errors:[],feedback:[],operator_input:input,notice:action==='REQUEST_ZOHO'?'Handoff requested for this approved message. Run the existing manual Zoho handoff; no provider call was made.':'Saved. Current status: '+require('./phase2-inbox').status(d,now)+'. '+(d.operator_workspace?.evaluation?.next||'Contact history preserved.')};
}
module.exports={ACTIONS,evaluate,process,audit,protectedReason};
