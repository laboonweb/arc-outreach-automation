'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {recalculateMachineDuplicates}=require('./duplicate-detection');
const {mergeResearch}=require('./operational-routing');
const {controls,integrity}=require('./run-operational-routing');
const {protectedReason}=require('./autonomous-discovery');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'private/autonomous-research');
function prepare(){
 fs.mkdirSync(dir,{recursive:true});if(fs.existsSync(path.join(dir,'selection.json')))throw Error('SELECTION_EXISTS_DO_NOT_RESELECT');
 const routing=JSON.parse(fs.readFileSync(path.join(root,'private/phase2/operations/routing.json'))),manifest=routing.source_snapshot;
 const rows=recalculateMachineDuplicates(manifest.files.flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,f))))).map(mergeResearch),byRoute=new Map(routing.records.map(r=>[r.lead_id,r]));
 const local=controls(),locked=new Set(local.drafts.filter(d=>d.review_status!=='UNREVIEWED'||d.sent_at||d.provider_draft_id).map(d=>d.lead_id));
 const pool=rows.map(r=>({...r,routing:byRoute.get(r.lead_id)?.routing})).filter(r=>r.routing==='NEEDS_MANUAL_RESEARCH'&&!protectedReason(r)&&!locked.has(r.lead_id));
 const cases=[];
 for(const dataset of ['AUSTRALIA','MANILA_AUDIT_QUEUE']){
  const available=pool.filter(r=>r.dataset_id===dataset),selected=[],sectors=new Map();
  const strata=[r=>!!r.website_url,r=>!r.website_url&&!!(r.facebook_url||r.instagram_url),r=>!r.website_url&&!r.facebook_url&&!r.instagram_url,r=>r.business_name.split(/\s+/).length<=3,r=>!r.public_email];
  for(let turn=0;selected.length<15;turn++){
   const fits=available.filter(r=>!selected.includes(r)&&strata[turn%strata.length](r)).sort((a,b)=>(sectors.get(a.sector)||0)-(sectors.get(b.sector)||0)||a.lead_id.localeCompare(b.lead_id));
   const candidate=fits[0]||available.find(r=>!selected.includes(r));if(!candidate)throw Error('INSUFFICIENT_ELIGIBLE_LEADS');selected.push(candidate);sectors.set(candidate.sector,(sectors.get(candidate.sector)||0)+1);
  }cases.push(...selected);
 }
 const freeze=['scripts/composio-zoho.js','scripts/email-transport.js','scripts/composio-draft-control.js','scripts/build-zoho-draft-workflow.js','scripts/draft-store.js','scripts/outreach-operations.js','scripts/review-server.js','scripts/duplicate-detection.js','scripts/legacy-status.js','scripts/dataset-output.js','review/index.html','review/review.js','review/review.css'];
 const hashes=Object.fromEntries(freeze.filter(f=>fs.existsSync(path.join(root,f))).map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')]));
 fs.writeFileSync(path.join(dir,'selection.json'),JSON.stringify({selected_at:new Date().toISOString(),source_execution:manifest.execution_id,limits:{searches:3,page_reads:6,total:9},cases},null,2));
 fs.writeFileSync(path.join(dir,'baseline.json'),JSON.stringify({integrity:integrity(),hashes,source_hashes:manifest.snapshot_hashes},null,2));
 console.log(JSON.stringify({selected:cases.length,pool:pool.length,datasets:Object.fromEntries(['AUSTRALIA','MANILA_AUDIT_QUEUE'].map(d=>[d,cases.filter(r=>r.dataset_id===d).length])),website_present:cases.filter(r=>r.website_url).length,social_supplied:cases.filter(r=>r.facebook_url||r.instagram_url).length,email_missing:cases.filter(r=>!r.public_email).length,cases:cases.map(r=>({business:r.business_name,dataset:r.dataset_id,sector:r.sector,website:r.website_url,social:r.facebook_url||r.instagram_url||''}))},null,2));
}
if(require.main===module)prepare();module.exports={prepare};
