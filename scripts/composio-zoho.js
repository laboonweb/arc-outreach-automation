'use strict';
const {sha256}=require('./helpers');
const {SIGNATURE,draftIdentity}=require('./outreach-mvp');
const {validateEmail}=require('./email-validator');
const TOOL='ZOHO_MAIL_MESSAGES_CREATE_DRAFT';
const ENDPOINT='https://backend.composio.dev/api/v3.1/tools/execute/'+TOOL;
const VERSION='20260915_00';
const SENDER='briann@arcwebworks.com';
const FOOTER='If you would prefer no further messages from Arc Web Works, reply and I will stop.';
function assertSignature(body){
 if(typeof body!=='string'||body.split(SIGNATURE).length!==2||!body.endsWith(SIGNATURE+'\n\n'+FOOTER))throw new Error('EXACT_SIGNATURE_AND_FOOTER_REQUIRED');
}
function escapeHtml(text){return text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function renderDraftHtml(body){
 assertSignature(body);
 const prefix=body.slice(0,-(SIGNATURE+'\n\n'+FOOTER).length).replace(/\n+$/,'');
 const paragraphs=prefix?prefix.split('\n\n').map(p=>escapeHtml(p).replace(/\n/g,'<br>')):[];
 const signature=SIGNATURE.split('\n').map((line,i)=>i===5?'<a href="https://arcwebworks.com">'+escapeHtml(line)+'</a>':escapeHtml(line)).join('<br>');
 paragraphs.push(signature,escapeHtml(FOOTER));
 return '<div style="font-family: Verdana, Arial, Helvetica, sans-serif; font-size: 10px; line-height: 1.5;">'+paragraphs.map((p,i)=>'<p style="margin: 0 0 '+(i===paragraphs.length-1?'0':'10px')+';">'+p+'</p>').join('')+'</div>';
}
function connectionConfig(config){
 if(!config||typeof config.connected_account_id!=='string'||!/^ca_[A-Za-z0-9_-]+$/.test(config.connected_account_id)||typeof config.account_id!=='string'||!/^\d+$/.test(config.account_id))throw new Error('NON_SECRET_ACCOUNT_IDENTIFIERS_REQUIRED');
 if(config.region&&!['com','eu','in','com.au','jp','ca'].includes(config.region))throw new Error('INVALID_ZOHO_REGION');
 if(config.user_id!==undefined&&(typeof config.user_id!=='string'||!config.user_id.trim()||config.user_id.length>200||/[\r\n<>]/.test(config.user_id)))throw new Error('INVALID_COMPOSIO_USER_ID');
 return {connected_account_id:config.connected_account_id,account_id:config.account_id,...(config.user_id!==undefined?{user_id:config.user_id}:{}),...(config.region?{region:config.region}:{})};
}
function buildExecuteRequest(email,config){
 const c=connectionConfig(config);
 if(!email||email.from!==SENDER||!validateEmail(email.to).valid||typeof email.subject!=='string'||!email.subject||/[\r\n]/.test(email.subject))throw new Error('INVALID_APPROVED_EMAIL');
 assertSignature(email.body);
 return {connected_account_id:c.connected_account_id,...(c.user_id?{user_id:c.user_id}:{}),version:VERSION,arguments:{accountId:c.account_id,fromAddress:SENDER,toAddress:email.to,subject:email.subject,content:renderDraftHtml(email.body),mode:'draft',mailFormat:'html',encoding:'UTF-8',askReceipt:'no',...(c.region?{region:c.region}:{})}};
}
function emailPayload(d){return {to:d.recipient,subject:d.subject,body:d.draft_body,from:SENDER,idempotency_key:d.draft_key};}
function scopeFor(d){return {lead_id:d.lead_id,draft_key:d.draft_key,message_hash:d.message_hash,campaign:d.campaign,step:d.step};}
function envelopeFor(d,config,claimedAt){
 return {...scopeFor(d),channel:d.channel,approved_hash:d.approved_hash,approved:true,ledger_claim:'CLAIMED',claimed_at:claimedAt,expires_at:new Date(Date.parse(claimedAt)+5*60000).toISOString(),checks:{recipient_matches:true,compliance_satisfied:true,suppression_clear:true,contact_locks_clear:true,sent:false},email:emailPayload(d),connection:connectionConfig(config)};
}
function guardEnvelope(envelope,scope,now=new Date().toISOString()){
 if(!envelope||!scope||!scope.draft_key||Object.keys(scope).length!==5||Object.keys(scope).some(k=>envelope[k]!==scope[k])||envelope.channel!=='EMAIL'||envelope.approved!==true||envelope.ledger_claim!=='CLAIMED'||
  !Number.isFinite(Date.parse(envelope.claimed_at))||Date.parse(envelope.claimed_at)>Date.parse(now)||Date.parse(envelope.expires_at)<=Date.parse(now)||Date.parse(envelope.expires_at)-Date.parse(envelope.claimed_at)>5*60000)throw new Error('APPROVED_ONE_RECORD_CLAIM_REQUIRED');
 const checks=envelope.checks;
 if(!checks||checks.recipient_matches!==true||checks.compliance_satisfied!==true||checks.suppression_clear!==true||checks.contact_locks_clear!==true||checks.sent!==false)throw new Error('PROVIDER_GATE');
 const e=envelope.email,identity=draftIdentity({lead_id:envelope.lead_id},{channel:'EMAIL',recipient:e?.to},envelope.campaign,envelope.step);
 if(identity.draft_key!==scope.draft_key||e?.idempotency_key!==scope.draft_key||sha256(JSON.stringify(['EMAIL',e?.to,e?.subject,e?.body]))!==scope.message_hash||envelope.approved_hash!==scope.message_hash)throw new Error('EXACT_CONTENT_APPROVAL_REQUIRED');
 return {request:buildExecuteRequest(e,envelope.connection),draft_key:scope.draft_key,message_hash:scope.message_hash,claimed_at:envelope.claimed_at};
}
function parseObject(value){if(typeof value==='string'){if(value.length>100000)throw new Error('AMBIGUOUS_DRAFT_RESULT');try{return JSON.parse(value);}catch{throw new Error('AMBIGUOUS_DRAFT_RESULT');}}return value;}
function parseCreateDraftResult(response){
 const r=parseObject(response);
 if(!r||r.successful!==true||r.error)throw new Error('AMBIGUOUS_DRAFT_RESULT');
 const data=parseObject(r.data),message=parseObject(data?.data)||data;
 if(data?.status?.code!==undefined&&data.status.code!==200)throw new Error('AMBIGUOUS_DRAFT_RESULT');
 if(typeof message?.messageId!=='string'||!message.messageId.trim()||message.mode&&message.mode!=='draft')throw new Error('AMBIGUOUS_DRAFT_RESULT');
 return {draft_id:message.messageId};
}
function normalizedReceipt(context,response){
 const base={draft_key:context.draft_key,message_hash:context.message_hash,claimed_at:context.claimed_at,tool:TOOL,sent:false};
 try{return {...base,status:'ZOHO_DRAFT_CREATED',...parseCreateDraftResult(response)};}
 catch{return {...base,status:'UNKNOWN_PROVIDER_RESULT',reconciliation_required:true};}
}
function createComposioAdapter(config,executeManual){
 const connection=connectionConfig(config);
 if(typeof executeManual!=='function')throw new Error('N8N_MANUAL_TRANSPORT_REQUIRED');
 return {tool:TOOL,mode:'CREATE_DRAFT_ONLY',async createDraft(email){return parseCreateDraftResult(await executeManual({tool:TOOL,url:ENDPOINT,body:buildExecuteRequest(email,connection)}));}};
}
module.exports={TOOL,ENDPOINT,VERSION,SENDER,FOOTER,assertSignature,escapeHtml,renderDraftHtml,connectionConfig,buildExecuteRequest,emailPayload,scopeFor,envelopeFor,guardEnvelope,parseCreateDraftResult,normalizedReceipt,createComposioAdapter};
