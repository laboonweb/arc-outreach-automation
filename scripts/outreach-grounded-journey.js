'use strict';
// A bounded positive proposal for verified business information. It describes
// the actual published starting point without inventing harm or site absence.
const {text,sha256}=require('./helpers'),h=require('./research-history');
function enrich(e,fs){
 const structural=fs.find(f=>['opportunity','structural_opportunity'].includes(f.type));
 const contact=fs.find(f=>['contact','published_email','public_contact_route'].includes(f.type)&&!/candidate profile.*unverified/i.test(f.excerpt));
 const meaningful=structural||contact||fs.find(f=>['service','services','offer','package'].includes(f.type));
 if(!meaningful||!e.verified_friction||!['Facebook','Instagram','LinkedIn','owned website'].includes(e.verified_presence))return null;
 const p=e.verified_presence,category=e.verified_business_description;
 const specific=category!=='business',context=specific?e.proposal_context[0]:'business information';
 // The clean category map is established upstream; no free-form excerpt enters
 // the language map. A published email can support an enquiry proposition even
 // when the Message button or a recent activity date is still unresolved.
 const opener=specific?`Your public business information describes ${category}.`:`I noticed the public business information for ${e.business_name} on ${p}.`;
 const narrative=p==='owned website'?'That gives someone a published place to start reading about the business before getting in touch.':`For someone starting on ${p}, the published business information is a place to begin before making an enquiry.`;
 const proposal=`I'd build a simple site around the ${context}, with a short form for the question or request someone wants to discuss. They could read the information and explain what they need from the same page, giving you useful context for the first conversation.`;
 const anchors=specific?[category]:[p.toLowerCase(),'public business information'];
 e.business_hook={kind:'GROUNDED_INFORMATION',label:specific?category+'; '+p:'Published business information on '+p,anchors,proof:false,signature:sha256(JSON.stringify(['GROUNDED_INFORMATION',category,p,meaningful.source_url,h.identity(meaningful)])),source_fact_types:[meaningful.type]};
 e.grounded_journey=true;e.human_language={openings:[opener],narratives:[narrative],proposals:[proposal],subject:specific?context+' enquiries':'business information and enquiries',customer_task:'Read the published business information and ask a specific question.',friction:narrative,outcome:'Connect the published business information to a useful enquiry.',ctas:require('./outreach-human').CTAS};
 e.allowed_claims=[{id:'asset_0',kind:'asset',text:opener},{id:'task_0',kind:'friction_consequence',stages:['friction','consequence'],text:narrative}];e.allowed_observations=[opener];e.allowed_opportunities=[e.human_language.outcome];
 Object.assign(e.verified_friction,{verified_asset:e.business_hook.label+'.',verified_friction:narrative,customer_task:e.human_language.customer_task,customer_consequence:narrative,desired_outcome:e.human_language.outcome,arc_mechanism:proposal});return e;
}
function compose(e,variant=0){return require('./outreach-human').compose(e,variant);}
function mechanism(value,e){return e.grounded_journey&&/\bsite\b/i.test(value)&&/short form/i.test(value)&&text(value).toLowerCase().includes(e.verified_business_description==='business'?'business information':e.proposal_context[0].toLowerCase());}
module.exports={enrich,compose,mechanism};
