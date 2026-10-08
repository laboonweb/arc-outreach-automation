'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {buildDraft,facts,selectChannel,SIGNATURE,approvalGate}=require('../scripts/outreach-mvp');
const {routingPass}=require('../scripts/operational-routing');
const now='2026-10-05T02:00:00Z';
function fact(type,excerpt,source_url='https://example.org/contact'){return {type,excerpt,source_url,observed_at:now,fact_date:now,verification:'HUMAN_REVIEWED_INPUT'};}
function lead(extra={}){return {lead_id:'fixture-opportunity',dataset_id:'MANILA_AUDIT_QUEUE',business_name:'Fixture Workshop',country:'Philippines',timezone:'Asia/Manila',arc_status:'NEEDS_RESEARCH',research_required:true,pain_verified:false,commercial_quality:'LOW',public_email:'fixture@example.org',email_confidence:'HIGH',email_source_url:'https://example.org/contact',evidence_json:JSON.stringify([fact('legitimacy','Business name and locality match the published contact page.'),fact('activity','The business published a completed repair project on October 1, 2026.'),fact('contact','Business enquiries: fixture@example.org'),fact('structural_opportunity','Current service information is spread across the reviewed business profiles.','https://facebook.com/fixtureworkshop/')]),...extra};}
test('verified opportunity becomes Tier B without a pain point, owner, trigger, HIGH quality or email-only rule',()=>{
 const d=buildDraft(lead(),now);assert.equal(d.evidence_tier,'TIER_B_VERIFIED_OPPORTUNITY');assert.equal(d.draft_status,'DRAFT_READY');assert.ok(d.draft_body.includes('one owned destination'));assert.ok(d.draft_body.includes('I already have a specific website concept in mind for this.'));assert.equal(d.draft_body.split(SIGNATURE).length,2);assert.ok(!/lost revenue|confus|lower conversion|broken|harder|prototype/i.test(d.draft_body));
 assert.equal(routingPass([lead()],{},now).records[0].routing,'READY_FOR_DRAFT_TIER_B');
});
test('Tier B verified social route works with no email; report retains no cold copy outside email ready',()=>{
 const r=lead({public_email:'',facebook_url:'https://facebook.com/profile.php?id=111',facebook_status:'USABLE'});const fs=JSON.parse(r.evidence_json);fs.push(fact('facebook','This business accepts public enquiry messages.','https://m.facebook.com/profile.php?id=111&ref=bookmarks'));r.evidence_json=JSON.stringify(fs);
 const out=routingPass([r],{},now);assert.equal(out.records[0].routing,'MANUAL_SOCIAL_TIER_B');assert.equal(out.records[0].draft_body,'');assert.equal(out.summary.channels.MANUAL_SOCIAL_TIER_B.FACEBOOK,1);
});
test('a different Facebook profile ID cannot authorize the contact route',()=>{
 const r=lead({public_email:'',facebook_url:'https://facebook.com/profile.php?id=111',facebook_status:'USABLE'});r.evidence_json=JSON.stringify([...JSON.parse(r.evidence_json),fact('facebook','Business messages accepted.','https://facebook.com/profile.php?id=1112')]);assert.equal(selectChannel(r,now).channel,'NO_ROUTE');
});
test('verified gap remains Tier A even when the previous pain aggregate was false',()=>{
 const r=lead();r.evidence_json=JSON.stringify([...JSON.parse(r.evidence_json),fact('gap','The published contact form does not provide a submit control.')]);const d=buildDraft(r,now);assert.equal(d.evidence_tier,'TIER_A_VERIFIED_GAP');assert.ok(d.draft_body.includes('submit control'));assert.ok(d.draft_body.includes('may make it harder'));
});
test('identity, activity and usable route are required; HTTP or registration alone cannot substitute',()=>{
 for(const type of ['legitimacy','activity','contact']){const r=lead();r.evidence_json=JSON.stringify(JSON.parse(r.evidence_json).filter(f=>f.type!==type));const d=buildDraft(r,now);assert.equal(d.evidence_tier,'TIER_C_NEEDS_RESEARCH');assert.equal(d.draft_body,'');}
 for(const kind of ['HTTP_ONLY','DIRECTORY_ONLY','REGISTRATION_ONLY'])assert.equal(buildDraft(lead({activity_signal_type:kind}),now).evidence_tier,'TIER_C_NEEDS_RESEARCH');
 assert.equal(buildDraft(lead({activity_operating_since:'2026-12-01'}),now).evidence_tier,'TIER_C_NEEDS_RESEARCH');
});
test('missing website is not automatic LOW or permission to claim absence; verified public presence supports a bounded proposal',()=>{
 const r=lead({public_email:'',instagram_url:'https://instagram.com/fixtureworkshop/',instagram_status:'USABLE'});r.evidence_json=JSON.stringify(JSON.parse(r.evidence_json).filter(f=>f.type!=='structural_opportunity').concat(fact('instagram','The official public profile accepts business enquiries.','https://instagram.com/fixtureworkshop/')));const d=buildDraft(r,now);assert.equal(d.evidence_tier,'TIER_B_VERIFIED_OPPORTUNITY');assert.ok(!/no website|do not have|does not have/i.test(d.draft_body));
 const plain=lead();plain.evidence_json=JSON.stringify(JSON.parse(plain.evidence_json).filter(f=>f.type!=='structural_opportunity'));assert.equal(buildDraft(plain,now).evidence_tier,'TIER_C_NEEDS_RESEARCH');
});
test('namesake and branch conflicts remain research cases even with attractive opportunity evidence',()=>{
 for(const extra of [{identity_status_reviewed:'MISMATCHED'},{critical_uncertainties_json:'["BRANCH_MISMATCH"]'}])assert.equal(buildDraft(lead(extra),now).evidence_tier,'TIER_C_NEEDS_RESEARCH');
 const r=lead();r.evidence_json=JSON.stringify([...JSON.parse(r.evidence_json),{...fact('legitimacy','Resolve entity/registration conflict before outreach.'),verification:'NEEDS_HUMAN_REVIEW'}]);assert.equal(buildDraft(r,now).evidence_tier,'TIER_C_NEEDS_RESEARCH');
 const branch=lead();branch.evidence_json=JSON.stringify(JSON.parse(branch.evidence_json).map(f=>f.type==='legitimacy'?{...f,excerpt:'Company name matches, but the listed address and phone differ. Review branch/address drift.'}:f));assert.equal(buildDraft(branch,now).evidence_tier,'TIER_C_NEEDS_RESEARCH');
});
test('AU compliance remains separate from opportunity quality and requires approval review',()=>{
 const d=buildDraft(lead({country:'Australia',compliance_status:'QUESTIONABLE'}),now);assert.equal(d.evidence_tier,'TIER_B_VERIFIED_OPPORTUNITY');assert.equal(d.draft_status,'DRAFT_READY');assert.equal(approvalGate(d,{reviewer:'Fixture reviewer',truthful:true,recipient_relevant:true,consent_reviewed:true,suppression_checked:true,compliance_basis:'Fixture only'}),'AU_COMPLIANCE_UNRESOLVED');
});
test('prior history and suppression override both tiers without changing inputs',()=>{
 for(const state of ['SENT','REPLIED','DISQUALIFIED','PARKED','DO_NOT_CONTACT']){const r=lead({arc_status:state}),before=JSON.stringify(r);assert.equal(routingPass([r],{},now).records[0].draft_body,'');assert.equal(JSON.stringify(r),before);}
 assert.equal(routingPass([lead({dataset_id:'MANILA_LEGACY'})],{},now).records[0].routing,'ALREADY_CONTACTED');
});
