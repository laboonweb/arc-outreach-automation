'use strict';
// Operator observations belong to the review ledger, never Arc Research.
const {text,sha256,parsePublicUrl}=require('./helpers'),h=require('./research-history');
const TYPES=new Set(['identity','activity','website_quality','association','gap','opportunity','service','proof','contact','messaging','permission','timezone','classification_review']);
const KEYS=new Set(['type','source_url','observed_at','fact_date','excerpt','association_basis','channel','recipient','supersedes','value','verified','website_status','parking_provider']);
const UNCERTAIN=/\b(?:unknown|unverified|not verified|not established|no evidence|could be|may be|access blocked|cannot verify|not observed|no longer|placeholder|sample|fabricated)\b/i;
const CUSTOMER_PROOF=/\b(?:customer|client) (?:feedback|reviews?|testimonials?)\b|\breviews?\b|\btestimonials?\b/i;
function customerProof(f){return ['proof','review'].includes(f.type)&&CUSTOMER_PROOF.test(f.excerpt)&&!UNCERTAIN.test(f.excerpt)&&!/\b(?:no|missing|without|not|unavailable)\b.{0,30}\b(?:feedback|reviews?|testimonials?)\b|\b(?:feedback|reviews?|testimonials?)\b.{0,30}\b(?:missing|unavailable|not available|not verified)\b/i.test(f.excerpt);}
function profile(recipient,channel,now){
 try{const u=parsePublicUrl(recipient);if(u.path==='/')return false;if(channel==='OTHER_MANUAL')return true;
 const row={evidence_json:JSON.stringify([{type:channel.toLowerCase(),source_url:recipient,observed_at:now,verification:'HUMAN_REVIEWED_INPUT',excerpt:'Published profile '+recipient}]),verified_social_routes:JSON.stringify([{channel,recipient,source_url:recipient,status:'USABLE',confidence:'HIGH'}])};
 return !!require('./research-contact-routes').verifiedCandidate(row,now);
 }catch{return false;}
}
function validate(input,lead,reviewer,now){
 if(!input||Object.keys(input).some(k=>!KEYS.has(k))||!TYPES.has(input.type))throw Error('OPERATOR_EVIDENCE_TYPE_REQUIRED');
 if(input.verified!==true||!text(reviewer)||text(input.excerpt).length<12||text(input.excerpt).length>500||text(input.association_basis).length<12||text(input.association_basis).length>500)throw Error('OPERATOR_EVIDENCE_BASIS_REQUIRED');
 if(!/^https?:\/\//i.test(text(input.source_url)))throw Error('OPERATOR_PUBLIC_SOURCE_REQUIRED');
 const source=parsePublicUrl(input.source_url).url,at=Date.parse(input.observed_at),date=Date.parse(input.fact_date||input.observed_at);
 if(!Number.isFinite(at)||!Number.isFinite(date)||at>Date.parse(now)||date>at||at<Date.parse(now)-90*86400000)throw Error('OPERATOR_OBSERVATION_DATE_INVALID');
 if(input.type==='activity'&&(date<Date.parse(now)-183*86400000||/HTTP (?:200|success)|directory only|registration only/i.test(input.excerpt)))throw Error('OPERATOR_ACTIVITY_NOT_CURRENT');
 const f={type:input.type,source_url:source,observed_at:new Date(at).toISOString(),fact_date:new Date(date).toISOString(),excerpt:text(input.excerpt),association_basis:text(input.association_basis),lead_id:lead.lead_id,verification:'HUMAN_REVIEWED_INPUT',verification_method:'HUMAN_REVIEWED_INPUT',source_type:'OPERATOR_RECORDED',reviewer,recorded_at:now};
 if(f.type==='proof'&&!customerProof(f))throw Error('OPERATOR_CUSTOMER_PROOF_REQUIRED');
 // Only a reviewed association with its dated source/basis can establish
 // ownership. Caller-supplied verification flags are never accepted.
 if(f.type==='association'){
  if(UNCERTAIN.test(f.excerpt)||/\b(?:not associated|not tied|does not belong|wrong business|namesake)\b/i.test(f.excerpt))throw Error('OPERATOR_WEBSITE_ASSOCIATION_REQUIRED');
  f.association_verified=true;
 }
 if(input.website_status||input.parking_provider){
  if(!['gap','website_quality'].includes(f.type)||input.website_status!=='PARKED'||!/\b(?:parked|parking)\b/i.test(f.excerpt)||UNCERTAIN.test(f.excerpt)||/\b(?:not|no longer) (?:a )?(?:parked|parking)\b/i.test(f.excerpt))throw Error('OPERATOR_WEBSITE_FINDING_REQUIRED');
  if(input.parking_provider&&!['GoDaddy'].includes(input.parking_provider)||input.parking_provider==='GoDaddy'&&(!/\bgodaddy\b/i.test(f.excerpt)||/\bnot (?:by |a )?godaddy\b/i.test(f.excerpt)))throw Error('OPERATOR_PARKING_PROVIDER_REQUIRED');
  Object.assign(f,{website_status:'PARKED',domain:parsePublicUrl(source).host.replace(/^www\./,''),parking_provider:input.parking_provider||''});
 }
 if(['contact','messaging','permission'].includes(f.type)){
  const channel=text(input.channel),recipient=text(input.recipient);
  if(!['EMAIL','FACEBOOK','INSTAGRAM','LINKEDIN','WHATSAPP','VIBER','OTHER_MANUAL'].includes(channel))throw Error('OPERATOR_ROUTE_REQUIRED');
  if(channel==='EMAIL'){if(!require('./email-validator').validateEmail(recipient).valid||f.type!=='permission'&&!f.excerpt.toLowerCase().includes(recipient.toLowerCase()))throw Error('OPERATOR_PUBLISHED_ROUTE_REQUIRED');}
  else if(!profile(recipient,channel,now)||f.type!=='permission'&&!f.excerpt.includes(recipient))throw Error('OPERATOR_PUBLISHED_ROUTE_REQUIRED');
  if(f.type==='messaging'&&(channel==='EMAIL'||!/message|messaging|contact option|chat/i.test(f.excerpt)))throw Error('OPERATOR_MESSAGE_OPTION_REQUIRED');
  Object.assign(f,{channel,recipient,route_url:recipient,email:channel==='EMAIL'?recipient:undefined});
 }
 if(f.type==='permission'){
  if(!['EXPRESS_CONSENT','DOCUMENTED_INFERRED_CONSENT','NOT_APPLICABLE_REVIEWED'].includes(input.value)||input.value==='NOT_APPLICABLE_REVIEWED'&&(lead.country==='Australia'||lead.dataset_id==='AUSTRALIA'))throw Error('OPERATOR_PERMISSION_BASIS_REQUIRED');
  if(/public (?:business )?email (?:alone|only)|no permission|no consent|permission unknown|consent unknown/i.test(f.excerpt))throw Error('OPERATOR_PERMISSION_BASIS_REQUIRED');
  f.value=input.value;
 }
 if(f.type==='timezone'){try{new Intl.DateTimeFormat('en',{timeZone:input.value}).format();}catch{throw Error('OPERATOR_TIMEZONE_INVALID');}f.value=input.value;}
 if(f.type==='classification_review'&&!input.supersedes)throw Error('OPERATOR_CORRECTION_REFERENCE_REQUIRED');
 if(input.supersedes){if(!/^[a-f0-9]{64}$/.test(input.supersedes))throw Error('OPERATOR_CORRECTION_REFERENCE_REQUIRED');f.supersedes=[input.supersedes];f.contradictory_evidence=true;}
 f.observation_id=sha256(JSON.stringify(f));return f;
}
function effective(source,d,now){
 if(!source)return null;if(!d.operator_workspace)return source;
 const own=d.operator_workspace.evidence||[],combined=h.mergeFacts(h.allFacts(source),own);
 // An explicit recorded correction changes only the effective view. Both
 // original observations and their correction remain in ledger history.
 for(const correction of own.filter(f=>f.supersedes?.length))for(const old of combined)if(correction.supersedes.includes(h.identity(old))){old.superseded_by=correction.observation_id;old.observation_status='SUPERSEDED';}
 const row={...source,evidence_json:JSON.stringify(combined.filter(f=>!f.superseded_by)),activity_evidence:'[]'};
 const fs=h.currentFacts(row,now),current=own.filter(f=>fs.some(x=>x.observation_id===f.observation_id));
 for(const f of current){
  if(f.type==='identity')row.identity_status_reviewed='VERIFIED';
  if(f.type==='classification_review'){
   // Correction requires a referenced old observation and current affirmative evidence.
   if(f.supersedes?.length&&fs.some(x=>x.type==='identity')){row.identity_status_reviewed='VERIFIED';row.critical_uncertainties_json=JSON.stringify(h.list(source.critical_uncertainties_json).filter(x=>!/IDENTITY|NAMESAKE|BRANCH_MISMATCH/.test(x)));}
  }
  if(f.type==='activity'){row.activity_status='ACTIVE';row.business_status='ACTIVE';row.activity_signal_type='OPERATOR_DATED_ACTIVITY';row.activity_valid_until='';row.activity_operating_since='';}
  if(['association','website_quality'].includes(f.type)){row.website_association='REVIEWED_ASSOCIATION';row.website_url=f.source_url;}
  if(f.type==='gap'){row.gap_verified=true;row.gap_unresolved_verified=true;}
  if(f.type==='contact'){
   if(f.channel==='EMAIL')Object.assign(row,{public_email:f.recipient,email_source_url:f.source_url,email_confidence:'REVIEWED',contact_verified:true,role_relevance:'REVIEWED'});
   else {row[f.channel.toLowerCase()+'_url']=f.recipient;row[f.channel.toLowerCase()+'_status']='USABLE';if(f.channel==='OTHER_MANUAL'){row.booking_url=f.recipient;row.booking_status='USABLE';}combined.push({...f,type:f.channel==='OTHER_MANUAL'?'platform':f.channel.toLowerCase(),observation_id:sha256(f.observation_id+':route')});row.evidence_json=JSON.stringify(combined.filter(f=>!f.superseded_by));}
   row.preferred_channel=f.channel;
  }
  if(f.type==='timezone')row.timezone=f.value;
 }
 // Restriction and historical fields are inherited verbatim. Tier is a derivation.
 const route=require('./phase2-eligibility').route(row,now,d),a=require('./outreach-evidence-tiers').assessTier(row,h.currentFacts(row,now),route,now);
 row.tier=a.tier;row.evidence_tier=a.tier;return row;
}
function checks(source,d,now){const row=effective(source,d,now);if(!row)return {};const fs=h.currentFacts(row,now),own=d.operator_workspace?.evidence||[];
 const matching=type=>own.filter(f=>f.type===type&&fs.some(x=>x.observation_id===f.observation_id)&&f.channel===d.channel&&require('./research-contact-routes').routeKey(f.channel,f.recipient)===require('./research-contact-routes').routeKey(d.channel,d.recipient)).at(-1);
 const permission=matching('permission'),messaging=matching('messaging');
 return {permission,messaging,compliance_status:permission?'SAFE_TO_REVIEW':d.compliance_status,consent_reviewed:!!permission,compliance_basis:permission?.excerpt||'',dm_verified:!!messaging};}
module.exports={TYPES,validate,effective,checks,customerProof,UNCERTAIN};
