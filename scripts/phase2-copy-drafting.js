'use strict';
const q=require('./phase2-cloud-queue');
const copy=require('./outreach-copy');
const {text,sha256,yes}=require('./helpers');
function safe(row,d){
 return !d.operator_workspace&&row.review_status==='UNREVIEWED'&&d.review_status==='UNREVIEWED'&&['DRAFT_READY','DRAFT_READY_SEND_BLOCKED','NEEDS_RESEARCH','NEEDS_COPY'].includes(d.draft_status)&&!d.initial_locked&&!d.provider_status&&!row.provider_status&&!d.provider_draft_id&&!row.provider_draft_id&&!d.sent_at&&!row.sent_at&&!yes(row.sent)&&!d.history_contact_at&&!d.history_reply_at&&!d.last_reply_at&&!d.last_contact_at&&!d.reply_status&&!row.reply_status&&!d.approved_hash&&!row.approved_hash&&!row.reviewed_hash&&!d.approved_at&&!d.approved_message&&!d.claimed_at&&!row.claim_at&&!row.claim_execution&&!d.cloud_manual_sends?.length&&!d.cloud_audit?.length&&!row.action&&!row.reviewer&&!row.review_note&&!row.compliance_basis&&row.subject===(d.subject||'')&&row.draft_body===(d.draft_body||'')&&!['DO_NOT_CONTACT','SUPPRESSED'].includes(row.suppression_status);
}
function pendingKeys(inbox=[],links=[]){return new Set(links.filter(l=>{const r=inbox.find(x=>x.id===l.inbox_id);if(!r)return true;try{const baseline=JSON.parse(l.snapshot);return text(r.action)&&r.action!=='NONE'||['subject','draft','compliance','notes'].some(k=>(r[k]||'')!==(baseline[k]||''));}catch{return true;}}).map(l=>l.queue_key));}
function needs(row,d,source,now=new Date().toISOString()){const mapped=source&&copy.structured(source,d.channel,now);const newDomainGap=mapped?.domain_gap&&mapped.verified_structural_gap!==d.copy_evidence?.verified_structural_gap;return !!newDomainGap||!text(d.draft_body).trim()||d.channel==='EMAIL'&&!text(d.subject).trim()||copy.leakage(d.subject,d.draft_body,copy.list(d.evidence_summary),d.copy_evidence||{}).length>0||d.copy_model===copy.MODEL&&d.copy_version!==copy.VERSION||source&&d.cloud_source_snapshot_hash!==q.sourceHash(source);}
function retainCopy(d){const history=copy.list(d.copy_history);if(d.draft_body&&!history.some(x=>x.message_hash===d.message_hash&&x.draft_body===d.draft_body))history.push({subject:d.subject,draft_body:d.draft_body,message_hash:d.message_hash,copy_status:d.copy_status,copy_checked_at:d.copy_checked_at,copy_version:d.copy_version,copy_evidence:d.copy_evidence,evidence_summary:d.evidence_summary,source_snapshot_hash:d.cloud_source_snapshot_hash||d.source_snapshot_hash});if(JSON.stringify(history).length>200000)throw Error('COPY_HISTORY_CAPACITY_REQUIRES_ARCHIVE');return history;}
function plan(research,queue,locks,options,now=new Date().toISOString(),inbox=[],links=[]){
 const c=q.config(options),existing=q.unpack(queue),idx=q.indexes(queue,locks,research,now),pending=pendingKeys(inbox,links),jobs=[],reserved=new Set(),summary={records_inspected:0,protected:0,unchanged:0,needs_research:0,needs_copy:0,selected:0,raw_leakage:0,evidence_dump_leakage:0,emails_sent:0,dms_sent:0,source_writes:0,zoho_drafts:0,max_model_calls:0};
 function quarantine(source,prior,issue){
  if(jobs.length>=c.cap)return;const diagnostics=require('./research-diagnostics').diagnose(source,now,prior?.d||{}),state=diagnostics.evidence_eligible?'NEEDS_COPY':'NEEDS_RESEARCH';if(!prior&&!diagnostics.evidence_eligible)return;
  const route=diagnostics.route,original=prior?.d||{...require('./phase2-draft-metadata').metadata(source,now,c.campaign),...require('./outreach-mvp').draftIdentity(source,route,c.campaign),channel:route.channel,recipient:route.recipient,route_source:route.source,tier:diagnostics.current_effective_tier,evidence_tier:diagnostics.current_effective_tier,dataset_id:source.dataset_id};
  if(!prior){const rk=q.reservationKey(original);if(q.blocked(original,idx)||reserved.has(rk)||existing.some(x=>x.d.lead_id!==source.lead_id&&q.reservationKey(x.d)===rk)){summary.protected++;return;}reserved.add(rk);}
  const d={...original,copy_history:retainCopy(original),research_diagnostics:diagnostics,evidence_summary:JSON.stringify(require('./research-history').allFacts(source)),subject:'',draft_body:'',message_hash:'',draft_status:state,routing:state==='NEEDS_COPY'?'NEEDS_COPY':'NEEDS_MANUAL_RESEARCH',copy_status:'PENDING',copy_version:copy.VERSION,copy_model:copy.MODEL,copy_evidence:null,cloud_source_snapshot_hash:q.sourceHash(source)};jobs.push({d,evidence:null,previous:prior?.row||null,raw:[],copy_output:null,correction_codes:diagnostics.evidence_eligible?[issue]:diagnostics.missing_or_stale,attempt:0,needs_llm:false});summary.selected++;if(state==='NEEDS_COPY')summary.needs_copy++;
 }
 for(const source of research){
  if(c.mode==='VALIDATION'&&!c.allowed_lead_ids.includes(source.lead_id))continue;summary.records_inspected++;
  const prior=existing.find(x=>x.d.lead_id===source.lead_id&&(x.d.campaign===c.campaign&&x.d.step==='initial'||x.d.provider_draft_id||['APPROVED','CLAIMED','UNKNOWN_PROVIDER_RESULT','ZOHO_DRAFT_CREATED','SENT'].includes(x.d.draft_status)));
  if(q.protection(source)||prior&&(!safe(prior.row,prior.d)||pending.has(prior.row.queue_key))){summary.protected++;continue;}
  if(prior&&!needs(prior.row,prior.d,source,now)){summary.unchanged++;continue;}
  if(prior?.d.copy_status==='FAILED'&&prior.d.copy_version===copy.VERSION&&prior.d.cloud_source_snapshot_hash===q.sourceHash(source)){summary[prior.d.draft_status==='NEEDS_COPY'?'needs_copy':'needs_research']++;continue;}
  const diagnostics=require('./research-diagnostics').diagnose(source,now,prior?.d||{});
  if(!diagnostics.evidence_eligible){quarantine(source,prior,'QUALIFIED_EVIDENCE_REQUIRED');summary.needs_research++;continue;}
  const d=q.prepareDraft(source,now,c.campaign,prior?.d);
  if(!d){quarantine(source,prior,'CLEAN_EVIDENCE_OR_ROUTE_REQUIRED');summary.needs_research++;continue;}
  if(prior&&prior.d.channel!=='NO_ROUTE'&&(prior.d.channel!==d.channel||q.routeKey(prior.d.channel,prior.d.recipient)!==q.routeKey(d.channel,d.recipient))){summary.protected++;continue;}
  if(q.blocked(d,idx)||['DO_NOT_EMAIL','DO_NOT_CONTACT'].includes(d.compliance_status)){summary.protected++;continue;}
  const rk=q.reservationKey(d);if(reserved.has(rk)||existing.some(x=>x.d.lead_id!==d.lead_id&&q.reservationKey(x.d)===rk)){summary.protected++;continue;}
  if(jobs.length>=c.cap)continue;
  if(prior){d.created_at=prior.d.created_at;d.draft_key=prior.d.draft_key;d.lead_step_key=prior.d.lead_step_key;d.recipient_key=prior.d.recipient_key;const leaks=copy.leakage(prior.d.subject,prior.d.draft_body,copy.list(prior.d.evidence_summary));if(leaks.some(x=>/LEAK|EXCERPT/.test(x)))summary.raw_leakage++;if(/##|\*\*|opening hours|\|[^\n]*\||out of 5/i.test(copy.core(prior.d.draft_body)))summary.evidence_dump_leakage++;}
  d.subject='';d.draft_body='';d.message_hash='';d.draft_status='NEEDS_RESEARCH';d.routing='NEEDS_MANUAL_RESEARCH';d.cloud_source_snapshot_hash=q.sourceHash(source);
  d.copy_history=prior?retainCopy(prior.d):[];d.research_diagnostics=diagnostics;
  d.copy_status='PENDING';d.copy_version=copy.VERSION;d.copy_model=copy.MODEL;d.copy_attempts=0;
  reserved.add(rk);jobs.push({d,evidence:d.copy_evidence,previous:prior?.row||null,raw:copy.list(source.evidence_json).concat(copy.list(source.activity_evidence)),correction_codes:[],model_input:copy.prompt(d.copy_evidence),needs_llm:false,needs_draft:true});summary.selected++;
 }
 // A different opener or name is not a distinct hook. Hold interchangeable
 // candidates before writing, including collisions with already-saved v5 copy.
 const peers=existing.map(x=>x.d).filter(d=>d.copy_version===copy.VERSION&&d.copy_status==='VALID'&&d.copy_evidence?.business_hook);
 for(const job of jobs){if(!job.evidence?.business_hook)continue;const hook=job.evidence.business_hook.signature;
  const collision=jobs.some(other=>other!==job&&other.d.lead_id!==job.d.lead_id&&other.evidence?.business_hook?.signature===hook)||peers.some(d=>d.lead_id!==job.d.lead_id&&d.copy_evidence.business_hook.signature===hook);
  if(collision){job.needs_draft=false;job.copy_output=null;job.correction_codes=['DISTINCT_BUSINESS_HOOK_REQUIRED'];job.attempt=0;summary.needs_copy++;}
 }
 summary.max_model_calls=jobs.filter(j=>j.needs_llm).length*2;return {summary,jobs};
}
function validateResult(job,response,attempt){
 let output,result;try{output=copy.parseResponse(response);result=copy.validate(output,job.evidence,job.raw);}catch(e){result={valid:false,issues:[e.message]};}
 const usage=response.usage||{},previousUsage=job.usage||{input_tokens:0,output_tokens:0};
 const next={...job,copy_output:result.valid?output:null,correction_codes:result.issues,attempt,needs_retry:!result.valid&&attempt===1&&!response.error,usage:{input_tokens:previousUsage.input_tokens+Number(usage.input_tokens||usage.prompt_tokens||0),output_tokens:previousUsage.output_tokens+Number(usage.output_tokens||usage.completion_tokens||0)}};
 next.model_input=copy.prompt(job.evidence,result.issues);return next;
}
function finish(job,now=new Date().toISOString()){
 const d={...job.d},o=job.copy_output;
 d.copy_attempts=job.attempt||0;d.copy_usage=job.usage;d.copy_checked_at=now;d.copy_issues=job.correction_codes||[];
 if(o){const result=copy.validate(o,job.evidence,job.raw);if(!result.valid)throw new Error('FINAL_COPY_VALIDATION_CHANGED');d.subject=d.channel==='EMAIL'?o.subject:'';d.draft_core=o.draft;d.draft_body=d.channel==='EMAIL'?copy.finalEmail(o.draft):o.draft;d.suggested_compliance_basis=job.evidence.suggested_compliance_basis||'';d.copy_output={observation_used:o.observation_used,opportunity_used:o.opportunity_used,claims_used:o.claims_used};d.copy_status='VALID';d.draft_status=require('./phase2-eligibility').state(d.send_blockers||[]);d.routing='READY_FOR_DRAFT';d.message_hash=sha256(JSON.stringify([d.channel,d.recipient,d.subject,d.draft_body]));copy.gate(d);}
 else{d.subject='';d.draft_core='';d.draft_body='';d.message_hash='';d.copy_status='FAILED';const researchBlocked=d.research_diagnostics&&!d.research_diagnostics.evidence_eligible;d.draft_status=researchBlocked?'NEEDS_RESEARCH':'NEEDS_COPY';d.routing=researchBlocked?'NEEDS_MANUAL_RESEARCH':'NEEDS_COPY';d.route_reason=researchBlocked?d.research_diagnostics.missing_or_stale.join('|'):'OUTBOUND_COPY_FAILED';}
 d.why_this_lead=d.research_diagnostics?require('./research-diagnostics').summary(d.research_diagnostics):copy.why(job.evidence);
 return {...q.pack(d),previous:job.previous,cas_payload:job.previous?.payload||'',copy_result:{business_name:d.business_name,state:d.draft_status,attempts:d.copy_attempts,issues:d.copy_issues,usage:d.copy_usage}};
}
function composeJob(job){
 if(!job.needs_draft)return {...job,usage:{input_tokens:0,output_tokens:0}};
 let next=job;
 for(let attempt=1;attempt<=2;attempt++){
  const output=copy.compose(job.evidence,attempt-1);
  if(!output)return {...job,attempt:0,copy_output:null,correction_codes:['REVIEWED_JOURNEY_REQUIRED'],needs_retry:false,usage:{input_tokens:0,output_tokens:0}};
  next=validateResult({...next,needs_llm:false},output,attempt);
  if(next.copy_output||!next.needs_retry)break;
 }
 return next;
}
module.exports={safe,pendingKeys,needs,plan,validateResult,composeJob,finish};
