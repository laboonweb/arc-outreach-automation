'use strict';
// Replace only embedded canonical JavaScript. Keep node parameters, renderer,
// credentials, connection graph and protection tables exactly as saved.
const fs=require('node:fs'),path=require('node:path');
const {bundle}=require('./build-workflows');
const {finish}=require('./build-phase2-inbox');
const dir=path.join(__dirname,'../private/phase2/copy-quality');
function rebundle(original){
 const w=structuredClone(original.workflow||original),operations=[];
 for(const n of w.nodes){
  const code=n.parameters?.jsCode;if(!code?.startsWith('const __nativeRequire = require;'))continue;
  const marker=/^const arc = __load\("\.\/([^"\r\n]+)"\);\r?\n/m.exec(code);
  if(!marker)throw new Error('BUNDLE_ENTRY_REQUIRED:'+n.name);
  const entry=marker[1];if(!/^phase2-/.test(entry))throw new Error('PHASE2_ENTRY_REQUIRED:'+entry);
  const parameters={...n.parameters,jsCode:bundle(entry)+code.slice(marker.index+marker[0].length)};
  if(parameters.jsCode!==code){operations.push({type:'updateNodeParameters',nodeName:n.name,parameters});n.parameters=parameters;}
 }
 return {workflow:w,operations,sdk:finish(w).sdk};
}
function save(stem){const input=JSON.parse(fs.readFileSync(path.join(dir,stem+'-before.json'),'utf8').replace(/^\uFEFF/,'')),result=rebundle(input);fs.writeFileSync(path.join(dir,stem+'-copy-patch.json'),JSON.stringify(result,null,2));return result;}
module.exports={rebundle,save};
if(require.main===module)for(const stem of ['sync','review','zoho','panel'])console.log(stem+': '+save(stem).operations.length+' code nodes');
