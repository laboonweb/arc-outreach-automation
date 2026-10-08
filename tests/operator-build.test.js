'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{compile}=require('../scripts/build-operator-lifecycle'),{compact}=require('../scripts/workflow-sdk-compact');
const root=path.join(__dirname,'../private/operator-lifecycle');
test('six exports preserve existing configuration except the explicit panel session guard and reconstruct exact SDK parameters',{skip:!['panel','draft','review','zoho','sync','copy'].every(stem=>fs.existsSync(path.join(root,stem+'-before.json')))&&'Requires the local ignored read-only workflow snapshots.'},()=>{
 for(const stem of ['panel','draft','review','zoho','sync','copy']){
  const file=path.join(root,stem+'-before.json');assert.ok(fs.existsSync(file),'Read-only baseline required: '+stem);const before=JSON.parse(fs.readFileSync(file,'utf8')),result=compile(before,stem),w=result.workflow,sdk=compact(w),configs=[],edges=[];
  const mock=c=>{configs.push(c);return {name:c.config.name,output:index=>({to:to=>{edges.push({from:c.config.name,index,to:to.name});return {};}})};},workflow={add(){return this;},group(){return this;}};
  vm.runInNewContext(sdk.replace(/^import .*?;\n/m,'').replace('export default workflow(','workflow('),{node:mock,trigger:mock,workflow:()=>workflow,expr:x=>'='+x});
  assert.equal(w.active,false);const preserved=structuredClone(w.connections);if(stem==='panel'){preserved['Decision request']=before.connections['Decision request'];for(const name of result.added)delete preserved[name];assert.deepEqual(result.added,['Signed decision valid?','Show invalid review session']);}assert.deepEqual(preserved,before.connections);assert.equal(configs.length,w.nodes.length);configs.forEach((c,i)=>assert.deepEqual(JSON.parse(JSON.stringify(c.config.parameters)),w.nodes[i].parameters));
  const expected=Object.entries(w.connections).flatMap(([from,c])=>c.main.flatMap((list,index)=>list.map(e=>({from,index,to:e.node}))));assert.deepEqual(edges,expected);
 }
});
test('rebuilt Cloud Code bundle executes the wording outcomes locally with the same guards',()=>{
 const {bundle}=require('../scripts/build-workflows'),probe=require('../scripts/validate-operator-wording'),context=vm.createContext({require,Date});
 vm.runInContext(bundle('phase2-operator-copy')+'globalThis.validator=arc;',context);const copy=require('../scripts/outreach-copy'),h=require('../scripts/research-history'),e=require('../scripts/phase2-operator-evidence');
 for(const c of probe.cases){
  const s=probe.fixture(c.observation,c.website),d=JSON.parse(s.queue[0].payload),fact=d.operator_workspace.evidence.find(f=>f.type===(c.website?'gap':'service'));
  d.subject=probe.NAME+': a clearer enquiry path';d.draft_body=copy.finalEmail(['Hi '+probe.NAME+' team,','Briann here from Arc Web Works.',c.opening||c.statement,c.proposal,c.addition,c.cta].filter(Boolean).join('\n\n'));d.operator_workspace.copy_claims=[{statement:c.statement,evidence_id:h.identity(fact)}];
  const issues=context.validator.validate(d,e.effective(s.research[0],d,probe.NOW),probe.NOW);assert.equal(issues.length===0,c.policy==='ALLOW',c.id+': '+JSON.stringify(issues));
 }
});
