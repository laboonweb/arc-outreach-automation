'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const probe=require('../scripts/validate-operator-wording'),q=require('../scripts/phase2-cloud-queue'),review=require('../scripts/phase2-cloud-review'),copy=require('../scripts/outreach-copy'),evidence=require('../scripts/phase2-operator-evidence'),h=require('../scripts/research-history');
const {NOW,NAME,URL}=probe,POOL='Pool service information is spread across separate posts.',PARKED='I noticed the domain tied to your business email, fixturepool.com.au, currently lands on a parked GoDaddy page.';
const proposal='I could build a website with pool service information and a simple enquiry form.';
const payload=s=>JSON.parse(s.queue[0].payload);
function add(s,type,excerpt,extra={}){return probe.act(s,'SAVE_REEVALUATE',{evidence:JSON.stringify({type,excerpt,source_url:URL,observed_at:NOW,fact_date:NOW,association_basis:'The exact synthetic business identity and branch match this source.',verified:true,...extra})});}
function write(s,{opening=POOL,statement=POOL,mechanism=proposal,cta='Worth showing you?',extra='',type='service',evidence_id,notes}={}){
 const f=payload(s).operator_workspace.evidence.find(f=>f.type===type),body=['Hi '+NAME+' team,','Briann here from Arc Web Works.',opening,mechanism,extra,cta].filter(Boolean).join('\n\n');
 const result=probe.act(s,'SAVE_REEVALUATE',{subject:NAME+': a clearer enquiry path',draft:body,copy_claims:JSON.stringify([{statement,evidence_id:evidence_id||f.observation_id}]),...(notes?{notes}:{})});
 assert.deepEqual(result.errors,[]);assert.equal(copy.core(payload(s).draft_body),body);return {result,body};
}
function allow(s){assert.equal(s.queue[0].state,'DRAFT_READY',JSON.stringify(payload(s).operator_workspace.evaluation));assert.doesNotThrow(()=>copy.gate(payload(s)));assert.deepEqual(probe.act(s,'REQUEST_REVIEW').errors,[]);assert.deepEqual(probe.act(s,'APPROVE').errors,[]);assert.equal(s.queue[0].state,'APPROVED');assert.equal(payload(s).approved_hash,payload(s).message_hash);}
function block(s,code){assert.equal(s.queue[0].state,'NEEDS_COPY');assert.ok(payload(s).operator_workspace.evaluation.copy_issues.includes(code),JSON.stringify(payload(s).operator_workspace.evaluation.copy_issues));assert.throws(()=>copy.gate(payload(s)),new RegExp(code));assert.ok(probe.act(s,'APPROVE').errors.length);assert.equal(s.queue[0].approved_hash,'');assert.equal(payload(s).operator_provider_request,undefined);}
const results=probe.run();
for(const c of probe.cases)test('wording probe policy at save and approval: '+c.id,()=>{
 const result=results.find(r=>r.id===c.id),expected=c.policy==='ALLOW';assert.equal(result.copy_eligible,expected,JSON.stringify(result));assert.equal(result.approval_allowed,expected);assert.ok(result.saved_working_copy);assert.deepEqual(result.save_errors,[]);
});

