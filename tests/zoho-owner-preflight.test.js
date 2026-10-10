'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {verifyOwnerAccount}=require('../scripts/zoho-owner-preflight');
const expected={connected_account_id:'ca_fixture',account_id:'9007199254740993123',user_id:'fixture-user',region:'com',primary_identity:'identity@example.com',mailbox:'mailbox@example.com',sender:'mailbox@example.com',recipient:'mailbox@example.com'};
const request={connected_account_id:expected.connected_account_id,user_id:expected.user_id,version:'20260915_00',arguments:{region:expected.region}};
function fixture(){return {successful:true,data:{status:{code:200},data:[{accountId:expected.account_id,primaryEmailAddress:expected.primary_identity,mailboxAddress:expected.mailbox,type:'ZOHO_ACCOUNT',enabled:true,status:true,mailboxStatus:'enabled',emailAddress:[{mailId:expected.sender,isPrimary:true,isAlias:false,isConfirmed:true}],sendMailDetails:[{fromAddress:expected.sender,mode:'mailbox',status:true,validated:false}],smtpStatus:true,outgoingBlocked:false,incomingBlocked:false}]}};}
test('separate primary identity and native outgoing sender require independent live evidence',()=>{
 const response=fixture(),before=JSON.stringify(response),result=verifyOwnerAccount(response,expected,request);
 assert.equal(result.status,'OWNER_ACCOUNT_VERIFIED');assert.equal(result.sender_verified,true);assert.equal(result.recipient_verified,true);assert.equal(result.create_calls,0);
 assert.equal(JSON.stringify(response),before);assert.ok(!JSON.stringify(result).includes('@'));assert.ok(!JSON.stringify(result).includes(expected.account_id));
});
test('same primary and sender remain supported without widening owner recipient scope',()=>{
 const response=fixture();response.data.data[0].primaryEmailAddress=expected.sender;
 assert.equal(verifyOwnerAccount(response,{...expected,primary_identity:expected.sender},request).status,'OWNER_ACCOUNT_VERIFIED');
 assert.throws(()=>verifyOwnerAccount(response,{...expected,primary_identity:expected.sender,recipient:'prospect@example.com'},request),/OWNER_TEST_SCOPE_REQUIRED/);
});
test('a confirmed native mailbox alias also needs its own enabled sender entry',()=>{
 const response=fixture();Object.assign(response.data.data[0].emailAddress[0],{isPrimary:false,isAlias:true});
 assert.equal(verifyOwnerAccount(response,expected,request).status,'OWNER_ACCOUNT_VERIFIED');
 response.data.data[0].sendMailDetails=[];assert.throws(()=>verifyOwnerAccount(response,expected,request),/OWNER_SENDER_NOT_ENABLED/);
});
test('wrong connected account, Composio user, region, version and added request arguments fail closed',()=>{
 for(const change of [{connected_account_id:'ca_other'},{user_id:'other-user'},{version:'other'},{arguments:{region:'eu'}},{arguments:{region:'com',mode:'send'}},{unreviewed_override:true}])assert.throws(()=>verifyOwnerAccount(fixture(),expected,{...request,...change}),/BINDING_STOP/);
});
test('missing expected identity or connected selectors cannot become an owner whitelist',()=>{
 for(const key of Object.keys(expected)){const changed={...expected};delete changed[key];assert.throws(()=>verifyOwnerAccount(fixture(),changed,request),/OWNER_TEST_SCOPE_REQUIRED/);}
});
test('wrong, unsafe numeric and duplicate provider account IDs cannot borrow another account sender',()=>{
 for(const id of ['123',Number(expected.account_id)]){const response=fixture();response.data.data[0].accountId=id;assert.throws(()=>verifyOwnerAccount(response,expected,request),/ONE_CONFIGURED_ACCOUNT/);}
 const response=fixture();response.data.data.push(structuredClone(response.data.data[0]));assert.throws(()=>verifyOwnerAccount(response,expected,request),/ONE_CONFIGURED_ACCOUNT/);
});
for(const [field,value,label]of [['primaryEmailAddress','wrong@example.com','PRIMARY_IDENTITY'],['mailboxAddress','wrong@example.com','MAILBOX_ADDRESS'],['type','IMAP_ACCOUNT','ACCOUNT_TYPE'],['enabled',false,'ENABLED'],['status',false,'STATUS'],['mailboxStatus','disabled','MAILBOX_STATUS']])test('rejects invalid account '+label+' without exposing its value',()=>{
 const response=fixture();response.data.data[0][field]=value;assert.throws(()=>verifyOwnerAccount(response,expected,request),new RegExp('OWNER_ACCOUNT_CHECKS_FAILED:'+label));
});
test('unconfirmed or missing sender/recipient association fails even when sender is listed',()=>{
 for(const entries of [[],[{mailId:expected.sender,isConfirmed:false}],[{mailId:'unrelated@example.com',isConfirmed:true}]]){const response=fixture();response.data.data[0].emailAddress=entries;assert.throws(()=>verifyOwnerAccount(response,expected,request),/ASSOCIATION_UNCONFIRMED/);}
 const response=fixture();response.data.data[0].emailAddress.push({...response.data.data[0].emailAddress[0]});assert.throws(()=>verifyOwnerAccount(response,expected,request),/ASSOCIATION_UNCONFIRMED/);
});
test('disabled, unrelated and external unverified sender routes never authorize an alias',()=>{
 for(const sender of [{fromAddress:expected.sender,mode:'mailbox',status:false},{fromAddress:'other@example.com',mode:'mailbox',status:true},{fromAddress:expected.sender,mode:'extfrom',status:true,validated:false}]){const response=fixture();response.data.data[0].sendMailDetails=[sender];assert.throws(()=>verifyOwnerAccount(response,expected,request),/SENDER_NOT_ENABLED/);}
 const response=fixture();response.data.data[0].sendMailDetails.push({...response.data.data[0].sendMailDetails[0]});assert.throws(()=>verifyOwnerAccount(response,expected,request),/SENDER_NOT_ENABLED/);
});
test('authorization on a different Zoho account cannot satisfy this configured mailbox',()=>{
 const response=fixture(),other=structuredClone(response.data.data[0]);other.accountId='456';response.data.data[0].sendMailDetails=[];response.data.data.push(other);assert.throws(()=>verifyOwnerAccount(response,expected,request),/SENDER_NOT_ENABLED/);
});
test('blocked and unknown incoming/outgoing routes are preserved',()=>{
 for(const [field,value]of [['smtpStatus',false],['outgoingBlocked',true],['incomingBlocked',true],['incomingBlocked',undefined]]){const response=fixture();response.data.data[0][field]=value;assert.throws(()=>verifyOwnerAccount(response,expected,request),/ROUTE_BLOCKED_OR_UNKNOWN/);}
});
test('provider authentication failures, invalid schema, truncation and oversized bodies stop',()=>{
 for(const response of [null,[],{successful:false},{successful:true,error:'fixture error'},{successful:true,data:'broken'}, {successful:true,data:{status:{code:401},data:[]}}, {successful:true,data:{status:{code:200},data:{}}}, {...fixture(),padding:'x'.repeat(1048577)}])assert.throws(()=>verifyOwnerAccount(response,expected,request));
 const response=fixture();response.data=JSON.stringify(response.data);assert.equal(verifyOwnerAccount(response,expected,request).status,'OWNER_ACCOUNT_VERIFIED');
});
test('the exact guard embedded in the Cloud Code node has the same outcome',()=>{
 const invoke=new Function('$input','Buffer',verifyOwnerAccount.toString()+';const items=$input.all();if(items.length!==1)throw Error("ONE_PROVIDER_RESPONSE_REQUIRED");return [{json:verifyOwnerAccount(items[0].json,'+JSON.stringify(expected)+','+JSON.stringify(request)+')}];');
 assert.equal(invoke({all:()=>[{json:fixture()}]},Buffer)[0].json.status,'OWNER_ACCOUNT_VERIFIED');assert.throws(()=>invoke({all:()=>[]},Buffer),/ONE_PROVIDER_RESPONSE_REQUIRED/);
});
