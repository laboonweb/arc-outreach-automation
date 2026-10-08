'use strict';
// Rebundle only Phase 2 Code nodes against the currently captured Cloud graph.
// Keep every transport, credential, persistence filter and manual activation.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {bundle}=require('./build-workflows');
const root=path.join(__dirname,'..'),dir=path.join(root,'private/draft-send-separation');
function build(){
 const manifest=[];
 for(const stem of ['draft','copy','sync','panel','review','zoho']){
  const before=JSON.parse(fs.readFileSync(path.join(dir,stem+'-before.json'),'utf8')),w=structuredClone(before),operations=[];
  for(const n of w.nodes){if(!n.bundle_entry)continue;let suffix=n.code_suffix;
   if(stem==='panel'&&n.name==='Render operator panel'){
    const match=/\{\.\.\.(\{[\s\S]+?\}),feedback:input.feedback,notice:input.notice,diagnosticsByKey:input.diagnosticsByKey\}/.exec(suffix);assert.ok(match,'CURRENT_RENDER_OPTIONS_REQUIRED');const opts=JSON.parse(match[1]);opts.js=fs.readFileSync(path.join(root,'review/panel.js'),'utf8');opts.css=fs.readFileSync(path.join(root,'review/panel.css'),'utf8');suffix=suffix.replace(match[0],'{...'+JSON.stringify(opts)+',feedback:input.feedback,notice:input.notice,diagnosticsByKey:input.diagnosticsByKey}');
   }
   const extra=[...suffix.matchAll(/__load\(["']\.\/([^"']+)/g)].map(m=>m[1]);
   n.parameters={...n.parameters,jsCode:bundle([n.bundle_entry,...extra])+suffix};new (Object.getPrototypeOf(async function(){}).constructor)(n.parameters.jsCode);
   delete n.bundle_entry;delete n.code_suffix;
   operations.push({type:'updateNodeParameters',nodeName:n.name,parameters:n.parameters});
  }
  // The native completion receipt must count both reviewable draft states.
  if(stem==='draft'){
   const n=w.nodes.find(n=>n.name==='Queue result');n.parameters.jsCode=n.parameters.jsCode.replace('r.state===\"DRAFT_READY\"','[\"DRAFT_READY\",\"DRAFT_READY_SEND_BLOCKED\"].includes(r.state)');
   if(n.parameters.jsCode!==before.nodes.find(x=>x.name===n.name).parameters.jsCode)operations.push({type:'updateNodeParameters',nodeName:n.name,parameters:n.parameters});
  }
  const patch={workflowId:before.id,expectedVersionId:before.versionId,wasActive:before.active,operations,workflow:w};
  fs.writeFileSync(path.join(dir,stem+'-patch.json'),JSON.stringify(patch));
  fs.mkdirSync(path.join(dir,'operations'),{recursive:true});operations.forEach((op,i)=>fs.writeFileSync(path.join(dir,'operations',stem+'-'+i+'.json'),JSON.stringify(op)));
  manifest.push({stem,id:before.id,expectedVersionId:before.versionId,active:before.active,operations:operations.length,nodeCount:w.nodes.length,graphPreserved:JSON.stringify(w.connections)===JSON.stringify(before.connections),groupsPreserved:JSON.stringify(w.nodeGroups)===JSON.stringify(before.nodeGroups)});
 }
 fs.writeFileSync(path.join(dir,'patch-manifest.json'),JSON.stringify(manifest,null,2));console.log(JSON.stringify(manifest));return manifest;
}
module.exports={build};if(require.main===module)build();