test('performance promises cannot be laundered through a proposal, saved observation or approval',()=>{
 for(const phrase of ['doubles your bookings','triple bookings','increases your sales','boosts revenue','improves conversions','generates more leads','drives traffic','attracts new customers','gives you more bookings']){
  const s=probe.fixture(POOL),original=JSON.stringify(s.research);write(s,{mechanism:'I could build a website that '+phrase+' with an enquiry form.'});block(s,'FORBIDDEN_CLAIM');assert.equal(JSON.stringify(s.research),original);
 }
 const s=probe.fixture('The new website doubles your bookings.'),f=payload(s).operator_workspace.evidence.find(f=>f.type==='service');write(s,{opening:f.excerpt,statement:f.excerpt});block(s,'FORBIDDEN_CLAIM');
});
test('customer feedback, reviews and testimonials require an actual current typed proof observation',()=>{
 for(const noun of ['customer feedback','reviews','testimonials']){
  const s=probe.fixture(POOL);write(s,{mechanism:'I could build a website with '+noun+' and a simple enquiry form.',notes:'Verified customer feedback, reviews and testimonials, checkbox reviewed.'});block(s,'UNSUPPORTED_PROOF_CONTEXT');
  assert.deepEqual(add(s,'proof','Published attributable customer feedback and reviews include a named customer testimonial.').errors,[]);write(s,{mechanism:'I could build a website with '+noun+' and a simple enquiry form.'});allow(s);
 }
});
test('untyped proof keywords, placeholder proof, stale and superseded proof cannot establish capability',()=>{
 const untyped=probe.fixture(POOL);assert.deepEqual(add(untyped,'service','Customer feedback and reviews are part of this service description.').errors,[]);write(untyped,{mechanism:'I could build a website with customer feedback and an enquiry form.'});block(untyped,'UNSUPPORTED_PROOF_CONTEXT');
 for(const excerpt of ['No customer feedback is published.','Customer feedback is unavailable.','Placeholder customer testimonials are displayed.','Customer reviews are unverified.','We may be collecting customer feedback.']){
  const s=probe.fixture(POOL),out=add(s,'proof',excerpt);assert.equal(out.errors[0].error,'OPERATOR_CUSTOMER_PROOF_REQUIRED');assert.ok(!payload(s).operator_workspace.evidence.some(f=>f.type==='proof'));write(s,{mechanism:'I could build a website with customer feedback and an enquiry form.'});block(s,'UNSUPPORTED_PROOF_CONTEXT');
 }
 for(const stale of [true,false]){
  const s=probe.fixture(POOL);assert.deepEqual(add(s,'proof','Published attributable customer feedback is available.').errors,[]);
  if(stale){const d=payload(s),f=d.operator_workspace.evidence.find(f=>f.type==='proof');f.observed_at=f.fact_date='2026-05-01T00:00:00Z';s.queue=[q.pack(d)];}
  else {const f=payload(s).operator_workspace.evidence.find(f=>f.type==='proof');assert.deepEqual(add(s,'classification_review','The previous customer proof was incorrectly associated with this branch.',{supersedes:f.observation_id}).errors,[]);}
  write(s,{mechanism:'I could build a website with customer feedback and an enquiry form.'});block(s,'UNSUPPORTED_PROOF_CONTEXT');
 }
});
test('dated automated review evidence can support proof, but cross-lead or unverified evidence cannot',()=>{
 for(const fields of [{},{lead_id:'arc_'+'b'.repeat(64)},{verification:'UNVERIFIED'}]){
  const s=probe.fixture(POOL),f={type:'review',excerpt:'Published attributable customer feedback and reviews.',source_url:URL,verification:'REVIEWED_FACT',observed_at:NOW,fact_date:NOW,...fields};s.research[0].evidence_json=JSON.stringify([f]);
  const original=JSON.stringify(s.research);write(s,{mechanism:'I could build a website with customer feedback and an enquiry form.'});if(!Object.keys(fields).length)allow(s);else block(s,'UNSUPPORTED_PROOF_CONTEXT');assert.equal(JSON.stringify(s.research),original);
 }
});
test('observation wrappers accept case and whitespace changes, but never extra factual assertions',()=>{
 for(const opening of ['I noticed pool service information is spread across separate posts.','I saw pool service information is spread across separate posts.','I noticed POOL service information is spread across separate posts.','I noticed pool service information is  spread across separate posts.']){const s=probe.fixture(POOL);write(s,{opening});allow(s);}
 for(const opening of ['I noticed pool service information is spread across separate posts and you are expanding.','I noticed pool service information is spread across separate posts. You offer plumbing.','I noticed your recent pool projects are on Facebook.']){const s=probe.fixture(POOL);write(s,{opening});block(s,'UNSUPPORTED_ASSERTION');}
 const s=probe.fixture(POOL);write(s,{evidence_id:'0'.repeat(64)});block(s,'OPERATOR_COPY_CLAIM_UNSUPPORTED');
 for(const excerpt of ['No pool service information is spread across separate posts.',"I did not notice pool service information is spread across separate posts."]){const x=probe.fixture(excerpt);write(x);block(x,'OPERATOR_COPY_CLAIM_UNSUPPORTED');}
});
test('all existing founder CTAs work without allowing completed prototypes or arbitrary factual CTA text',()=>{
 for(const cta of require('../scripts/outreach-human').CTAS){const s=probe.fixture(POOL);write(s,{cta});allow(s);}
 for(const cta of ["I've got an idea for this. You are expanding. Worth showing you?","I've already created your prototype. Worth showing you?"]){const s=probe.fixture(POOL);write(s,{cta});block(s,cta.includes('prototype')?'FORBIDDEN_CLAIM':'UNSUPPORTED_ASSERTION');}
});
test('parked business-email wording requires association, exact current host, contact and provider finding',()=>{
 const s=probe.fixture(POOL,PARKED),original=JSON.stringify(s.research);write(s,{opening:PARKED,statement:PARKED,type:'gap'});allow(s);assert.equal(JSON.stringify(s.research),original);
 const d=payload(s),association=d.operator_workspace.evidence.find(f=>f.type==='association'),gap=d.operator_workspace.evidence.find(f=>f.type==='gap');assert.equal(association.association_verified,true);assert.equal(gap.website_status,'PARKED');assert.equal(gap.parking_provider,'GoDaddy');assert.equal(gap.source_type,'OPERATOR_RECORDED');
 // The draft gate and manual provider claim recheck the same evidence; no
 // request execution or provider receipt is created by this test.
 assert.deepEqual(probe.act(s,'REQUEST_ZOHO').errors,[]);assert.equal(review.claim(s.research,s.queue,[],{mode:'PRODUCTION',cap:'ALL'},'local-wording-claim',{connected_account_id:'ca_synthetic',account_id:'123',region:'com.au'},NOW).length,1);
 for(const change of ['association','contact','website_status','parking_provider','wrong_host','stale_gap']){
  const x=probe.fixture(POOL,PARKED),draft=payload(x),facts=draft.operator_workspace.evidence;
  if(['association','contact'].includes(change))draft.operator_workspace.evidence=facts.filter(f=>f.type!==change);
  else {const f=facts.find(f=>f.type==='gap');if(change==='wrong_host'){f.source_url='https://anotherfixture.com.au/';f.domain='anotherfixture.com.au';}else if(change==='stale_gap')f.observed_at=f.fact_date='2026-05-01T00:00:00Z';else delete f[change];}
  x.queue=[q.pack(draft)];write(x,{opening:PARKED,statement:PARKED,type:'gap'});assert.ok(payload(x).operator_workspace.evaluation.copy_issues.includes(change==='stale_gap'?'OPERATOR_COPY_CLAIM_UNSUPPORTED':'BUSINESS_DOMAIN_CLAIM_NOT_VERIFIED'));assert.ok(probe.act(x,'APPROVE').errors.length);
 }
});
test('parked structured controls reject superficial, uncertain, negative and invented provider findings',()=>{
 for(const [excerpt,fields,code] of [
  ['The destination is a normal working business page.',{website_status:'PARKED'},'OPERATOR_WEBSITE_FINDING_REQUIRED'],
  ['The destination may be a parked page.',{website_status:'PARKED'},'OPERATOR_WEBSITE_FINDING_REQUIRED'],
  ['The destination is not a parked page.',{website_status:'PARKED'},'OPERATOR_WEBSITE_FINDING_REQUIRED'],
  ['The destination is a parked page.',{website_status:'PARKED',parking_provider:'GoDaddy'},'OPERATOR_PARKING_PROVIDER_REQUIRED'],
  ['The destination is a parked page, not GoDaddy.',{website_status:'PARKED',parking_provider:'GoDaddy'},'OPERATOR_PARKING_PROVIDER_REQUIRED'],
  ['The destination is a parked GoDaddy page.',{website_status:'LIVE',parking_provider:'GoDaddy'},'OPERATOR_WEBSITE_FINDING_REQUIRED']
 ]){const s=probe.fixture(POOL);const out=add(s,'gap',excerpt,{source_url:'https://fixturepool.com.au/',...fields});assert.equal(out.errors[0].error,code);assert.ok(!payload(s).operator_workspace.evidence.some(f=>f.website_status));}
 const s=probe.fixture(POOL);assert.equal(add(s,'association','This destination does not belong to the identified business.').errors[0].error,'OPERATOR_WEBSITE_ASSOCIATION_REQUIRED');assert.equal(add(s,'association','This is the identified business domain.',{association_verified:true}).errors[0].error,'OPERATOR_EVIDENCE_TYPE_REQUIRED');
 for(const code of ['OPERATOR_CUSTOMER_PROOF_REQUIRED','OPERATOR_WEBSITE_ASSOCIATION_REQUIRED','OPERATOR_WEBSITE_FINDING_REQUIRED','OPERATOR_PARKING_PROVIDER_REQUIRED']){const feedback=require('../scripts/phase2-panel').message(code);assert.ok(feedback&&!feedback.includes('existing outreach protections'),feedback);}
});
test('generic parked wording works without inventing a parking provider; unsupported provider wording stays blocked',()=>{
 const s=probe.fixture(POOL,PARKED),d=payload(s),f=d.operator_workspace.evidence.find(f=>f.type==='gap');f.excerpt=PARKED.replace(' GoDaddy','');f.parking_provider='';s.queue=[q.pack(d)];write(s,{opening:f.excerpt,statement:f.excerpt,type:'gap'});allow(s);
 const x=probe.fixture(POOL,PARKED),draft=payload(x);draft.operator_workspace.evidence.find(f=>f.type==='gap').parking_provider='';x.queue=[q.pack(draft)];write(x,{opening:PARKED,statement:PARKED,type:'gap'});block(x,'BUSINESS_DOMAIN_CLAIM_NOT_VERIFIED');
});
test('a supported operator statement has a bounded excerpt exemption; original research and unmatched text do not',()=>{
 const long='The lesson page asks prospective learners to call or text the business for lesson availability.';
 const s=probe.fixture(long),original=JSON.stringify(s.research);write(s,{opening:'I noticed '+long[0].toLowerCase()+long.slice(1),statement:long,mechanism:'I could build a website with lesson information and an enquiry form.'});allow(s);assert.equal(JSON.stringify(s.research),original);
 const x=probe.fixture(POOL),raw={type:'service',source_url:URL,observed_at:NOW,fact_date:NOW,verification:'DISCOVERY_VERIFIED',excerpt:long};x.research[0].evidence_json=JSON.stringify([raw]);write(x,{opening:long,statement:long,evidence_id:h.identity(raw),mechanism:'I could build a website with lesson information and an enquiry form.'});block(x,'VERBATIM_RESEARCH_EXCERPT');
 const y=probe.fixture(long);write(y,{opening:long,statement:long,mechanism:'I could build a website with lesson information and an enquiry form.',extra:long});block(y,'VERBATIM_RESEARCH_EXCERPT');
});
test('supporting a statement never exempts source links, raw metadata, contacts or evidence labels',()=>{
 for(const observation of ['Pool details are published at '+URL+'.','Opening hours: Monday to Friday, pool services are available.','Pool services use the contact operator-fixture@example.org.','Pool service evidence_json was marked DISCOVERY_VERIFIED.','Pool services are explained in ## Research.']){
  const s=probe.fixture(observation);write(s,{opening:observation,statement:observation});block(s,observation.includes('@')?'CONTACT_LEAK':'RAW_RESEARCH_LEAK');
 }
 const s=probe.fixture(POOL,PARKED);write(s,{opening:PARKED,statement:PARKED,type:'gap',extra:'https://fixturepool.com.au/source/123'});block(s,'RAW_RESEARCH_LEAK');
});
test('accepted wording cannot bypass missing permission, suppression, protected state, signature or current-source gates',()=>{
 const s=probe.fixture(POOL),d=payload(s);d.operator_workspace.evidence=d.operator_workspace.evidence.filter(f=>f.type!=='permission');s.queue=[q.pack(d)];write(s,{opening:'I noticed '+POOL.toLowerCase(),cta:require('../scripts/outreach-human').CTAS[0]});assert.equal(s.queue[0].state,'DRAFT_READY_SEND_BLOCKED');assert.ok(probe.act(s,'APPROVE').errors.length);
 for(const fields of [{sent_at:NOW,draft_status:'SENT'},{provider_status:'ZOHO_DRAFT_CREATED',provider_draft_id:'synthetic-existing',draft_status:'ZOHO_DRAFT_CREATED'},{draft_status:'DO_NOT_CONTACT'}]){
  const x=probe.fixture(POOL),before=Object.assign(payload(x),fields);x.queue=[q.pack(before)];const out=probe.act(x,'SAVE_REEVALUATE',{draft:'I noticed a supported observation.'});assert.equal(out.errors.length,1);const after=payload(x);for(const key of ['draft_body','recipient','sent_at','provider_draft_id','draft_status'])assert.equal(after[key],before[key]);
 }
 const x=probe.fixture(POOL);write(x);x.locks=[{kind:'SUPPRESSION',identity:'lead:'+x.research[0].lead_id}];assert.equal(probe.act(x,'APPROVE').errors[0].error,'PERMANENT_SUPPRESSION');
 const y=probe.fixture(POOL);write(y);assert.throws(()=>copy.gate({...payload(y),draft_body:payload(y).draft_body.replace(copy.FOOTER,'Edited footer')}),/EXACT_SIGNATURE_AND_FOOTER_REQUIRED/);allow(y);y.research[0].checked_at='changed-after-approval';assert.ok(probe.act(y,'REQUEST_ZOHO').errors.length);
});
test('performance protection also applies to the existing structured/manual gate without operator statements',()=>{
 const source='https://facebook.com/fixture-pool',facts=[['identity','Fixture Pool Care is the verified business.'],['activity','Dated completed pool service work.'],['service','Pool maintenance services.'],['opportunity','Service information is spread across separate posts.']].map(([type,excerpt])=>({type,excerpt,source_url:source,observed_at:NOW,fact_date:NOW,verification:'REVIEWED_FACT'}));
 const lead={lead_id:'arc_'+'c'.repeat(64),dataset_id:'MANILA_AUDIT_QUEUE',business_name:'Fixture Pool Care',country:'Philippines',timezone:'Asia/Manila',evidence_json:JSON.stringify(facts),verified_social_routes:JSON.stringify([{channel:'FACEBOOK',recipient:source,source_url:source,status:'MANUAL_SOCIAL_CANDIDATE',confidence:'HIGH'}])};
 const e=copy.structured(lead,'FACEBOOK',NOW),o=copy.compose(e);assert.ok(o);assert.equal(copy.validate(o,e,facts).valid,true);
 const changed={...o,draft:o.draft+' I could build a website that doubles your bookings with an enquiry form.'};assert.ok(copy.validate(changed,e,facts).issues.includes('FORBIDDEN_CLAIM'));assert.throws(()=>copy.gate({business:lead.business_name,channel:'FACEBOOK',subject:'',draft_body:changed.draft,copy_evidence:e,evidence_summary:JSON.stringify(facts)}),/FORBIDDEN_CLAIM/);
});
test('the manual evidence editor exposes bounded proof/parked controls and serializes only applicable findings',()=>{
 const s=probe.fixture(POOL),html=require('../scripts/phase2-operator-view').editor(payload(s),true,NOW,'NEEDS_COPY');assert.match(html,/option value="proof">Published customer feedback/);assert.match(html,/data-evidence="website_status"/);assert.match(html,/option value="PARKED"/);assert.match(html,/data-evidence="parking_provider"/);assert.ok(!html.includes('data-evidence="association_verified"'));
 // Execute the real browser submission handler with a minimal DOM fixture;
 // assert the transmitted payload, rather than matching source strings.
 const vm=require('node:vm'),fs=require('node:fs');
 for(const type of ['gap','proof']){
  let submit,submitted;const control=(value,type='text')=>({value,type,checked:true,addEventListener(){},dataset:{},textContent:''}),fields={type,source_url:'https://fixturepool.com.au/',excerpt:type==='gap'?'The domain lands on a parked GoDaddy page.':'Published attributable customer feedback is available.',association_basis:'The exact synthetic business matches.',observed_at:NOW.slice(0,16),fact_date:NOW.slice(0,10),verified:true,website_status:'PARKED',parking_provider:'GoDaddy',channel:'EMAIL',recipient:'fixture@example.org',permission:'',timezone:'',supersedes:''};
  const inputs=Object.entries(fields).map(([key,value])=>({...control(value,key==='verified'?'checkbox':'text'),dataset:{evidence:key}})),evidenceSection={querySelectorAll:()=>inputs},approve={disabled:false,dataset:{hardBlocked:'true'}},heading={querySelector:()=>control(''),addEventListener(){}},suppression={querySelector:()=>control('')};
  const form={elements:{evidence:control(''),notes:control(''),compliance:control('NOT_APPLICABLE'),token:control(Buffer.from(JSON.stringify({expires:Date.now()+60000})).toString('base64url')+'.synthetic')},dataset:{},addEventListener:(kind,fn)=>{if(kind==='submit')submit=fn;},querySelector:()=>approve};
  const lead={dataset:{id:'1',status:'NEEDS_COPY',market:'Manila',channel:'EMAIL'},querySelectorAll:()=>[],querySelector:selector=>selector==='.lead-heading'?heading:selector==='.lead-detail'?{}:selector==='form'?form:selector==='.local-error'?{}:selector==='.manual-evidence'?evidenceSection:selector==='.suppression-confirm'?suppression:selector==='strong'?{textContent:NAME}:null};
  const filters=Array.from({length:4},(_,i)=>control(i===3?'':'ALL')),document={querySelectorAll:()=>[lead],getElementById:id=>['status-filter','market-filter','channel-filter','search'].includes(id)?filters[['status-filter','market-filter','channel-filter','search'].indexOf(id)]:control('')};
  vm.runInNewContext(fs.readFileSync(require.resolve('../review/panel.js'),'utf8'),{document,sessionStorage:{getItem:()=>null,setItem(){}},Date,atob:s=>Buffer.from(s,'base64').toString('utf8')});submit({submitter:control('SAVE_REEVALUATE'),preventDefault(){throw Error('Unexpected cancelled valid submission');}});submitted=JSON.parse(form.elements.evidence.value);
  assert.equal(submitted.type,type);assert.equal(submitted.verified,true);if(type==='gap'){assert.equal(submitted.website_status,'PARKED');assert.equal(submitted.parking_provider,'GoDaddy');}else{assert.equal(submitted.website_status,undefined);assert.equal(submitted.parking_provider,undefined);}assert.equal(submitted.association_verified,undefined);
 }
});
test('the copy picker excludes stale and refreshed evidence while correction/history keeps earlier observations',()=>{
 const s=probe.fixture(POOL,PARKED),before=payload(s),old=before.operator_workspace.evidence.find(f=>f.type==='gap');
 const fresh=evidence.validate({type:'gap',excerpt:PARKED,source_url:'https://fixturepool.com.au/',observed_at:'2026-10-08T05:00:00Z',fact_date:'2026-10-08T05:00:00Z',association_basis:'The exact synthetic business and domain match.',verified:true,website_status:'PARKED',parking_provider:'GoDaddy'},s.research[0],'Synthetic Tester','2026-10-08T06:00:00Z');
 const d=payload(s);d.operator_workspace.evidence.push(fresh);d.evidence_summary=JSON.stringify(h.allFacts(evidence.effective(s.research[0],d,'2026-10-08T06:00:00Z')));
 const html=require('../scripts/phase2-operator-view').editor(d,true,'2026-10-08T06:00:00Z','NEEDS_COPY'),picker=/<select data-claim="evidence_id">([\s\S]*?)<\/select>/.exec(html)[1];assert.ok(picker.includes(fresh.observation_id));assert.ok(!picker.includes(old.observation_id));assert.ok(html.includes('option value="'+old.observation_id+'"'));assert.equal(d.operator_workspace.evidence.find(f=>f.observation_id===old.observation_id).excerpt,PARKED);
 const numericClock=require('../scripts/phase2-operator-view').editor(d,true,Date.parse('2026-10-08T06:00:00Z'),'NEEDS_COPY');assert.ok(/<select data-claim="evidence_id">([\s\S]*?)<\/select>/.exec(numericClock)[1].includes(fresh.observation_id));
 const later=require('../scripts/phase2-operator-view').editor(d,true,'2027-05-08T06:00:00Z','NEEDS_RESEARCH');assert.equal(/<select data-claim="evidence_id">([\s\S]*?)<\/select>/.exec(later)[1],'');
});
