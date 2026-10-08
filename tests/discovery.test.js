'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {runDiscovery,startDiscovery,nextDiscoveryRequest,consumeDiscoveryResponse,finishDiscovery,decodeProvider,documents,association}=require('../scripts/discovery-engine');
const {verifyDiscovery}=require('../scripts/discovery-verifier');
const {runResearch}=require('../scripts/research-engine');
const {makeWorker}=require('../scripts/build-workflows');
const now='2026-10-04T10:00:00Z';
const lead={business_name:'Synthetic Workshop',country:'Philippines',city:'Manila',address:'12 Sample Street, Manila',phone:'+63 912 345 6789',dataset_id:'MANILA_AUDIT_QUEUE',source_spreadsheet_id:'synthetic'};
const url='https://synthetic.example.org/';
const config={discovery:{enabled:true,provider_approved:true,allowed_hosts:['synthetic.example.org'],official_hosts:['synthetic.example.org'],official_urls:[]}};
const page={url,text:'Synthetic Workshop 12 Sample Street, Manila. Services and construction projects. Contact and booking appointments: Email: hello@synthetic.example.org. Owner: Maria Santos. WhatsApp https://wa.me/639123456789 .'};
const response=docs=>({result:{structuredContent:{results:docs}}});
const transport=async r=>response(r.kind==='SEARCH'?[{url,title:'Synthetic Workshop'}]:[page]);
async function research(input,settings=config){const d=verifyDiscovery(await runDiscovery(input,settings,transport,now));return {d,result:await runResearch(d.lead,d.config,async()=>({statusCode:200,body:'<html><h1>Synthetic Workshop</h1><p>12 Sample Street, Manila. Services.</p></html>'}),now)};}
test('discovery is opt-in, approval-gated, bounded, and sends only minimal identity/public targets',async()=>{
 assert.throws(()=>startDiscovery(lead,{discovery:{enabled:true}},now),/APPROVAL_REQUIRED/);
 let calls=0;const disabled=await runDiscovery(lead,{},()=>{calls++;},now);assert.equal(calls,0);assert.equal(disabled.discovery.status,'DISABLED');
 const secret={...lead,existing_email:'private@example.org',legacy_snapshot_json:'PRIVATE_HISTORY',reviewer_note:'PRIVATE_NOTE',first_contact_at:'PRIVATE_DATE'};
 let requests=[];await runDiscovery(secret,config,async r=>{requests.push(r);return transport(r);},now);
 assert.ok(requests.length<=6);const serialized=JSON.stringify(requests);assert.doesNotMatch(serialized,/PRIVATE_|private@example/);assert.match(serialized,/Synthetic Workshop/);
});
test('missing URL triggers discovery; search snippets and unreviewed hosts never become verified facts',async()=>{
 const c={discovery:{...config.discovery,allowed_hosts:[]}};const d=await runDiscovery(lead,c,transport,now);
 assert.equal(d.discovery.status,'UNRESOLVED');assert.ok(d.discovery.warnings.some(x=>x.includes('HOST_REVIEW_REQUIRED')));assert.deepEqual(d.discovery.facts,{});
 const r=await runResearch(verifyDiscovery(d).lead,{},()=>{throw Error('Unexpected fetch');},now);assert.equal(r.research_required,true);assert.equal(r.pain_verified,false);
});
test('name alone and wrong branch/phone are ambiguous; supplied website is not ownership proof',async()=>{
 assert.equal(association(lead,{url,text:'Synthetic Workshop 99 Other Street, Sydney. Email: fraud@synthetic.example.org'}).verified,false);
 const d=await runDiscovery({...lead,website_url:url},config,async r=>response(r.kind==='SEARCH'?[]:[{url,text:'Unrelated Company. Services Contact Email: fraud@synthetic.example.org'}]),now);
 assert.equal(d.discovery.ambiguous_matches.length,1);assert.deepEqual(d.discovery.facts,{});assert.equal(verifyDiscovery(d).lead.contact_email,undefined);
});
test('matched current business services improve quality without owner, trigger or email gates',async()=>{
 const {result}=await research(lead);assert.equal(result.commercial_quality,'MEDIUM');assert.equal(result.contactability,'STRONG');assert.equal(result.research_required,true);assert.equal(result.pain_verified,false);
 assert.equal(result.public_email,'hello@synthetic.example.org');assert.equal(result.whatsapp_url,'https://wa.me/639123456789');assert.equal(result.whatsapp_status,'USABLE');assert.match(result.evidence_json,/DISCOVERY_VERIFIED/);
 assert.match(result.critical_uncertainties_json,/GAP_UNVERIFIED/);assert.equal(result.website_url,url);
});
test('HTTP 200 or a matched directory listing cannot establish current operations or official website',async()=>{
 const c={discovery:{...config.discovery,official_hosts:[]}};const d=verifyDiscovery(await runDiscovery(lead,c,transport,now));
 const r=await runResearch(d.lead,d.config,async()=>({statusCode:200,body:'Synthetic Workshop'}),now);
 assert.equal(r.business_status,'UNCERTAIN');assert.equal(r.public_email,'');assert.equal(r.website_url,'');assert.equal(r.commercial_quality,'LOW');
});
test('explicit reviewer controls and protected/contact/history locks survive discovered evidence',async()=>{
 for(const arc_status of ['SENT','PARKED','DISQUALIFIED','REPLIED','DO_NOT_CONTACT']){
  const l={...lead,arc_status,status_signals:[{status:arc_status}],previous_result:{arc_status},initial_contact_recorded:true,first_contact_at:'2026-09-20',followup_count:'2',manual_status_override:arc_status,contact_verified:false,activity_verified:false};
  const frozen=JSON.stringify(l),{d,result}=await research(l);assert.equal(JSON.stringify(l),frozen);assert.equal(d.lead.contact_verified,false);assert.equal(result.public_email,'');assert.equal(result.business_status,'UNCERTAIN');assert.equal(result.arc_status,arc_status);assert.equal(result.first_contact_at,l.first_contact_at);assert.equal(result.followup_count,'2');assert.equal(result.initial_outreach_blocked,true);
 }
});
test('Australia consent remains separate from discovered quality and contactability',async()=>{
 const {result}=await research({...lead,country:'Australia',city:'Sydney',state:'NSW'});assert.equal(result.commercial_quality,'MEDIUM');assert.equal(result.contactability,'STRONG');assert.equal(result.acma_status,'QUESTIONABLE');assert.notEqual(result.outreach_readiness,'READY_FOR_REVIEW');
});
test('social-only explicit business DM route is usable without an email; profile URLs alone are weak',async()=>{
 const u='https://www.facebook.com/syntheticworkshop';const c={discovery:{...config.discovery,allowed_hosts:['www.facebook.com'],official_hosts:[],official_urls:[u]}};
 const d=verifyDiscovery(await runDiscovery(lead,c,async r=>response(r.kind==='SEARCH'?[{url:u}]:[{url:u,text:'Synthetic Workshop 12 Sample Street, Manila. Services. Message us for construction appointments and bookings.'}]),now));
 const r=await runResearch(d.lead,d.config,()=>{throw Error('Unexpected direct fetch');},now);assert.equal(r.contactability,'USABLE');assert.equal(r.recommended_channel,'FB_MANUAL');assert.equal(r.public_email,'');assert.equal(r.commercial_quality,'MEDIUM');
});
test('provider redirects, access restrictions, malformed responses and errors remain unresolved',async()=>{
 for(const raw of [{statusCode:429,body:'rate limited'},{result:{isError:true,content:[]}},{body:'not json'}])assert.throws(()=>decodeProvider(raw),/PROVIDER/);
 const d=await runDiscovery(lead,config,async r=>r.kind==='SEARCH'?response([{url}]):response([{url:'https://other.example.org/',text:page.text}]),now);
 assert.deepEqual(d.discovery.facts,{});assert.ok(d.discovery.warnings.includes('FETCH_TARGET_MISMATCH'));
 const blocked=await runDiscovery(lead,config,async r=>r.kind==='SEARCH'?response([{url}]):response([{url,text:'Log in to continue. '+page.text}]),now);assert.deepEqual(blocked.discovery.facts,{});
});
test('discovered contacts cannot borrow provenance for a conflicting reviewer address or held identity',async()=>{
 const d=verifyDiscovery(await runDiscovery({...lead,contact_email:'old@other.example.org'},config,transport,now));assert.equal(d.lead.contact_email,'old@other.example.org');assert.equal(d.lead.discovery_facts.contact,undefined);
 const held=verifyDiscovery(await runDiscovery({...lead,association_verified:false},config,transport,now));assert.deepEqual(held.lead.discovery_facts,{});assert.equal(held.lead.website_url,undefined);assert.match(JSON.stringify(held.lead.discovery_observations),/EXPLICIT_IDENTITY_REVIEW_HOLD/);
 let calls=0;const skipped=await runDiscovery({...lead,skip_research:true},config,()=>{calls++;},now);assert.equal(calls,0);assert.equal(skipped.discovery.status,'DISABLED');
});
test('JSON/SSE and multiple provider document blocks keep source association intact',()=>{
 assert.equal(decodeProvider({body:'data: '+JSON.stringify(response([page]))+'\n\n'}).results[0].url,url);
 const docs=documents({text:'# First\nURL: https://first.example.org/\nFirst text\n# Second\nURL: https://second.example.org/\nSecond text'});assert.equal(docs.length,2);assert.doesNotMatch(docs[0].text,/Second text/);
});
test('unlabelled own-domain email is accepted only on an identity-matched official page',async()=>{
 const text='Synthetic Workshop 12 Sample Street, Manila. Services contact. **hello@synthetic.example.org customer@other.example.org';
 const d=verifyDiscovery(await runDiscovery(lead,config,async r=>response(r.kind==='SEARCH'?[{url}]:[{url,text}]),now));
 assert.equal(d.lead.contact_email,'hello@synthetic.example.org');
 const unapproved=await runDiscovery(lead,{discovery:{...config.discovery,official_hosts:[]}},async r=>response(r.kind==='SEARCH'?[{url}]:[{url,text}]),now);
 assert.equal(unapproved.discovery.facts.contact,undefined);
});
test('identity phone digits cannot be assembled across unrelated page text',()=>{
 const l={...lead,address:''};
 assert.equal(association(l,{title:'Synthetic Workshop',text:'Record 9123. Other unrelated 456789.'}).verified,false);
 assert.equal(association(l,{title:'Synthetic Workshop',text:'Phone: +63 (912) 345-6789'}).verified,true);
 assert.equal(association({...l,phone:'+61 439 600 787'},{title:'Synthetic Workshop',text:'0439 600 787 (0439600787)'}).verified,true);
});
test('published contact platform can replace missing email without claiming a submitted or tested booking',async()=>{
 const d=verifyDiscovery(await runDiscovery(lead,config,async r=>response(r.kind==='SEARCH'?[{url}]:[{url,text:'Synthetic Workshop 12 Sample Street, Manila. Services and book online. Contact form for enquiries.'}]),now));
 const r=await runResearch(d.lead,d.config,async()=>({statusCode:200,body:'Synthetic Workshop'}),now);assert.equal(r.contactability,'USABLE');assert.equal(r.recommended_channel,'BUSINESS_CONTACT_MANUAL');assert.equal(r.public_email,'');assert.match(r.evidence_json,/PUBLIC_ROUTE_NOT_SUBMITTED/);assert.equal(r.pain_verified,false);
});
test('exported discovery loop executes with a native HTTP boundary and preserves the specific lead',async()=>{
 const w=makeWorker();const out={};const execute=(name,input)=>{const n=w.nodes.find(x=>x.name===name);const context={require,$input:{first:()=>({json:input})},$:name=>({item:{json:out[name]}})};const result=vm.runInNewContext('(function(){'+n.parameters.jsCode+'})()',context)[0].json;out[name]=result;return result;};
 let s=execute('Initialize discovery',{lead,config});for(let i=0;i<8;i++){s=execute('Discovery request context',s);if(!s.pending)break;s=execute('Record discovery evidence',await transport(s.pending));}
 const result=execute('Verify discovered identity',execute('Discovery result',s));assert.equal(result.lead.business_name,lead.business_name);assert.equal(result.lead.contact_email,'hello@synthetic.example.org');assert.equal(result.lead.dataset_id,lead.dataset_id);
 const http=w.nodes.find(x=>x.name==='Discover public evidence');assert.equal(http.parameters.authentication,'none');assert.equal(http.parameters.options.allowUnauthorizedCerts,false);assert.equal(http.parameters.options.redirect.redirect.followRedirects,false);
});
