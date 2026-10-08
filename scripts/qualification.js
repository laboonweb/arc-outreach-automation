'use strict';
const {yes,text,parsePublicUrl}=require('./helpers');
const {reviewedFact,classifyActivity}=require('./activity-classifier');
const {validateEmail}=require('./email-validator');
const {scoreLead}=require('./lead-score');
const {PROTECTED}=require('./legacy-status');
const DIMENSION_FIELDS=['commercial_quality','commercial_basis','contactability','contact_route_type','research_confidence','outreach_readiness','compliance_status','critical_uncertainties_json','readiness_reasons_json','activity_signal_strength','qualification_version','qualification_checked_at','qualification_notes'];
function validProfile(url, platform) {
  try {const p=parsePublicUrl(url);if(p.path==='/')return false;
    if(platform==='instagram')return /(^|\.)instagram\.com$/.test(p.host)&&!/^\/(p|reel|reels|stories|explore)\//.test(p.path);
    if(platform==='facebook')return /(^|\.)(facebook\.com|fb\.com)$/.test(p.host)&&!/^\/(share|posts|reel|watch)\//.test(p.path);
    return platform==='linkedin'&&/(^|\.)linkedin\.com$/.test(p.host)&&/^\/(company|in)\//.test(p.path);
  }catch{return false;}
}
function contactAssessment(output,row,now) {
  if(validateEmail(output.public_email).valid&&output.email_source_url&&output.email_confidence!=='UNVERIFIED')return {level:['OFFICIAL_WEBSITE','FACEBOOK_ABOUT','INSTAGRAM_CONTACT'].includes(output.email_source_type)?'STRONG':'USABLE',type:'VERIFIED_EMAIL'};
  for(const p of ['whatsapp','viber','instagram','facebook','linkedin'])if(output[p+'_status']==='USABLE'&&reviewedFact(row,p,now))return {level:'USABLE',type:p==='whatsapp'||p==='viber'?'PUBLIC_'+p.toUpperCase()+'_BOOKING_ROUTE':'PUBLIC_'+({instagram:'IG',facebook:'FB',linkedin:'LINKEDIN'}[p])+'_ENQUIRY_ROUTE'};
  if(row.booking_status==='USABLE'&&reviewedFact(row,'platform',now)){try{parsePublicUrl(row.booking_url);return {level:'USABLE',type:'PUBLIC_BUSINESS_CONTACT_PLATFORM'};}catch{}}
  if(['instagram','facebook','linkedin'].some(p=>validProfile(output[p+'_url'],p)))return {level:'WEAK',type:'SOCIAL_PROFILE_ONLY'};
  if(/^\+?[\d ().-]+$/.test(text(output.phone).replace(/^'/,''))&&/^[\d]{7,15}$/.test(text(output.phone).replace(/\D/g,'')))return {level:'WEAK',type:'PHONE_ONLY'};
  return {level:'NONE',type:'NO_VERIFIED_ROUTE'};
}
function assessQualification(output,row,now=output.checked_at||new Date().toISOString()) {
  const activity=classifyActivity(row,now), gap=yes(row.gap_unresolved_verified)&&Boolean(reviewedFact(row,'gap',now));
  const legitimate=Boolean(reviewedFact(row,'legitimacy',now)),businessCase=Boolean(reviewedFact(row,'business_case',now));
  const quality=reviewedFact(row,'website_quality',now), resolved=Boolean(quality)&&row.website_quality_reviewed==='STRONG_SITE'&&yes(row.strong_site_solves_gap_verified);
  const mismatch=['MISMATCHED','UNCERTAIN'].includes(row.identity_status_reviewed), proof=Boolean(reviewedFact(row,'proof',now));
  const operations=['ACTIVE','LIKELY_ACTIVE'].includes(activity.status)&&activity.confidence>=60;
  const trigger=Boolean(reviewedFact(row,'buying_trigger',now)),decisionMaker=Boolean(reviewedFact(row,'decision_maker',now));
  const score=scoreLead({activity:activity.status,activityConfidence:activity.confidence,gap,legitimate,businessCase,proof,operations,identityMismatch:mismatch,resolvedGap:resolved,trigger,decisionMaker});
  const route=contactAssessment(output,row,now), critical=[];
  if(mismatch)critical.push('IDENTITY_UNRESOLVED');
  if(score.quality!=='DISQUALIFY'){
    if(!operations)critical.push('ACTIVITY_UNCORROBORATED');
    if(!legitimate)critical.push('LEGITIMACY_UNESTABLISHED');
    if(!gap)critical.push('GAP_UNVERIFIED');
    if(gap&&!businessCase)critical.push('BUSINESS_CASE_UNESTABLISHED');
  }
  const completeness=[operations,legitimate,gap||resolved,businessCase||resolved,['STRONG','USABLE'].includes(route.level)].filter(Boolean).length;
  const confidence=mismatch?'LOW':completeness>=4&&activity.confidence>=70?'HIGH':completeness>=2?'MEDIUM':'LOW';
  const reasons=[];
  const prior=row.previous_result||{};
  const blocked=PROTECTED.includes(row.arc_status)||PROTECTED.includes(output.arc_status)||PROTECTED.includes(prior.arc_status)||[row,output,prior].some(r=>yes(r.initial_contact_recorded)||yes(r.initial_outreach_blocked)||yes(r.duplicate_review_required))||yes(row.suppressed)||output.suppression_status==='DO_NOT_CONTACT';
  let readiness;
  if(blocked||score.quality==='DISQUALIFY'||output.acma_status==='DO_NOT_EMAIL'){readiness='BLOCKED';reasons.push(blocked?'PROTECTED_HISTORY_OR_CONTACT_LOCK':score.quality==='DISQUALIFY'?'COMMERCIAL_DISQUALIFICATION':'SUPPRESSION');}
  else if(!['STRONG','USABLE'].includes(route.level)){readiness='PARK';reasons.push(route.type);}
  else if(critical.length){readiness='NEEDS_RESEARCH';reasons.push(...critical);}
  else if(output.country==='Australia'&&output.acma_status!=='SAFE_TO_REVIEW'){readiness='NEEDS_COMPLIANCE_REVIEW';reasons.push('AU_CONSENT_REVIEW');}
  else if(yes(row.legacy_join_review_required)||yes(row.legacy_colour_review_required)||!output.timezone){readiness='NEEDS_RESEARCH';reasons.push('OPERATIONAL_REVIEW');}
  else readiness='READY_FOR_REVIEW';
  return {commercial_quality:score.quality,commercial_basis:score.basis,lead_quality:score.quality,lead_score:score.score,
    contactability:route.level,contact_route_type:route.type,research_confidence:confidence,confidence_score:Math.min(100,completeness*20+(trigger?5:0)+(decisionMaker?5:0)),
    outreach_readiness:readiness,compliance_status:output.acma_status,research_required:critical.length>0,
    critical_uncertainties_json:JSON.stringify(critical),readiness_reasons_json:JSON.stringify(reasons),
    business_status:activity.status,business_status_confidence:activity.confidence,activity_signal_strength:activity.strength||'WEAK',
    activity_evidence:JSON.stringify(activity.evidence),qualification_version:'2.1.0',qualification_checked_at:now,
    qualification_notes:score.basis+'. Critical factual uncertainties: '+(critical.join(', ')||'none')+'. Outreach review: '+(reasons.join(', ')||'human approval remains required')+'. Contact verification is public provenance, not delivery or consent.'};
}
function recalibrateResult(previous,row,now=new Date().toISOString()) {
  const result={...previous,...assessQualification(previous,row,now)};
  result.research_version='2.1.0';
  // Scoring does not refresh source observations or reset workflow/history state.
  return result;
}
module.exports={DIMENSION_FIELDS,validProfile,contactAssessment,assessQualification,recalibrateResult};
