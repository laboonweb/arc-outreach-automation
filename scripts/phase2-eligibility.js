'use strict';
// Draft evidence and outreach permission are deliberately separate. Pure logic:
// this module neither refreshes evidence nor changes a source or a contact lock.
const h=require('./research-history'),{text,yes,parsePublicUrl}=require('./helpers');
const routes=require('./research-contact-routes'),{assessTier}=require('./outreach-evidence-tiers');
const LABELS={ACTIVITY_STALE:'Recent activity needs refreshing.',ACTIVITY_UNVERIFIED:'Recent business activity needs verification.',AU_COMPLIANCE_REVIEW:'Australian contact permission needs operator review and a recorded basis.',COMPLIANCE_REVIEW:'Contact permission needs operator review.',MESSAGING_AVAILABILITY_UNVERIFIED:'The actual Message/contact option has not been verified.',NO_VERIFIED_PUBLIC_ROUTE:'A usable contact route needs verification.',TIMEZONE_REQUIRED:'The business timezone needs verification.',COMPLIANCE_BLOCKED:'An existing contact restriction blocks outreach.',CURRENT_EVIDENCE_REVIEW:'Current evidence needs review before approval.'};
function social(url){try{return /(^|\.)(facebook\.com|fb\.com|instagram\.com|linkedin\.com)$/.test(parsePublicUrl(url).host);}catch{return false;}}
function route(row,now,payload={}){
 const selected=routes.selectChannel(row,now),candidate=routes.verifiedCandidate(row,now),all=[selected,...(candidate?[{...candidate,source:candidate.source_url}]:[])].filter(r=>r.channel!=='NO_ROUTE');
 // Keep an existing verified draft route stable, including Alex's manual DM.
 return all.find(r=>r.channel===payload.channel&&routes.routeKey(r.channel,r.recipient)===routes.routeKey(payload.channel,payload.recipient))||all.find(r=>r.channel===text(row.preferred_channel).toUpperCase())||all[0]||{channel:'NO_ROUTE',recipient:'',source:''};
}
function draftFacts(row,now){
 const all=h.allFacts(row),current=h.currentFacts(row,now);
 // A stale activity date is never presented as recent. Its still-verifiable
 // published description may support copy context without renewing the date.
 const context=all.filter(f=>f.type==='activity'&&h.verified(f)&&!f.superseded_by&&!/^\s*[\[{]/.test(f.excerpt)&&Date.parse(f.observed_at)>=Date.parse(now)-90*86400000&&Date.parse(f.fact_date||f.observed_at)<=Date.parse(now));
 return [...new Map([...current,...context].map(f=>[h.identity(f),f])).values()].filter(f=>!/^\s*[\[{]/.test(f.excerpt));
}
function assess(row,now=new Date().toISOString(),payload={}){
 const current=h.currentFacts(row,now),fs=draftFacts(row,now),r=route(row,now,payload),strict=assessTier(row,current,r,now),issues=[];
 if(strict.issues.includes('IDENTITY_UNRESOLVED'))issues.push('IDENTITY_UNRESOLVED');
 const owned=current.some(f=>f.type==='business_domain'&&['ACTIVE_SITE','ACTIVE_REDIRECT'].includes(f.classification))||current.some(f=>['association','website_quality'].includes(f.type)&&!social(f.source_url))&&['VERIFIED','REVIEWED_ASSOCIATION'].includes(row.website_association)||yes(row.website_ownership_verified)||yes(row.website_association_verified);
 const gap=strict.gap;
 let opportunity=strict.opportunity;
 if(owned&&opportunity?.opportunity_kind==='VERIFIED_PLATFORM_PRESENCE')opportunity=null;
 if(!gap&&!opportunity)issues.push('STRUCTURAL_OPPORTUNITY_UNESTABLISHED');
 const meaningful=fs.some(f=>['service','services','offer','package','location','branch','contact','published_email','public_contact_route','activity','gap','opportunity','structural_opportunity','facebook','instagram','linkedin'].includes(f.type));
 if(!meaningful)issues.push('MEANINGFUL_BUSINESS_EVIDENCE_REQUIRED');
 const protection=require('./phase2-cloud-queue').protection(row)|| (payload.initial_locked?payload.route_reason||'CONTACT_LOCK':'');
 const tier=gap?'TIER_A_VERIFIED_GAP':opportunity?'TIER_B_VERIFIED_OPPORTUNITY':'TIER_C_NEEDS_RESEARCH';
 return {eligible:!issues.length&&!protection,issues,protection,tier,route:r,facts:fs,current,identity:strict.identity,gap,opportunity,strict};
}
function sendBlockers(row,now=new Date().toISOString(),payload={},controls={}){
 const a=assess(row,now,payload),out=[];
 if(a.protection)out.push('PROTECTED');
 if(a.strict.issues.includes('ACTIVITY_UNRESOLVED'))out.push(h.allFacts(row).some(f=>f.type==='activity'&&h.verified(f)&&!f.superseded_by)?'ACTIVITY_STALE':'ACTIVITY_UNVERIFIED');
 if(!a.eligible)out.push(...a.issues);
 if(!require('./phase2-cloud-queue').QUALIFIED.has(require('./phase2-cloud-queue').tier(row)))out.push('CURRENT_EVIDENCE_REVIEW');
 if(a.route.channel==='NO_ROUTE'||row.route_invalid)out.push('NO_VERIFIED_PUBLIC_ROUTE');
 if(!require('./outreach-mvp').scheduledTime(now,row.timezone).utc)out.push('TIMEZONE_REQUIRED');
 const status=controls.compliance_status||payload.compliance_status||row.compliance_status||row.acma_status||'REVIEW_REQUIRED';
 if(['DO_NOT_EMAIL','DO_NOT_CONTACT'].includes(status)||['DO_NOT_EMAIL','DO_NOT_CONTACT'].includes(row.compliance_status)||['DO_NOT_EMAIL','DO_NOT_CONTACT'].includes(row.acma_status))out.push('COMPLIANCE_BLOCKED');
 else if((row.country==='Australia'||row.dataset_id==='AUSTRALIA')&&!(status==='SAFE_TO_REVIEW'&&yes(controls.consent_reviewed)&&text(controls.compliance_basis)))out.push('AU_COMPLIANCE_REVIEW');
 else if(!['SAFE_TO_REVIEW','NOT_APPLICABLE'].includes(status))out.push('COMPLIANCE_REVIEW');
 if(a.route.channel!=='EMAIL'&&a.route.channel!=='NO_ROUTE'&&!payload.dm_verified_at&&!yes(controls.dm_verified))out.push('MESSAGING_AVAILABILITY_UNVERIFIED');
 return [...new Set(out)];
}
function state(blockers){return blockers.length?'DRAFT_READY_SEND_BLOCKED':'DRAFT_READY';}
module.exports={LABELS,social,route,draftFacts,assess,sendBlockers,state};
