'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {DraftStore}=require('../scripts/draft-store');const {buildDraft}=require('../scripts/outreach-mvp');
const {createEmailDraft,prepareManualDraft,recordManualReceipt}=require('../scripts/email-transport');
const z=require('../scripts/composio-zoho');const {build,payloadCode}=require('../scripts/build-zoho-draft-workflow');
const now='2026-10-04T08:00:00.000Z';const config={connected_account_id:'ca_fixture',account_id:'9007199254740993123',region:'com'};
const review={reviewer:'Fixture Reviewer',truthful:true,recipient_relevant:true,consent_reviewed:true,suppression_checked:true,compliance_basis:'Synthetic fixture only'};
function fixture(country='Philippines'){
 return buildDraft({lead_id:'arc_'+'f'.repeat(64),business_name:'Fixture Industrial',country,timezone:'Asia/Manila',arc_status:'NEEDS_RESEARCH',business_status:'ACTIVE',commercial_quality:'HIGH',research_confidence:'HIGH',research_required:false,pain_verified:true,public_email:'fixture@example.org',email_source_url:'https://example.org/',email_confidence:'HIGH',compliance_status:country==='Australia'?'SAFE_TO_REVIEW':'NOT_APPLICABLE',evidence_json:JSON.stringify(['activity','legitimacy','gap','business_case','contact'].map(type=>({type,source_url:'https://example.org/',fact_date:now,observed_at:now,verification:'HUMAN_REVIEWED_INPUT',excerpt:({activity:'The business published a completed service project this month.',legitimacy:'The website name and address match.',gap:'The service page has a Lorem ipsum placeholder.',business_case:'Specific project proof may help a visitor assess capability.',contact:'Public business email: fixture@example.org.'})[type]})))},now);
}
function setup(t,country){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'arc-zoho-')),store=new DraftStore(path.join(dir,'queue.sqlite')),d=fixture(country);store.import([d]);t.after(()=>{store.close();if(!path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep))throw new Error('UNSAFE_TEST_CLEANUP');fs.rmSync(dir,{recursive:true,force:true});});return {store,d};}
function success(id='9007199254740993555'){return {successful:true,error:null,data:JSON.stringify({status:{code:200},data:{messageId:id}})};}
test('connected-account user identity survives manual handoff without forwarding extra configuration',t=>{
 const {store,d}=setup(t);store.action(d.draft_key,'APPROVE',review,now);
 const c={...config,user_id:'fixture-user',unnecessary_metadata:'must not leave local configuration'};
 const e=prepareManualDraft(store,d.draft_key,c,now),request=z.guardEnvelope(e,z.scopeFor(d),now).request;
 assert.equal(request.user_id,c.user_id);assert.equal(request.arguments.accountId,config.account_id);
 assert.ok(!('user_id' in request.arguments));assert.ok(!JSON.stringify(request).includes('unnecessary_metadata'));
 for(const user_id of [123,'','<guessed>',"bad\nuser"])assert.throws(()=>z.connectionConfig({...config,user_id}),/INVALID_COMPOSIO_USER_ID/);
});
test('Composio adapter maps only exact approved content to the pinned draft tool',async t=>{
 const {store,d}=setup(t);store.action(d.draft_key,'APPROVE',review,now);let request,calls=0;
 const adapter=z.createComposioAdapter(config,async r=>{request=r;calls++;return success();});
 const result=await createEmailDraft(store,d.draft_key,adapter);assert.equal(result.status,'ZOHO_DRAFT_CREATED');assert.equal(calls,1);
 assert.equal(request.url,z.ENDPOINT);assert.equal(request.tool,z.TOOL);assert.deepEqual(Object.keys(request.body).sort(),['arguments','connected_account_id','version']);
 assert.deepEqual(request.body.arguments,{accountId:config.account_id,fromAddress:z.SENDER,toAddress:d.recipient,subject:d.subject,content:z.renderDraftHtml(d.draft_body),mode:'draft',mailFormat:'html',encoding:'UTF-8',askReceipt:'no',region:'com'});
 assert.ok(!JSON.stringify(request).includes('reviewer'));assert.ok(!JSON.stringify(request).includes('source_snapshot_hash'));
 const kept=store.get(d.draft_key);assert.equal(kept.sent_at,null);assert.equal(kept.followup_due_at,null);assert.equal(kept.reply_status,d.reply_status);assert.equal(store.due('2027-01-01T00:00:00Z').length,0);
 await assert.rejects(createEmailDraft(store,d.draft_key,adapter));assert.equal(calls,1);
});
test('provider draft becomes SENT only after a real manual-send confirmation',async t=>{
 const {store,d}=setup(t);store.action(d.draft_key,'APPROVE',review,now);await createEmailDraft(store,d.draft_key,z.createComposioAdapter(config,async()=>success()));
 assert.throws(()=>store.action(d.draft_key,'SENT'),/MANUAL_SEND_CONFIRMATION/);
 const sent=store.action(d.draft_key,'SENT',{manual_send_confirmation:true},'2026-10-05T02:00:00Z');assert.equal(sent.sent_at,'2026-10-05T02:00:00Z');assert.equal(sent.followup_due_at,'2026-10-12T02:00:00.000Z');
 assert.equal(store.providerStatus(d.draft_key).state,'ZOHO_DRAFT_CREATED');
});
test('a timeout after provider creation leaves a durable reconciliation lock',async t=>{
 const {store,d}=setup(t);store.action(d.draft_key,'APPROVE',review,now);let calls=0;const adapter=z.createComposioAdapter(config,async()=>{calls++;throw new Error('fixture timeout');});
 await assert.rejects(createEmailDraft(store,d.draft_key,adapter),/UNKNOWN_PROVIDER_RESULT/);assert.equal(store.get(d.draft_key).review_status,'RECONCILIATION_REQUIRED');
 await assert.rejects(createEmailDraft(store,d.draft_key,adapter));assert.equal(calls,1);assert.throws(()=>store.action(d.draft_key,'SENT',{manual_send_confirmation:true}),/EXACT_CONTENT|RECONCILIATION/);
});
test('altered reviewed recipient, subject or body cannot be sent to Composio',async t=>{
 for(const field of ['recipient','subject','draft_body']){const {store,d}=setup(t);store.action(d.draft_key,'APPROVE',review,now);const edited=store.get(d.draft_key);edited[field]+=' changed';store.save(edited);let calls=0;
 await assert.rejects(createEmailDraft(store,d.draft_key,z.createComposioAdapter(config,async()=>{calls++;return success();})),/PROVIDER_GATE/);assert.equal(calls,0);assert.equal(store.providerStatus(d.draft_key),null);}
});
test('revoked compliance and reviewer checks are re-evaluated before provider claim',t=>{
 for(const change of ['consent','AU','history','route','identity']){const {store,d}=setup(t,change==='AU'?'Australia':undefined);store.action(d.draft_key,'APPROVE',review,now);const edited=store.get(d.draft_key);
 if(change==='consent')edited.review.consent_reviewed=false;if(change==='AU')edited.compliance_status='QUESTIONABLE';if(change==='history')edited.source_state='SENT';if(change==='route')edited.route_invalid=true;if(change==='identity')edited.step='different';
 store.save(edited);assert.throws(()=>store.claimProvider(d.draft_key),/PROVIDER_GATE/);assert.equal(store.providerStatus(d.draft_key),null);}
});
test('suppression and cross-campaign contact locks prevent any provider claim',t=>{
 for(const type of ['suppression','contact']){const {store,d}=setup(t);store.action(d.draft_key,'APPROVE',review,now);if(type==='suppression')store.action(d.draft_key,'DO_NOT_CONTACT',{},now);else store.rememberContact(d,now);assert.throws(()=>store.claimProvider(d.draft_key),/PROVIDER_GATE/);}
});
test('missing IDs, numeric Zoho IDs and invalid regions fail before a claim',t=>{
 const {store,d}=setup(t);store.action(d.draft_key,'APPROVE',review,now);for(const c of [{}, {...config,account_id:123}, {...config,connected_account_id:''}, {...config,region:'invalid'}])assert.throws(()=>prepareManualDraft(store,d.draft_key,c,now),/IDENTIFIERS_REQUIRED|INVALID_ZOHO_REGION/);
 assert.equal(store.providerStatus(d.draft_key),null);
});
test('signature must remain exact and present exactly once with compliance after it',()=>{
 const d=fixture();assert.doesNotThrow(()=>z.assertSignature(d.draft_body));
 for(const body of [d.draft_body+'\n'+require('../scripts/outreach-mvp').SIGNATURE,d.draft_body.replace('Briann Arcala','Other Name'),d.draft_body.replace(z.FOOTER,'')])assert.throws(()=>z.buildExecuteRequest({...z.emailPayload(d),body},config),/SIGNATURE/);
});
test('HTTP 200, false success, missing draft ID, wrong mode and unsafe numeric IDs remain ambiguous',()=>{
 for(const response of [{successful:false,data:{messageId:'id'}},{successful:true,data:{}},{successful:true,data:{status:{code:400},data:{messageId:'id'}}},{successful:true,error:'failed',data:{messageId:'id'}},{successful:true,data:{messageId:9007199254740993555}},{successful:true,data:{messageId:'id',mode:'send'}},{}])assert.throws(()=>z.parseCreateDraftResult(response),/AMBIGUOUS/);
 assert.equal(z.parseCreateDraftResult(success()).draft_id,'9007199254740993555');assert.equal(z.parseCreateDraftResult({successful:true,data:{messageId:'id'}}).draft_id,'id');
});
test('local manual handoff reserves once and binds the receipt to exact content and claim',t=>{
 const {store,d}=setup(t);store.action(d.draft_key,'APPROVE',review,now);const envelope=prepareManualDraft(store,d.draft_key,config,now),context=z.guardEnvelope(envelope,z.scopeFor(d),now),receipt=z.normalizedReceipt(context,success());
 assert.throws(()=>prepareManualDraft(store,d.draft_key,config,now),/ALREADY_CLAIMED/);assert.throws(()=>recordManualReceipt(store,d.draft_key,{...receipt,draft_key:'wrong'},now),/ASSOCIATION/);
 const created=recordManualReceipt(store,d.draft_key,receipt,now);assert.equal(created.draft_status,'ZOHO_DRAFT_CREATED');assert.equal(created.sent_at,null);assert.equal(created.followup_due_at,null);
});
test('reconciliation may record confirmed success without making another provider request',t=>{
 const {store,d}=setup(t);store.action(d.draft_key,'APPROVE',review,now);const envelope=prepareManualDraft(store,d.draft_key,config,now);store.providerResult(d.draft_key,'UNKNOWN_PROVIDER_RESULT','', '2026-10-04T08:01:00Z');
 const receipt=z.normalizedReceipt(z.guardEnvelope(envelope,z.scopeFor(d),now),success());const kept=recordManualReceipt(store,d.draft_key,receipt,'2026-10-04T08:02:00Z');assert.equal(kept.draft_status,'ZOHO_DRAFT_CREATED');assert.equal(kept.review_status,'APPROVED');
 assert.throws(()=>prepareManualDraft(store,d.draft_key,config,now));
});
test('late provider receipts preserve a suppression or recorded historical send',t=>{
 const {store,d}=setup(t);store.action(d.draft_key,'APPROVE',review,now);store.claimProvider(d.draft_key,now);store.action(d.draft_key,'DO_NOT_CONTACT',{},now);
 const suppressed=store.providerResult(d.draft_key,'ZOHO_DRAFT_CREATED','fixture-id',now);assert.equal(suppressed.draft_status,'DO_NOT_CONTACT');assert.equal(suppressed.reply_status,'DO_NOT_CONTACT');
 assert.throws(()=>store.providerResult(d.draft_key,'UNKNOWN_PROVIDER_RESULT'),/CONFLICT/);assert.equal(store.providerStatus(d.draft_key).provider_id,'fixture-id');
});
test('source changes after provider creation invalidate further action without erasing provider history',t=>{
 const {store,d}=setup(t);store.action(d.draft_key,'APPROVE',review,now);store.claimProvider(d.draft_key,now);store.providerResult(d.draft_key,'ZOHO_DRAFT_CREATED','fixture-id',now);store.import([{...d,source_snapshot_hash:'changed'}]);
 const kept=store.get(d.draft_key);assert.equal(kept.draft_status,'ZOHO_DRAFT_CREATED');assert.equal(kept.provider_draft_id,'fixture-id');assert.equal(kept.review_status,'SOURCE_CHANGED_REVIEW_REQUIRED');assert.throws(()=>store.action(d.draft_key,'SENT',{manual_send_confirmation:true}),/EXACT_CONTENT/);
});
test('generated n8n guard runs on one approved fixture only and forwards no review/history metadata',t=>{
 const {store,d}=setup(t);store.action(d.draft_key,'APPROVE',review,now);const envelope=prepareManualDraft(store,d.draft_key,config,now),workflow=build({scope:z.scopeFor(d)}).workflow;
 const guard=workflow.nodes[2];const invoke=e=>new Function('$input','require',guard.parameters.jsCode)({all:()=>e.map(json=>({json}))},require);
 const current={...envelope,claimed_at:new Date().toISOString(),expires_at:new Date(Date.now()+300000).toISOString()};
 const out=invoke([current])[0].json;assert.equal(out.request.arguments.toAddress,d.recipient);assert.ok(!('review' in out.request));assert.throws(()=>invoke([current,current]),/ONE_RECORD/);
 for(const changed of [{approved:false},{message_hash:'wrong'},{expires_at:now},{email:{...current.email,to:'other@example.org'}},{checks:{...current.checks,suppression_clear:false}}])assert.throws(()=>invoke([{...current,...changed}]));
 assert.throws(()=>new Function(payloadCode())(),/EXPLICIT_APPROVAL/);
});
test('inactive native HTTP transport has no retry, redirect, inline credential or send path',()=>{
 const {workflow,sdk}=build();assert.equal(workflow.active,false);assert.equal(workflow.settings.saveManualExecutions,false);assert.equal(workflow.settings.saveDataErrorExecution,'none');
 const http=workflow.nodes.find(n=>n.type.endsWith('.httpRequest'));assert.equal(http.disabled,true);assert.equal(http.retryOnFail,false);assert.equal(http.parameters.url,z.ENDPOINT);assert.equal(http.credentials.httpHeaderAuth.name,'Composio API');assert.equal(http.parameters.genericAuthType,'httpHeaderAuth');
 const dedupe=workflow.nodes.find(n=>n.type.endsWith('.removeDuplicates'));assert.equal(dedupe.parameters.operation,'removeItemsSeenInPreviousExecutions');assert.equal(dedupe.parameters.dedupeValue,'={{ $json.draft_key }}');assert.equal(workflow.connections[dedupe.name].main[0][0].node,http.name);
 assert.equal(http.parameters.options.redirect.redirect.followRedirects,false);assert.equal(http.parameters.options.allowUnauthorizedCerts,false);assert.ok(!/SEND_EMAIL|api[_-]?key|oauth[_-]?token/i.test(sdk));
 assert.ok(!workflow.nodes.some(n=>/webhook|schedule|googleSheets|zoho/i.test(n.type)));
});
