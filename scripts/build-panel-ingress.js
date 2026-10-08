'use strict';
const {bundle}=require('./build-workflows'),base=require('./build-phase2-cloud');
function attach(workflow){
 const decision=workflow.nodes.find(n=>n.name==='Decision request');
 if(!decision)throw Error('PANEL_INGRESS_REQUIRED');
 const match=/arc\.verifyToken\(body\?\.token,("(?:\\.|[^"\\])*")\)/.exec(decision.parameters.jsCode);
 if(!match)throw Error('PANEL_INGRESS_BASELINE_REQUIRED');
 const render=workflow.nodes.find(n=>n.name==='Render operator panel'),url=/"readUrl":("(?:\\.|[^"\\])*")/.exec(render.parameters.jsCode);
 if(!url)throw Error('PANEL_READ_URL_REQUIRED');
 decision.parameters={...decision.parameters,jsCode:bundle('phase2-panel-ingress')+'return [{json:arc.read($input.first().json.body,'+match[1]+')}];'};
 const gate={name:'Signed decision valid?',type:'n8n-nodes-base.if',typeVersion:2.3,position:[600,260],parameters:{conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict',version:2},conditions:[{leftValue:'={{ !$json.request.rejected }}',rightValue:true,operator:{type:'boolean',operation:'true'}}],combinator:'and'},options:{}}};
 const reply=base.code('Show invalid review session',bundle('phase2-panel-ingress')+'return [{json:{html:arc.rejection('+url[1]+')}}];');reply.position=[840,260];
 workflow.nodes.push(gate,reply);
 workflow.connections[decision.name]={main:[[{node:gate.name,type:'main',index:0}]]};
 workflow.connections[gate.name]={main:[[{node:'Panel request',type:'main',index:0}],[{node:reply.name,type:'main',index:0}]]};
 workflow.connections[reply.name]={main:[[{node:'Show review panel',type:'main',index:0}]]};
 return [gate,reply];
}
module.exports={attach};
