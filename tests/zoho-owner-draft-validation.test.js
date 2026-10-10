'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const v=require('../scripts/zoho-owner-draft-validation'),z=require('../scripts/composio-zoho'),r=require('../scripts/phase2-cloud-review');
const {SIGNATURE}=require('../scripts/outreach-mvp'),{sha256}=require('../scripts/helpers');
const connection={connected_account_id:'ca_synthetic_owner',account_id:'123456789',user_id:'synthetic-owner',region:'com'},now='2026-10-10T01:00:00Z';
const approved={sender:z.SENDER,recipient:z.SENDER,subject:'[Synthetic test] Unsent validation',body:'Synthetic transport test. Leave unsent.\n\n'+SIGNATURE+'\n\n'+z.FOOTER};
approved.message_hash=sha256(JSON.stringify(['EMAIL',approved.recipient,approved.subject,approved.body]));
approved.request_sha256=sha256(JSON.stringify(z.buildExecuteRequest({from:approved.sender,to:approved.recipient,subject:approved.subject,body:approved.body},connection)));
const draftId='1700000000000000001',folderId='900000000000000001';
const wrap=data=>({successful:true,error:null,data:JSON.stringify({status:{code:200},data})});
const folder=()=>wrap([{folderType:'Drafts',folderName:'Drafts',path:'/Drafts',isArchived:0,folderId,URI:'https://mail.zoho.com/api/accounts/'+connection.account_id+'/folders/'+folderId}]);
const head=()=>({messageId:draftId,headerContent:{From:['Owner <'+z.SENDER+'>'],To:['"Owner" <'+z.SENDER+'>'],Subject:[approved.subject],'Content-Type':['text/html; charset=UTF-8']}});
function setup(){const base={...v.initial(approved,connection,now),id:1},claim={...v.claim(base,approved,connection,'synthetic-execution',now),id:1},request=v.request([claim],claim,approved,connection,'synthetic-execution',now),receipt={...v.receipt(claim,request,wrap({messageId:draftId,mode:'draft'}),now),id:1};return {base,claim,request,receipt};}
test('owner claim is durably bound before the frozen draft-only request',()=>{
 const x=setup();assert.equal(x.claim.state,'CLAIMED');assert.equal(x.request.request.version,z.VERSION);assert.equal(x.request.request.arguments.mode,'draft');assert.equal(sha256(JSON.stringify(x.request.request)),approved.request_sha256);
 assert.equal(r.persistedReceipt(x.receipt,[x.receipt]).state,'ZOHO_DRAFT_CREATED');assert.equal(x.receipt.sent,false);assert.equal(JSON.parse(x.receipt.payload).owner_audit.length,3);
});
test('zero/multiple/wrong durable claim rows, altered fields and expired claims block dispatch',()=>{
 const x=setup();for(const rows of [[],[x.claim,x.claim],[{...x.claim,id:2}],[{...x.claim,payload:x.base.payload}],[{...x.claim,recipient:'other@example.invalid'}]])assert.throws(()=>v.request(rows,x.claim,approved,connection,'synthetic-execution',now));
 assert.throws(()=>v.request([x.claim],x.claim,approved,connection,'wrong',now),/PERSISTED_PROVIDER_CLAIM/);
 assert.throws(()=>v.request([x.claim],x.claim,approved,connection,'synthetic-execution','2026-10-10T01:06:00Z'),/ONE_RECORD_CLAIM/);
});
test('wrong account, arbitrary owner recipient and changed approval hashes cannot create a claim',()=>{
 const {base}=setup();for(const [a,c]of [[{...approved,recipient:'other@example.invalid'},connection],[{...approved,message_hash:'wrong'},connection],[approved,{...connection,account_id:'987654321'}],[approved,{...connection,connected_account_id:'ca_wrong'}]])assert.throws(()=>v.claim(base,a,c,'next',now));
 for(const change of [{state:'SENT'},{sent:true},{provider_status:'UNKNOWN_PROVIDER_RESULT'},{provider_draft_id:draftId},{approved_hash:'wrong'}])assert.throws(()=>v.claim({...base,...change},approved,connection,'next',now));
});
test('ambiguous provider outcomes remain locked and replay never calls the provider',()=>{
 const x=setup();for(const response of [{},{error:'timeout'},wrap({messageId:1700000000000000001}),wrap({messageId:draftId,mode:'send'})]){
 const kept=v.receipt(x.claim,x.request,response,now);assert.equal(kept.state,'UNKNOWN_PROVIDER_RESULT');assert.equal(v.replay(kept,approved,connection,'replay').provider_calls,0);
 }
 for(const row of [x.claim,x.receipt])assert.equal(v.replay(row,approved,connection,'replay').row_mutations,0);
});
test('strict folder identity and unsent draft header/body produce a complete readback',()=>{
 const {receipt}=setup(),f=v.folders(folder(),connection),h=v.headers(wrap(head()),draftId,approved),b=v.content(wrap({messageId:draftId,content:z.renderDraftHtml(approved.body)}),draftId,approved),kept=v.verified(receipt,approved,connection,f,h,b,'readback',now);
 assert.equal(JSON.parse(kept.payload).owner_validation.readback.unsent_verified,true);assert.equal(kept.sent,false);assert.equal(kept.sent_at,null);assert.equal(kept.followup_due_at,null);assert.equal(JSON.parse(kept.payload).owner_audit.length,4);
 assert.equal(v.replay(kept,approved,connection,'replay').duplicate_prevention,true);
});
test('wrong, duplicate, fabricated or numeric Drafts folder identities are rejected',()=>{
 const good=JSON.parse(folder().data).data[0];for(const rows of [[],[good,good],[{...good,folderType:'Sent'}],[{...good,path:'/Sent'}],[{...good,URI:good.URI.replace(connection.account_id,'987')}],[{...good,folderId:900000000000000001}]])assert.throws(()=>v.folders(wrap(rows),connection));
});
test('missing, duplicated, altered and extra-recipient headers stop verification',()=>{
 for(const update of [{From:['other@example.invalid']},{To:[z.SENDER+', other@example.invalid']},{To:[z.SENDER,z.SENDER]},{To:[]},{Subject:['changed']},{Subject:[approved.subject,approved.subject]},{Cc:['other@example.invalid']},{Bcc:['']},{Received:['SMTP']},{'Resent-To':[z.SENDER]},{from:[z.SENDER]}])assert.throws(()=>v.headers(wrap({...head(),headerContent:{...head().headerContent,...update}}),draftId,approved));
 for(const messageId of ['wrong',1700000000000000001,'1700000000000000002'])assert.throws(()=>v.headers(wrap({...head(),messageId}),draftId,approved));
});
test('truncation, extra markup, unsafe IDs, invalid schemas and oversized provider reads fail closed',()=>{
 const html=z.renderDraftHtml(approved.body);for(const content of [html.slice(0,-1),'<div>'+html+'</div>',html+'<img src="https://example.invalid/a">',approved.body])assert.throws(()=>v.content(wrap({messageId:draftId,content}),draftId,approved),/EXACT_DRAFT_CONTENT/);
 for(const response of [{successful:false},{successful:true,data:{status:{code:200}}},{successful:true,data:'invalid'},{successful:true,data:{status:{code:500},data:[]}},{successful:true,data:'x'.repeat(1048577)}])assert.throws(()=>v.data(response));
});
test('receipt zero-match/conflicting persistence and incomplete verification never manufacture success',()=>{
 const {receipt}=setup();for(const rows of [[],[receipt,receipt],[{...receipt,provider_draft_id:'wrong'}],[{...receipt,payload:'wrong'}]])assert.throws(()=>r.persistedReceipt(receipt,rows));
 assert.throws(()=>v.verified(receipt,approved,connection,{folder_type:'Sent'},{draft_id:draftId},{body_verified:true,message_hash:approved.message_hash},'readback',now));
});
function runGraph(graph,row,responses){
 const outputs=new Map();let input=[{json:{}}],calls=0,writes=0,current=structuredClone(row);
 const lookup=name=>({first:()=>outputs.get(name)[0]});
 for(const node of graph.nodes){
  if(node.type.endsWith('.dataTable')){
   if(node.parameters.operation==='get')input=[{json:structuredClone(current)}];
   else {const source=input[0].json;current={...current,...Object.fromEntries(Object.keys(require('../scripts/phase2-cloud-queue').COLUMNS).map(k=>[k,source[k]]))};writes++;input=[{json:structuredClone(current)}];}
  }else if(node.type.endsWith('.httpRequest')){calls++;input=[{json:responses.shift()}];}
  else if(node.type.endsWith('.code'))input=new Function('$input','$','$execution','require',node.parameters.jsCode)({all:()=>input,first:()=>input[0]},lookup,{id:'synthetic-cloud'},require);
  outputs.set(node.name,input);
 }
 return {row:current,calls,writes,output:input[0].json};
}
test('generated Cloud graph executes frozen receipt, complete readback and replay on synthetic responses',()=>{
 const builder=require('../scripts/build-owner-draft-validation'),graphs=builder.build(approved,connection,'synthetic-table',{id:'synthetic-credential',name:'Synthetic API'}),base={...v.initial(approved,connection),id:1};
 const created=runGraph(graphs.create,base,[wrap({messageId:draftId,mode:'draft'})]);assert.equal(created.calls,1);assert.equal(created.writes,2);assert.equal(created.output.state,'ZOHO_DRAFT_CREATED');
 const verified=runGraph(graphs.readback,created.row,[folder(),wrap(head()),wrap({messageId:draftId,content:z.renderDraftHtml(approved.body)})]);assert.equal(verified.calls,3);assert.equal(verified.writes,1);assert.equal(verified.output.verification.unsent_verified,true);
 const replay=runGraph(graphs.replay,verified.row,[]);assert.equal(replay.calls,0);assert.equal(replay.writes,0);assert.equal(replay.output.duplicate_prevention,true);
 assert.throws(()=>runGraph(graphs.create,created.row,[]),/OWNER_REPLAY_BLOCKED/);
});
test('generated HTTP nodes retain frozen versions, TLS, no retry and no send/delete paths',()=>{
 const graphs=require('../scripts/build-owner-draft-validation').build(approved,connection,'synthetic-table',{id:'synthetic-credential',name:'Synthetic API'});
 for(const graph of Object.values(graphs)){
  assert.equal(graph.active,false);assert.equal(graph.settings.saveManualExecutions,false);assert.equal(graph.settings.saveDataSuccessExecution,'none');assert.equal(graph.settings.saveDataErrorExecution,'none');
  for(const node of graph.nodes.filter(n=>n.type.endsWith('.httpRequest'))){assert.equal(node.retryOnFail,false);assert.equal(node.parameters.options.allowUnauthorizedCerts,false);assert.equal(node.parameters.options.redirect.redirect.followRedirects,false);assert.ok(!/SEND_EMAIL|DELETE|REPLY/.test(node.parameters.url));assert.equal(node.parameters.jsonBody,'={{ $json.request }}');}
 }
 assert.equal(graphs.replay.nodes.some(n=>n.type.endsWith('.httpRequest')),false);
 assert.equal(graphs.create.nodes.find(n=>n.name==='Verify durable claim before CREATE').parameters.jsCode.includes('arc.request(rows,expected'),true);
});
test('readback schema diagnostics distinguish shape failures without accepting them or retaining values',()=>{
 const cases=[[[], 'ZOHO_ENVELOPE_OBJECT_REQUIRED'],[{},'ZOHO_STATUS_OBJECT_REQUIRED'],[{status:{code:' 200'},data:[]},'ZOHO_STATUS_SUCCESS_REQUIRED'],[{status:{code:500},data:[]},'ZOHO_STATUS_SUCCESS_REQUIRED'],[{status:{code:200}},'ZOHO_DATA_REQUIRED']];
 for(const [data,error]of cases)assert.throws(()=>v.data({successful:true,data}),new RegExp(error));
 const response={successful:true,data:JSON.stringify({status:{code:'200'},data:{private_value:'synthetic-private-body'}})},diagnostic=v.schemaReceipt(response);
 assert.equal(diagnostic.status_code_type,'string');assert.equal(diagnostic.native_success,true);assert.equal(JSON.stringify(diagnostic).includes('synthetic-private-body'),false);assert.deepEqual(v.data(response),{private_value:'synthetic-private-body'});
 assert.equal(v.schemaReceipt(wrap([])).native_success,true);assert.equal(v.schemaReceipt({successful:true,data:'broken'}).parse_ok,false);
 assert.deepEqual(v.schemaReceipt({successful:true,data:'x'.repeat(1048577)}),{top_type:'object',size_cap_exceeded:true});
});

