'use strict';
const fs=require('node:fs');const path=require('node:path');const {bundle}=require('./build-workflows');
function build(selection){
 if(selection.reduce((n,s)=>n+s.cases.length,0)!==10)throw new Error('FIXED_TEN_REQUIRED');
 const requests=selection.map(s=>({url:'https://sheets.googleapis.com/v4/spreadsheets/'+s.spreadsheet_id+'/values:batchGet?'+["'Arc Research'!1:1",...s.cases.map(c=>"'Arc Research'!"+c.row+':'+c.row)].map(r=>'ranges='+encodeURIComponent(r)).join('&')+'&valueRenderOption=UNFORMATTED_VALUE'}));
 const nodes=[{name:'Run manually',type:'n8n-nodes-base.manualTrigger',typeVersion:1,parameters:{},position:[0,0]},
 {name:'Prepare selected Arc reads',type:'n8n-nodes-base.code',typeVersion:2,parameters:{mode:'runOnceForAllItems',jsCode:'return '+JSON.stringify(requests)+'.map(json=>({json}));'},position:[240,0]},
 {name:'Read only selected Arc rows',type:'n8n-nodes-base.httpRequest',typeVersion:4.2,parameters:{method:'GET',url:'={{ $json.url }}',authentication:'predefinedCredentialType',nodeCredentialType:'googleSheetsOAuth2Api',options:{timeout:60000,redirect:{redirect:{followRedirects:false}},batching:{batch:{batchSize:1,batchInterval:1000}},response:{response:{responseFormat:'json'}}}},credentials:{googleSheetsOAuth2Api:{id:'UQzrFhk94U9e5MyD',name:'Google Sheets account'}},retryOnFail:false,position:[480,0]},
 {name:'Route and draft ten only',type:'n8n-nodes-base.code',typeVersion:2,parameters:{mode:'runOnceForAllItems',jsCode:bundle('outreach-intake')+'return [{json:arc.preview($input.all().map(i=>i.json),'+JSON.stringify(selection)+')}];'},position:[720,0]}];
 const connections={};for(let i=0;i<nodes.length-1;i++)connections[nodes[i].name]={main:[[{node:nodes[i+1].name,type:'main',index:0}]]};
 const workflow={name:'Arc | Phase 2 MVP | Ten lead draft validation',active:false,nodes,connections,settings:{executionOrder:'v1',timezone:'Asia/Manila',saveManualExecutions:false,saveDataSuccessExecution:'none',saveDataErrorExecution:'none',executionTimeout:180}};
 let sdk=nodes.map((n,i)=>'const n'+i+' = '+(i?'node':'trigger')+'({type:'+JSON.stringify(n.type)+',version:'+n.typeVersion+',config:'+JSON.stringify({name:n.name,parameters:n.parameters,...(n.credentials?{credentials:n.credentials}:{}),...('retryOnFail' in n?{retryOnFail:n.retryOnFail}:{})})+'});').join('\n');
 sdk+='\nexport default workflow("arc-phase2-ten",'+JSON.stringify(workflow.name)+').add(n0).to(n1).to(n2).to(n3).group("Draft validation",[n1,n2,n3],{description:"Read ten existing Arc Research rows, enforce history/evidence gates, and preview review drafts. No writes or sends."});';
 return {workflow,sdk};
}
if(require.main===module){const file=process.argv[2];if(!file)throw new Error('Private selection manifest path required');const result=build(JSON.parse(fs.readFileSync(file,'utf8')));fs.mkdirSync('private/phase2',{recursive:true});fs.writeFileSync('private/phase2/workflow.json',JSON.stringify(result.workflow,null,2));fs.writeFileSync('private/phase2/workflow.sdk.js',result.sdk);console.log('Generated private fixed-ten read-only draft validation workflow.');}
module.exports={build};
