'use strict';
const fs=require('node:fs');const {bundle}=require('./build-workflows');const {metadataRequests}=require('./dataset-intake');
function build(config,{integrityOnly=false,disarmed=false}={}){
 const nodes=[];
 function code(name,jsCode){nodes.push({name,type:'n8n-nodes-base.code',typeVersion:2,parameters:{mode:'runOnceForAllItems',jsCode},position:[nodes.length*240,0]});}
 function get(name){nodes.push({name,type:'n8n-nodes-base.httpRequest',typeVersion:4.2,parameters:{method:'GET',url:'={{ $json.url }}',authentication:'predefinedCredentialType',nodeCredentialType:'googleSheetsOAuth2Api',options:{timeout:60000,redirect:{redirect:{followRedirects:false}},batching:{batch:{batchSize:1,batchInterval:1000}},response:{response:{responseFormat:'json'}}}},credentials:{googleSheetsOAuth2Api:{id:'UQzrFhk94U9e5MyD',name:'Google Sheets account'}},retryOnFail:false,position:[nodes.length*240,0]});}
 nodes.push({name:'Run source snapshot manually',type:'n8n-nodes-base.manualTrigger',typeVersion:1,parameters:{},position:[0,0]});
 code('Configure read-only registry','return [{json:'+JSON.stringify(config)+'}];');
 code('Prepare metadata reads','return '+JSON.stringify(metadataRequests(config))+'.map(json=>({json}));');
 get('Read workbook metadata');
 code('Prepare source grids',bundle('dataset-intake')+'return arc.gridRequests($input.all().map(i=>i.json),$("Configure read-only registry").first().json).map(json=>({json}));');
 get('Read source and Arc grids');
 code('Normalize routing snapshot',bundle('routing-snapshot')+`
 const snapshots=$input.all().map(i=>i.json),registry=$("Configure read-only registry").first().json,now=new Date().toISOString();
 const result=arc.normalizeSnapshots(snapshots,registry,now);
 const crypto=require('crypto');
 const hashes=snapshots.map(s=>({spreadsheet_id:s.spreadsheetId,sha256:crypto.createHash('sha256').update(JSON.stringify(s.sheets)).digest('hex')}));
 return [{json:{created_at:now,${integrityOnly?'lead_count:result.leads.length':'leads:result.leads.map(arc.projectLead)'},snapshot_hashes:hashes,source_writes:0,provider_calls:0,discovery_requests:0}}];`);
 if(disarmed)for(const n of nodes.filter(n=>n.type==='n8n-nodes-base.httpRequest'))n.disabled=true;
 const connections={};for(let i=0;i<nodes.length-1;i++)connections[nodes[i].name]={main:[[{node:nodes[i+1].name,type:'main',index:0}]]};
 const workflow={name:'Arc | Operational routing | Read-only source snapshot',active:false,nodes,connections,settings:{executionOrder:'v1',timezone:'Asia/Manila',saveManualExecutions:false,saveDataSuccessExecution:'none',saveDataErrorExecution:'none',executionTimeout:180}};
 let sdk="import { workflow, node, trigger, expr } from '@n8n/workflow-sdk';\n";
 sdk+=nodes.map((n,i)=>{const cfg={name:n.name,parameters:n.parameters,...(n.credentials?{credentials:n.credentials}:{}),...('retryOnFail' in n?{retryOnFail:n.retryOnFail}:{}),...(n.disabled?{disabled:true}:{})};const json=JSON.stringify(cfg).replace('"={{ $json.url }}"','expr("{{ $json.url }}")');return 'const n'+i+' = '+(i?'node':'trigger')+'({type:'+JSON.stringify(n.type)+',version:'+n.typeVersion+',config:'+json+'});';}).join('\n');
 sdk+='\nexport default workflow("arc-routing-snapshot",'+JSON.stringify(workflow.name)+').add(n0)'+nodes.slice(1).map((_,i)=>'.to(n'+(i+1)+')').join('')+';';
 return {workflow,sdk};
}
if(require.main===module){const {workflow,sdk}=build(JSON.parse(fs.readFileSync('config/datasets.json','utf8')),{integrityOnly:process.argv.includes('--integrity-only'),disarmed:process.argv.includes('--disarmed')});fs.mkdirSync('private/phase2/operations',{recursive:true});fs.writeFileSync('private/phase2/operations/snapshot.workflow.json',JSON.stringify(workflow,null,2));fs.writeFileSync('private/phase2/operations/snapshot.sdk.js',sdk);console.log('Read-only routing snapshot built: seven nodes, GET only.');}
module.exports={build};
