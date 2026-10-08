'use strict';
const {text,yes}=require('./helpers');
const {assessTier}=require('./outreach-evidence-tiers');
const domains=require('./email-domain');
function verify(input){
 const row={...input.lead},d=input.discovery,facts={},held=[];
 for(const [key,f] of Object.entries(d.facts||{})){
  if(text(row[key+'_verified'])&&!yes(row[key+'_verified'])){held.push(key+':EXPLICIT_REVIEW_HOLD');continue;}
  const domainFact=(d.domain_facts||[]).find(x=>x.source_url===f.source_url&&x.verification==='DISCOVERY_VERIFIED'&&x.domain_identity_confidence>=85&&domains.reusable(x,d.observed_at));
  if((!domainFact&&!d.identities.some(i=>i.status!=='IDENTITY_UNRESOLVED'&&i.url===f.source_url))||f.verification!=='DISCOVERY_VERIFIED'||!f.excerpt)continue;
  facts[key]=f;
 }
 const fields={...d.fields};
 if(text(row.contact_email)&&fields.contact_email&&row.contact_email.toLowerCase()!==fields.contact_email.toLowerCase()){delete facts.contact;delete fields.contact_email;delete fields.contact_source_type;held.push('CONTACT_REVIEW_VALUE_CONFLICT');}
 for(const p of ['website','facebook','instagram','linkedin','whatsapp','viber'])if(text(row['reviewed_'+p+'_url'])&&fields[p+'_url']&&row['reviewed_'+p+'_url']!==fields[p+'_url']){delete fields[p+'_url'];delete facts[p];held.push(p+':REVIEWED_ROUTE_CONFLICT');}
 // These are transient machine facts. Reviewer-owned cells are never projected from them.
 const lead={...row,discovery_facts:facts,discovery_observations:[...d.observations,...Object.values(facts),{type:'autonomous_discovery_run',source_url:'https://api.exa.ai/search',observed_at:d.observed_at,excerpt:d.provider_status,version:d.version,searches:d.searches,exa_searches:d.exa_searches,tavily_searches:d.tavily_searches,page_read_attempts:d.page_read_attempts,pages_fetched:d.pages_fetched,requests:d.requests,retryable:d.retryable,held}],discovery_errors:d.errors,autonomous_research:{...d,facts,held}};
 for(const [key,value] of Object.entries(fields))if(!text(row[key])||/^(website|facebook|instagram|linkedin|whatsapp|viber)_url$/.test(key)&&!text(row['reviewed_'+key]))lead[key]=value;
 const primary=d.identities.find(i=>i.status==='AUTO_VERIFIED_OFFICIAL'&&i.source_type==='WEBSITE');if(primary)lead.website_url=fields.website_url||row.website_url;
 return {...input,lead,config:{...input.config,allowed_hosts:[...new Set([...(input.config.allowed_hosts||[]),...(d.official_hosts||[])])]}};
}
function qualify(output,row,now){
 const d=row.autonomous_research,history=require('./research-history'),merged=history.mergeRows(row.previous_result||{}, {...output,evidence_json:JSON.stringify([...history.list(output.evidence_json),...Object.values(d.facts)])},now),fs=history.currentFacts({...row,...merged},now);
 let route=d.selected_route||{channel:'NO_ROUTE',recipient:''};
 if(route.channel==='NO_ROUTE'){
  const contact=fs.find(f=>['contact','published_email'].includes(f.type)&&merged.public_email&&text(f.excerpt).toLowerCase().includes(merged.public_email.toLowerCase()));
  const social=history.list(merged.verified_social_routes).find(r=>fs.some(f=>f.source_url===r.source_url&&['legitimacy','identity',r.channel.toLowerCase(),'public_contact_route'].includes(f.type)));
  if(contact)route={channel:'EMAIL',recipient:merged.public_email,source_url:contact.source_url};else if(social)route=social;
 }
 const active=fs.some(f=>f.type==='activity'),activityConfidence=Math.max(0,...fs.filter(f=>f.type==='activity').map(f=>Number(f.activity_confidence)||60));
 const forTier=domains.project({...row,...merged,website_url:merged.website_url||d.fields.website_url||'',business_status:active?'LIKELY_ACTIVE':'UNCERTAIN',activity_status:active?'LIKELY_ACTIVE':'UNCERTAIN',evidence_json:JSON.stringify(fs),critical_uncertainties_json:'[]'},fs,now);
 const tier=assessTier(forTier,fs,route,now);if(d.held.length){tier.tier='TIER_C_NEEDS_RESEARCH';tier.issues.push(...d.held);}if(d.provider_status==='PROVIDER_RETRY_REQUIRED')tier.issues.push('PROVIDER_RETRY_REQUIRED');
 const ready=tier.tier!=='TIER_C_NEEDS_RESEARCH',quality=tier.tier==='TIER_A_VERIFIED_GAP'?'HIGH':tier.tier==='TIER_B_VERIFIED_OPPORTUNITY'?'MEDIUM':'LOW';
 const routing=ready?(route.channel==='EMAIL'?'READY_FOR_DRAFT_TIER_':'MANUAL_SOCIAL_TIER_')+(quality==='HIGH'?'A':'B'):'NEEDS_MANUAL_RESEARCH';
 const contact=route.channel==='NO_ROUTE'?(d.routes.length?'WEAK':'NONE'):route.channel==='EMAIL'?'STRONG':'USABLE';
 const readiness=ready?(row.country==='Australia'&&output.acma_status!=='SAFE_TO_REVIEW'?'NEEDS_COMPLIANCE_REVIEW':'READY_FOR_REVIEW'):'NEEDS_RESEARCH';
 return {commercial_quality:quality,lead_quality:quality,lead_score:quality==='HIGH'?85:quality==='MEDIUM'?65:20,commercial_basis:tier.tier,contactability:contact,contact_route_type:route.channel,research_required:!ready,research_confidence:ready?(activityConfidence>=75?'HIGH':'MEDIUM'):'LOW',critical_uncertainties_json:JSON.stringify(tier.issues),business_status:active?'LIKELY_ACTIVE':'UNCERTAIN',business_status_confidence:activityConfidence,activity_signal_strength:active?'USABLE':'WEAK',outreach_readiness:readiness,readiness_reasons_json:JSON.stringify(ready&&row.country==='Australia'&&output.acma_status!=='SAFE_TO_REVIEW'?['AU_CONSENT_REVIEW']:tier.issues),qualification_version:'2.2.0-autonomous',qualification_checked_at:now,qualification_notes:'Autonomous evidence tier; public route availability is not delivery or consent. Provider status: '+d.provider_status+'.',pain_verified:!!tier.gap,pain_point:tier.gap?.excerpt||'',pain_evidence:tier.gap?.source_url||'',research_notes:'Active bounded discovery executed. '+d.searches+' search attempts; '+d.page_read_attempts+' page-read attempts. '+d.provider_status+'.'};
}
module.exports={verify,qualify};
