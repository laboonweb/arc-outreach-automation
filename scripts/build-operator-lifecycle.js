'use strict';
// Local exports only, against read-only current snapshots. No connector mutation.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{bundle}=require('./build-workflows'),{assets}=require('./build-phase2-panel');
const ROOT=path.join(__dirname,'../private/operator-lifecycle');
function compile(before,stem){
 const w=structuredClone(before.workflow||before),changed=[];
 for(const n of w.nodes){const code=n.parameters?.jsCode;if(!code)continue;const m=/^const arc = __load\("\.\/([^"\r\n]+)"\);\r?\n/m.exec(code);
  if(m){let suffix=code.slice(m.index+m[0].length);const loads=[...suffix.matchAll(/__load\(["']\.\/([^"']+)/g)].map(m=>m[1]);
   if(stem==='panel'&&n.name==='Existing Inbox review logic'){assert.ok(suffix.includes('{"mode":"PRODUCTION","cap":"ALL"'),'PANEL_CONTROL_OPTIONS_REQUIRED');suffix=suffix.replace('{"mode":"PRODUCTION","cap":"ALL"','{"operator_lifecycle_required":true,"mode":"PRODUCTION","cap":"ALL"');}
   if(stem==='panel'&&n.name==='Render operator panel'){
    const match=/\{\.\.\.(\{[\s\S]+?\}),feedback:input.feedback,notice:input.notice(?:,diagnosticsByKey:input.diagnosticsByKey)?\}/.exec(suffix);assert.ok(match,'PANEL_RENDER_OPTIONS_REQUIRED');const opts=JSON.parse(match[1]);Object.assign(opts,assets());suffix=suffix.replace(match[0],'{...'+JSON.stringify(opts)+',feedback:input.feedback,notice:input.notice,diagnosticsByKey:input.diagnosticsByKey}');
   }
   n.parameters={...n.parameters,jsCode:bundle([m[1],...loads])+suffix};
  }
  if(stem==='panel'&&n.name==='Refreshed render context')n.parameters.jsCode=n.parameters.jsCode.replace('feedback:[],notice:"Review saved. No email or DM was sent."','feedback:$("Existing Inbox review logic").first().json.errors||[],notice:$("Existing Inbox review logic").first().json.notice||"Review saved. No email or DM was sent."');
  if(n.parameters.jsCode!==code)changed.push(n.name);
  new (Object.getPrototypeOf(async function(){}).constructor)(n.parameters.jsCode);
 }
 if(stem==='zoho')for(const name of require('./build-phase2-cloud').guardProviderPersistence(w))if(!changed.includes(name))changed.push(name);
 assert.deepEqual(w.connections,(before.workflow||before).connections);
 for(const n of w.nodes){const prior=(before.workflow||before).nodes.find(x=>x.name===n.name),strip=x=>{const out=structuredClone(x);if(out.parameters?.jsCode)out.parameters.jsCode='CANONICAL_CODE';if(stem==='zoho'&&out.name==='Persist provider result')out.alwaysOutputData=true;return out;};assert.deepEqual(strip(n),strip(prior));}
 const added=stem==='panel'?require('./build-panel-ingress').attach(w):[];
 if(added.length&&!changed.includes('Decision request'))changed.push('Decision request');
 w.active=false;delete w.activeVersion;delete w.activeVersionId;delete w.pinData;
 return {workflow:w,changed,added:added.map(n=>n.name),proof:{graph_unchanged:!added.length,ingress_error_branch:!!added.length,existing_noncode_parameters_unchanged:stem!=='zoho',provider_receipt_write_guard:stem==='zoho',active:false,published:false,source_writes:0,provider_calls:0,emails_sent:0,dms_sent:0}};
}
function build(){const manifest=[];for(const stem of ['panel','draft','review','zoho','sync','copy']){const before=JSON.parse(fs.readFileSync(path.join(ROOT,stem+'-before.json'),'utf8')),result=compile(before,stem),sdk=require('./workflow-sdk-compact').compact(result.workflow);fs.writeFileSync(path.join(ROOT,stem+'-local.json'),JSON.stringify(result.workflow,null,2));fs.writeFileSync(path.join(ROOT,stem+'-local.sdk.js'),sdk);manifest.push({stem,id:before.id,expected_version:before.versionId,was_active:before.active,changed_nodes:result.changed,added_nodes:result.added,sdk_characters:sdk.length,...result.proof});}fs.writeFileSync(path.join(ROOT,'build-manifest.json'),JSON.stringify(manifest,null,2));return manifest;}
module.exports={compile,build};if(require.main===module)console.log(build().map(x=>({stem:x.stem,changed_nodes:x.changed_nodes.length,active:x.active,published:x.published})));
