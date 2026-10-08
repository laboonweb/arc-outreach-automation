'use strict';
// Build a reviewable patch against retained Cloud snapshots. A separately read
// current manifest must prove that the graph, controls and credentials match.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {bundle}=require('./build-workflows'),base=require('./build-phase2-cloud');
const root=path.join(__dirname,'..'),dir=path.join(root,'private/integrity-audit');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const fnv=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0).toString(16);};
function split(code){const m=/^const arc = __load\("\.\/([^"\r\n]+)"\);\r?\n/m.exec(code);return m?{entry:m[1],suffix:code.slice(m.index+m[0].length)}:{suffix:code};}
function boundary(nodes){return fnv(JSON.stringify(nodes.map(n=>({...n,parameters:n.parameters?.jsCode?{...n.parameters,jsCode:'CODE'}:n.parameters}))));}
function panelReads(w){
 const registry=JSON.stringify(base.datasets()),checkFile=path.join(dir,'operational-check-history.json'),checkHistory=fs.existsSync(checkFile)?JSON.stringify(read(checkFile)):'[]',names=['Retain diagnostic render context','Prepare held diagnostic index','Read held research index','Prepare held exact research','Read held exact research','Attach current held diagnostics'];
 const codes=[base.code(names[0],'return $input.all();'),base.code(names[1],bundle('phase2-panel-diagnostics')+'return arc.indexRequests($("'+names[0]+'").first().json,'+registry+').map(json=>({json}));'),{...base.read(names[2],'={{ $json.url }}'),typeVersion:4.5},base.code(names[3],bundle('phase2-panel-diagnostics')+'return arc.exactRequests($("'+names[0]+'").first().json,$input.all().map(i=>i.json),'+registry+').map(json=>({json}));'),{...base.read(names[4],'={{ $json.url }}'),typeVersion:4.5},base.code(names[5],bundle('phase2-panel-diagnostics')+'return [{json:arc.attach($("'+names[0]+'").first().json,$input.all().map(i=>i.json),$("'+names[2]+'").all().map(i=>i.json),'+registry+',undefined,'+checkHistory+')}];')];
 for(const [i,n]of codes.entries()){n.position=[800+i*240,1600];n.id='integrity-'+i;if(n.credentials)n.credentials=w.nodes.find(x=>x.credentials?.googleSheetsOAuth2Api)?.credentials;}
 for(const from of ['Current render context','Refreshed render context']){const edges=w.connections[from].main[0];assert.equal(edges.filter(e=>e.node==='Render operator panel').length,1);edges.find(e=>e.node==='Render operator panel').node=names[0];}
 for(let i=0;i<names.length;i++)w.connections[names[i]]={main:[[{node:names[i+1]||'Render operator panel',type:'main',index:0}]]};
 w.nodes.push(...codes);const group=w.nodeGroups?.find(g=>g.name==='Review one decision and show the panel');if(group){group.nodeNames.push(...names);group.description='GET renders canonical held diagnostics. POST reuses existing Inbox gates and one-record persistence. No provider or send nodes.';}return codes;
}
function build(){
 const manifest=read(path.join(dir,'live-workflow-metadata.json')),files={worker:'phase1worker',parent:'parent',draft:'draft',panel:'panel',copy:'copy',sync:'sync',review:'review',zoho:'zoho'},summary=[];
 for(const [stem,file]of Object.entries(files)){
  const p=read(path.join(root,'private/production-release',file+'-before.json')),original=p.workflow||p,w=structuredClone(original),live=manifest.find(m=>m.id===w.id);
  assert.ok(live,'LIVE_WORKFLOW_MANIFEST_REQUIRED');assert.equal(fnv(JSON.stringify(w.connections)),live.graphHash);assert.equal(boundary(w.nodes),live.noncodeHash);
  const operations=[];
  for(const n of w.nodes){if(!n.parameters?.jsCode)continue;const s=split(n.parameters.jsCode),m=live.codes.find(c=>c.name===n.name);assert.equal(fnv(s.suffix),m.suffixHash,'CLOUD_CONTROL_CHANGED:'+n.name);if(!s.entry)continue;
   const loads=[...s.suffix.matchAll(/__load\(["']\.\/([^"']+)/g)].map(m=>m[1]);let suffix=s.suffix;
   if(stem==='panel'&&n.name==='Render operator panel'){
    const match=/\{\.\.\.(\{[\s\S]+?\}),feedback:input.feedback,notice:input.notice\}/.exec(suffix);assert.ok(match,'PANEL_RENDER_OPTIONS_REQUIRED');const opts=JSON.parse(match[1]);assert.equal(opts.js,fs.readFileSync(path.join(root,'review/panel.js'),'utf8'));opts.css=fs.readFileSync(path.join(root,'review/panel.css'),'utf8');suffix=suffix.replace(match[0],'{...'+JSON.stringify(opts)+',feedback:input.feedback,notice:input.notice,diagnosticsByKey:input.diagnosticsByKey}');
   }
   n.parameters={...n.parameters,jsCode:bundle([s.entry,...loads])+suffix};new (Object.getPrototypeOf(async function(){}).constructor)(n.parameters.jsCode);
   operations.push({type:'updateNodeParameters',nodeName:n.name,parameters:n.parameters});
  }
  if(stem==='panel'){const added=panelReads(w);for(const n of added)operations.push({type:'addNode',node:n});for(const source of ['Current render context','Refreshed render context']){operations.push({type:'removeConnection',source,target:'Render operator panel'},{type:'addConnection',source,target:added[0].name});}for(let i=0;i<added.length;i++)operations.push({type:'addConnection',source:added[i].name,target:added[i+1]?.name||'Render operator panel'});if(w.nodeGroups?.length)operations.push({type:'setNodeGroups',nodeGroups:w.nodeGroups});}
  w.versionId=live.versionId;w.active=false;delete w.activeVersion;delete w.activeVersionId;delete w.pinData;
  fs.writeFileSync(path.join(dir,stem+'-integrity-patch.json'),JSON.stringify({workflowId:live.id,expectedVersionId:live.versionId,wasActive:live.active,operations,workflow:w},null,2));
  fs.mkdirSync(path.join(dir,'operations'),{recursive:true});operations.forEach((operation,i)=>fs.writeFileSync(path.join(dir,'operations',stem+'-'+i+'.json'),JSON.stringify(operation)));
  summary.push({stem,id:live.id,expectedVersionId:live.versionId,wasActive:live.active,codeUpdates:operations.filter(o=>o.type==='updateNodeParameters').length,newReadOnlyNodes:operations.filter(o=>o.type==='addNode').length,operations:operations.length,nodeCount:w.nodes.length,graphPreserved:stem!=='panel',existingNoncodeParametersPreserved:true,controlSuffixPreserved:stem!=='panel',published:false});
 }
 fs.writeFileSync(path.join(dir,'patch-manifest.json'),JSON.stringify(summary,null,2));console.log(summary);
}
module.exports={build,split,boundary,panelReads};if(require.main===module)build();
