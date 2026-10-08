'use strict';
const fs=require('node:fs');
const {bundle}=require('./build-workflows');
const {ENDPOINT,scopeFor}=require('./composio-zoho');
const SETTINGS={executionOrder:'v1',timezone:'Asia/Manila',saveManualExecutions:false,saveDataSuccessExecution:'none',saveDataErrorExecution:'none',executionTimeout:90,availableInMCP:true};
function payloadCode(envelope=null){return envelope?'return [{json:'+JSON.stringify(envelope)+'}];':'throw new Error("EXPLICIT_APPROVAL_AND_LOCAL_LEDGER_CLAIM_REQUIRED");';}
function build({scope=null,credential={id:'pKhUbAxQ1lefPvd3',name:'Composio API'}}={}){
 const nodes=[
  {name:'Run manually after approval',type:'n8n-nodes-base.manualTrigger',typeVersion:1,parameters:{},position:[0,0]},
  {name:'One approved ledger claim',type:'n8n-nodes-base.code',typeVersion:2,parameters:{mode:'runOnceForAllItems',jsCode:payloadCode()},position:[240,0]},
  {name:'Check approved one record',type:'n8n-nodes-base.code',typeVersion:2,parameters:{mode:'runOnceForAllItems',jsCode:bundle('composio-zoho')+'const items=$input.all(); if(items.length!==1)throw new Error("ONE_RECORD_ONLY"); return [{json:arc.guardEnvelope(items[0].json,'+JSON.stringify(scope)+')}];'},position:[480,0]},
  {name:'Block previously claimed provider key',type:'n8n-nodes-base.removeDuplicates',typeVersion:2,parameters:{operation:'removeItemsSeenInPreviousExecutions',logic:'removeItemsWithAlreadySeenKeyValues',dedupeValue:'={{ $json.draft_key }}',options:{scope:'node',historySize:10000}},position:[720,0]},
  {name:'Composio CREATE_DRAFT only',type:'n8n-nodes-base.httpRequest',typeVersion:4.2,parameters:{method:'POST',url:ENDPOINT,authentication:'genericCredentialType',genericAuthType:'httpHeaderAuth',sendBody:true,contentType:'json',specifyBody:'json',jsonBody:'={{ $json.request }}',options:{timeout:30000,allowUnauthorizedCerts:false,redirect:{redirect:{followRedirects:false}},response:{response:{neverError:true,responseFormat:'json'}}}},credentials:{httpHeaderAuth:credential},disabled:true,retryOnFail:false,onError:'continueRegularOutput',position:[960,0]},
  {name:'Minimal provider receipt',type:'n8n-nodes-base.code',typeVersion:2,parameters:{mode:'runOnceForAllItems',jsCode:bundle('composio-zoho')+'const items=$input.all(); if(items.length!==1)throw new Error("ONE_RESULT_ONLY"); return [{json:arc.normalizedReceipt($("Check approved one record").first().json,items[0].json)}];'},position:[1200,0]}
 ];
 const connections={};for(let i=0;i<nodes.length-1;i++)connections[nodes[i].name]={main:[[{node:nodes[i+1].name,type:'main',index:0}]]};
 const workflow={name:'Arc | Phase 2 MVP | Zoho draft transport',active:false,nodes,connections,settings:SETTINGS};
 const samples=[{}, {}, {request:{},draft_key:'fixture'}, {request:{},draft_key:'fixture'}, {successful:true,data:{}}, {status:'UNKNOWN_PROVIDER_RESULT',sent:false}];
 let sdk="import {workflow,node,trigger,expr} from '@n8n/workflow-sdk';\n";
 sdk+=nodes.map((n,i)=>{
  const config={name:n.name,parameters:n.parameters,...(n.credentials?{credentials:n.credentials}:{}),...('disabled'in n?{disabled:n.disabled}:{}),...('retryOnFail'in n?{retryOnFail:n.retryOnFail,onError:n.onError}:{} )};
  const serialized=JSON.stringify(config).replace(JSON.stringify('={{ $json.request }}'),"expr('{{ $json.request }}')").replace(JSON.stringify('={{ $json.draft_key }}'),"expr('{{ $json.draft_key }}')");
  return 'const transport'+i+' = '+(i?'node':'trigger')+'({type:'+JSON.stringify(n.type)+',version:'+n.typeVersion+',config:'+serialized+',output:'+JSON.stringify([samples[i]])+'});';
 }).join('\n');
 sdk+='\nexport default workflow("arc-zoho-draft-transport",'+JSON.stringify(workflow.name)+').add(transport0).to(transport1).to(transport2).to(transport3).to(transport4).to(transport5);';
 return {workflow,sdk};
}
if(require.main===module){
 const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync('private/phase2/draft-queue.sqlite',{readOnly:true});
 const d=db.prepare('SELECT payload FROM drafts WHERE id=?').get(process.argv[2]);db.close();if(!d)throw new Error('EXPLICIT_DRAFT_KEY_REQUIRED');
 const result=build({scope:scopeFor(JSON.parse(d.payload))});fs.mkdirSync('private/phase2/composio',{recursive:true});
 fs.writeFileSync('private/phase2/composio/workflow.json',JSON.stringify(result.workflow,null,2));fs.writeFileSync('private/phase2/composio/workflow.sdk.js',result.sdk);
 console.log('Generated inactive, disarmed one-record CREATE_DRAFT transport.');
}
module.exports={build,payloadCode,SETTINGS};
