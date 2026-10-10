'use strict';
// Read-only Stage 2 validation; never used to qualify prospects or authorize a send.
function verifyOwnerAccount(response,expected,request){
 if(!expected||['connected_account_id','account_id','user_id','region','primary_identity','mailbox','sender','recipient'].some(k=>typeof expected[k]!=='string'||!expected[k]||/[\r\n<>]/.test(expected[k]))||
  !/^ca_[A-Za-z0-9_-]+$/.test(expected.connected_account_id)||!/^\d+$/.test(expected.account_id)||!['com','eu','in','com.au','jp','ca'].includes(expected.region)||expected.sender!==expected.mailbox||expected.recipient!==expected.mailbox)throw Error('OWNER_TEST_SCOPE_REQUIRED');
 if(!request||request.connected_account_id!==expected.connected_account_id||request.user_id!==expected.user_id||request.version!=='20260915_00'||request.arguments?.region!==expected.region||Object.keys(request.arguments).join(',')!=='region'||Object.keys(request).some(k=>!['connected_account_id','user_id','version','arguments'].includes(k)))throw Error('OWNER_CONNECTED_ACCOUNT_BINDING_STOP');
 if(!response||typeof response!=='object'||Array.isArray(response))throw Error('PROVIDER_RESPONSE_TYPE_STOP');
 if(Buffer.byteLength(JSON.stringify(response),'utf8')>1048576)throw Error('PROVIDER_RESPONSE_SIZE_STOP');
 if(response.successful!==true||response.error)throw Error('PROVIDER_ACCOUNT_READ_FAILED');
 let data=response.data;
 for(let i=0;i<3&&typeof data==='string';i++){try{data=JSON.parse(data);}catch{throw Error('PROVIDER_ACCOUNT_JSON_STOP');}}
 if(!data||typeof data!=='object'||Array.isArray(data)||Number(data.status?.code)!==200||!Array.isArray(data.data))throw Error('ZOHO_ACCOUNT_SCHEMA_STOP');
 const matches=data.data.filter(a=>a?.accountId===expected.account_id);
 if(matches.length!==1)throw Error('EXACTLY_ONE_CONFIGURED_ACCOUNT_REQUIRED');
 const account=matches[0];
 const failures=[['PRIMARY_IDENTITY',account.primaryEmailAddress===expected.primary_identity],['MAILBOX_ADDRESS',account.mailboxAddress===expected.mailbox],['ACCOUNT_TYPE',account.type==='ZOHO_ACCOUNT'],['ENABLED',account.enabled===true],['STATUS',account.status===true],['MAILBOX_STATUS',account.mailboxStatus==='enabled']].filter(([,ok])=>!ok).map(([name])=>name);
 if(failures.length)throw Error('OWNER_ACCOUNT_CHECKS_FAILED:'+failures.join(','));
 for(const [label,address] of [['SENDER',expected.sender],['RECIPIENT',expected.recipient]]){
  const entries=Array.isArray(account.emailAddress)?account.emailAddress.filter(e=>e?.mailId===address):[];
  if(entries.length!==1||entries[0].isConfirmed!==true)throw Error('OWNER_'+label+'_ASSOCIATION_UNCONFIRMED');
 }
 const senders=Array.isArray(account.sendMailDetails)?account.sendMailDetails.filter(s=>s?.fromAddress===expected.sender):[];
 // Zoho's native mailbox sender can have validated=false; require confirmed membership and active mailbox mode.
 if(senders.length!==1||senders[0].mode!=='mailbox'||senders[0].status!==true)throw Error('OWNER_SENDER_NOT_ENABLED');
 if(account.smtpStatus!==true||account.outgoingBlocked!==false||account.incomingBlocked!==false)throw Error('OWNER_MAIL_ROUTE_BLOCKED_OR_UNKNOWN');
 return {status:'OWNER_ACCOUNT_VERIFIED',connected_account_verified:true,primary_identity_verified:true,mailbox_verified:true,sender_verified:true,recipient_verified:true,read_only:true,create_calls:0};
}
module.exports={verifyOwnerAccount};
