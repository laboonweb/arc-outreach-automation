'use strict';
const {text,sha256}=require('./helpers');
const q=require('./phase2-cloud-queue');
const review=require('./phase2-cloud-review');
const operations=require('./outreach-operations');
const {facts,list}=require('./outreach-mvp');

const FIELDS='business_name market channel contact subject draft why_this_lead compliance action notes send_status'.split(' ');
const COLUMNS=Object.fromEntries(FIELDS.map(k=>[k,'string']));
const LINK_COLUMNS={queue_key:'string',inbox_id:'number',snapshot:'string',backend_hash:'string'};
const ACTIONS=new Set(['NONE','APPROVE','EDIT','REJECT','NEEDS_RESEARCH','DO_NOT_CONTACT','MARK_SENT']);
const COMPLIANCE=new Set(['NEEDS_REVIEW','SAFE_TO_CONTACT','DO_NOT_CONTACT','NOT_APPLICABLE']);
const immutable=['business_name','market','channel','contact','why_this_lead','send_status'];
const clone=x=>JSON.parse(JSON.stringify(x));
const clean=x=>text(x).replace(/[\u0000-\u001f]/g,' ').replace(/[\u2013\u2014]/g,', ').replace(/\s+/g,' ').trim();
const userNotes=x=>text(x).split('\n').filter(line=>!line.startsWith('Inbox: ')).join('\n').trim();
const command=x=>text(x.action).trim().toUpperCase()||'NONE';
const tuple=x=>JSON.stringify([x.business_name,x.channel,x.contact]);
const digest=row=>sha256(row.payload);
function fingerprint(row){return sha256(JSON.stringify([row.id,command(row),row.subject||'',row.draft||'',row.compliance,userNotes(row.notes)]));}
function compliance(d){
 if(['DO_NOT_CONTACT','DO_NOT_EMAIL'].includes(d.compliance_status)||d.draft_status==='DO_NOT_CONTACT')return 'DO_NOT_CONTACT';
 if(d.country==='Australia')return d.compliance_status==='SAFE_TO_REVIEW'?'SAFE_TO_CONTACT':'NEEDS_REVIEW';
 return d.compliance_status==='NOT_APPLICABLE'?'NOT_APPLICABLE':d.compliance_status==='SAFE_TO_REVIEW'?'SAFE_TO_CONTACT':'NEEDS_REVIEW';
}
function status(d,now){
 if(d.draft_status==='DO_NOT_CONTACT'||['DO_NOT_CONTACT','DO_NOT_EMAIL'].includes(d.compliance_status))return 'PROTECTED';
 if(d.reply_status==='REPLIED'||d.draft_status==='REPLIED')return 'REPLIED';
 if(d.followups_parked||['PARKED','REJECTED','DO_NOT_CONTACT','DISQUALIFIED'].includes(d.draft_status))return 'PARKED';
 if(d.sent_at){const due=operations.due({all:()=>[d],blocked:()=>false},now);return due.length?'FOLLOW_UP_DUE':'SENT';}
 if(d.draft_status==='NEEDS_COPY')return 'NEEDS_COPY';
 if(d.draft_status==='PROTECTED'||d.initial_locked&&!d.sent_at)return 'PROTECTED';
 if(d.draft_status==='NEEDS_RESEARCH'||!text(d.draft_body).trim()||d.channel==='EMAIL'&&!text(d.subject).trim())return 'NEEDS_RESEARCH';
 if(d.draft_status==='ZOHO_DRAFT_CREATED')return d.provider_status==='ZOHO_DRAFT_CREATED'&&d.provider_draft_id?'ZOHO_DRAFT_CREATED':'PROTECTED';
 if(['CLAIMED','UNKNOWN_PROVIDER_RESULT'].includes(d.provider_status))return 'PROTECTED';
 try{require('./outreach-copy').gate(d);}catch{return 'NEEDS_COPY';}
 if(d.draft_status==='DRAFT_READY_SEND_BLOCKED')return 'DRAFT_READY_SEND_BLOCKED';
 const operatorFacts=d.operator_workspace?require('./research-history').currentFacts({evidence_json:d.evidence_summary},now):[];
 const checked=type=>operatorFacts.some(f=>f.type===type&&f.source_type==='OPERATOR_RECORDED'&&f.channel===d.channel&&q.routeKey(f.channel,f.recipient)===q.routeKey(d.channel,d.recipient));
 if(d.draft_status==='DRAFT_READY'&&(compliance(d)==='NEEDS_REVIEW'||d.country==='Australia'&&!checked('permission')&&(!d.review?.consent_reviewed||!d.review?.compliance_basis)||d.channel!=='EMAIL'&&!d.dm_verified_at&&!checked('messaging')))return 'DRAFT_READY_SEND_BLOCKED';
 if(d.draft_status==='MANUAL_SOCIAL_READY')return 'MANUAL_SOCIAL_READY';
 if(d.draft_status==='APPROVED')return 'READY_TO_SEND';
 if(d.draft_status!=='DRAFT_READY'||compliance(d)==='NEEDS_REVIEW')return 'NEEDS_REVIEW';
 return 'DRAFT_READY';
}
function reason(row,d){
 if(d.research_diagnostics)return require('./research-diagnostics').summary(d.research_diagnostics);
 if(d.why_this_lead)return d.why_this_lead;
 if(['NEEDS_RESEARCH','NEEDS_COPY'].includes(d.draft_status)&&!d.draft_body){const known=list(d.evidence_summary||row.evidence_basis).filter(f=>f.excerpt&&f.source_url);return 'Known: '+[...new Set(known.map(f=>f.type.replaceAll('_',' ')))].join(', ')+'.\nMissing / stale: '+(d.tier_issues?.join(', ')||d.copy_issues?.join(', ')||d.route_reason||'Current canonical evidence needs review.')+'\nNext step: '+(d.draft_status==='NEEDS_COPY'?'Review the composer using the verified evidence.':'Review the specific current blocker against Arc Research.');}
 const evidence=list(row.evidence_basis).filter(f=>f.excerpt&&f.source_url);
 const pick=types=>evidence.find(f=>types.includes(f.type));
 const primary=pick(['gap','pain','structural_gap'])||pick(['opportunity','structural_opportunity'])||pick(['legitimacy','identity'])||pick(['activity']);
 const chosen=primary?[primary]:[];
 if(!chosen.length)return 'More verified evidence is needed before outreach.';
 if(primary&&['opportunity','structural_opportunity'].includes(primary.type))return 'Verified public business presence and enquiry route. An owned destination was not established during bounded research.';
 return 'Verified business evidence is available. Review the specific opportunity and source evidence before outreach.';
}
function market(row){
 const dataset=text(row.dataset_id).trim().toUpperCase();
 return ['AUSTRALIA','AUSTRALIA_500_20261011'].includes(dataset)?'Australia':/^MANILA(?:_|$)/.test(dataset)?'Manila':'';
}
function project(row,now=new Date().toISOString()){
 const [{d}]=q.unpack([row]);
 return {business_name:row.business_name,market:market(row),channel:row.channel,contact:row.recipient||'',subject:d.channel==='EMAIL'?d.subject||'':'',draft:d.draft_body||'',why_this_lead:reason(row,d),compliance:compliance(d),action:'NONE',notes:userNotes(row.review_note),send_status:status(d,now)};
}
function mapping(queue,inbox,links){
 const backend=new Map(),byId=new Map(),byKey=new Map(),assigned=new Set();
 for(const {row} of q.unpack(queue)){if(backend.has(row.queue_key))throw new Error('DUPLICATE_BACKEND_KEY');backend.set(row.queue_key,row);}
 for(const row of inbox.filter(r=>r.id)){if(byId.has(row.id))throw new Error('DUPLICATE_INBOX_ID');byId.set(row.id,row);}
 for(const link of links.filter(r=>r.queue_key)){
  if(byKey.has(link.queue_key)||assigned.has(link.inbox_id)||!backend.has(link.queue_key)||!byId.has(link.inbox_id))throw new Error('INBOX_MAPPING_RECONCILIATION_REQUIRED');
  // Accept only the previous projection's missing market during this additive
  // migration. Sync then stores a full snapshot without changing the ledger.
  const baseline=JSON.parse(link.snapshot);if(!FIELDS.every(k=>typeof baseline[k]==='string'||k==='market'&&baseline[k]===undefined))throw new Error('INVALID_INBOX_SNAPSHOT');
  assigned.add(link.inbox_id);byKey.set(link.queue_key,link);
 }
 return {backend,byId,byKey,assigned};
}
function allowed(row,c){return c.mode!=='VALIDATION'||c.allowed_lead_ids.includes(row.lead_id);}
function processed(row,inbox){const d=JSON.parse(row.payload),receipt=d.cloud_inbox_action;return receipt?.inbox_id===inbox.id&&receipt.fingerprint===fingerprint(inbox)&&receipt.result_hash===review.hash(d);}
function sync(queue,inbox,links,options,feedback=[],now=new Date().toISOString()){
 const c=q.config(options),idx=mapping(queue,inbox,links),writes=[],seen=new Set(),summary={projected:0,pending_preserved:0,backend_writes:0,emails_sent:0,dms_sent:0};
 for(const row of queue.filter(r=>r.queue_key&&allowed(r,c))){
  const canonical=project(row,now),key=tuple(canonical);if(seen.has(key))throw new Error('AMBIGUOUS_HUMAN_IDENTITY');seen.add(key);
  const link=idx.byKey.get(row.queue_key),current=link?idx.byId.get(link.inbox_id):inbox.find(r=>r.id&&!idx.assigned.has(r.id)&&tuple(r)===key);
  if(!link&&current&&FIELDS.some(k=>(current[k]||'')!==canonical[k]))throw new Error('UNLINKED_INBOX_ROW_REQUIRES_RECONCILIATION');
  const failure=feedback.find(f=>f.queue_key===row.queue_key),done=current&&processed(row,current);
  const baseline=link?JSON.parse(link.snapshot):canonical;
  const pending=current&&!done&&(command(current)!=='NONE'||['subject','draft','compliance'].some(k=>(current[k]||'')!==baseline[k]));
  let view={...canonical,notes:current?userNotes(current.notes):canonical.notes};
  if(pending&&!failure){
   summary.pending_preserved++;
   if(typeof baseline.market==='string'&&current.market===canonical.market)continue;
   view={...current,market:canonical.market};
  }
  if(failure){view={...current,action:'NONE',notes:userNotes(current.notes)+'\nInbox: '+friendly(failure.error)};for(const k of immutable)view[k]=canonical[k];}
  if(done)view.notes=userNotes(current.notes);
  view=Object.fromEntries(FIELDS.map(k=>[k,text(view[k])]));
  const snapshot=pending&&!failure?{...baseline,market:canonical.market,notes:userNotes(view.notes)}:{...canonical,notes:view.notes};
  if(current&&link&&FIELDS.every(k=>(current[k]||'')===view[k])&&link.backend_hash===digest(row)&&link.snapshot===JSON.stringify(snapshot))continue;
  // Known rows are matched by their built-in ID. An interrupted first projection
  // is recovered only by its unique, exact human identity and canonical content.
  writes.push({...view,queue_key:row.queue_key,inbox_id:current?.id||0,backend_hash:digest(row),snapshot:JSON.stringify(snapshot),match_keys:current?['id','id','id']:['business_name','channel','contact'],match_values:current?[current.id,current.id,current.id]:[view.business_name,view.channel,view.contact]});summary.projected++;
 }
 return {summary,writes};
}
function linkResults(plan,rows){
 if(rows.length!==plan.writes.length)throw new Error('INBOX_WRITE_COUNT_MISMATCH');
 const used=new Set();return rows.map(row=>{
  const matches=plan.writes.filter(p=>tuple(p)===tuple(row));if(matches.length!==1||!row.id||used.has(row.id))throw new Error('INBOX_WRITE_ASSOCIATION_MISMATCH');
  const p=matches[0];if(p.inbox_id&&p.inbox_id!==row.id)throw new Error('INBOX_ROW_ID_CHANGED');
  if(FIELDS.some(k=>(row[k]||'')!==p[k]))throw new Error('INBOX_CONTENT_WRITE_MISMATCH');used.add(row.id);
  return {queue_key:p.queue_key,inbox_id:row.id,snapshot:p.snapshot,backend_hash:p.backend_hash};
 });
}
function friendly(error){
 const copyReason=require('./outreach-content').message(error);if(copyReason)return copyReason;
 const messages={AU_COMPLIANCE_UNRESOLVED:'Set compliance to SAFE_TO_CONTACT only after review, and document the basis in notes.',AU_COMPLIANCE_BASIS_REQUIRED:'Document your Australian contact permission basis in notes.',SOCIAL_VERIFICATION_REQUIRED:'Verify the actual Message/contact option, then add MESSAGING VERIFIED to notes.',MANUAL_SEND_CONFIRMATION_REQUIRED:'After sending the exact approved message yourself, add SENT MANUALLY to notes.',INBOX_STALE:'This item changed in the ledger. Review the refreshed Inbox before choosing the action again.',EDIT_MUST_BE_REVIEWED_BEFORE_APPROVAL:'Save changed subject/draft with EDIT first, then review and APPROVE.',READ_ONLY_FIELD_CHANGED:'Business, market, channel, contact, evidence and send status are read-only. Review the refreshed values.',FOLLOWUP_REVIEW_REQUIRED:'Review follow-up context and compliance before recording this follow-up.',CURRENT_SOURCE_OR_LEDGER_PROTECTED:'Current research or outreach protections block this action.',SOURCE_CHANGED_NEEDS_RESEARCH:'The research changed. This item needs research review before approval.',EDIT_NOT_ALLOWED:'An existing provider draft or sent record cannot be edited here.',PERMANENT_SUPPRESSION:'This contact is suppressed. Outreach remains blocked.'};
 return messages[error]||'Action blocked by existing outreach protections ('+clean(error).slice(0,100)+').';
}
function process(research,queue,locks,inbox,links,options,now=new Date().toISOString()){
 const c=q.config(options),idx=mapping(queue,inbox,links),writes=[],errors=[],summary={reviewed:0,approved:0,manual_social_ready:0,marked_sent:0,replayed:0,source_writes:0,provider_calls:0,emails_sent:0,dms_sent:0};
 let working=clone(queue);
 for(const input of inbox.filter(r=>r.id&&command(r)!=='NONE')){
  const link=links.find(l=>l.inbox_id===input.id),row=link&&working.find(r=>r.queue_key===link.queue_key);
  if(!row){errors.push({inbox_id:input.id,error:'INBOX_MAPPING_RECONCILIATION_REQUIRED'});continue;}
  if(!allowed(row,c)||writes.length>=c.cap)continue;
  const action=command(input);
  try{
   if(!ACTIONS.has(action))throw new Error('INVALID_ACTION');if(!COMPLIANCE.has(input.compliance))throw new Error('INVALID_COMPLIANCE');
   if(processed(row,input)){summary.replayed++;continue;}
   if(link.backend_hash!==digest(row))throw new Error('INBOX_STALE');
   const baseline=JSON.parse(link.snapshot);if(immutable.some(k=>text(input[k])!==baseline[k]))throw new Error('READ_ONLY_FIELD_CHANGED');
   const d=clone(JSON.parse(row.payload)),notes=userNotes(input.notes),au=d.country==='Australia';
   let candidate={...row,action:'',review_status:d.review_status,reviewer:c.operator||'Briann',review_note:notes,dm_verified:false,manual_send_confirmation:false};
   if(input.compliance==='DO_NOT_CONTACT'&&action!=='DO_NOT_CONTACT')throw new Error('COMPLIANCE_BLOCKED');
   if(['APPROVE','MARK_SENT'].includes(action)&&(input.subject!==(d.subject||'')||input.draft!==(d.draft_body||'')))throw new Error('EDIT_MUST_BE_REVIEWED_BEFORE_APPROVAL');
   if(action==='APPROVE'){
    if(au&&input.compliance!=='SAFE_TO_CONTACT')throw new Error('AU_COMPLIANCE_UNRESOLVED');
    if(au&&!notes.replace(/MESSAGING VERIFIED/gi,'').trim())throw new Error('AU_COMPLIANCE_BASIS_REQUIRED');
    const source=review.gate(row,d,research,q.indexes(working,locks,research,now),now);
    if(!facts(source,now).some(f=>['legitimacy','identity'].includes(f.type)))throw new Error('VERIFIED_IDENTITY_REQUIRED');
    if(d.channel!=='EMAIL'&&!/\bMESSAGING VERIFIED\b/i.test(notes))throw new Error('SOCIAL_VERIFICATION_REQUIRED');
    Object.assign(candidate,{review_status:'APPROVED',truthful:true,recipient_relevant:true,suppression_checked:true,consent_reviewed:true,compliance_basis:au?notes:notes||'Operator APPROVE confirms exact copy and route. Current verified evidence and suppression checks passed.',compliance_status:au?'SAFE_TO_REVIEW':d.compliance_status,dm_verified:d.channel!=='EMAIL'});
   }else if(action==='EDIT'){
    if(d.channel!=='EMAIL'&&d.draft_status==='MANUAL_SOCIAL_READY'&&!d.sent_at&&!d.provider_status){d.draft_status='APPROVED';candidate={...candidate,state:'APPROVED',payload:JSON.stringify(d)};}
    Object.assign(candidate,{review_status:'NEEDS_EDIT',subject:input.subject,draft_body:input.draft,truthful:false,recipient_relevant:false,consent_reviewed:false,suppression_checked:false,compliance_basis:''});
   }else if(action==='REJECT')candidate.review_status='REJECTED';
   else if(action==='NEEDS_RESEARCH')candidate.review_status='NEEDS_RESEARCH';
   else if(action==='DO_NOT_CONTACT')candidate.action='DO_NOT_CONTACT';
   else if(action==='MARK_SENT'){
    if(!/\bSENT MANUALLY\b/i.test(notes))throw new Error('MANUAL_SEND_CONFIRMATION_REQUIRED');
    if(status(d,now)==='FOLLOW_UP_DUE')throw new Error('FOLLOWUP_REVIEW_REQUIRED');
    Object.assign(candidate,{action:'MARK_SENT',action_step:'initial',manual_send_confirmation:true,sent_message:input.draft});
   }
   const controls=working.map(r=>r.queue_key===row.queue_key?candidate:{...r,action:'',review_status:JSON.parse(r.payload).review_status,dm_verified:false});
   const result=review.process(research,controls,locks,{...c,allowed_lead_ids:[row.lead_id]},now);
   if(result.errors.length)throw require('./outreach-content').restore(result.errors[0]);const saved=result.writes.find(r=>r.queue_key===row.queue_key);if(!saved)throw new Error('ACTION_DID_NOT_TRANSITION');
   const next=JSON.parse(saved.payload);
   if(action==='EDIT'){delete next.approved_at;delete next.review;delete next.dm_verified_at;}
   next.cloud_inbox_action={inbox_id:input.id,fingerprint:fingerprint(input),action,at:now,result_hash:review.hash(next)};
   saved.payload=JSON.stringify(next);saved.cas_payload=row.payload;
   writes.push(saved);working=working.map(r=>r.queue_key===row.queue_key?saved:r);
   for(const key of ['reviewed','approved','manual_social_ready','marked_sent'])summary[key]+=result.summary[key];
  }catch(e){errors.push({queue_key:row.queue_key,inbox_id:input.id,business:row.business_name,error:e.message,...(e.failures?{failures:e.failures}:{})});}
 }
 const finalIndex=q.indexes(working,locks,research,now);
 return {summary,writes,errors,due:operations.due({all:()=>q.unpack(working).map(x=>x.d),blocked:d=>finalIndex.suppressedLead.has(d.lead_id)||finalIndex.suppressedRoute.has(q.routeKey(d.channel,d.recipient))},now).map(d=>({business:d.business,step:d.step,followup_due_at:d.followup_due_at,final_message:d.final_message})),feedback:errors};
}
module.exports={FIELDS,COLUMNS,LINK_COLUMNS,ACTIONS,COMPLIANCE,project,market,compliance,status,reason,mapping,sync,linkResults,process,fingerprint,digest,friendly,userNotes};
