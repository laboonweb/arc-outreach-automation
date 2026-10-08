'use strict';
// Controlled translations of verified facts. Never copy an excerpt into outreach.
const {text,norm,sha256,parsePublicUrl}=require('./helpers');
const JARGON=/\b(?:owned (?:customer |enquiry |service )?(?:destinations?|paths?|sites?|journeys?)|entry (?:routes?|points?)|enquiry (?:routes?|journeys?)|service[ -]to[ -]enquiry(?: journeys?)?|platform (?:pages?|journeys?|dependenc[ey])|customer journeys?|verified (?:friction|asset)|structural opportunit(?:y|ies)|friction archetypes?|business[ -]approved information|focused website|service discovery route|give that route|for someone discovering|from there,? someone still relies|bring (?:all )?(?:the|your|that) information together)\b/i;
const CTAS=[
 "I've got an idea for this. Worth showing you?",
 "I can sketch out the approach if you'd like to see it. Interested?",
 "Would it be useful if I showed you how I'd set this up?",
 "Want me to walk you through the idea?"
];
const factTypes=new Set(['identity','legitimacy','discovery_identity_check','service','services','offer','package','location','branch','public_contact_route','activity','review']);
function firstParty(f){try{return /(^|\.)(facebook\.com|instagram\.com|fb\.com)$/.test(parsePublicUrl(f.source_url).host)&&(f.official_status==='AUTO_VERIFIED_OFFICIAL'||['REVIEWED_FACT','HUMAN_REVIEWED_INPUT'].includes(f.verification));}catch{return false;}}
function hook(e,fs){
 const facts=fs.filter(f=>factTypes.has(f.type));
 // Titles alone can establish an identity/location, not an invented service offer.
 const withoutName=f=>text(f.excerpt).replace(new RegExp(e.business_name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'),'');
 const has=re=>facts.some(f=>re.test(withoutName(f))&&!/not offered|do not offer|no longer offer|unverified service/i.test(f.excerpt));
 const official=re=>facts.some(f=>firstParty(f)&&re.test(text(f.excerpt)));
 const locations=['Middle Swan','Gawler East','Port Noarlunga','Kings Park','Intramuros','Bangor'];
 const location=locations.find(v=>facts.some(f=>firstParty(f)&&text(f.excerpt).includes(v)))||locations.find(v=>facts.filter(f=>text(f.excerpt).includes(v)).length>=2)||'';
 const proof=e.verified_friction.public_proof;
 let kind='',label='',anchors=[],detail='';
 if(e.domain_gap){kind='BUSINESS_DOMAIN';label='Public business contact and associated domain';anchors=[e.domain_gap.classification==='BROKEN_DESTINATION'?'destination tied to your business email':'domain tied to your business email'];detail=e.domain_gap.domain+' '+e.domain_gap.kind;}
 else if(official(/manila shooting package/i)){kind='SHOOT_PACKAGE';label='Published Manila shooting package';anchors=['manila shooting package'];detail='package';}
 else if(e.verified_business_description==='automotive services'&&has(/log ?book service/i)&&has(/rego inspections|registration inspections/i)&&has(/\bbrakes\b/i)){kind='VEHICLE_SERVICES';label='Logbook servicing, brakes and registration inspections';anchors=['logbook servicing','brakes','registration inspections'];detail='named services';}
 else if(e.verified_business_description==='driving instruction'&&official(/text or call|call or text/i)){kind='LESSON_CALL_TEXT';label='Driving lessons with a published text-or-call option';anchors=['text or call','lessons'];detail='text or call';}
 else if(e.verified_business_description==='driving instruction'&&location){kind='LOCAL_LESSONS';label='Driving school listed in '+location;anchors=[location.toLowerCase(),'lessons'];detail=location;}
 else if(e.verified_business_description==='pool maintenance'&&has(/swimming pool maintenance|pool (?:maintenance|service|repair)/i)){kind='POOL_SERVICE';label='Pool maintenance'+(proof?' with public customer reviews':'');anchors=proof?['pool maintenance','customer']:['pool maintenance'];detail=proof?'reviews':'service category';}
 else if(['kitchen projects','kitchens and cabinetry'].includes(e.verified_business_description)&&proof&&location){kind='LOCAL_KITCHEN_PROOF';label='Kitchen business listed in '+location+' with public customer reviews';anchors=[location.toLowerCase(),'customer reviews'];detail=location+' reviews';}
 else if(e.verified_business_description!=='business'&&facts.some(f=>['service','services','offer'].includes(f.type))){kind='SERVICE_CATEGORY';label=e.verified_business_description;anchors=[e.proposal_context[0].toLowerCase()];detail=e.verified_business_description;}
 else if(e.tier==='TIER_A_VERIFIED_GAP'&&['PLACEHOLDER_PROOF','BROKEN_ENQUIRY','BROKEN_DESTINATION'].includes(e.verified_structural_gap)&&e.verified_business_description!=='business'){kind='SITE_REPAIR';label=e.verified_business_description+'; '+e.verified_structural_gap;anchors=[e.verified_business_description];detail=e.verified_structural_gap;}
 if(!kind)return null;
 return {kind,label,anchors,location,proof,signature:sha256(JSON.stringify([kind,detail,e.verified_business_description])),source_fact_types:[...new Set(facts.map(f=>f.type))]};
}
function language(e){
 const h=e.business_hook,n=e.business_name,p=e.verified_presence,r=e.verified_friction;
 let openings,narratives,proposals,subject,task,friction,outcome;
 switch(h.kind){
 case 'BUSINESS_DOMAIN':
  openings=[e.domain_gap.observation];
  narratives=[r.customer_consequence];
  proposals=[`I'd turn that domain into a functioning business site explaining your ${e.proposal_context[0]}${h.proof?', with customer feedback beside the services':''} and a short form asking what help someone needs. They could read about the work, explain what they need and send a useful outline before the first conversation.`];
  task='Open the business domain and ask about the work needed.';friction=e.domain_gap.observation;outcome='Give the business domain a working site with services and a simple enquiry form.';subject='your business domain';break;
 case 'POOL_SERVICE':
  openings=[`Pool maintenance is listed for your business${h.proof?', with customer reviews people can read':''}.`,`Your pool maintenance listings${h.proof?' and customer reviews':''} give people a way to check the work you handle.`,`People can look into your pool maintenance work${h.proof?' and read customer feedback':''}.`];
  narratives=[`If they start on ${p}, they use the page itself to look into the pool work before getting in touch.`,`For people who find you on ${p}, understanding the pool work and finding how to contact you both start on the page.`];
  proposals=[`I'd build a simple site explaining the pool work you handle${h.proof?', with customer feedback beside it':''} and a short form asking what help they need. They could read about the service, then tell you about their pool from the same page.`,`I'd explain the pool work on a simple site${h.proof?', with customer feedback beside it':''}, then add a short form asking what help they need with their pool. The enquiry could give you a useful starting point for the conversation.`];
  task='Understand the pool work and ask for help.';friction=`Someone starting on ${p} uses the page to understand the pool work and find how to contact the business.`;outcome='Explain the pool services and make it easy to ask about the work needed.';subject='pool maintenance enquiries';break;
 case 'VEHICLE_SERVICES':
  openings=[`Your listings cover logbook servicing, brakes and registration inspections.`,`Logbook servicing, brakes and registration inspections are all listed for ${n}.`,`Your listings already cover logbook servicing, brakes and registration inspections.`];
  narratives=[`Those listings describe the work, while ${p} gives people a way to contact you. Reading about a service and asking about a vehicle means moving between them.`,`Reading the service listings and then contacting you through ${p} means switching pages to ask about the vehicle.`];
  proposals=["I'd build service pages that explain the work, show relevant customer feedback and lead into a short enquiry about the vehicle and the problem. The service explanation and a place to ask about the car could sit on the same page.","I'd put an explanation of each service on a site, beside relevant customer feedback and a short vehicle enquiry. People could describe what needs doing while the service they're reading about is still in front of them."];
  if(!h.proof)proposals=proposals.map(s=>s.replace(/, show relevant customer feedback/,'').replace(' beside relevant customer feedback and',' beside'));
  task='Understand the vehicle work, check feedback, then ask about the car.';friction=`Service details are in listings; the verified way to contact the business is on ${p}.`;outcome='Explain each service beside a short enquiry about the vehicle and work needed.';subject='logbook servicing and vehicle enquiries';break;
 case 'SHOOT_PACKAGE':
  openings=[`The Manila shooting package is the offer I'd lead with on a ${n} site.`,`Your Manila shooting package is a specific offer someone can weigh up before asking about a date.`,`I'd start with the Manila shooting package when planning a site for ${n}.`];
  narratives=[`On ${p}, that starts with the package post and then contacting you about availability.`,`On ${p}, they start with the post and then contact you about availability.`];
  proposals=[`I'd make a site where someone can open the package, read the inclusions and venue details${h.proof?' alongside customer feedback':''}, then ask about availability with their proposed shoot date. The request could include the package they were looking at, so you have that context from the start.`,`I'd build the site around choosing a package, checking its inclusions and the venue details${h.proof?', then reading customer feedback':''}. A short availability form could carry their package choice and proposed shoot date into the enquiry.`];
  task='Read the shooting package, check the venue, ask about a date.';friction='The shooting package is published in a Facebook post; availability enquiries start from that platform.';outcome='Let someone explore the package and ask about availability with the package and date attached.';subject='shooting package enquiries';break;
 case 'LESSON_CALL_TEXT':
  openings=[`Your instruction to text or call gives learners a direct way to ask about lessons.`,`Text or call is the next step you give learners asking about lessons.`,`For questions about lessons, you ask learners to text or call.`];
  // Anchors accept either natural representation of the published instruction.
  h.anchors=['text or call','lessons'];
  narratives=[`That takes a learner from the ${p} page into a text or phone conversation about lessons.`,`That takes the conversation from the ${p} page into a text or phone call about lessons.`];
  proposals=["I'd put lesson information on a simple site, with a short form for their experience level and what they'd like help with. You could start the call with their question in front of you.","I'd explain the lessons on a simple site and let learners send their starting experience and question before a call. You'd have something specific to discuss when you reply."];
  task='Ask about lessons by text or call.';friction='A learner moves from the Facebook page to a text or call to explain what they need.';outcome='Help learners send useful context before a lesson conversation.';subject='lesson questions before a call';break;
 case 'LOCAL_LESSONS':
  openings=[`${n} is listed in ${h.location}, with a ${p} page learners can find.`,`Learners looking up ${n} can find the ${h.location} location and ${p} page.`,`Learners can find your ${h.location} location and contact details on ${p}.`];
  narratives=[`For learners arriving through ${p}, the profile is where they start looking into lessons and work out how to contact you.`,`For a learner starting with the ${p} page, understanding the lessons and finding how to ask about them happen there.`];
  proposals=[`I'd build a lesson page around what a new learner needs to know, with your ${h.location} location and a short form for their starting experience and lesson question. They could read first, then get in touch with a specific question.`,`I'd make the lesson information easy to read on a simple site, keep the ${h.location} location visible and put a lesson enquiry beside it. A learner could tell you where they're starting and what they'd like to learn.`];
  task='Check the school location and ask about driving lessons.';friction='Someone starting on Facebook uses the profile to learn about lessons and find how to contact the school.';outcome='Show the lesson information and business location beside a useful learner enquiry.';subject='lessons in '+h.location;break;
 case 'LOCAL_KITCHEN_PROOF':
  openings=[`People looking you up in ${h.location} can find customer reviews as well as the ${p} page.`,`Customer reviews and your ${h.location} listing give people a way to look into the business.`,`Your business has customer reviews people can read and a listing in ${h.location}.`];
  narratives=[`For people who start with ${p}, looking into the business and getting in touch both happen through the page.`,`If they come through ${p}, they use the page to look into the business and find how to contact you.`];
  proposals=["I'd build a simple site around the kitchen work, with customer feedback beside the explanation and a short project brief. People could describe the kitchen they have in mind before the first conversation.","I'd explain the kitchen work on a simple site, with customer feedback and a short form about the project they have in mind. They could read about the business, then get in touch with a useful outline of the job."];
  task='Check customer feedback and ask about a kitchen project.';friction='Someone starting on Facebook uses the page to look into the business before asking about a project.';outcome='Explain the kitchen work beside feedback and a short project enquiry.';subject='kitchen project enquiries';break;
 case 'SITE_REPAIR':
  if(e.verified_structural_gap==='BROKEN_ENQUIRY'){openings=['The enquiry form on your website has no working submit control.'];narratives=['A visitor cannot send an enquiry through that form.'];proposals=[`I'd repair the form on your ${e.verified_business_description} site and test that enquiries reach you. I'd also add a clear confirmation after submission, so someone knows their message has gone through and can see what happens next.`];}
  else if(e.verified_structural_gap==='PLACEHOLDER_PROOF'){openings=['Your website has placeholder testimonials in its customer feedback section.'];narratives=['Those placeholders do not show attributable feedback from customers.'];proposals=[`I'd replace them on your ${e.verified_business_description} site with attributable customer feedback beside a short enquiry about the work. A visitor could read the service explanation, check the feedback and ask a specific question from the same page.`];}
  else{openings=['The website address associated with your business returns a missing-page response.'];narratives=['A visitor following that address reaches a page that does not work.'];proposals=[`I'd restore your ${e.verified_business_description} site and test the links, the enquiry form and delivery of the request. I'd also add a clear submission confirmation, so a visitor can see that their message has gone through and what happens next.`];}
  task='Use the website to ask about '+e.verified_business_description+'.';friction=r.verified_friction;outcome='Restore a clear, working way to enquire.';subject='your '+e.verified_business_description+' website';break;
 default:return null; // New categories require reviewed natural-language mappings.
 }
 // Strong archetypes retain their established, evidence-backed problem.
 if(h.kind!=='SITE_REPAIR'&&r.scope==='VERIFIED_MESSAGE_REQUIREMENT')narratives=['Your published instruction asks people to message for details before they can decide what to enquire about.'];
 if(h.kind!=='SITE_REPAIR'&&r.scope==='VERIFIED_LOCATION_STRUCTURE')narratives=['Location details are spread across separate posts or pages, so someone using them has to piece those details together.'];
 if(h.kind!=='SITE_REPAIR'&&r.scope==='VERIFIED_SERVICE_STRUCTURE')narratives=['Service details are spread across the content, so someone reading it has to piece the information together before enquiring.'];
 return {openings,narratives,proposals,subject,customer_task:task,friction,outcome,ctas:CTAS};
}
function enrich(e,fs){
 const h=hook(e,fs);if(!h)return null;e.business_hook=h;
 const l=language(e);if(!l)return null;e.human_language=l;
 e.allowed_claims=l.openings.map((s,i)=>({id:'asset_'+i,kind:'asset',text:s})).concat(l.narratives.map((s,i)=>({id:'task_'+i,kind:'friction_consequence',stages:['friction','consequence'],text:s})));
 e.allowed_observations=l.openings;e.allowed_opportunities=[l.outcome];
 Object.assign(e.verified_friction,{verified_asset:h.label+'.',verified_friction:l.friction,customer_task:l.customer_task,customer_consequence:l.narratives[0],desired_outcome:l.outcome,arc_mechanism:l.proposals[0]});
 return e;
}
function compose(e,variant=0){
 if(!e?.human_language||!e.business_hook)return null;
 const l=e.human_language,seed=parseInt(sha256(e.business_name+e.business_hook.kind).slice(0,8),16)+variant;
 const a=seed%l.openings.length,b=seed%l.narratives.length,c=seed%l.proposals.length;
 const opener=l.openings[a],narrative=l.narratives[b],proposal=l.proposals[c];
 // Stable variety changes rhythm and CTA, while every factual statement stays allowed.
 const body=seed%2?`${opener} ${narrative}\n\n${proposal}`:`${opener}\n\n${narrative}\n\n${proposal}`;
 const ctaIndex={POOL_SERVICE:0,VEHICLE_SERVICES:1,SHOOT_PACKAGE:1,LESSON_CALL_TEXT:3,LOCAL_LESSONS:2,LOCAL_KITCHEN_PROOF:0,SITE_REPAIR:2};
 const cta=l.ctas[((ctaIndex[e.business_hook.kind]??seed)+variant)%l.ctas.length];
 const plain=require('./outreach-content').plain;
 return {subject:e.channel==='EMAIL'?plain(`${e.business_name}: ${l.subject}`):null,draft:plain(`Hi ${e.business_name} team, Briann here from Arc Web Works.\n\n${body}\n\n${cta}`),observation_used:plain(opener),opportunity_used:l.outcome,claims_used:['asset_'+a,'task_'+b]};
}
function uniqueness(output,e,peers=[]){
 const body=norm(output.draft||output.draft_body).replaceAll(norm(e.business_name),'[business]');
 const own=!!e.business_hook&&e.business_hook.anchors.every(a=>body.includes(norm(a)));
 const conflict=peers.some(p=>p.evidence?.business_name!==e.business_name&&(p.evidence?.business_hook?.signature===e.business_hook?.signature||norm(p.output?.draft||p.output?.draft_body).replaceAll(norm(p.evidence?.business_name),'[business]')===body));
 return {valid:own&&!conflict,issues:!own?['BUSINESS_HOOK_REQUIRED']:conflict?['INTERCHANGEABLE_COPY']:[]};
}
function mechanism(proposal,e){
 if(e.grounded_journey)return require('./outreach-grounded-journey').mechanism(proposal,e);
 const s=norm(proposal),kind=e.business_hook?.kind;
 const checks={BUSINESS_DOMAIN:()=>/domain/.test(s)&&/site/.test(s)&&/form/.test(s)&&s.includes(norm(e.proposal_context[0])),POOL_SERVICE:()=>/pool/.test(s)&&/form|tell|asking|request/.test(s),VEHICLE_SERVICES:()=>/vehicle|car/.test(s)&&/enquiry/.test(s)&&/service/.test(s),SHOOT_PACKAGE:()=>/package/.test(s)&&/availability/.test(s)&&/date/.test(s),LESSON_CALL_TEXT:()=>/lessons?/.test(s)&&/experience/.test(s)&&/call/.test(s),LOCAL_LESSONS:()=>/lesson/.test(s)&&s.includes(norm(e.business_hook.location))&&/form|enquiry/.test(s),LOCAL_KITCHEN_PROOF:()=>/kitchen/.test(s)&&/project/.test(s)&&/form|brief/.test(s),SITE_REPAIR:()=>/repair|restore|replace/.test(s)&&/enquir|feedback|links|form/.test(s)};
 return !!checks[kind]?.();
}
module.exports={JARGON,CTAS,hook,enrich,compose,uniqueness,mechanism};