test('read-only raw JSON preserves long integer ID tokens, strings and exact HTML without Number coercion',()=>{
 const raw='{"messageId":1700000000000000001,"folderId":900000000000000001,"text":"1700000000000000001 \\"quoted\\"","status":{"code":200}}';
 const parsed=v.parseRead(raw);assert.equal(parsed.messageId,draftId);assert.equal(parsed.folderId,folderId);assert.equal(parsed.text,'1700000000000000001 "quoted"');assert.equal(parsed.status.code,200);
 for(const code of [true,null,'200.0','0200',' 200','200 ',201,500])assert.throws(()=>v.data({successful:true,data:{status:{code},data:[]}}),/ZOHO_STATUS_SUCCESS/);
 for(const raw of ['{"messageId":1700000000000000001','not json','x'.repeat(1048577)])assert.throws(()=>v.parseRead(raw));
 assert.throws(()=>v.id(v.parseRead('{"messageId":1.7e18}').messageId),/LOSSLESS/);
});
test('bounded recovery graph certifies three exact reads with three durable checkpoints and native replay refusal',()=>{
 const {receipt}=setup(),graph=require('../scripts/build-owner-draft-validation').buildRecovery(approved,connection,'synthetic-table',{id:'synthetic-credential',name:'Synthetic API'},receipt);
 const raw=x=>({data:JSON.stringify(x)}),native=d=>({successful:true,error:null,data:{status:{code:'200'},data:d}});
 const f=JSON.parse(folder().data).data,h=head(),b={messageId:draftId,content:z.renderDraftHtml(approved.body)};
 const result=runGraph(graph,receipt,[raw(native(f)),raw(native(h)),raw(native(b))]);
 assert.equal(result.calls,3);assert.equal(result.writes,3);assert.equal(result.output.replay.duplicate_prevention,true);assert.equal(result.output.verification.unsent_verified,true);
 const d=JSON.parse(result.row.payload);assert.equal(d.owner_validation.recovery.reads.length,3);assert.equal(d.owner_validation.recovery.reads.every(x=>x.outcome==='PASS'),true);assert.equal(d.claim_execution,'synthetic-execution');assert.equal(result.row.provider_draft_id,draftId);assert.equal(result.row.sent,false);
 for(const n of graph.nodes.filter(n=>n.type.endsWith('.httpRequest'))){assert.equal(n.parameters.options.response.response.responseFormat,'text');assert.equal(n.retryOnFail,false);assert.equal(n.parameters.options.redirect.redirect.followRedirects,false);assert.equal(v.READ_TOOLS.some(t=>n.parameters.url.endsWith(t)),true);}
});
test('recovery errors persist safe diagnostics and refuse subsequent reads without altering the claim',()=>{
 const {receipt}=setup(),request=v.recoveryRequest(receipt,approved,connection,0,'recovery'),bad={data:JSON.stringify({successful:true,data:{data:[{private_value:'synthetic-private-value'}]}})},out=v.recoveryCheckpoint(receipt,approved,connection,0,request,bad,'recovery',now);
 assert.equal(out.outcome.outcome,'STOP');assert.equal(out.outcome.check,'ZOHO_STATUS_OBJECT_REQUIRED');assert.equal(out.outcome.schema.status_type,'undefined');assert.equal(out.claim_execution,receipt.claim_execution);assert.equal(out.provider_draft_id,draftId);
 assert.equal(JSON.stringify(JSON.parse(out.payload).owner_validation.recovery).includes('synthetic-private-value'),false);assert.throws(()=>v.recoveryRequest(out,approved,connection,1,'recovery'),/EXACT_EXISTING/);
 assert.throws(()=>v.recoveryCheckpoint(receipt,approved,connection,0,{...request,connected_account_id:'ca_wrong'},bad,'recovery',now),/EXACT_RECOVERY_REQUEST/);
 const oversized=v.recoveryCheckpoint(receipt,approved,connection,0,request,{data:'x'.repeat(1048577)},'recovery',now);assert.equal(oversized.outcome.check,'BOUNDED_RAW_JSON_REQUIRED');
 const missing=v.recoveryCheckpoint(receipt,approved,connection,0,request,{data:JSON.stringify({successful:true,data:{status:{code:200}}})},'recovery',now);assert.equal(missing.outcome.check,'ZOHO_DATA_REQUIRED');assert.equal(missing.outcome.schema.native_success,true);assert.equal(missing.outcome.schema.payload_type,'undefined');assert.equal(missing.claim_execution,receipt.claim_execution);
 const shape=v.schemaReceipt({successful:true,data:{status:{code:200},folders:[{private_value:'synthetic-private-value'}]}});assert.equal(shape.known_field_types.folders,'array');assert.equal(JSON.stringify(shape).includes('synthetic-private-value'),false);assert.throws(()=>v.data({successful:true,data:{status:{code:200},folders:[]}}),/ZOHO_DATA_REQUIRED/);
 assert.throws(()=>v.recoveryRequest({...receipt,provider_draft_id:'wrong'},approved,connection,0,'recovery'));
});
test('one-read schema diagnostic preserves stopped recovery and cannot certify or repeat a draft',()=>{
 const {receipt}=setup(),request=v.recoveryRequest(receipt,approved,connection,0,'recovery'),stopped=v.recoveryCheckpoint(receipt,approved,connection,0,request,{data:JSON.stringify({successful:true,data:{status:{code:200}}})},'recovery',now);
 const builder=require('../scripts/build-owner-draft-validation'),graph=builder.buildSchemaDiagnostic(approved,connection,'synthetic-table',{id:'synthetic-credential',name:'Synthetic API'},stopped),raw={data:JSON.stringify({successful:true,data:{status:{code:200},folders:[{private_value:'synthetic-private-value'}]}})};
 const result=runGraph(graph,stopped,[raw]),before=JSON.parse(stopped.payload),after=JSON.parse(result.row.payload);
 assert.equal(result.calls,1);assert.equal(result.writes,1);assert.equal(result.output.verification_complete,false);assert.equal(result.output.diagnostic.schema.known_field_types.folders,'array');assert.equal(result.output.diagnostic.outcome,'SCHEMA_OBSERVED');assert.equal(JSON.stringify(result.output).includes('synthetic-private-value'),false);
 assert.deepEqual(after.owner_validation.recovery,before.owner_validation.recovery);assert.equal(after.owner_validation.readback,undefined);assert.deepEqual(after.owner_audit.slice(0,-1),before.owner_audit);assert.equal(result.row.claim_execution,receipt.claim_execution);assert.equal(result.row.provider_draft_id,draftId);assert.equal(result.row.sent,false);assert.equal(v.replay(result.row,approved,connection,'replay').provider_calls,0);
 assert.throws(()=>runGraph(graph,result.row,[]),/EXACT_RECOVERY_BASELINE/);assert.throws(()=>runGraph(graph,receipt,[]),/EXACT_RECOVERY_BASELINE/);assert.throws(()=>runGraph(graph,{...stopped,provider_draft_id:'wrong'},[]),/EXACT_RECOVERY_BASELINE/);
 for(const response of [{data:'invalid'},{data:'x'.repeat(1048577)},{error:'timeout'},{data:JSON.stringify({successful:false,data:{status:{code:200}}})}])assert.throws(()=>runGraph(graph,stopped,[response]),/OWNER_SCHEMA_DIAGNOSTIC_STOP/);
 assert.equal(graph.nodes.filter(n=>n.type.endsWith('.httpRequest')).length,1);assert.equal(graph.nodes.filter(n=>n.type.endsWith('.dataTable')&&n.parameters.operation==='update').length,1);assert.equal(graph.active,false);assert.equal(graph.nodes.find(n=>n.type.endsWith('.httpRequest')).parameters.options.response.response.responseFormat,'text');
});
test('observed folders mapping retains exact account, unique Drafts folder and lossless ID checks',()=>{
 const f=JSON.parse(folder().data).data,mapped=rows=>({successful:true,error:null,data:{status:{code:200},folders:rows}});
 assert.deepEqual(v.folders(mapped(f),connection),v.folders(folder(),connection));
 for(const rows of [null,{},[],[f[0],f[0]],[{...f[0],folderId:900000000000000001}],[{...f[0],URI:f[0].URI.replace(connection.account_id,'987')}],[{...f[0],folderName:'Sent'}],[{...f[0],path:'/Sent'}],[{...f[0],isArchived:1}]])assert.throws(()=>v.folders(mapped(rows),connection));
 assert.throws(()=>v.folders({successful:true,data:{status:{code:200},data:f,folders:f}},connection),/AMBIGUOUS_FOLDER_PAYLOAD/);
 for(const response of [{successful:false,data:{status:{code:200},folders:f}},{successful:true,error:'denied',data:{status:{code:200},folders:f}},{successful:true,data:{folders:f}},{successful:true,data:{status:{code:500},folders:f}},{successful:true,data:{status:{code:200},folderList:f}}])assert.throws(()=>v.folders(response,connection));
 assert.throws(()=>v.data(mapped(f)),/ZOHO_DATA_REQUIRED/);
});
test('corrected readback appends a fresh attempt after the exact schema probe without erasing prior stops',()=>{
 const {receipt}=setup(),request=v.recoveryRequest(receipt,approved,connection,0,'recovery'),stopped=v.recoveryCheckpoint(receipt,approved,connection,0,request,{data:JSON.stringify({successful:true,data:{status:{code:200}}})},'recovery',now),builder=require('../scripts/build-owner-draft-validation');
 const f=JSON.parse(folder().data).data,mapped={data:JSON.stringify({successful:true,data:{status:{code:200},folders:f}})},diagnostic=runGraph(builder.buildSchemaDiagnostic(approved,connection,'synthetic-table',{id:'synthetic-credential',name:'Synthetic API'},stopped),stopped,[mapped]);
 const graph=builder.buildRecovery(approved,connection,'synthetic-table',{id:'synthetic-credential',name:'Synthetic API'},diagnostic.row),result=runGraph(graph,diagnostic.row,[mapped,{data:JSON.stringify(wrap(head()))},{data:JSON.stringify(wrap({messageId:draftId,content:z.renderDraftHtml(approved.body)}))}]),before=JSON.parse(diagnostic.row.payload),after=JSON.parse(result.row.payload);
 assert.equal(result.calls,3);assert.equal(result.writes,3);assert.equal(result.output.verification.unsent_verified,true);assert.equal(result.output.replay.duplicate_prevention,true);assert.deepEqual(after.owner_validation.recovery,before.owner_validation.recovery);assert.deepEqual(after.owner_validation.schema_probe,before.owner_validation.schema_probe);assert.deepEqual(after.owner_audit.slice(0,before.owner_audit.length),before.owner_audit);assert.equal(after.owner_validation.readback_recovery.reads.length,3);assert.equal(result.row.claim_execution,receipt.claim_execution);
 assert.throws(()=>v.recoveryRequest(result.row,approved,connection,0,'another'),/EXACT_EXISTING_DRAFT/);
 const q=require('../scripts/phase2-cloud-queue');for(const patch of [{outcome:'STOP'},{request_hash:'wrong'},{tool:v.READ_TOOLS[1]},{verification_complete:true},{schema:{native_success:false,known_field_types:{folders:'array'},payload_type:'undefined'}}]){const altered=structuredClone(before);Object.assign(altered.owner_validation.schema_probe,patch);const bad={...q.pack(altered,{reviewer:diagnostic.row.reviewer,reviewed_hash:diagnostic.row.reviewed_hash,claim_execution:diagnostic.row.claim_execution}),id:1};assert.throws(()=>v.recoveryRequest(bad,approved,connection,0,'next'),/EXACT_SCHEMA_CONTINUATION/);}
});
