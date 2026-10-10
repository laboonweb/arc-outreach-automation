'use strict';
// Isolated administrative test only; production qualification is never bypassed.
const z=require('./composio-zoho'),q=require('./phase2-cloud-queue'),r=require('./phase2-cloud-review');
const {sha256}=require('./helpers');
const {draftIdentity}=require('./outreach-mvp');
const PURPOSE='OWNER_ONLY_TRANSPORT_VALIDATION';
function exact(row,approved,connection){
 if(!row||row.sent!==false||row.sent_at!==null||row.followup_due_at!==null)throw Error('OWNER_UNSENT_RECORD_REQUIRED');
 const d=JSON.parse(row.payload),packed=q.pack(d,{reviewer:row.reviewer,reviewed_hash:row.reviewed_hash,claim_execution:row.claim_execution});
 if(Object.keys(q.COLUMNS).some(k=>row[k]!==packed[k])||d.owner_validation?.purpose!==PURPOSE||d.owner_validation.connection_hash!==sha256(JSON.stringify(z.connectionConfig(connection)))||d.owner_validation.approved_request_hash!==approved.request_sha256||d.owner_validation.message_hash!==approved.message_hash||d.recipient!==approved.recipient||d.subject!==approved.subject||d.draft_body!==approved.body||d.approved_hash!==approved.message_hash||r.hash(d)!==approved.message_hash||approved.sender!==z.SENDER||approved.recipient!==z.SENDER)throw Error('EXACT_OWNER_APPROVAL_REQUIRED');
 if(sha256(JSON.stringify(z.buildExecuteRequest({from:approved.sender,to:approved.recipient,subject:approved.subject,body:approved.body},connection)))!==approved.request_sha256)throw Error('FROZEN_OWNER_REQUEST_REQUIRED');
 return d;
}
function initial(approved,connection,now=new Date().toISOString()){
 const lead_id='OWNER_TRANSPORT_TEST_20261010',identity=draftIdentity({lead_id},{channel:'EMAIL',recipient:approved.recipient},'owner-transport-validation-20261010','initial');
 const d={...identity,lead_id,business:'Owner transport validation',dataset_id:'OWNER_TEST',tier:'ADMINISTRATIVE_TEST',channel:'EMAIL',recipient:approved.recipient,subject:approved.subject,draft_body:approved.body,message_hash:approved.message_hash,approved_hash:approved.message_hash,approved_message:{recipient:approved.recipient,subject:approved.subject,body:approved.body},created_at:now,approved_at:now,review_status:'APPROVED',draft_status:'APPROVED',compliance_status:'OWNER_REQUESTED_ADMINISTRATIVE_TEST',sent_at:null,followup_due_at:null,owner_validation:{purpose:PURPOSE,connection_hash:sha256(JSON.stringify(z.connectionConfig(connection))),message_hash:approved.message_hash,approved_request_hash:approved.request_sha256},owner_audit:[{at:now,action:'OWNER_EXPLICIT_APPROVAL',reviewer:'Owner',message_hash:approved.message_hash}]};
 const row=q.pack(d,{reviewer:'Owner',reviewed_hash:approved.message_hash,claim_execution:''});exact(row,approved,connection);return row;
}
function claim(row,approved,connection,execution,now=new Date().toISOString()){
 const d=exact(row,approved,connection);
 if(row.state!=='APPROVED'||row.provider_status||row.provider_draft_id||d.claimed_at||d.claim_execution)throw Error('OWNER_REPLAY_BLOCKED');
 d.claimed_at=now;d.claim_execution=String(execution);d.provider_status='CLAIMED';d.draft_status='CLAIMED';
 d.owner_audit.push({at:now,action:'PROVIDER_CLAIM',execution:String(execution),message_hash:approved.message_hash});
 const out=q.pack(d,{reviewer:'Owner',reviewed_hash:approved.message_hash,claim_execution:String(execution)});
 r.request(out,connection,execution,now);return out;
}
function request(rows,expected,approved,connection,execution,now=new Date().toISOString()){
 if(rows.length!==1||rows[0].id!==expected.id||Object.keys(q.COLUMNS).some(k=>rows[0][k]!==expected[k]))throw Error('ONE_DURABLE_EXACT_CLAIM_REQUIRED');
 exact(rows[0],approved,connection);return r.request(rows[0],connection,execution,now);
}
function receipt(row,context,response,now=new Date().toISOString()){
 // Frozen normalization locks every ambiguous result without another CREATE.
 const out=r.receipt(row,context,response,now),d=JSON.parse(out.payload);
 d.owner_audit.push({at:now,action:'PROVIDER_RECEIPT',execution:context.claim_execution,status:out.provider_status,draft_id:out.provider_draft_id,message_hash:context.message_hash});
 return q.pack(d,{reviewer:'Owner',reviewed_hash:d.approved_hash,claim_execution:d.claim_execution});
}
function data(response){
 if(!response||typeof response!=='object'||Buffer.byteLength(JSON.stringify(response),'utf8')>1048576||response.successful!==true||response.error)throw Error('BOUNDED_PROVIDER_READ_REQUIRED');
 let d=response.data;for(let i=0;i<3&&typeof d==='string';i++){try{d=JSON.parse(d);}catch{throw Error('PROVIDER_JSON_REQUIRED');}}
 if(!d||typeof d!=='object'||Array.isArray(d))throw Error('ZOHO_ENVELOPE_OBJECT_REQUIRED');
 if(!d.status||typeof d.status!=='object')throw Error('ZOHO_STATUS_OBJECT_REQUIRED');
 if(typeof d.status.code!=='number')throw Error('ZOHO_STATUS_NUMBER_REQUIRED');
 if(d.status.code!==200)throw Error('ZOHO_STATUS_SUCCESS_REQUIRED');
 if(!Object.hasOwn(d,'data'))throw Error('ZOHO_DATA_REQUIRED');return d.data;
}
function schemaReceipt(response){
 const type=x=>x===null?'null':Array.isArray(x)?'array':typeof x;
 if(Buffer.byteLength(JSON.stringify(response)??'','utf8')>1048576)return {top_type:type(response),size_cap_exceeded:true};
 let d=response?.data,layers=0,parse_ok=true;
 for(;layers<3&&typeof d==='string';layers++){try{d=JSON.parse(d);}catch{parse_ok=false;break;}}
 return {top_type:type(response),successful:response?.successful===true,error_present:!!response?.error,data_type:type(response?.data),json_layers:layers,parse_ok,envelope_type:type(d),status_type:type(d?.status),status_code_type:type(d?.status?.code),native_success:d?.status?.code===200,payload_type:type(d?.data)};
}
function id(value){if(typeof value!=='string'||!/^\d+$/.test(value))throw Error('LOSSLESS_PROVIDER_ID_REQUIRED');return value;}
function folders(response,connection){
 const rows=data(response);if(!Array.isArray(rows))throw Error('DRAFTS_FOLDER_REQUIRED');
 const found=rows.filter(x=>x.folderType==='Drafts');
 if(found.length!==1||found[0].folderName!=='Drafts'||found[0].path!=='/Drafts'||found[0].isArchived!==0||found[0].URI!=='https://mail.zoho.'+(connection.region||'com')+'/api/accounts/'+connection.account_id+'/folders/'+id(found[0].folderId))throw Error('EXACT_DRAFTS_FOLDER_REQUIRED');
 return {folder_id:found[0].folderId,folder_type:'Drafts'};
}
function mailbox(value,expected){
 if(typeof value!=='string'||/[\r\n,;:]/.test(value))return false;
 if(value===expected)return true;
 const m=value.match(/^(?:"[^"<>@]*"|[^<>@"]*)\s*<([^<>]+)>$/);return !!m&&m[1]===expected;
}
function headers(response,draftId,approved){
 const d=data(response);if(id(d.messageId)!==draftId||!d.headerContent||typeof d.headerContent!=='object'||Array.isArray(d.headerContent))throw Error('EXACT_DRAFT_HEADERS_REQUIRED');
 const h={};for(const [key,value]of Object.entries(d.headerContent)){const k=key.toLowerCase();if(Object.hasOwn(h,k))throw Error('DUPLICATE_HEADER_REQUIRED_STOP');h[k]=value;}
 const one=k=>Array.isArray(h[k])&&h[k].length===1&&typeof h[k][0]==='string'?h[k][0]:null;
 if(!mailbox(one('from'),approved.sender)||!mailbox(one('to'),approved.recipient)||one('subject')!==approved.subject||['cc','bcc','resent-to','resent-cc','resent-bcc','resent-from','received'].some(k=>Object.hasOwn(h,k)))throw Error('EXACT_OWNER_HEADERS_REQUIRED');
 return {draft_id:draftId,sender_verified:true,recipient_verified:true,subject_verified:true};
}
function content(response,draftId,approved){
 const d=data(response);if(id(d.messageId)!==draftId||d.content!==z.renderDraftHtml(approved.body))throw Error('EXACT_DRAFT_CONTENT_REQUIRED');
 return {body_verified:true,html_hash:sha256(d.content),message_hash:approved.message_hash};
}
function verified(row,approved,connection,folder,header,body,execution,now=new Date().toISOString()){
 const d=exact(row,approved,connection);
 if(row.state!=='ZOHO_DRAFT_CREATED'||!row.provider_draft_id||header.draft_id!==row.provider_draft_id||folder.folder_type!=='Drafts'||!header.sender_verified||!header.recipient_verified||!header.subject_verified||!body.body_verified||body.message_hash!==approved.message_hash)throw Error('COMPLETE_DRAFT_READBACK_REQUIRED');
 d.owner_validation.readback={...folder,...header,...body,unsent_verified:true,execution:String(execution),at:now};
 d.owner_audit.push({at:now,action:'UNSENT_READBACK_VERIFIED',execution:String(execution),draft_id:row.provider_draft_id,message_hash:approved.message_hash});
 return q.pack(d,{reviewer:'Owner',reviewed_hash:d.approved_hash,claim_execution:d.claim_execution});
}
function replay(row,approved,connection,execution){
 try{claim(row,approved,connection,execution);}catch(e){if(e.message==='OWNER_REPLAY_BLOCKED')return {duplicate_prevention:true,provider_calls:0,row_mutations:0,state:row.state,draft_id:row.provider_draft_id,sent:false};throw e;}
 throw Error('REPLAY_DID_NOT_BLOCK');
}
module.exports={PURPOSE,exact,initial,claim,request,receipt,data,schemaReceipt,id,folders,headers,content,verified,replay};
