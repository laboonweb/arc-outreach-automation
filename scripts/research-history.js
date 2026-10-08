'use strict';
// Append-only observations in the existing evidence cell. Network failures are
// check attempts, never contradictory business facts. No storage/network API.
const {text,yes,sha256,parsePublicUrl}=require('./helpers');
const policy=require('./email-domain-policy');
const VERIFIED=new Set(['DISCOVERY_VERIFIED','REVIEWED_FACT','HUMAN_REVIEWED_INPUT']);
const WEAK=new Set(['ACCESS_BLOCKED','UNKNOWN','UNCERTAIN','TIMEOUT','TRANSPORT_FAILURE','PROVIDER_RETRY_REQUIRED','NOT_FOUND','NO_WEBSITE','NOT_SUPPLIED','UNVERIFIED']);
const PROTECTED_FIELDS=('legacy_status legacy_colour legacy_status_imported legacy_snapshot_json legacy_recheck_required legacy_join_review_required legacy_colour_review_required first_contact_at first_contact_channel followup_due_at followup_channel followup_count last_reply_at reply_status initial_contact_recorded initial_outreach_blocked duplicate_review_required duplicate_matches_json duplicate_group_key suppression_status').split(' ');
function list(value){if(value===''||value==null)return [];const a=typeof value==='string'?JSON.parse(value):value;if(!Array.isArray(a))throw Error('EVIDENCE_HISTORY_INVALID');return a;}
function operational(f){return f.observation_status==='CHECK_ATTEMPT'||WEAK.has(f.classification)||WEAK.has(f.status)||/^(research_check_attempt|autonomous_discovery_run|research_runtime_receipt|discovery_run|discovery_candidate|discovery_review_candidate|website_check|contact_platform_candidate)$/.test(f.type);}
function verified(f){try{parsePublicUrl(f.source_url);}catch{return false;}return VERIFIED.has(f.verification)&&text(f.excerpt)&&Number.isFinite(Date.parse(f.observed_at||f.fact_date))&&!f.conflicts?.length&&!operational(f)&&(f.type!=='business_domain'||f.version!==policy.VERSION&&f.verification!=='DISCOVERY_VERIFIED'||f.confidence==='HIGH'&&f.association_verified===true&&Number(f.domain_identity_confidence)>=85);}
function value(f){return f.value??f.classification??f.route_url??f.email??f.excerpt;}
function identity(f){return f.observation_id||sha256(JSON.stringify([f.type,f.source_url,f.observed_at,f.fact_date||'',value(f),f.verification||'']));}
function slot(f){if(f.type==='business_domain')return 'domain:'+f.domain;return f.type+':'+f.source_url;}
function confidence(f){return f.confidence==='HIGH'?3:f.confidence==='MEDIUM'?2:f.confidence==='LOW'?0:VERIFIED.has(f.verification)?2:0;}
function decorate(f){return {...f,observation_id:identity(f),value:value(f),source:f.source||f.source_url,source_type:f.source_type||f.email_source_type||(f.type==='business_domain'?'BUSINESS_DOMAIN':f.verification==='HUMAN_REVIEWED_INPUT'?'HUMAN_REVIEWED_SOURCE':'PUBLIC_SOURCE'),confidence:f.confidence|| (VERIFIED.has(f.verification)?'REVIEWED':'UNKNOWN'),verification_method:f.verification_method||f.verification||'UNVERIFIED',observation_status:operational(f)?'CHECK_ATTEMPT':f.observation_status|| (verified(f)?'VERIFIED':'UNVERIFIED'),superseded_by:f.superseded_by||null,...(!f.observed_at?{provenance_warning:'OBSERVATION_TIME_NOT_RECORDED'}:{})};}
function mergeFacts(previous,incoming){
 const out=[],ids=new Map();
 for(const raw of [...list(previous),...list(incoming)]){const f=decorate(raw);if(ids.has(f.observation_id))continue;out.push(f);ids.set(f.observation_id,f);}
 // Only a later, independently verified contradictory domain classification (or
 // an explicit reviewed supersedes reference) can retire a verified observation.
 const ordered=out.filter(verified).slice().sort((a,b)=>Date.parse(a.observed_at)-Date.parse(b.observed_at));
 for(const f of ordered){
  for(const old of ordered){if(old===f||Date.parse(old.observed_at)>=Date.parse(f.observed_at)||old.superseded_by)continue;
   const same=slot(old)===slot(f),refresh=same&&value(old)===value(f);
   const contradiction=same&&f.type==='business_domain'&&confidence(f)>=confidence(old)&&f.classification!==old.classification;
   const explicit=Array.isArray(f.supersedes)&&f.supersedes.includes(old.observation_id)&&f.contradictory_evidence===true;
   if(refresh||contradiction||explicit){old.observation_status=refresh?'REFRESHED':'SUPERSEDED';old.superseded_by=f.observation_id;old.superseded_reason=refresh?'VERIFIED_REFRESH':'VERIFIED_CONTRADICTION';}
  }
 }
 // A domain's old gap cannot survive a verified functioning destination, nor
 // outlive the exact observation that established that particular gap.
 for(const g of out.filter(f=>f.type==='gap'&&f.domain&&f.version===policy.VERSION)){
  const domain=out.find(f=>f.type==='business_domain'&&f.domain===g.domain&&f.observed_at===g.observed_at&&f.superseded_by);
  if(domain){g.observation_status='SUPERSEDED';g.superseded_by=domain.superseded_by;g.superseded_reason=domain.superseded_reason;}
 }
 for(const f of out.filter(validInvalidation))for(const old of out){
  if(old===f||!verified(old)||Date.parse(old.observed_at)>Date.parse(f.observed_at)||old.superseded_by)continue;
  const route=old.route_url||old.email||old.value;
  if(['contact','published_email','public_contact_route','phone','facebook','instagram','linkedin','whatsapp','viber'].includes(old.type)&&(route===f.route_value||old.source_url===f.route_value||text(old.excerpt).toLowerCase().includes(text(f.route_value).toLowerCase()))){old.observation_status='INVALIDATED';old.superseded_by=f.observation_id;old.superseded_reason=f.reason;}
 }
 return out;
}
function validInvalidation(f){return f.type==='contact_invalidation'&&verified(f)&&f.contradictory_evidence===true&&text(f.route_value)&&['BOUNCED','DOES_NOT_EXIST','PROFILE_GONE','WRONG_BUSINESS','OPERATOR_SUPPRESSED'].includes(f.reason);}
function activityFresh(f,row,all,now){
 const age=(Date.parse(now)-Date.parse(f.fact_date||f.observed_at))/86400000;
 if(!Number.isFinite(age)||age < -1||age>365||['HTTP_ONLY','DIRECTORY_ONLY','REGISTRATION_ONLY','CLOSURE_CANDIDATE'].includes(f.signal_type||row.activity_signal_type)||['INACTIVE','LIKELY_INACTIVE'].includes(row.activity_status)||row.activity_valid_until&&Date.parse(row.activity_valid_until)<Date.parse(now)||row.activity_operating_since&&Date.parse(row.activity_operating_since)>Date.parse(now))return false;
 // A 6-12 month signal needs recorded corroboration, not an inferred score.
 return age<=183||yes(f.corroborated)||yes(row.activity_corroborated)||Array.isArray(f.corroboration_ids)&&f.corroboration_ids.some(id=>all.some(x=>identity(x)===id&&verified(x)&&x.type==='activity'&&Date.parse(x.fact_date||x.observed_at)>=Date.parse(now)-183*86400000));
}
function fresh(f,row,all,now){
 if(!verified(f)||f.superseded_by||['SUPERSEDED','REFRESHED','INVALIDATED'].includes(f.observation_status)||f.lead_id&&row.lead_id&&f.lead_id!==row.lead_id)return false;
 if(f.type==='activity')return activityFresh(f,row,all,now);
 if(f.type==='business_domain'&&f.version===policy.VERSION)return policy.reusable(f,now);
 if(f.type==='gap'&&f.domain&&f.version===policy.VERSION){const d=all.find(d=>d.type==='business_domain'&&d.domain===f.domain&&d.observed_at===f.observed_at);return !!d&&fresh(d,row,all,now);}
 const age=Date.parse(now)-Date.parse(f.fact_date||f.observed_at);return Number.isFinite(age)&&age>=-86400000&&age<=90*86400000;
}
function allFacts(row){return mergeFacts(list(row.evidence_json),list(row.activity_evidence));}
function currentFacts(row,now=new Date().toISOString()){const all=allFacts(row);return all.filter(f=>fresh(f,row,all,now));}
function currentDomain(row,now){const all=allFacts(row);const domains=all.filter(f=>f.type==='business_domain'&&f.classification&&verified(f)&&!f.superseded_by).sort((a,b)=>Date.parse(b.observed_at)-Date.parse(a.observed_at));const f=domains[0];return f?{fact:f,status:fresh(f,row,all,now)?f.classification:'STALE_PREVIOUSLY_'+f.classification,fresh:fresh(f,row,all,now)}:null;}
function assertAssociation(prior,next){for(const key of ['lead_id','dataset_id','source_spreadsheet_id'])if(text(prior[key])&&text(next[key])&&prior[key]!==next[key])throw Error('EVIDENCE_MERGE_PROVENANCE_MISMATCH:'+key);}
function mergeRows(prior,next,now=next.checked_at||new Date().toISOString()){
 prior||={};
 assertAssociation(prior,next);
 for(const f of list(next.evidence_json))assertAssociation(next,f);
 const incoming=list(next.evidence_json),old=allFacts(prior),combined=mergeFacts(old,[...incoming,...list(next.activity_evidence)]);
 const out={...prior,...next,evidence_json:JSON.stringify(combined),activity_evidence:JSON.stringify(combined.filter(f=>f.type==='activity'))};
 const groups=[['public_email','email_source_url','email_source_type','email_confidence','email_validation','verified_email'],...['facebook','instagram','linkedin','whatsapp','viber'].map(p=>[p+'_url',p+'_status']),['phone'],['decision_maker_name','decision_maker_role','decision_maker_source'],['buying_trigger','buying_trigger_source','buying_trigger_date']];
 const types=['contact','published_email','public_contact_route','facebook','instagram','linkedin','whatsapp','viber','phone','decision_maker','buying_trigger'];
 for(const group of groups){const key=group[0],p=key.replace(/_url$|_name$/,'');const supported=old.some(f=>verified(f)&&!f.superseded_by&&types.includes(f.type)&&(key==='public_email'?text(f.excerpt).toLowerCase().includes(text(prior[key]).toLowerCase()):key==='phone'?text(f.excerpt).includes(text(prior[key])):key==='decision_maker_name'?f.type==='decision_maker':key==='buying_trigger'?f.type==='buying_trigger':f.type===p||f.type==='public_contact_route'&&f.channel?.toLowerCase()===p));
  const replacement=incoming.some(f=>verified(f)&&(key==='public_email'?['contact','published_email','public_contact_route'].includes(f.type)&&text(f.excerpt).toLowerCase().includes(text(next[key]).toLowerCase())&&text(next[key]):f.type===p&&text(next[key])));
  const invalidation=incoming.find(f=>validInvalidation(f)&&f.route_value===prior[key]);
  if(supported&&!replacement&&!invalidation)for(const f of group)out[f]=prior[f]??out[f];
  if(invalidation)for(const f of group)out[f]='';
 }
 const routes=[...list(prior.verified_social_routes),...list(next.verified_social_routes)];if(routes.length)out.verified_social_routes=JSON.stringify([...new Map(routes.map(r=>[r.channel+'|'+r.recipient,r])).values()].filter(r=>!incoming.some(f=>validInvalidation(f)&&f.route_value===r.recipient)));
 // Recover a dropped projection only from an existing unambiguous verified
 // observation. This does not rediscover, refresh or infer a new route.
 const surviving=combined.filter(f=>verified(f)&&!f.superseded_by);
 if(!text(out.public_email)){const contacts=surviving.filter(f=>['contact','published_email'].includes(f.type)),addresses=[...new Set(contacts.flatMap(f=>f.email?[f.email]:text(f.excerpt).match(/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)||[]))].filter(email=>!combined.some(f=>validInvalidation(f)&&f.route_value.toLowerCase()===email.toLowerCase()));if(addresses.length===1){const email=addresses[0],f=contacts.find(f=>f.email===email||text(f.excerpt).includes(email));Object.assign(out,{public_email:email,email_source_url:f.source_url,email_source_type:f.email_source_type||prior.email_source_type||'REVIEWED_PUBLIC_SOURCE',email_confidence:f.confidence||'REVIEWED'});}}
 for(const p of ['facebook','instagram','linkedin','whatsapp','viber'])if(!text(out[p+'_url'])){const f=surviving.find(f=>f.type===p&&!combined.some(x=>validInvalidation(x)&&[f.route_url,f.source_url].includes(x.route_value)));if(f)out[p+'_url']=f.route_url||f.source_url;}
 if(old.some(f=>f.type==='activity'&&fresh(f,prior,old,now))&&!incoming.some(f=>f.type==='activity'&&verified(f)))for(const key of ['activity_status','activity_signal_type','activity_corroborated','activity_operating_since','activity_valid_until','activity_confidence','business_status','business_status_confidence'])if(prior[key]!==undefined)out[key]=prior[key];
 const domain=currentDomain(out,now);
 if(domain){const f=domain.fact;Object.assign(out,{website_url:f.requested_url||f.source_url,website_final_url:f.final_url||f.source_url,website_http_code:f.http_status||'',website_source:f.source_url,website_evidence:f.excerpt,website_association:'VERIFIED',website_status:domain.fresh?['ACTIVE_SITE','ACTIVE_REDIRECT'].includes(f.classification)?'LIVE':'BROKEN_SITE':domain.status});if(!text(next.website_check_status)||WEAK.has(next.website_check_status))out.website_check_status=next.website_check_status||'NOT_CHECKED';}
 // Keep the check result independently, even when a good effective fact wins.
 const attempts=incoming.filter(operational);const checkSource=next.website_source||next.website_url||prior.website_source||prior.website_url;if(checkSource&&text(next.website_check_status)&&WEAK.has(next.website_check_status))attempts.push({type:'research_check_attempt',source_url:checkSource,observed_at:now,status:next.website_check_status,excerpt:next.website_evidence||'Could not verify again.',observation_status:'CHECK_ATTEMPT'});
 if(attempts.length)out.evidence_json=JSON.stringify(mergeFacts(combined,attempts));
 // Rebase a weak retry on surviving facts, rather than projecting a provider
 // failure into a downgrade. Explicit reviewer identity/route holds still apply.
 if(old.some(verified)&&!next.research_skipped&&/^TIER_[ABC]_/.test(next.tier||next.commercial_basis||'')){
  const fs=currentFacts(out,now),route=require('./research-contact-routes').selectChannel(out,now),candidate=route.channel==='NO_ROUTE'?require('./research-contact-routes').verifiedCandidate(out,now):null;
  const critical=list(out.critical_uncertainties_json).filter(x=>!['IDENTITY_UNRESOLVED','ACTIVITY_UNRESOLVED','NO_VERIFIED_PUBLIC_ROUTE','STRUCTURAL_OPPORTUNITY_UNESTABLISHED','PROVIDER_RETRY_REQUIRED'].includes(x));
  const assessment=require('./outreach-evidence-tiers').assessTier({...out,critical_uncertainties_json:JSON.stringify(critical)},fs,candidate||route,now);
  if(assessment.tier!=='TIER_C_NEEDS_RESEARCH')Object.assign(out,{tier:assessment.tier,commercial_basis:assessment.tier,research_required:false,commercial_quality:assessment.tier==='TIER_A_VERIFIED_GAP'?'HIGH':'MEDIUM',lead_quality:assessment.tier==='TIER_A_VERIFIED_GAP'?'HIGH':'MEDIUM',critical_uncertainties_json:JSON.stringify(critical),outreach_readiness:out.country==='Australia'&&out.acma_status!=='SAFE_TO_REVIEW'?'NEEDS_COMPLIANCE_REVIEW':'READY_FOR_REVIEW'});
 }
 const observations=[];
 for(const row of [prior,out]){const tier=row.tier||row.commercial_basis,at=row.qualification_checked_at||row.checked_at;const facts=allFacts(row).filter(verified);if(tier&&at&&facts.length)observations.push({type:'qualification_tier',value:tier,source_url:facts[0].source_url,source_type:'EVIDENCE_DERIVATION',observed_at:at,confidence:row.research_confidence||'UNKNOWN',verification:'EVIDENCE_DERIVED',verification_method:'EVIDENCE_DERIVED',observation_status:'DERIVED',excerpt:'Qualification based on recorded observations.',basis_observation_ids:facts.map(identity)});}
 if(observations.length)out.evidence_json=JSON.stringify(mergeFacts(list(out.evidence_json),observations));
 if(out.evidence_json.length>45000||out.activity_evidence.length>45000)throw Error('EVIDENCE_HISTORY_CAPACITY_REQUIRES_ARCHIVE');
 return out;
}
module.exports={VERIFIED,WEAK,PROTECTED_FIELDS,list,value,identity,verified,operational,mergeFacts,activityFresh,fresh,allFacts,currentFacts,currentDomain,mergeRows,assertAssociation,validInvalidation};
