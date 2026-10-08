'use strict';
// Temporary, inactive provider validation utility. It cannot execute writes.
const fs=require('node:fs');
const {SETTINGS}=require('./build-zoho-draft-workflow');
const READ_TOOLS=new Set(['ZOHO_MAIL_ACCOUNTS_LIST_ACCOUNTS','ZOHO_MAIL_FOLDERS_LIST_FOLDERS','ZOHO_MAIL_MESSAGES_LIST_EMAILS','ZOHO_MAIL_MESSAGES_GET_MESSAGE_CONTENT']);
function build(tool,args,connectedAccount,projection,userId){
 if(!READ_TOOLS.has(tool))throw new Error('READ_ONLY_TOOL_REQUIRED');
 if(!/^ca_[A-Za-z0-9]+$/.test(connectedAccount))throw new Error('INVALID_CONNECTED_ACCOUNT');
 if(userId!==undefined&&(typeof userId!=='string'||!userId.trim()||userId.length>200||/[\r\n<>]/.test(userId)))throw new Error('INVALID_COMPOSIO_USER_ID');
 const parameters={method:'POST',url:'https://backend.composio.dev/api/v3.1/tools/execute/'+tool,authentication:'genericCredentialType',genericAuthType:'httpHeaderAuth',sendBody:true,contentType:'json',specifyBody:'json',jsonBody:JSON.stringify({connected_account_id:connectedAccount,...(userId?{user_id:userId}:{}),version:'20260915_00',arguments:args}),options:{timeout:30000,allowUnauthorizedCerts:false,redirect:{redirect:{followRedirects:false}},response:{response:{neverError:true,responseFormat:'json'}}}};
 const parser='const r=$input.first().json; if(r.successful!==true||r.error) return [{json:{successful:false,error_type:"PROVIDER_READ_FAILED"}}]; let d=r.data; for(let i=0;i<3&&typeof d==="string";i++)d=JSON.parse(d); if(d.status&&Number(d.status.code)!==200)return [{json:{successful:false,error_type:"ZOHO_READ_FAILED",status_code:d.status.code}}]; const data=d.data??d; '+projection;
 const nodes=[{name:'Manual read-only validation',type:'n8n-nodes-base.manualTrigger',typeVersion:1,parameters:{}},{name:'Composio read-only request',type:'n8n-nodes-base.httpRequest',typeVersion:4.2,parameters,credentials:{httpHeaderAuth:{id:'pKhUbAxQ1lefPvd3',name:'Composio API'}},retryOnFail:false,onError:'continueRegularOutput'},{name:'Bounded verification result',type:'n8n-nodes-base.code',typeVersion:2,parameters:{mode:'runOnceForAllItems',jsCode:parser}}];
 nodes[1].disabled=true;
 const workflow={name:'Arc | Phase 2 MVP | Zoho read-only validation',active:false,nodes,settings:SETTINGS};
 let sdk="import {workflow,node,trigger} from '@n8n/workflow-sdk';\n";
 sdk+=nodes.map((n,i)=>'const read'+i+' = '+(i?'node':'trigger')+'({type:'+JSON.stringify(n.type)+',version:'+n.typeVersion+',config:'+JSON.stringify({name:n.name,parameters:n.parameters,...(n.credentials?{credentials:n.credentials,retryOnFail:false,onError:'continueRegularOutput',disabled:true}:{})})+',output:[{}]});').join('\n');
 sdk+='\nexport default workflow("arc-zoho-read-validation",'+JSON.stringify(workflow.name)+').add(read0).to(read1).to(read2);';
 return {workflow,sdk};
}
if(require.main===module){const c=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const r=build(c.tool,c.arguments,c.connected_account_id,c.projection,c.user_id);fs.writeFileSync('private/phase2/composio/read-validation.json',JSON.stringify(r.workflow,null,2));fs.writeFileSync('private/phase2/composio/read-validation.sdk.js',r.sdk);console.log('Built inactive read-only verification helper.');}
module.exports={build,READ_TOOLS};
