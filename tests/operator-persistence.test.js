'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{once}=require('node:events'),{start}=require('../scripts/phase2-operator-preview');
test('signed native-form save is durable after restart; stale or cross-origin submissions cannot replace it',async()=>{
 const root=path.resolve(__dirname,'../private/operator-lifecycle');fs.mkdirSync(root,{recursive:true});const dir=fs.mkdtempSync(path.join(root,'persistence-test-')),file=path.join(dir,'synthetic.json');let server;
 const launch=async()=>{server=start({port:0,file});await once(server,'listening');return 'http://127.0.0.1:'+server.address().port;};
 const close=()=>new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
 try{
  let base=await launch(),html=await (await fetch(base)).text(),form=/<form[^>]*data-form-id="1">([\s\S]*?)<\/form>/.exec(html)[1],token=/name="token" value="([^"]+)"/.exec(form)[1],original=JSON.parse(fs.readFileSync(file,'utf8')).research;
  const now=new Date().toISOString(),body=new URLSearchParams({id:'1',token,action:'SAVE_REEVALUATE',subject:'',draft:'Persisted native form working copy.',notes:'Synthetic persistence test.',compliance:'NOT_APPLICABLE',lifecycle:'1',reviewer:'Synthetic HTTP Tester',copy_claims:'[]',evidence:JSON.stringify({type:'identity',source_url:'https://www.facebook.com/arc-operator-fixture-0',observed_at:now,fact_date:now,excerpt:'Manual Research Fixture is the matching synthetic branch.',association_basis:'The synthetic source and displayed business match.',verified:true})});
  html=await (await fetch(base+'/action',{method:'POST',headers:{Origin:'null','Sec-Fetch-Site':'same-origin'},body})).text();assert.match(html,/Saved\. Current status: NEEDS_RESEARCH/);
  const saved=JSON.parse(fs.readFileSync(file,'utf8'));assert.deepEqual(saved.research,original);assert.equal(saved.queue[0].draft_body,'Persisted native form working copy.');assert.equal(JSON.parse(saved.queue[0].payload).operator_workspace.evidence.length,1);
  html=await (await fetch(base+'/action',{method:'POST',headers:{Origin:'https://example.org'},body})).text();assert.match(html,/fields the panel cannot edit/);assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),saved);
  html=await (await fetch(base+'/action',{method:'POST',headers:{Origin:base},body})).text();assert.match(html,/This item changed/);assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),saved);
  await close();base=await launch();html=await (await fetch(base)).text();assert.ok(html.includes('Persisted native form working copy.'));assert.ok(html.includes('Synthetic HTTP Tester'));assert.ok(html.includes('matching synthetic branch'));assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')).research,original);
 }finally{if(server?.listening)await close();const target=path.resolve(dir);assert.equal(path.dirname(target),root);fs.rmSync(target,{recursive:true,force:true});}
});
