'use strict';
// Pure single-record evidence refresh for the explicitly bounded regression.
// Routine batches obtain the same facts through autonomous-discovery.
const domains=require('./email-domain'),{qualify}=require('./autonomous-qualification');
const {yes,text}=require('./helpers');
function refresh(row,domainFacts,now=new Date().toISOString()){
 if(['SENT','REPLIED','FOLLOW_UP_DUE','DO_NOT_CONTACT','PARKED','DISQUALIFIED'].includes(row.arc_status)||yes(row.initial_contact_recorded)||yes(row.initial_outreach_blocked)||yes(row.duplicate_review_required)||row.research_runtime_hold)throw Error('CURRENT_RESEARCH_PROTECTION');
 let fs=JSON.parse(row.evidence_json||'[]');
 fs=domains.append(fs,domainFacts,now);
 const valid=domainFacts.filter(f=>f.verification==='DISCOVERY_VERIFIED'&&f.domain_identity_confidence>=85&&domains.reusable(f,now));
 const gap=(!text(row.gap_verified)||yes(row.gap_verified))&&(!text(row.gap_unresolved_verified)||yes(row.gap_unresolved_verified))?valid.map(f=>domains.gap(f,now)).find(Boolean):null;
 if(gap)fs=domains.append(fs,[gap],now);
 const projected=domains.project(row,fs,now),routes=require('./research-contact-routes'),selected=routes.selectChannel({...row,evidence_json:JSON.stringify(fs)},now),route=selected.channel==='NO_ROUTE'?routes.verifiedCandidate({...row,evidence_json:JSON.stringify(fs)},now)||selected:selected;
 // Retain the already accepted activity/contact classification; this refresh
 // inspects only domain state, and never invents a new activity observation.
 const d={facts:Object.fromEntries(fs.map((f,i)=>['fact_'+i,f])),fields:{website_url:projected.website_url},domain_facts:valid,selected_route:route,routes:[route],activity:{confidence:Number(row.activity_confidence||row.business_status_confidence)||0},held:[],provider_status:row.provider_status||'COMPLETED',searches:0,page_read_attempts:0};
 if(gap)d.facts.gap=gap;
 if(valid.some(f=>['ACTIVE_SITE','ACTIVE_REDIRECT'].includes(f.classification)))d.facts=Object.fromEntries(Object.entries(d.facts).filter(([,f])=>!['opportunity','structural_opportunity','no_website'].includes(f.type)&&!(f.type==='gap'&&!domains.gap(f,now))));
 const qualified=qualify(projected,{...projected,autonomous_research:d},now);
 const result={...projected,...qualified,evidence_json:JSON.stringify(fs),checked_at:now,last_researched_at:now,research_notes:'Bounded business-email-domain refresh; prior accepted activity, route and compliance retained. '+valid.reduce((n,f)=>n+(f.requests||0),0)+' public-domain HTTP requests; zero Exa/Tavily requests.',research_version:row.research_version+'+'+domains.VERSION};
 // Domain evidence cannot release review, suppression, history or routing locks.
 for(const field of ['acma_status','acma_reason','compliance_status','suppression_status','arc_status','queue_route','recommended_channel','contact_route_type','contactability','outreach_readiness','readiness_reasons_json','research_status','provider_status','research_batch_id','batch_summary_json'])result[field]=row[field];
 result.tier=result.commercial_basis;
 return require('./research-history').mergeRows(row,result,now);
}
module.exports={refresh};
