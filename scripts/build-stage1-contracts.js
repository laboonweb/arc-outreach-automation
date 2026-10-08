'use strict';
const fs=require('node:fs'),path=require('node:path'),base=require('./build-phase2-cloud'),{bundle}=require('./build-workflows');
function build(){
 const root=path.resolve(__dirname,'../private/operator-stage1'),c=JSON.parse(fs.readFileSync(path.join(root,'config.json'))),state=JSON.parse(fs.readFileSync(path.join(root,'fixtures.json')));
 const w={name:c.prefix+' control',active:false,nodes:[base.manual()],connections:{},settings:{...base.SETTINGS,saveManualExecutions:true,saveDataSuccessExecution:'all',saveDataErrorExecution:'all',executionTimeout:60}};
 for(const [label,id,limit]of [['Queue',c.queue_table,8],['protections',c.lock_table,2],['Inbox',c.inbox_table,8],['links',c.inbox_links_table,8]]){
  w.nodes.push(base.table('Read synthetic '+label,id,'get',{returnAll:false,limit}));
  if(label!=='links')w.nodes.push(base.code('Retain synthetic '+label,'return [{json:{rows:$input.all().map(i=>i.json).filter(r=>r.id)}}];'));
 }
 w.nodes.push(base.code('Read-only engine contract receipt',bundle('phase2-stage1-contracts')+'const research='+JSON.stringify(state.research)+';return [{json:arc.run(research,$("Retain synthetic Queue").first().json.rows,$("Retain synthetic protections").first().json.rows,$("Retain synthetic Inbox").first().json.rows,$input.all().map(i=>i.json).filter(r=>r.id),new Date().toISOString())}];'));
 w.nodes.forEach((n,i)=>{n.position=[i*230,0];if(i<w.nodes.length-1)w.connections[n.name]={main:[[{node:w.nodes[i+1].name,type:'main',index:0}]]};});
 w.nodeGroups=[{name:'Bounded synthetic engine checks',nodeNames:w.nodes.slice(1).map(n=>n.name),description:'Read eight synthetic leads and two protections; run canonical modules on copies. No writes, HTTP, provider calls or sending.'}];
 // SDK output hints are illustrative only. Keep them small; runtime parameters
 // and the exact canonical Code strings remain unchanged.
 const sdk=require('./workflow-sdk-compact').compact(w).replace(/const fixtureOutput=\[[^\r\n]+\];/,'const fixtureOutput=[{"id":1,"rows":[],"checks":[]}];');fs.writeFileSync(path.join(root,'contracts.json'),JSON.stringify(w));fs.writeFileSync(path.join(root,'contracts.sdk.js'),sdk);return {nodes:w.nodes.length,sdk_characters:sdk.length};
}
module.exports={build};if(require.main===module)console.log(build());
