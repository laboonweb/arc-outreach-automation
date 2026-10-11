'use strict';
const q=require('./phase2-cloud-queue'),{text,sha256,yes}=require('./helpers');
const {businessKey,phoneKey,socialKey,domainKey}=require('./duplicate-detection');
const DATASET='AUSTRALIA_500_20261011',HOLD='MANUAL_ONLY_SOURCE_INTAKE';
function controls(options){
 const c=options.manual_intake;
 if(c?.enabled!==true)throw Error('MANUAL_INTAKE_DISABLED');
 if(c.dataset_id!==DATASET||!Array.isArray(c.source_ids)||c.source_ids.length!==5||new Set(c.source_ids).size!==5||c.source_ids.some(id=>!/^0x[\da-f]+:0x[\da-f]+$/i.test(id)))throw Error('MANUAL_INTAKE_FIXED_FIVE_SOURCE_IDS_REQUIRED');
 if(!text(options.operator).trim()||text(options.operator).length>100||options.mode!=='VALIDATION'||Number(options.cap)!==5||options.allowed_lead_ids?.length!==5||new Set(options.allowed_lead_ids).size!==5)throw Error('MANUAL_INTAKE_REVIEWED_PILOT_REQUIRED');
 return c;
}
function field(v,...names){for(const name of names){const k=Object.keys(v).find(k=>k.toLowerCase().replace(/[^a-z0-9]/g,'')===name.toLowerCase().replace(/[^a-z0-9]/g,''));if(k&&v[k])return text(v[k]);}return '';}
function keys(row){
 const v={...row};if(row.legacy_snapshot_json){const raw=JSON.parse(row.legacy_snapshot_json);Object.assign(v,raw[0]?.values||{});}
 const urls=Object.values(v).filter(x=>typeof x==='string').flatMap(x=>require('./dataset-intake').urls(x));
 const maps=[field(v,'source_original_id','ID'),...urls].flatMap(x=>{const h=x.match(/0x[\da-f]+:0x([\da-f]+)/i);if(h)return [BigInt('0x'+h[1]).toString()];const c=x.match(/[?&]cid=(\d+)/);return c?[c[1]]:[];});
 const email=Object.entries(v).filter(([k])=>/email|recipient|contact/i.test(k)).map(([,x])=>text(x).trim().toLowerCase()).filter(x=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)&&!x.includes('://'));
 return {name:businessKey(field(v,'Business','Prospect','business_name')),phone:phoneKey(field(v,'Phone'),row.country),maps,social:urls.filter(u=>['facebook','instagram','linkedin'].includes(require('./dataset-intake').routeType(u))).map(socialKey).filter(Boolean),email,domain:domainKey(field(v,'website_url','Website'))};
}
function matches(a,b){return a.name&&a.name===b.name||a.phone&&a.phone===b.phone||a.domain&&a.domain===b.domain||['maps','social','email'].some(k=>a[k].some(x=>b[k].includes(x)));}
function references(responses,registry,specs){
 if(specs.length!==3||new Set(specs.map(s=>s.dataset_id)).size!==3)throw Error('MANUAL_INTAKE_REFERENCE_SPEC_REQUIRED');
 const rows=[],seen=new Set();
 for(const raw of responses){let r=raw.body||raw;if(Buffer.byteLength(typeof r==='string'?r:JSON.stringify(r))>8*1024*1024||raw.statusCode&&raw.statusCode!==200)throw Error('MANUAL_INTAKE_REFERENCE_RESPONSE_FAILED');if(typeof r==='string')r=JSON.parse(r);const d=registry.find(d=>d.spreadsheet_id===r.spreadsheetId),spec=specs.find(s=>s.dataset_id===d?.dataset_id);
  if(!d||d.dataset_id===DATASET||!spec||seen.has(d.dataset_id)||r.valueRanges?.length!==spec.tabs.length)throw Error('MANUAL_INTAKE_REFERENCE_COVERAGE_REQUIRED');seen.add(d.dataset_id);
  for(let i=0;i<spec.tabs.length;i++){const tab=spec.tabs[i],vr=r.valueRanges[i],values=vr.values,headers=values?.[0],expected=tab.range;
   const normalize=s=>s.replace(/^'([^']+)'!/,'$1!');
   if(normalize(vr.range||'')!==normalize(expected)||!headers||JSON.stringify(headers)!==JSON.stringify(tab.headers)||values.length!==tab.rows+1)throw Error('MANUAL_INTAKE_REFERENCE_SCHEMA_OR_COUNT_CHANGED');
   for(const cells of values.slice(1)){const v=Object.fromEntries(headers.map((h,j)=>[h,cells[j]??'']));if(field(v,'Business','Prospect','business_name'))rows.push({...v,country:d.country});}
  }
 }
 if(seen.size!==3)throw Error('MANUAL_INTAKE_REFERENCE_COVERAGE_REQUIRED');return rows;
}
function plan(research,queue,locks,options,now,inbox=[],links=[],referenceRows){
 const c=controls(options),existing=q.unpack(queue),idx=q.indexes(queue,locks,research,now);
 if(!Array.isArray(referenceRows)||!referenceRows.length)throw Error('MANUAL_INTAKE_CURRENT_REFERENCES_REQUIRED');
 const source=research.filter(r=>r.dataset_id===DATASET);
 if(source.length!==500||new Set(source.map(r=>r.source_original_id)).size!==500||source.some(r=>r.research_runtime_hold!==HOLD||r.country!=='Australia'))throw Error('MANUAL_INTAKE_COMPLETE_HELD_SOURCE_REQUIRED');
 const selected=c.source_ids.map(id=>{const found=source.filter(r=>r.source_original_id===id);if(found.length!==1)throw Error('MANUAL_INTAKE_SOURCE_ID_NOT_FOUND');return found[0];});
 if(selected.some(r=>!options.allowed_lead_ids.includes(r.lead_id))||new Set(selected.map(r=>r.lead_id)).size!==5)throw Error('MANUAL_INTAKE_LEAD_ALLOWLIST_MISMATCH');
 const peers=[...research,...referenceRows,...existing.map(x=>({...x.d,...x.row,country:x.d.country,legacy_snapshot_json:x.d.source_provenance?.legacy_snapshot_json}))],peerKeys=peers.map(keys),writes=[];
 for(const r of selected){
  if([419,433].includes(Number(r.source_row))||q.protection(r)||yes(r.initial_outreach_blocked)||yes(r.duplicate_review_required)||existing.some(x=>x.d.lead_id===r.lead_id)||links.some(l=>l.queue_key?.startsWith(r.lead_id))||inbox.some(i=>businessKey(i.business_name)===businessKey(r.business_name)))throw Error('MANUAL_INTAKE_EXISTING_OR_PROTECTED');
  const k=keys(r);if(peers.some((p,i)=>p.lead_id!==r.lead_id&&matches(k,peerKeys[i])))throw Error('MANUAL_INTAKE_DUPLICATE_REVIEW_REQUIRED');
  const {draftIdentity}=require('./outreach-mvp');
  const d={...require('./phase2-draft-metadata').metadata(r,now,options.campaign||q.CAMPAIGN),...draftIdentity(r,{channel:'NO_ROUTE',recipient:''},options.campaign||q.CAMPAIGN),business_name:r.business_name,dataset_id:DATASET,channel:'NO_ROUTE',recipient:'',route_source:'',subject:'',draft_body:'',message_hash:'',approved_hash:'',draft_status:'NEEDS_RESEARCH',review_status:'UNREVIEWED',routing:'NEEDS_MANUAL_RESEARCH',compliance_status:'REVIEW_REQUIRED',tier:'TIER_C_NEEDS_RESEARCH',evidence_summary:'[]',tier_evidence_basis:'[]',source_urls:JSON.stringify([r.source_url]),cloud_source_snapshot_hash:q.sourceHash(r),source_provenance:{source_original_id:r.source_original_id,source_url:r.source_url,source_snapshot_hash:q.sourceHash(r),legacy_snapshot_json:r.legacy_snapshot_json},operator_workspace:{version:1,evidence:[],copy_claims:[],audit:[]}};
  if(q.blocked(d,idx)||k.email.some(e=>idx.suppressedRoute.has(e)||idx.route.has(e))||k.social.some(s=>idx.suppressedRoute.has(s)||idx.route.has(s)))throw Error('MANUAL_INTAKE_SUPPRESSION_OR_CONTACT_LOCK');
  const event={at:now,event:'MANUAL_SOURCE_INTAKE',reviewer:options.operator,from:'NEEDS_RESEARCH',to:'NEEDS_RESEARCH',evidence_refs:[r.source_url],changes:{source_original_id:r.source_original_id,source_hash:q.sourceHash(r),verified_evidence:false},previous_hash:''};event.event_hash=sha256(JSON.stringify(event));d.operator_workspace.audit.push(event);writes.push(q.pack(d));
 }
 require('./phase2-panel-diagnostics').targets({queue:[...queue,...writes]});
 return {summary:{manual_intake:true,selected:5,source_writes:0,zoho_drafts:0,emails_sent:0,dms_sent:0},writes};
}
function persisted(plan,before,after){
 if(after.length!==before.length+plan.writes.length||before.some(r=>JSON.stringify(after.find(x=>x.id===r.id))!==JSON.stringify(r)))throw Error('MANUAL_INTAKE_EXISTING_ROWS_CHANGED');
 for(const expected of plan.writes){const matches=after.filter(r=>r.queue_key===expected.queue_key);if(matches.length!==1||!Number.isInteger(matches[0].id)||Object.keys(q.COLUMNS).some(k=>(matches[0][k]??null)!==(expected[k]??null)))throw Error('MANUAL_INTAKE_PERSISTENCE_MISMATCH');}
 return {...plan.summary,persisted:plan.writes.length,payload_hashes:plan.writes.map(r=>sha256(r.payload))};
}
function projection(plan,queue,inbox,links,options){
 const c=controls(options),selected=q.unpack(queue).filter(x=>x.d.dataset_id===DATASET&&options.allowed_lead_ids.includes(x.d.lead_id));
 const selectedKeys=new Set(selected.map(x=>x.row.queue_key));
 if(selected.length!==5||selected.some(x=>!c.source_ids.includes(x.d.source_provenance?.source_original_id))||plan.writes.length!==5||plan.writes.some(w=>!selectedKeys.has(w.queue_key)||links.some(l=>l.queue_key===w.queue_key)||w.match_keys.includes('id')||inbox.some(i=>businessKey(i.business_name)===businessKey(w.business_name))))throw Error('MANUAL_INTAKE_NEW_PROJECTION_ONLY');
 return plan;
}
module.exports={controls,keys,matches,references,plan,persisted,projection};
