'use strict';
// Synthetic local-only records. Provider receipts below are test responses.
const q=require('./phase2-cloud-queue'),r=require('./phase2-cloud-review'),{sha256}=require('./helpers');
function seed(now=new Date().toISOString()){
 const research=[],queue=[],connection={connected_account_id:'ca_fixture',account_id:'123'};
 for(const [index,name]of ['Manual Research Fixture','Manual Copy Fixture','Email Review Fixture','Social Review Fixture','Provider Draft Fixture','Sent Follow-up Fixture','Suppressed Fixture'].entries()){
  const social=index===3,url='https://www.facebook.com/arc-operator-fixture-'+index;
  const source={lead_id:'arc_'+sha256('operator-fixture-'+index),dataset_id:'MANILA_AUDIT_QUEUE',business_name:name,country:'Philippines',timezone:'Asia/Manila',tier:index===0?'TIER_C_NEEDS_RESEARCH':'TIER_B_VERIFIED_OPPORTUNITY',qualification_checked_at:now,arc_status:'NEEDS_RESEARCH',compliance_status:'NOT_APPLICABLE',public_email:social?'':'fixture-'+index+'@example.org',email_source_url:url,email_confidence:'HIGH',facebook_url:url,facebook_status:'USABLE',evidence_json:JSON.stringify(index===0?[]:['identity','activity','opportunity','contact','facebook','service'].map(type=>({type,source_url:url,observed_at:now,fact_date:now,verification:'DISCOVERY_VERIFIED',excerpt:type==='contact'?'Published fixture-'+index+'@example.org business contact.':type==='service'?'Pool maintenance services are available.':type==='facebook'?url:'Synthetic pool maintenance '+type+' observation.'})))};
  let d=q.prepareDraft(source,now)||require('./phase2-draft-metadata').metadata(source,now,q.CAMPAIGN);d.dataset_id=source.dataset_id;d.cloud_source_snapshot_hash=q.sourceHash(source);
  if(index===1){d.draft_status='NEEDS_COPY';d.subject='';d.draft_body='';}
  if(index===0){d.draft_body='';d.subject='';}
  let row=q.pack(d);
  if(index===4||index===5){row=r.process([source],[{...row,review_status:'APPROVED',reviewer:'Synthetic operator',truthful:true,recipient_relevant:true,consent_reviewed:true,suppression_checked:true,compliance_basis:'Synthetic permission record only.'}],[],{mode:'PRODUCTION',cap:'ALL'},now).writes[0];const claim=r.claim([source],[row],[],{mode:'VALIDATION',cap:5,allowed_lead_ids:[source.lead_id]},'fixture',connection,now)[0],request=r.request(claim,connection,'fixture',now);row=r.receipt(claim,request,{successful:true,data:{messageId:'synthetic-provider-'+index}},now);if(index===5){const sentAt=new Date(Date.parse(now)-12*86400000).toISOString();row=r.process([source],[{...row,action:'MARK_SENT',manual_send_confirmation:true,reviewer:'Synthetic operator',sent_message:row.draft_body}],[],{mode:'PRODUCTION',cap:'ALL'},sentAt).writes[0];}}
  if(index===6){d=JSON.parse(row.payload);d.draft_status='DO_NOT_CONTACT';d.review_status='REJECTED';row=q.pack(d);}
  research.push(source);queue.push(row);
 }
 return {synthetic_only:true,research,queue,locks:[]};
}
module.exports={seed};
