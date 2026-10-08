'use strict';
// Read-only Cloud harness. It uses only the eight existing synthetic identities.
// Proposed engine results and deliberately invalid inputs are never persisted.
const q=require('./phase2-cloud-queue'),review=require('./phase2-cloud-review'),copy=require('./phase2-copy-drafting'),e=require('./phase2-operator-evidence'),operator=require('./phase2-operator-lifecycle'),inbox=require('./phase2-inbox'),{sha256}=require('./helpers');
function run(research,queue,locks,rows,links,now){
 const original=JSON.stringify({research,queue,locks,rows,links}),checks=[];
 const check=(condition,name)=>{if(!condition)throw Error('STAGE1_CONTRACT_FAILED:'+name);checks.push(name);};
 check(research.length===8&&queue.length===8&&rows.length===8&&links.length===8&&locks.length===2,'exact_bounded_synthetic_universe');
 const ids=new Set(research.map(x=>x.lead_id));check(queue.every(x=>ids.has(x.lead_id)),'only_existing_eight_identities');
 const owned=queue.filter(x=>JSON.parse(x.payload).operator_workspace),protectedRows=queue.filter(x=>{const d=JSON.parse(x.payload);return d.provider_status||d.provider_draft_id||d.sent_at||d.history_contact_at||d.draft_status==='DO_NOT_CONTACT';}),forbidden=new Set([...owned,...protectedRows].map(x=>x.queue_key));
 const draft=q.plan(research,queue,locks,{mode:'PRODUCTION',cap:25},now);
 check(draft.writes.every(x=>!forbidden.has(x.queue_key)),'draft_intake_preserves_operator_and_protected_work');
 const planned=copy.plan(research,queue,locks,{mode:'PRODUCTION',cap:25},now,rows,links);
 check(planned.jobs.every(x=>!forbidden.has(x.d.lead_step_key)),'grounded_copy_preserves_operator_and_protected_work');
 const generated=planned.jobs.map(x=>copy.finish(copy.composeJob(x)));
 check(generated.every(x=>ids.has(x.lead_id)&&!x.sent&&!x.provider_draft_id),'grounded_copy_results_remain_unsent_and_isolated');
 check(planned.summary.max_model_calls===0,'grounded_copy_zero_paid_calls');
 const reviewed=review.process(research,queue,locks,{mode:'PRODUCTION',cap:'ALL'},now);
 check(reviewed.writes.length===0,'review_rerun_has_no_implicit_commands');
 const suppressed=queue.find(x=>JSON.parse(x.payload).draft_status==='DO_NOT_CONTACT');
 const rejected=review.process(research,[{...suppressed,action:'EDIT',review_status:'NEEDS_EDIT'}],locks,{mode:'PRODUCTION',cap:'ALL'},now);
 check(rejected.writes.length===0&&rejected.errors[0]?.error==='PERMANENT_SUPPRESSION','review_cannot_remove_suppression');
 check(review.claim(research,queue,locks,{mode:'PRODUCTION',cap:25},'read-only-fixture',{connected_account_id:'ca_stage1_mock',account_id:'123'},now).length===0,'handoff_rerun_without_request_has_no_claim');
 const projections=inbox.sync(queue,rows,links,{mode:'PRODUCTION',cap:'ALL'},[],now);
 check(projections.writes.length===0,'settled_inbox_rerun_needs_no_write');
 const source=research[0],base={type:'identity',source_url:'https://example.org/stage1',observed_at:now,fact_date:now,excerpt:'Synthetic identified business and branch match.',association_basis:'Synthetic business identity and branch match the fixture.',verified:true};
 for(const [name,changes]of [['unchecked',{verified:false}],['private_source',{source_url:'https://127.0.0.1/private'}],['future',{observed_at:new Date(Date.parse(now)+86400000).toISOString()}],['stale',{observed_at:new Date(Date.parse(now)-91*86400000).toISOString(),fact_date:new Date(Date.parse(now)-91*86400000).toISOString()}],['http_activity',{type:'activity',excerpt:'HTTP 200 alone is the recorded activity.'}],['invented_route',{type:'contact',channel:'EMAIL',recipient:'test@example.org',excerpt:'The exact contact has not been recorded.'}],['unverified_customer_proof',{type:'proof',excerpt:'Customer reviews are unavailable.'}]]){
  let failed=false;try{e.validate({...base,...changes},source,'Synthetic Reviewer',now);}catch{failed=true;}check(failed,'invalid_evidence_'+name);
 }
 const au=research.find(x=>x.dataset_id==='AUSTRALIA');let auRejected=false;try{e.validate({...base,type:'permission',channel:'EMAIL',recipient:'s3@example.org',value:'NOT_APPLICABLE_REVIEWED',excerpt:'Public email alone is the contact permission basis.'},au,'Synthetic Reviewer',now);}catch{auRejected=true;}check(auRejected,'australian_public_email_is_not_permission');
 const wording=require('./validate-operator-wording').run(queue[0].lead_id).map(({id,policy,copy_eligible,approval_allowed,saved_working_copy,issues})=>({id,policy,copy_eligible,approval_allowed,saved_working_copy,issues}));
 for(const result of wording)check(result.saved_working_copy&&result.copy_eligible===(result.policy==='ALLOW')&&result.approval_allowed===(result.policy==='ALLOW'),'wording_'+result.id);
 for(const row of protectedRows){const d=JSON.parse(row.payload);check(!!operator.protectedReason(research.find(x=>x.lead_id===row.lead_id),d,queue,locks,now),'protection_'+row.id);}
 check(JSON.stringify({research,queue,locks,rows,links})===original,'all_input_records_and_history_byte_identical');
 return {synthetic_only:true,read_only:true,checks,checks_passed:checks.length,input_sha256:sha256(original),draft:draft.summary,grounded_copy:planned.summary,copy_proposals:generated.map(x=>({lead_id:x.lead_id,state:x.state})),review:reviewed.summary,wording,provider_calls:0,paid_calls:0,row_mutations:0,source_writes:0,emails_sent:0,dms_sent:0};
}
module.exports={run};
