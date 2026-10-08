'use strict';
// Pure Phase 2 boundary. Research excerpts never become prompt or outbound text.
const {text,norm,parsePublicUrl,sha256}=require('./helpers');
const VERSION='arc-copy-v8-draft-send-separation';
const human=require('./outreach-human');
const content=require('./outreach-content');
const MODEL='NONE_STRUCTURED_COMPOSER';
const SIGNATURE='Best,\nBriann Arcala\nFounder, Arc Web Works\n+63 995 530 6231\nbriann@arcwebworks.com\narcwebworks.com';
const FOOTER='If you would prefer no further messages from Arc Web Works, reply and I will stop.';
const BANNED=/I (?:found|came across) your public business information|I came across your business information|a focused website could|bring (?:all )?(?:your|that|the published) information|information you approve|business-approved|no obligation|game.chang|unlock your|elevate your|digital landscape|boost your|limited.time/i;
const LEAK=/https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|org|net|au|ph|io)(?:\b|\/)|##|\*\*|\|[^\n]*\||```|(?:^|\n)\s*[\[{]|"[a-z_]+"\s*:|opening hours|popular times|contact\s*[-:]?\s*(?:phone|email)|\b(?:Exa|Tavily|Birdeye|Wheree|TradeRefer|Findglocal)\b|source_url|evidence_json|DISCOVERY_VERIFIED|EXACT_NAME|PUBLISHED_PHONE|confidence_score|search result|listing metadata|out of 5|\b\d+\s+reviews\b/i;
const FORBIDDEN_BASE=/los(?:ing|t) (?:customers|leads|revenue|sales)|low conversions?|converts? poorly|customers? (?:are )?confused|bad UX|urgent|urgency|guarantee|increase (?:your )?(?:sales|revenue|conversions)|you (?:have|don't have|do not have|haven't got) (?:no |a )?(?:website|site)|without (?:a |an )?(?:website|site)|no (?:owned )?website|social.only|rely(?:ing)? (?:entirely|solely)|doing most of|(?:built|made|created|finished|prepared|ready) (?:you |a |the |your )?(?:mockup|prototype|homepage)|(?:mockup|prototype) (?:is |already |ready)|\b(?:analytics|conversion rate|ROI)\b/i;
const FORBIDDEN_CLAIMS=['lost customers or revenue','conversion performance or analytics','customer confusion','urgency or buying intent','website absence','social-only or dominant traffic','a completed mockup or prototype','unverified services, locations, branches, people or activity'];
// Future business performance is not established by a proposed mechanism or
// by past results. Apply this guard at every existing FORBIDDEN call site.
const PERFORMANCE=/\b(?:doubl(?:e|es|ed|ing)|tripl(?:e|es|ed|ing)|quadrupl(?:e|es|ed|ing)|increase[sd]?|increasing|grow(?:s|ing)?|boost(?:s|ed|ing)?|multiply|multiplies|raise[sd]?|improv(?:e|es|ed|ing))\b[^.!?\n]{0,50}\b(?:bookings?|sales|revenue|conversions?|traffic|customers?|leads?|profits?)\b|\b(?:generates?|delivers?|attracts?|brings?|gets?|drives?)\b[^.!?\n]{0,30}\b(?:bookings?|sales|revenue|traffic|customers?|leads?|profits?)\b|\b(?:more|higher|increased|additional) (?:bookings?|sales|revenue|conversions?|traffic|customers?|leads?|profits?)\b/i;
const FORBIDDEN=new RegExp(FORBIDDEN_BASE.source+'|'+PERFORMANCE.source,'i');
function list(v){try{const a=typeof v==='string'?JSON.parse(v||'[]'):v;return Array.isArray(a)?a:[];}catch{return [];}}
function words(s){return norm(s).replace(/[^a-z0-9']/g,' ').split(/\s+/).filter(Boolean);}
function verified(row,now){return require('./phase2-eligibility').draftFacts(row,now);}
function structured(row,channel,now=new Date().toISOString()){
 const fs=verified(row,now),name=text(row.business_name||row.business).trim();
 if(!name||name.length>140||LEAK.test(name)||/[\n\r{}<>]/.test(name))return null;
 if(!fs.some(f=>['identity','legitimacy'].includes(f.type)))return null;
 const assessment=require('./phase2-eligibility').assess(row,now);
 if(!assessment.eligible)return null;
 const tier=assessment.tier;
 if(!['TIER_A_VERIFIED_GAP','TIER_B_VERIFIED_OPPORTUNITY'].includes(tier))return null;
 const namePattern=new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi');
 const corpus=fs.filter(f=>!/not offered|do not offer|no longer offer|unverified service/i.test(f.excerpt)).map(f=>text(f.excerpt).replace(namePattern,'')).join(' ').toLowerCase();
 // Whitelisted business categories are extracted, never copied from scraped text.
 const categories=[[/swimming pool|pool (?:maintenance|service|repair)/,'pool maintenance',['pool services','pool maintenance']],[/cabinet maker|cabinetry/,'kitchens and cabinetry',['kitchen projects','cabinetry','project enquiries']],[/kitchen/,'kitchen projects',['kitchen projects','project enquiries']],[/automotive|auto repair|car repair|motor vehicle/,'automotive services',['vehicle services','service enquiries']],[/driving school|driving (?:lessons|instructor)|learn to drive/,'driving instruction',['driving lessons','lesson enquiries']],[/immigration|migration assistance/,'immigration services',['services','service enquiries']],[/event service|venue|shooting.package|studio rental/,'venue and event services',['venue information','booking enquiries']]];
 const category=categories.find(([re])=>re.test(corpus));
 const platforms=[['Facebook',/(^|\.)facebook\.com$|(^|\.)fb\.com$/],['Instagram',/(^|\.)instagram\.com$/],['LinkedIn',/(^|\.)linkedin\.com$/]];
 const platform=platforms.find(([,re])=>fs.some(f=>{try{return re.test(parsePublicUrl(f.source_url).host)&&['legitimacy','identity','opportunity','structural_opportunity','facebook','instagram','linkedin','public_contact_route'].includes(f.type);}catch{return false;}}))?.[0];
 const gap=fs.find(f=>f.type==='gap'||f.type==='structural_gap');
 const domainGap=require('./outreach-domain-gap').select(row,fs,now);
 let observation='',opportunity='',kind='';
 if(tier==='TIER_A_VERIFIED_GAP'){
  if(fs.some(f=>f.type==='gap'&&Object.values(require('./outreach-domain-gap').KINDS).includes(f.gap_kind))&&!domainGap)return null;
  if(domainGap){observation=domainGap.observation;opportunity='Turn the business-associated domain into a functioning business site for services, proof and enquiries.';kind=domainGap.kind;}
  else if(gap&&/placeholder|lorem ipsum|john doe/i.test(gap.excerpt)){observation='I noticed placeholder testimonials on your website.';opportunity='Replace the placeholders with attributable project proof and a clear enquiry path.';kind='PLACEHOLDER_PROOF';}
  else if(gap&&/broken|not working|fails|no submit control|does not provide a submit control/i.test(gap.excerpt)&&/enquiry|contact|form/i.test(gap.excerpt)){observation='I noticed the enquiry form has no working submit control.';opportunity='Repair the enquiry path and make the next step clear.';kind='BROKEN_ENQUIRY';}
  else if(gap&&[404,410].includes(Number(gap.status_code))&&['VERIFIED','REVIEWED_ASSOCIATION'].includes(row.website_association)){kind='BROKEN_DESTINATION';}
  else if(assessment.opportunity)return structured({...row,evidence_json:JSON.stringify(fs.filter(f=>!['gap','structural_gap'].includes(f.type))),activity_evidence:'[]',gap_verified:false},channel,now);
  else return null; // New gap types need an explicit reviewed claim mapping.
 }else{
  const structural=assessment.opportunity;if(!structural||!platform)return null;
  const emailOnPlatform=channel==='EMAIL'&&fs.some(f=>['contact','published_email','public_contact_route'].includes(f.type)&&f.source_url===row.email_source_url&&norm(f.excerpt).includes(norm(row.public_email)));
  let emailHost='';try{emailHost=parsePublicUrl(row.email_source_url).host;}catch{}
  observation=emailOnPlatform&&platforms.find(([p,re])=>p===platform&&re.test(emailHost))?`Your ${platform} page lists a public email for enquiries.`:`I noticed ${name} has a ${platform} page.`;
  opportunity='An owned destination could give people a direct route from understanding the business to making an enquiry.';kind='OWNED_ENQUIRY_DESTINATION';
  if(/(?:location|branch).*(?:spread|fragment|separate)|(?:spread|fragment).*(?:location|branch)/i.test(structural.excerpt)){observation='Your location information is spread across separate social pages.';opportunity='Create a location selector with one clear enquiry journey for each location.';kind='LOCATION_JOURNEY';}
 }
 const officialContent=fs.filter(f=>{try{return /(^|\.)facebook\.com$/.test(parsePublicUrl(f.source_url).host);}catch{return false;}}).map(f=>f.excerpt).join(' ');
 const shootingPackage=/manila shooting package/i.test(officialContent);
 if(shootingPackage&&!domainGap)observation='I noticed your Facebook content includes a Manila shooting package.';
 const claims=[{id:'presence',text:observation}];
 // A business name alone supplies proposal context, not proof of a service.
 if(category&&category[1]!=='kitchen projects')claims.push({id:'service',text:`You offer ${category[1]}.`});
 const proposalContext=shootingPackage?['shooting packages','venue information','booking enquiries']:category?.[2]||['business information','enquiry path'];
 const owned=fs.some(f=>['association','website_quality'].includes(f.type)&&!/(facebook|instagram|exa)\./.test(f.source_url))&&['VERIFIED','REVIEWED_ASSOCIATION'].includes(row.website_association);
 const e={version:VERSION,business_name:name,market:row.country==='Australia'||row.dataset_id==='AUSTRALIA'?'Australia':'Manila',tier,channel,verified_business_description:category?.[1]||'business',verified_presence:platform||'owned website',verified_website_status:owned?'OWNED_SITE_VERIFIED':'OWNED_SITE_NOT_ESTABLISHED',verified_social_status:platform?'PUBLIC_PRESENCE_VERIFIED; ACTIVITY_AND_MESSAGING_NOT_ASSERTED':'NOT_ESTABLISHED',verified_routes:[channel==='EMAIL'?'Public business email verified':'Public profile verified; messaging requires manual verification'],verified_structural_gap:kind,verified_branch_location_evidence:kind==='LOCATION_JOURNEY'?['Separate social location pages verified']:[],verified_recent_activity:[],allowed_claims:claims,allowed_observations:claims.map(c=>c.text),allowed_opportunities:[opportunity],proposal_context:proposalContext,forbidden_claims:FORBIDDEN_CLAIMS};
 if(domainGap)e.domain_gap=domainGap;
 const friction=require('./outreach-friction');e.verified_friction=friction.derive(e,fs);if(!e.verified_friction)return null;e.suggested_compliance_basis=friction.complianceBasis(e,fs);Object.assign(e,content.evidence(row,fs));return human.enrich(e,fs)||require('./outreach-grounded-journey').enrich(e,fs);
}
const SCHEMA={type:'object',additionalProperties:false,required:['subject','draft','observation_used','opportunity_used','claims_used'],properties:{subject:{type:['string','null']},draft:{type:'string'},observation_used:{type:'string'},opportunity_used:{type:'string'},claims_used:{type:'array',items:{type:'string'}}}};
function prompt(e,corrections=[]){return JSON.stringify({evidence:e,correction_codes:corrections.slice(0,12)});}
function core(body){return text(body).split('\n\n'+SIGNATURE)[0].trim();}
function outboundFailures(subject,body,e={},raw=[]){return content.scan('subject',subject,e,raw).concat(content.scan('draft',core(body),e,raw));}
function leakage(subject,body,raw=[],e={}){const issues=outboundFailures(subject,body,e,raw).map(f=>f.code);for(const s of [text(subject),core(body)])if(BANNED.test(s))issues.push('GENERIC_TEMPLATE');return [...new Set(issues)];}
function validate(output,e,raw=[],{metadata=true}={}){
 const body=core(output.draft||output.draft_body),subject=text(output.subject).trim(),failures=outboundFailures(subject,body,e,raw),issues=leakage(subject,body,raw,e);
 if(metadata&&text(output.draft).includes(SIGNATURE))issues.push('MODEL_SIGNATURE_NOT_ALLOWED');
 if(!body)issues.push('DRAFT_REQUIRED');if(e.channel==='EMAIL'&&(!subject||/[\n\r]/.test(subject)||subject.length>100))issues.push('EMAIL_SUBJECT_REQUIRED');
 if(e.channel==='EMAIL'&&subject&&!norm(subject).includes(norm(e.business_name)))issues.push('BUSINESS_SPECIFIC_SUBJECT_REQUIRED');
 if(e.channel!=='EMAIL'&&subject)issues.push('SOCIAL_SUBJECT_NOT_ALLOWED');
 if(!norm(body).includes(norm(e.business_name)))issues.push('BUSINESS_CONTEXT_REQUIRED');
 const count=words(body).length;if(count<(e.channel==='EMAIL'?80:60)||count>(e.channel==='EMAIL'?170:130))issues.push('DRAFT_LENGTH');
 if(FORBIDDEN.test(body))issues.push('FORBIDDEN_CLAIM');
 let numeric=body.replaceAll(e.business_name,'');for(const d of e.verified_business_domains||[])numeric=numeric.replaceAll(d.host,'');
 if(/\d/.test(numeric)||/\b(?:percent|percentage|dozens|hundreds|thousands)\b/i.test(body))issues.push('UNSUPPORTED_STATISTICS');
 // Operator paraphrases stay bounded by clean verified facts, never notes.
 if(!metadata&&e.business_hook){issues.push(...content.manual(body,e));return checked(issues,failures,count);}
 if(metadata){if(!e.allowed_claims.some(c=>(!e.verified_friction||c.kind==='asset')&&c.text===output.observation_used)||!body.includes(output.observation_used))issues.push('OBSERVATION_NOT_GROUNDED');if(!e.allowed_opportunities.includes(output.opportunity_used))issues.push('OPPORTUNITY_NOT_GROUNDED');if(!Array.isArray(output.claims_used)||!output.claims_used.some(id=>e.allowed_claims.some(c=>c.id===id&&(!e.verified_friction||c.kind==='asset')))||output.claims_used.some(id=>!e.allowed_claims.some(c=>c.id===id)))issues.push('UNSUPPORTED_CLAIM_ID');}
 // Factual statements and structural consequences must match the reviewed allowlist.
 let remaining=body.replace(`Hi ${e.business_name} team,`,'').replace(/^\s*Briann here from Arc Web Works\.\s*/,'').trim();
 for(const c of e.allowed_claims){if(remaining.includes(c.text)){if(metadata&&!output.claims_used?.includes(c.id))issues.push('UNDECLARED_CLAIM');remaining=remaining.replace(c.text,'');}else if(metadata&&output.claims_used?.includes(c.id))issues.push('CLAIM_NOT_USED');}
 for(const cta of ['I have a specific website direction in mind for this. Worth showing you?','I have a specific concept in mind for how this could work. Worth showing you?'])remaining=remaining.replace(cta,'');
 for(const cta of human.CTAS)remaining=remaining.replace(cta,'');
 if(e.verified_friction){for(const kind of ['friction','consequence'])if(!e.allowed_claims.some(c=>(c.kind===kind||c.stages?.includes(kind))&&body.includes(c.text)))issues.push('REASONING_STAGE_MISSING');}
 if(e.version===VERSION){
  issues.push(...human.uniqueness(output,e).issues);
  if(!/\b(?:site|website|service pages|lesson page)\b/i.test(remaining))issues.push('WEBSITE_MECHANISM_REQUIRED');
  if(!human.mechanism(remaining,e))issues.push('BUSINESS_SPECIFIC_MECHANISM_REQUIRED');
  // Controlled proposals are not claims about the present business. Permit small
  // operator edits, but retain the existing conservative assertion/service checks.
  for(const proposal of e.human_language?.proposals||[]){
   for(const variant of [proposal,proposal.replaceAll("I'd ",'I would '),proposal.replaceAll("I'd ",'I could ')])remaining=remaining.replace(variant,'');
  }
 }
 remaining=remaining.replace(/\b(?:Thank you|Thanks)\.$/,'');
 const sentences=remaining.split(/(?<=[.!?])\s+|\n+/).map(s=>s.trim()).filter(Boolean);
 if(sentences.length>3||sentences.some(s=>!/^(?:A dedicated site could|A website could|That could|I could|I would|I can|I'd)\b/.test(s)||/\b(?:because|currently|still|already|existing|today|now|always|every|best|most|only|you have|you offer|you are|your customers are)\b/i.test(s)))issues.push('UNSUPPORTED_ASSERTION');
 const otherServices=/\b(?:plumbing|plumber|dental|dentist|migration|immigration|automotive|vehicle|kitchen|cabinetry|pool|driving|lesson|venue|restaurant|menu|food|medical|legal|insurance|mortgage)\b/gi;
 const context=words(e.verified_business_description+' '+e.proposal_context.join(' '));
 if(e.verified_friction){if(/service area|pricing|price list|booking calendar/i.test(remaining))issues.push('UNSUPPORTED_JOURNEY_DETAIL');if(/proof|feedback|testimonials|gallery|project examples/i.test(remaining)&&!e.verified_friction.public_proof&&e.verified_structural_gap!=='PLACEHOLDER_PROOF')issues.push('UNSUPPORTED_PROOF_CONTEXT');}
 if([...remaining.matchAll(otherServices)].some(m=>!context.includes(m[0].toLowerCase())))issues.push('UNSUPPORTED_SERVICE');
 if(/\b(?:your|the) (?:broken|poor|slow|confusing|outdated|missing|fragmented|ineffective)\b/i.test(remaining)&&e.tier!=='TIER_A_VERIFIED_GAP')issues.push('UNSUPPORTED_PROBLEM');
 return checked(issues,failures,count);
}
function checked(issues,failures,count){issues=[...new Set(issues)];for(const code of issues)if(!failures.some(f=>f.code===code))failures.push(content.describe(code,/SUBJECT/.test(code)?'subject':'draft'));return {valid:!issues.length,issues,failures,word_count:count};}
function parseResponse(response){if(response.error)throw new Error('MODEL_REQUEST_FAILED');let v=response;if(Array.isArray(response))v=response[0];if(v?.choices)v=v.choices[0];if(v?.output){const items=Array.isArray(v.output)?v.output:[v.output];const t=items.flatMap(i=>i.content||[]).find(c=>c.type==='output_text');v=t?.text;}if(v?.message?.content)v=v.message.content;if(v?.text)v=v.text;if(typeof v==='string')v=JSON.parse(v);if(!v||Object.keys(v).sort().join(',')!==SCHEMA.required.slice().sort().join(',')||typeof v.draft!=='string'||typeof v.observation_used!=='string'||typeof v.opportunity_used!=='string'||!Array.isArray(v.claims_used)||!(v.subject===null||typeof v.subject==='string'))throw new Error('MODEL_OUTPUT_INVALID');return v;}
// Canonical human-language composer.
function compose(e,variant=0){if(!e||e.version!==VERSION||!e.verified_friction)return null;if(e.grounded_journey)return require('./outreach-grounded-journey').compose(e,variant);if(!['pool maintenance','kitchen projects','kitchens and cabinetry','automotive services','driving instruction','venue and event services','immigration services'].includes(e.verified_business_description))return null;return human.compose(e,variant);}
function preview(e){return compose(e);}
function why(e){
 if(!e?.verified_friction)return 'Verified evidence is incomplete. More research is needed before outreach.';
 const r=e.verified_friction;return `Verified asset: ${r.verified_asset}\nVerified friction: ${r.verified_friction}\nOpportunity: ${r.desired_outcome}`;
}
function finalEmail(body){
 const value=text(body).replace(/\r\n/g,'\n').trim();
 if(!value)throw new Error('DRAFT_REQUIRED');
 if(value.includes(SIGNATURE)||value.includes(FOOTER)){require('./composio-zoho').assertSignature(value);return value;}
 return value+'\n\n'+SIGNATURE+'\n\n'+FOOTER;
}
function gate(d){
 if(d.operator_workspace?.copy_claims?.length){
  const source={lead_id:d.lead_id,business_name:d.business,public_email:d.channel==='EMAIL'?d.recipient:'',evidence_json:d.evidence_summary||'[]'};
  const issues=require('./phase2-operator-copy').validate(d,source,d.operator_workspace.evaluation?.checked_at||new Date().toISOString());
  if(issues.length)throw content.rejection(issues);return;
 }
 const body=core(d.draft_body),raw=list(d.evidence_summary),e=d.copy_evidence||{},failures=outboundFailures(d.subject,body,e,raw),issues=leakage(d.subject,body,raw,e);
 if(!body)issues.push('DRAFT_REQUIRED');
 if(d.channel==='EMAIL'){if(!text(d.subject).trim())issues.push('EMAIL_SUBJECT_REQUIRED');if(body)try{require('./composio-zoho').assertSignature(d.draft_body);}catch{issues.push('EXACT_SIGNATURE_AND_FOOTER_REQUIRED');}}
 if(d.channel!=='EMAIL'&&text(d.draft_body).includes(SIGNATURE))issues.push('SOCIAL_SIGNATURE');
 if(d.copy_evidence){const result=validate({subject:d.subject,draft:body},d.copy_evidence,raw,{metadata:false});issues.push(...result.issues);failures.push(...result.failures);}
 else if(FORBIDDEN.test(body))issues.push('FORBIDDEN_CLAIM');
 const result=checked(issues,failures,words(body).length);if(!result.valid)throw content.rejection(result.issues,result.failures);
}
module.exports={VERSION,MODEL,SIGNATURE,FOOTER,BANNED,LEAK,FORBIDDEN,SCHEMA,structured,prompt,core,leakage,validate,why,parseResponse,list,verified,preview,compose,finalEmail,gate,uniqueness:human.uniqueness,JARGON:human.JARGON};
