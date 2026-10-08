'use strict';
const {yes,text,parsePublicUrl}=require('./helpers');
const TIERS=['TIER_A_VERIFIED_GAP','TIER_B_VERIFIED_OPPORTUNITY','TIER_C_NEEDS_RESEARCH'];
function publicPlatform(f){try{return /(^|\.)(facebook\.com|fb\.com|instagram\.com|linkedin\.com|birdeye\.com|opentable\.com|findglocal\.com|primer\.ph|primer\.com\.ph|spot\.ph|tatlerasia\.com)$/.test(parsePublicUrl(f.source_url).host);}catch{return false;}}
function assessTier(row,fs,route,now=new Date().toISOString()){
 const identity=fs.find(f=>f.type==='legitimacy'||f.type==='identity'),activity=fs.find(f=>f.type==='activity');
 let critical=[];try{critical=JSON.parse(row.critical_uncertainties_json||'[]');if(!Array.isArray(critical))critical=['EVIDENCE_METADATA_INVALID'];}catch{critical=['EVIDENCE_METADATA_INVALID'];}
 const identityConflict=['MISMATCHED','UNCERTAIN','UNRESOLVED'].includes(row.identity_status_reviewed)||fs.some(f=>f.lead_id&&f.lead_id!==row.lead_id)||critical.some(x=>/IDENTITY|NAMESAKE|BRANCH_MISMATCH|EVIDENCE_METADATA_INVALID/.test(x));
 let sourceWarnings=[];try{sourceWarnings=JSON.parse(row.evidence_json||'[]').filter(f=>/entity\/registration conflict|resolve.*identity|namesake.*unresolved|review branch\/address drift|source city.*conflicts/i.test(f.excerpt||''));}catch{}
 const issues=[];
 if(!identity||identityConflict||sourceWarnings.length)issues.push('IDENTITY_UNRESOLVED');
 const inactive=['INACTIVE','LIKELY_INACTIVE'].includes(row.business_status)||['INACTIVE','LIKELY_INACTIVE'].includes(row.activity_status);
 const futureOpening=row.activity_operating_since&&Date.parse(row.activity_operating_since)>Date.parse(now);
 const weakSignal=['HTTP_ONLY','DIRECTORY_ONLY','REGISTRATION_ONLY'].includes(row.activity_signal_type);
 if(!activity||inactive||futureOpening||weakSignal)issues.push('ACTIVITY_UNRESOLVED');
 if(route.channel==='NO_ROUTE')issues.push('NO_VERIFIED_PUBLIC_ROUTE');
 const structural=fs.find(f=>f.type==='opportunity'||f.type==='structural_opportunity'||f.type==='no_website'||f.type==='gap'&&/no (?:verified )?(?:owned )?(?:web ?site|central)|social[- ]only|relies.*social|information.*(?:spread|scattered).*platform/i.test(f.excerpt));
 const gap=fs.find(f=>f.type==='gap'&&f!==structural&&(!text(row.gap_verified)||yes(row.gap_verified))&&(!text(row.gap_unresolved_verified)||yes(row.gap_unresolved_verified)));
 let opportunity=structural;
 const owned=fs.some(f=>f.type==='business_domain'&&f.association_verified===true&&['ACTIVE_SITE','ACTIVE_REDIRECT'].includes(f.classification))||fs.some(f=>['association','website_quality'].includes(f.type))&&['REVIEWED_ASSOCIATION','VERIFIED'].includes(row.website_association)||yes(row.website_ownership_verified)||yes(row.website_association_verified);
 if(owned&&opportunity?.opportunity_kind==='VERIFIED_PLATFORM_PRESENCE')opportunity=null;
 // Missing URLs alone establish nothing. A reviewed public presence supports
 // a bounded owned-destination proposal without claiming there is no website.
 if(!opportunity&&!owned&&!text(row.website_url))opportunity=fs.find(f=>['facebook','instagram','linkedin','platform'].includes(f.type)&&publicPlatform(f))||(identity&&publicPlatform(identity)?identity:null);
 if(issues.length)return {tier:TIERS[2],issues,identity,activity,gap,opportunity,sourceWarnings};
 if(gap)return {tier:TIERS[0],issues:[],identity,activity,gap,opportunity,sourceWarnings};
 if(opportunity)return {tier:TIERS[1],issues:[],identity,activity,gap:null,opportunity,sourceWarnings};
 return {tier:TIERS[2],issues:['STRUCTURAL_OPPORTUNITY_UNESTABLISHED'],identity,activity,gap:null,opportunity:null,sourceWarnings};
}
module.exports={TIERS,assessTier};
