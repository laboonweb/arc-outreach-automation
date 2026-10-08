'use strict';
// Local, ignored test manifests. Never export source/history fields to a search provider.
const fs=require('node:fs');
const path=require('node:path');
const read=f=>JSON.parse(fs.readFileSync(path.join('private',f),'utf8').replace(/^\uFEFF/,''));
function prepare(){
 const manifest=read('remaining-offline-manifest.json').slice(0,400);
 const all=read('workbook-inspection/normalized.json');
 const rows=Array.isArray(all)?all:all.leads;
 if(!Array.isArray(rows))throw Error('NORMALIZED_LEADS_REQUIRED');
 const calibrated=read('calibration-cloud-results.json').final.results;
 const low=calibrated.filter(x=>x.lead_quality==='LOW'&&/^(true|yes|1)$/i.test(String(x.research_required)));
 const cases=[];
 for(const d of ['AUSTRALIA','MANILA_LEGACY','MANILA_AUDIT_QUEUE']){
  const existing=low.filter(x=>x.dataset_id===d&&x.website_url).slice(0,d==='MANILA_AUDIT_QUEUE'?1:2);
  for(const prior of existing){const lead=rows.find(x=>x.lead_id===prior.lead_id);if(!lead)throw Error('SOURCE_ID_MISSING');cases.push({...lead,website_url:prior.website_url,previous_result:prior});}
  const pool=manifest.filter(x=>x.dataset_id===d&&!x.skip_research&&!cases.some(c=>c.lead_id===x.lead_id));
  const total=d==='MANILA_AUDIT_QUEUE'?9:8;
  const step=Math.max(1,Math.floor(pool.length/(total-existing.length)));
  for(let i=0;cases.filter(x=>x.dataset_id===d).length<total;i+=step)cases.push(pool[Math.min(i,pool.length-1)]);
 }
 if(cases.length!==25||new Set(cases.map(x=>x.lead_id)).size!==25)throw Error('INVALID_TEST_MANIFEST');
 fs.writeFileSync('private/discovery-test-cases.json',JSON.stringify(cases,null,2));
 console.log(JSON.stringify({cases:cases.length,datasets:Object.fromEntries(['AUSTRALIA','MANILA_LEGACY','MANILA_AUDIT_QUEUE'].map(d=>[d,cases.filter(x=>x.dataset_id===d).length])),websitePresent:cases.filter(x=>x.website_url).length}));
}
if(require.main===module)prepare();
module.exports={prepare};
