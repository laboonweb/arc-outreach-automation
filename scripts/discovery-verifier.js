'use strict';
const {parsePublicUrl,text,norm,yes,evidence}=require('./helpers');
const PREFIXES=['association','legitimacy','activity','contact','facebook','instagram','linkedin','whatsapp','viber','decision_maker','platform'];
function verifyDiscovery(input){
 if(['2.0.0','2.1.0-authenticated'].includes(input.discovery?.version))return require('./autonomous-qualification').verify(input);
 if(input.discovery?.status==='DISABLED')return input;
 const discovery=input.discovery||{},row={...input.lead},now=discovery.observed_at||new Date().toISOString(),facts={};
 const association=discovery.facts?.association;
 for(const p of PREFIXES){const f=discovery.facts?.[p];if(!f)continue;
  try{parsePublicUrl(f.source_url);}catch{continue;}
  if(!association||!text(f.excerpt)||f.verification!=='DISCOVERY_VERIFIED'||f.confidence!=='HIGH'||!Number.isFinite(Date.parse(f.fact_date))||Date.parse(f.fact_date)>Date.parse(now))continue;
  // Discovery never overrides an explicit operator decision, including false.
  if(row[p+'_verified']!==undefined&&text(row[p+'_verified'])!=='')continue;
  facts[p]=f;
 }
 const fields={...discovery.fields};
 const groups={contact:['contact_email','contact_source_type'],activity:['activity_status','activity_signal_type','activity_corroborated'],decision_maker:['decision_maker_name_reviewed','decision_maker_role_reviewed'],platform:['booking_url','booking_status']};
 for(const p of ['facebook','instagram','linkedin','whatsapp','viber'])groups[p]=[p+'_status_reviewed'];
 const held=[];
 for(const [p,keys]of Object.entries(groups))if(facts[p]&&keys.some(k=>text(row[k])&&fields[k]!==undefined&&norm(row[k])!==norm(fields[k]))){delete facts[p];held.push(p+':EXPLICIT_REVIEW_VALUE_CONFLICT');}
 for(const p of ['facebook','instagram','linkedin','whatsapp','viber'])if(text(row['reviewed_'+p+'_url'])&&fields[p+'_url']&&row['reviewed_'+p+'_url']!==fields[p+'_url']){delete facts[p];delete fields[p+'_url'];held.push(p+':REVIEWED_ROUTE_CONFLICT');}
 if(['MISMATCHED','UNCERTAIN'].includes(row.identity_status_reviewed)||row.association_verified!==undefined&&text(row.association_verified)!==''&&!yes(row.association_verified)){for(const key of Object.keys(facts))delete facts[key];for(const key of Object.keys(fields))delete fields[key];held.push('EXPLICIT_IDENTITY_REVIEW_HOLD');}
 for(const [p,keys]of Object.entries(groups))if(!facts[p])for(const k of keys)delete fields[k];
 if(!facts.association){delete fields.website_url;delete fields.website_ownership_verified;}
 const verifiedRow={...row,discovery_facts:facts};
 for(const [key,value]of Object.entries(fields))if(!text(row[key])||['website_url','facebook_url','instagram_url','linkedin_url','whatsapp_url','viber_url'].includes(key)&&!text(row['reviewed_'+key]))verifiedRow[key]=value;
 // Provenance is kept in machine-owned evidence_json, never reviewer columns.
 verifiedRow.discovery_observations=[...(discovery.observations||[]),...Object.values(facts),
  ...(discovery.candidates||[]).slice(0,12).map(c=>evidence('discovery_candidate',c.url,c.title||'Public candidate; identity and contact availability unverified.',now,{confidence:'LOW',verification:'NEEDS_HUMAN_REVIEW'})),
  ...Object.entries(discovery.facts||{}).filter(([p])=>!facts[p]).map(([p,f])=>({...f,type:'discovery_review_candidate',fact_type:p,verification:'NEEDS_HUMAN_REVIEW',confidence:'MEDIUM'})),
  ...((discovery.routes||[]).map(r=>evidence('contact_platform_candidate',r.source_url,r.url,r.observed_at,{confidence:r.confidence,route_url:r.url,availability:r.availability}))),
  evidence('discovery_run','https://mcp.exa.ai/mcp',discovery.status||'DISABLED',now,{requests:discovery.requests||0,warnings:[...(discovery.warnings||[]),...held],ambiguous_matches:discovery.ambiguous_matches||[],confidence:'LOW'})];
 verifiedRow.discovery_errors=discovery.errors||[];
 return {...input,lead:verifiedRow,config:{...input.config,allowed_hosts:[...new Set([...(input.config.allowed_hosts||[]),...(input.config.discovery?.allowed_hosts||[])])]}};
}
module.exports={verifyDiscovery};
