'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {assessQualification,recalibrateResult}=require('../scripts/qualification');
const {classifyActivity}=require('../scripts/activity-classifier');
const now='2026-10-04T10:00:00Z';
const fact=(p,date='2026-10-01')=>({[p+'_verified']:true,[p+'_source_url']:'https://synthetic.example.org/',[p+'_date']:date,[p+'_evidence']:'Synthetic source-backed factual observation.'});
const core={activity_status:'ACTIVE',...fact('activity'),...fact('legitimacy'),...fact('gap'),gap_unresolved_verified:true,...fact('business_case')};
const output={country:'Philippines',public_email:'hello@synthetic.example.org',email_source_url:'https://synthetic.example.org/',email_source_type:'OFFICIAL_WEBSITE',email_confidence:'MEDIUM',timezone:'Asia/Manila',acma_status:'NOT_APPLICABLE',checked_at:now};
test('strong commercial case without owner/trigger/email remains HIGH while profile-only readiness PARKs',()=>{
 const r=assessQualification({...output,public_email:'',instagram_url:'https://instagram.com/synthetic'},core,now);
 assert.equal(r.commercial_quality,'HIGH');assert.equal(r.contactability,'WEAK');assert.equal(r.contact_route_type,'SOCIAL_PROFILE_ONLY');assert.equal(r.outreach_readiness,'PARK');assert.equal(r.research_required,false);
 const enriched=assessQualification({...output,public_email:'',instagram_url:'https://instagram.com/synthetic'},{...core,...fact('buying_trigger'),...fact('decision_maker')},now);
 assert.equal(enriched.confidence_score,r.confidence_score+10);assert.equal(enriched.research_required,false);
});
test('AU consent, delivery tests, timezone and historical state do not create critical commercial uncertainty',()=>{
 const r=assessQualification({...output,country:'Australia',acma_status:'QUESTIONABLE'},core,now);
 assert.equal(r.commercial_quality,'HIGH');assert.equal(r.contactability,'STRONG');assert.equal(r.compliance_status,'QUESTIONABLE');assert.equal(r.outreach_readiness,'NEEDS_COMPLIANCE_REVIEW');assert.equal(r.research_required,false);
 const legacy=assessQualification(output,{...core,arc_status:'SENT',initial_contact_recorded:true},now);
 assert.equal(legacy.commercial_quality,'HIGH');assert.equal(legacy.research_required,false);assert.equal(legacy.outreach_readiness,'BLOCKED');
 const duplicate=assessQualification({...output,duplicate_review_required:true,initial_outreach_blocked:true},{...core,duplicate_review_required:false,initial_outreach_blocked:false},now);
 assert.equal(duplicate.outreach_readiness,'BLOCKED');assert.equal(duplicate.research_required,false);
 const tz=assessQualification({...output,timezone:''},core,now);assert.equal(tz.research_required,false);assert.equal(tz.outreach_readiness,'NEEDS_RESEARCH');
});
test('HTTP errors and suppression block readiness without erasing established commercial quality',()=>{
 const r=assessQualification({...output,errors_json:'[{"code":"403"}]',suppression_status:'DO_NOT_CONTACT'},core,now);
 assert.equal(r.commercial_quality,'HIGH');assert.equal(r.outreach_readiness,'BLOCKED');assert.equal(r.research_required,false);
});
test('older activity is usable only with corroboration; directories/registrations/HTTP alone never establish activity',()=>{
 const six=classifyActivity({...core,activity_date:'2026-05-01'},now);assert.equal(six.status,'ACTIVE');assert.equal(six.strength,'STRONG');
 const older={...core,activity_date:'2025-12-01',activity_corroborated:true};assert.equal(classifyActivity(older,now).strength,'USABLE');assert.equal(classifyActivity({...older,activity_corroborated:false},now).status,'UNCERTAIN');
 for(const kind of ['DIRECTORY_ONLY','REGISTRATION_ONLY','HTTP_ONLY'])assert.equal(classifyActivity({...core,activity_signal_type:kind},now).status,'UNCERTAIN');
 assert.equal(classifyActivity({...core,activity_date:'2025-01-01'},now).status,'UNCERTAIN');
});
test('published launch and advertised WhatsApp support potential without pretending the gap is verified',()=>{
 const row={...core,gap_unresolved_verified:false,activity_status:'LIKELY_ACTIVE',activity_signal_type:'ANNOUNCED_OPENING',activity_operating_since:'2026-09-01',...fact('activity','2026-08-19'),...fact('whatsapp')};
 const r=assessQualification({...output,public_email:'',whatsapp_status:'USABLE'},row,now);
 assert.equal(r.commercial_quality,'MEDIUM');assert.equal(r.contactability,'USABLE');assert.match(r.commercial_basis,/PROVISIONAL/);assert.equal(r.research_required,true);assert.match(r.critical_uncertainties_json,/GAP_UNVERIFIED/);
 assert.equal(classifyActivity({...row,activity_operating_since:'2026-11-01'},now).status,'UNCERTAIN');
});
test('expired residency, wrong identity, missing URL and cached 403 never become fabricated gaps',()=>{
 const expired=classifyActivity({...core,activity_valid_until:'2026-09-27'},now);assert.equal(expired.status,'UNCERTAIN');
 const wrong=assessQualification(output,{...core,identity_status_reviewed:'MISMATCHED'},now);assert.equal(wrong.commercial_quality,'LOW');assert.equal(wrong.research_required,true);
 const wrongSite=assessQualification(output,{...core,identity_status_reviewed:'MISMATCHED',...fact('website_quality'),website_quality_reviewed:'STRONG_SITE',strong_site_solves_gap_verified:true},now);assert.equal(wrongSite.commercial_quality,'LOW');assert.match(wrongSite.critical_uncertainties_json,/IDENTITY_UNRESOLVED/);
 const noGap=assessQualification({...output,website_url:'',website_http_code:403},{...core,gap_unresolved_verified:false},now);assert.equal(noGap.commercial_quality,'MEDIUM');assert.match(noGap.critical_uncertainties_json,/GAP_UNVERIFIED/);
});
test('resolved original gap is DISQUALIFY with useful assessment despite missing optional information',()=>{
 const r=assessQualification(output,{...fact('website_quality'),website_quality_reviewed:'STRONG_SITE',strong_site_solves_gap_verified:true},now);
 assert.equal(r.commercial_quality,'DISQUALIFY');assert.equal(r.research_required,false);assert.equal(r.outreach_readiness,'BLOCKED');
});
test('re-scoring preserves source observation times and every protected/history/control field',()=>{
 for(const arc_status of ['SENT','PARKED','DISQUALIFIED','REPLIED','DO_NOT_CONTACT']){
  const prior={...output,arc_status,first_contact_at:'2026-09-20',first_contact_channel:'FB',followup_count:'2',reply_status:'No reply',legacy_snapshot_json:'[]',checked_at:'2026-10-03',last_researched_at:'2026-10-03',manual_reset_reason:'Keep review',evidence_json:'[]',research_notes:'Prior evidence.'};
  const r=recalibrateResult(prior,{...core,arc_status},now);
  for(const key of ['arc_status','first_contact_at','first_contact_channel','followup_count','reply_status','legacy_snapshot_json','checked_at','last_researched_at','manual_reset_reason','evidence_json'])assert.equal(r[key],prior[key]);
 }
});
test('post URLs, generic social URLs and invalid telephone identifiers are not usable routes',()=>{
 const r=assessQualification({...output,public_email:'',instagram_url:'https://instagram.com/p/abc/',facebook_url:'https://facebook.com/',phone:'1234567890123456789'},core,now);
 assert.equal(r.contactability,'NONE');assert.equal(r.outreach_readiness,'PARK');assert.equal(r.commercial_quality,'HIGH');
});
test('recalibration transport uses existing evidence only and rejects a different record',async()=>{
 const {runResearch}=require('../scripts/research-engine'),prior={...output,lead_id:'arc_'+'a'.repeat(64),dataset_id:'SYNTHETIC',source_spreadsheet_id:'synthetic_workbook',country:'Philippines',research_notes:'Prior research.',evidence_json:'[]',arc_status:'SENT'};
 const lead={...core,business_name:'Synthetic',country:'Philippines',city:'Manila',lead_id:prior.lead_id,dataset_id:prior.dataset_id,source_spreadsheet_id:prior.source_spreadsheet_id,website_url:'https://synthetic.example.org',arc_status:'SENT',previous_result:prior};
 let calls=0;const result=await runResearch(lead,{rescore_existing:true},()=>{calls++;throw Error('Forbidden external call');},now);
 assert.equal(calls,0);assert.equal(result.arc_status,'SENT');assert.equal(result.commercial_quality,'HIGH');
 await assert.rejects(()=>runResearch({...lead,previous_result:{...prior,lead_id:'arc_'+'b'.repeat(64)}},{rescore_existing:true},()=>{},now),/PROVENANCE_MISMATCH/);
});

test('normal research retains prior duplicate/contact locks when current matching changes',async()=>{
 const {runResearch}=require('../scripts/research-engine');
 const prior={arc_status:'NEEDS_RESEARCH',duplicate_review_required:true,initial_outreach_blocked:true,duplicate_matches_json:'[{"lead_id":"old_match"}]',duplicate_group_key:'prior_group'};
 const row={...core,business_name:'Synthetic',country:'Philippines',city:'Manila',dataset_id:'SYNTHETIC',source_spreadsheet_id:'synthetic',previous_result:prior,duplicate_review_required:false,initial_outreach_blocked:false};
 const r=await runResearch(row,{},()=>{throw Error('Unexpected request');},now);
 assert.equal(r.commercial_quality,'HIGH');assert.equal(r.outreach_readiness,'BLOCKED');assert.equal(r.research_required,false);
 assert.equal(r.duplicate_review_required,true);assert.equal(r.initial_outreach_blocked,true);assert.equal(r.duplicate_matches_json,prior.duplicate_matches_json);assert.equal(r.duplicate_group_key,prior.duplicate_group_key);assert.equal(r.arc_status,'NEEDS_RESEARCH');
});
