'use strict';
const q=require('./phase2-cloud-queue'),r=require('./phase2-cloud-review');
function run(now=new Date().toISOString()){
 const check=(value,name)=>{if(!value)throw new Error(name);};
 const source='https://www.facebook.com/arcfixture';
 const lead={lead_id:'arc_'+'a'.repeat(64),dataset_id:'MANILA_AUDIT_QUEUE',business_name:'Synthetic Arc Fixture',country:'Philippines',timezone:'Asia/Manila',tier:'TIER_B_VERIFIED_OPPORTUNITY',qualification_checked_at:now,arc_status:'NEEDS_RESEARCH',commercial_quality:'MEDIUM',public_email:'fixture@example.org',email_source_url:source,email_confidence:'HIGH',compliance_status:'NOT_APPLICABLE',evidence_json:JSON.stringify(['legitimacy','activity','opportunity','contact'].map(type=>({type,source_url:source,observed_at:now,fact_date:now,verification:'DISCOVERY_VERIFIED',excerpt:{legitimacy:'Synthetic pool maintenance business, verified name and phone.',activity:'Synthetic published business hours.',opportunity:'Synthetic verified business information on a public platform.',contact:'Synthetic published email fixture@example.org.'}[type]}))),verified_social_routes:JSON.stringify([{channel:'FACEBOOK',recipient:source,source_url:source,status:'MANUAL_SOCIAL_CANDIDATE',confidence:'HIGH',messaging_tested:false}])};
 const social={...lead,lead_id:'arc_'+'b'.repeat(64),public_email:''},controls={mode:'VALIDATION',cap:5,allowed_lead_ids:[lead.lead_id,social.lead_id]},connection={connected_account_id:'ca_fixture',account_id:'123'};
 const plan=q.plan([lead,social],[],[],controls,now);check(plan.writes.length===2,'TWO_FIXTURE_DRAFTS');
 const email=plan.writes.find(x=>x.channel==='EMAIL'),dm=plan.writes.find(x=>x.channel==='FACEBOOK');check(email.draft_html.includes('font-size: 10px')&&email.draft_html.includes('font-family: Verdana')&&email.draft_html.includes('href="https://arcwebworks.com"')&&email.draft_html.split('Briann Arcala').length===2,'FROZEN_HTML');
 check(q.plan([lead,social],plan.writes,[],controls,now).writes.length===0,'RERUN_DUPLICATE');
 check(r.claim([lead,social],plan.writes,[],controls,'fixture',connection,now).length===0,'NO_UNAPPROVED_CLAIM');
 const review={review_status:'APPROVED',reviewer:'Synthetic Fixture',truthful:true,recipient_relevant:true,consent_reviewed:true,suppression_checked:true,compliance_basis:'Synthetic only'};
 const approved=r.process([lead,social],[{...email,...review},{...dm,...review,dm_verified:true}],[],controls,now);check(!approved.errors.length&&approved.writes.find(x=>x.channel==='FACEBOOK').state==='MANUAL_SOCIAL_READY','MANUAL_SOCIAL_READY');
 const claim=r.claim([lead,social],approved.writes,[],controls,'fixture',connection,now)[0],request=r.request(claim,connection,'fixture',now);check(request.request.arguments.mode==='draft'&&request.request.arguments.mailFormat==='html','DRAFT_ONLY_REQUEST');
 const receipt=r.receipt(claim,request,{successful:true,data:{messageId:'synthetic-not-a-provider-draft',mode:'draft'}},now);check(receipt.state==='ZOHO_DRAFT_CREATED'&&receipt.sent===false&&receipt.sent_at===null&&receipt.followup_due_at===null,'DRAFT_IS_UNSENT');
 const sent=r.process([lead],[{...receipt,action:'MARK_SENT',manual_send_confirmation:true,reviewer:'Synthetic Fixture',sent_message:receipt.draft_body}],[],controls,now).writes[0];check(sent.state==='SENT'&&sent.followup_due_at,'EXPLICIT_MARK_SENT');
 const twice=r.process([lead],[{...sent,action:'MARK_SENT',manual_send_confirmation:true,reviewer:'Synthetic Fixture',sent_message:sent.draft_body}],[],controls,now).writes[0];check(JSON.parse(twice.payload).cloud_manual_sends.length===1&&twice.sent_at===sent.sent_at,'MARK_SENT_IDEMPOTENT');
 return {synthetic_only:true,checks_passed:9,email_fixtures:1,social_fixtures:1,actual_provider_calls:0,actual_sends:0,real_queue_writes:0};
}
function providerSeed(now=new Date().toISOString()){
 const source='https://www.facebook.com/arcfixture',lead={lead_id:'arc_'+'c'.repeat(64),dataset_id:'MANILA_AUDIT_QUEUE',business_name:'Synthetic Claim Fixture',country:'Philippines',timezone:'Asia/Manila',tier:'TIER_B_VERIFIED_OPPORTUNITY',qualification_checked_at:now,arc_status:'NEEDS_RESEARCH',public_email:'claim-fixture@example.org',email_source_url:source,email_confidence:'HIGH',compliance_status:'NOT_APPLICABLE',evidence_json:JSON.stringify(['legitimacy','activity','opportunity','contact'].map(type=>({type,source_url:source,observed_at:now,fact_date:now,verification:'DISCOVERY_VERIFIED',excerpt:type==='contact'?'Synthetic published claim-fixture@example.org.':'Synthetic pool maintenance '+type+' fact.'})))};
 const d=q.pack(q.prepareDraft(lead,now)),controls={mode:'VALIDATION',cap:5,allowed_lead_ids:[lead.lead_id]},review={...d,review_status:'APPROVED',reviewer:'Synthetic Fixture',truthful:true,recipient_relevant:true,consent_reviewed:true,suppression_checked:true,compliance_basis:'Synthetic only'};
 return r.process([lead],[review],[],controls,now).writes[0];
}
module.exports={run,providerSeed};
