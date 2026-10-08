'use strict';
// Prospect fields only. Internal notes are neither copy nor verification evidence.
const {text,norm,parsePublicUrl}=require('./helpers');
const human=require('./outreach-human');
const SOURCE_HOST=/(^|\.)(facebook\.com|fb\.com|instagram\.com|linkedin\.com|exa\.ai|tavily\.com|google\.[a-z.]+|bing\.com|godaddy\.com|birdeye\.com|wheree\.com|traderefer\.au|findglocal\.com)$/i;
const LINKS=/https?:\/\/[^\s<>"'()[\]{}]+|(?:www\.)?(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:com|net|org|au|ph|io|co|ai|biz|info|uk|nz)(?:[/?#][^\s<>"'()[\]{}]*)?/gi;
const canonical=s=>norm(s).replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"');
function domain(raw){try{return parsePublicUrl(raw).host.replace(/^www\./,'');}catch{return '';}}
function domains(row,fs){
 const records=[];
 for(const f of fs){
  const typed=['business_domain','verified_domain','association','website_association','website_quality'].includes(f.type);
  const reviewed=['REVIEWED_FACT','HUMAN_REVIEWED_INPUT'].includes(f.verification);
  const owned=typed&&(reviewed&&f.association_verified===true||f.official_status==='AUTO_VERIFIED_OFFICIAL'&&['VERIFIED','REVIEWED_ASSOCIATION'].includes(row.website_association));
  if(!owned)continue;
  const host=domain(f.domain||f.business_domain||f.source_url);
  if(!host||SOURCE_HOST.test(host))continue;
  if(!f.domain&&!f.business_domain&&!['association','website_association'].includes(f.type)&&domain(row.verified_domain||row.website_final_url||row.website_url)!==host)continue;
  if(records.some(d=>d.host===host))continue;
  const statusFact=fs.find(s=>['website_quality','gap','structural_gap','business_domain'].includes(s.type)&&domain(s.domain||s.business_domain||s.source_url)===host&&/^(PARKED|BROKEN|404|410)$/.test(text(s.website_status||s.domain_status||s.status_code)));
  const parked=statusFact&&text(statusFact.website_status||statusFact.domain_status)==='PARKED';
  const emailMatch=reviewed&&f.email_domain_matches===true||text(row.public_email).split('@')[1]?.toLowerCase()===host&&fs.some(s=>['published_email','contact','public_contact_route'].includes(s.type)&&text(s.excerpt).includes(row.public_email));
  const provider=parked&&(statusFact.source_type==='OPERATOR_RECORDED'?statusFact.parking_provider==='GoDaddy':/godaddy/i.test(statusFact.excerpt))?'GoDaddy':'';
  records.push({host,association:'VERIFIED_BUSINESS_ASSOCIATION',status:parked?'PARKED':statusFact?'BROKEN':'NOT_ASSERTED',parking_provider:provider,email_domain_matches:!!emailMatch});
 }
 return records;
}
function evidence(row,fs){
 const social=fs.filter(f=>{try{return /(^|\.)(facebook\.com|instagram\.com|fb\.com)$/.test(parsePublicUrl(f.source_url).host)&&(f.official_status==='AUTO_VERIFIED_OFFICIAL'||['REVIEWED_FACT','HUMAN_REVIEWED_INPUT'].includes(f.verification));}catch{return false;}});
 return {verified_business_domains:domains(row,fs),manual_facts:{social_service_information:social.some(f=>['service','services','offer','package'].includes(f.type)&&/pool|driving|lesson|kitchen|vehicle|automotive|shooting/i.test(f.excerpt)),social_customer_feedback:social.some(f=>['review','proof'].includes(f.type)&&/reviews?|feedback/i.test(f.excerpt)),social_primary_information:social.some(f=>f.scope==='CURRENT_CUSTOMER_JOURNEY'&&f.claims_verified===true&&f.social_primary_information_verified===true),recent_work:social.some(f=>['activity','project','proof'].includes(f.type)&&f.recent_work_verified===true)}};
}
function failure(code,field,reason){return {code,field,reason:'Draft blocked: '+reason};}
function scan(field,value,e={},raw=[]){
 const s=text(value),out=[];
 for(const match of s.matchAll(LINKS)){
  const link=match[0].replace(/[.,;:!?]+$/,'');
  let p;try{p=parsePublicUrl(link);}catch{}
  const known=p&&!SOURCE_HOST.test(p.host)&&e.verified_business_domains?.some(d=>d.association==='VERIFIED_BUSINESS_ASSOCIATION'&&d.host===p.host.replace(/^www\./,''));
  // A reviewed business host is not permission to include paths, queries or excerpts.
  if(!known||p.path!=='/'||/[?#@]/.test(link)){const label=field==='subject'?'subject.':'message.',source=/^https?:|^www\./i.test(link)||p&&SOURCE_HOST.test(p.host);out.push(failure('RAW_RESEARCH_LEAK',field,known?'research link found in prospect-facing '+label:source?'raw source URL found in prospect-facing '+label:'unverified business domain found in prospect-facing '+label));}
 }
 if(/##|\*\*|\|[^\n]*\||```/.test(s))out.push(failure('RAW_RESEARCH_LEAK',field,'research markdown detected.'));
 if(/(?:^|\n)\s*[\[{]|"[a-z_]+"\s*:/.test(s))out.push(failure('RAW_RESEARCH_LEAK',field,'raw research JSON detected.'));
 if(/opening hours|popular times|contact\s*[-:]?\s*(?:phone|email)|out of 5|\b\d+\s+reviews\b/i.test(s))out.push(failure('RAW_RESEARCH_LEAK',field,'business-listing metadata detected.'));
 if(/\b(?:Exa|Tavily|Birdeye|Wheree|TradeRefer|Findglocal)\b/i.test(s))out.push(failure('RAW_RESEARCH_LEAK',field,'research provider or directory name detected.'));
 if(/source_url|evidence_json|DISCOVERY_VERIFIED|EXACT_NAME|PUBLISHED_PHONE|confidence_score|search result|listing metadata/i.test(s))out.push(failure('RAW_RESEARCH_LEAK',field,'internal research labels detected.'));
 if(/[^\s@]+@[^\s@]+\.[a-z]{2,}|\+?\d[\d ()-]{7,}\d/i.test(s))out.push(failure('CONTACT_LEAK',field,'scraped phone or email information detected.'));
 const jargon=s.match(human.JARGON);if(jargon)out.push(failure('PROSPECT_LANGUAGE_JARGON',field,"banned internal phrase '"+jargon[0]+"'."));
 if(/[\u2013\u2014]|[!?]{2,}|\.{3,}/.test(s))out.push(failure('PLAIN_PUNCTUATION_REQUIRED',field,'use a comma or period instead of an em/en dash or repeated stylised punctuation.'));
 const words=v=>canonical(v).replace(/[^a-z0-9']/g,' ').split(/\s+/).filter(Boolean),w=words(s).join(' ');
 if(raw.some(f=>{const rw=words(typeof f==='string'?f:f.excerpt||'');return rw.some((_,i)=>i<=rw.length-12&&w.includes(rw.slice(i,i+12).join(' ')));}))out.push(failure('VERBATIM_RESEARCH_EXCERPT',field,'a long verbatim research excerpt was copied into the message.'));
 return out;
}
function hook(body,e){
 if(e.grounded_journey)return e.business_hook.anchors.every(a=>canonical(body).includes(canonical(a)));
 const s=canonical(body).replaceAll(canonical(e.business_name),'[business]'),h=e.business_hook;
 if(!h)return false;
 const proof=!h.proof||/customer (?:feedback|reviews)|\breviews\b/.test(s);
 const checks={BUSINESS_DOMAIN:()=>h.anchors.every(a=>s.includes(canonical(a)))&&s.includes(canonical(e.proposal_context[0]))&&proof,POOL_SERVICE:()=>/pool (?:maintenance|services|work)/.test(s)&&proof,VEHICLE_SERVICES:()=>/logbook servicing/.test(s)&&/brakes/.test(s)&&/registration inspections/.test(s),SHOOT_PACKAGE:()=>/manila shooting package/.test(s),LESSON_CALL_TEXT:()=>/text or call|call or text/.test(s)&&/lessons/.test(s),LOCAL_LESSONS:()=>s.includes(canonical(h.location))&&/lessons/.test(s),LOCAL_KITCHEN_PROOF:()=>s.includes(canonical(h.location))&&proof,SITE_REPAIR:()=>s.includes(canonical(e.verified_business_description))};
 return !!checks[h.kind]?.();
}
function manual(body,e){
 const issues=[],s=canonical(body),name=canonical(e.business_name),p=canonical(e.verified_presence);
 let remaining=s.replace('hi '+name+' team,','').replace(/^\s*briann here from arc web works\.\s*/,'').trim(),observed=false,friction=false,proposal=false;
 for(const c of e.allowed_claims||[]){const v=canonical(c.text);if(remaining.includes(v)){remaining=remaining.replace(v,'');if(c.kind==='asset')observed=true;if(c.kind==='friction_consequence'||c.kind==='friction'||c.stages?.includes('friction'))friction=true;}}
 for(const c of e.human_language?.proposals||[])for(const v of [c,c.replaceAll("I'd ",'I would '),c.replaceAll("I'd ",'I could ')])if(remaining.includes(canonical(v))){remaining=remaining.replace(canonical(v),'');proposal=true;}
 for(const c of [...human.CTAS,...(e.human_language?.ctas||[]),"I already have a direction in mind for how I'd approach it. Worth showing you?","I have a specific website direction in mind for this. Worth showing you?","I have a specific concept in mind for how this could work. Worth showing you?"])remaining=remaining.replace(canonical(c),'');
 const parked=e.verified_business_domains?.find(d=>d.association==='VERIFIED_BUSINESS_ASSOCIATION'&&d.status==='PARKED'&&d.email_domain_matches);
 const domainPattern=/^(?:i noticed |i saw )?(?:the |your )domain tied to your business email(?:,? [a-z0-9.-]+,?)? currently lands on a parked(?: godaddy)? page[,.]?$/;
 const sentences=remaining.split(/(?<=[!?])\s+|(?<=[.])(?:\s+|$)|\n+/).map(x=>x.trim()).filter(Boolean);
 // Split only domain commas/conjunctions; periods inside a hostname are preserved.
 for(const sentence of sentences){
  const clauses=sentence.split(/,? while /);
  if(domainPattern.test(clauses[0])){
   if(!parked||/godaddy/.test(clauses[0])&&parked.parking_provider!=='GoDaddy')issues.push('BUSINESS_DOMAIN_CLAIM_NOT_VERIFIED');
   else{observed=true;friction=true;}
   if(clauses[1]){
    if(!new RegExp('^(?:most of )?the useful information about your pool services and customer feedback is (?:sitting )?on '+p+'[.]?$').test(clauses[1])||!e.manual_facts?.social_service_information||!e.manual_facts?.social_customer_feedback||/^most of /.test(clauses[1])&&!e.manual_facts?.social_primary_information)issues.push('SOCIAL_CONTENT_CLAIM_NOT_VERIFIED');
   }
   continue;
  }
  if(e.business_hook?.kind==='POOL_SERVICE'&&new RegExp('^people (?:coming|arriving|starting) (?:through|on) '+p+' (?:still )?use the page (?:itself )?to (?:look into|understand) (?:your|the) pool (?:work|services) (?:and find how to contact you|before getting in touch)[.]?$').test(sentence)){observed=true;friction=true;continue;}
  if(/^(?:i could|i would|i'd|a website could|a dedicated site could|that could|i can)\b/.test(sentence)||/^there'?s (?:a |a pretty )?clear opportunity to turn that domain into a proper home for the business/.test(sentence)||/^there is a clear opportunity to turn that domain into a proper home for the business/.test(sentence)){
   const current=/\b(?:because|currently|still|already|existing|today|now|always|every|best|most|only|you have|you offer|you are|your customers are)\b/.test(sentence);
   const domainProposal=/turn that domain/.test(sentence);
   if(current||domainProposal&&!parked){issues.push('UNSUPPORTED_ASSERTION');continue;}
   if(/recent work/.test(sentence)&&!e.manual_facts?.recent_work){issues.push('UNSUPPORTED_JOURNEY_DETAIL');continue;}
   if(/service area|pricing|price list|booking calendar/.test(sentence))issues.push('UNSUPPORTED_JOURNEY_DETAIL');
   if(/reviews|proof|feedback|testimonials|gallery|project examples/.test(sentence)&&!e.verified_friction?.public_proof)issues.push('UNSUPPORTED_PROOF_CONTEXT');
   const vocabulary=canonical(e.verified_business_description+' '+(e.proposal_context||[]).join(' '));
   const services=sentence.match(/\b(?:plumbing|dental|migration|immigration|automotive|vehicle|kitchen|cabinetry|pool|driving|lesson|venue|restaurant|menu|food|medical|legal|insurance|mortgage)\b/g)||[];
   if(services.some(v=>!vocabulary.includes(v)))issues.push('UNSUPPORTED_SERVICE');
   const domainMechanism=domainProposal&&/services/.test(sentence)&&/simple way/.test(sentence)&&/explain what they need/.test(sentence)&&/getting in touch/.test(sentence);
   if((/\b(?:site|website|service pages|lesson page)\b/.test(sentence)&&human.mechanism(sentence,e))||domainMechanism)proposal=true;
   continue;
  }
  if(!/^(?:thanks|thank you)\.$/.test(sentence))issues.push('UNSUPPORTED_ASSERTION');
 }
 if(!hook(body,e))issues.push('BUSINESS_HOOK_REQUIRED');
 if(!observed||!friction)issues.push('REASONING_STAGE_MISSING');
 if(!proposal)issues.push('BUSINESS_SPECIFIC_MECHANISM_REQUIRED');
 return [...new Set(issues)];
}
const REASONS={DRAFT_REQUIRED:'message is empty.',EMAIL_SUBJECT_REQUIRED:'email subject is empty or invalid.',BUSINESS_SPECIFIC_SUBJECT_REQUIRED:'email subject must identify the business.',BUSINESS_CONTEXT_REQUIRED:'business context is missing.',BUSINESS_HOOK_REQUIRED:'message is missing a business-specific hook.',DRAFT_LENGTH:'message length is outside the channel limits.',FORBIDDEN_CLAIM:'an unsupported pain, outcome or prototype claim was found.',UNSUPPORTED_STATISTICS:'statistics or unverified numbers were found.',UNSUPPORTED_ASSERTION:'a factual sentence is not supported by the supplied verified evidence. Rephrase it or verify the fact.',REASONING_STAGE_MISSING:'the verified observation and customer task must be clear.',BUSINESS_SPECIFIC_MECHANISM_REQUIRED:'describe a relevant website improvement and enquiry step.',WEBSITE_MECHANISM_REQUIRED:'the website improvement is missing.',UNSUPPORTED_SERVICE:'a service not established by the evidence was mentioned.',UNSUPPORTED_JOURNEY_DETAIL:'a service area, pricing, recent-work or booking detail is not verified.',UNSUPPORTED_PROOF_CONTEXT:'customer proof is not established by the evidence.',BUSINESS_DOMAIN_CLAIM_NOT_VERIFIED:'the business-email domain and parked-page claim need verified structured evidence.',SOCIAL_CONTENT_CLAIM_NOT_VERIFIED:'the services and customer feedback claimed on social are not verified.',GENERIC_TEMPLATE:'generic template language was found.',EXACT_SIGNATURE_AND_FOOTER_REQUIRED:'the frozen email signature or footer is incomplete.',SOCIAL_SIGNATURE:'social messages must not include an email signature.',SOCIAL_SUBJECT_NOT_ALLOWED:'social messages must not have a subject.'};
function describe(code,field='draft'){return failure(code,field,REASONS[code]||'copy failed '+code.toLowerCase().replaceAll('_',' ')+'.');}
function rejection(issues,failures=[]){const e=new Error('OUTBOUND_CONTENT_BLOCKED:'+ [...new Set(issues)].join(','));e.failures=failures.length?failures:[...new Set(issues)].map(code=>describe(code,/SUBJECT/.test(code)?'subject':'draft'));return e;}
function restore(error){const e=new Error(error.error);if(error.failures)e.failures=error.failures;return e;}
function message(error,failures=[]){
 const evidenceReasons={OPERATOR_CUSTOMER_PROOF_REQUIRED:'Record actual published customer feedback, a review or a testimonial. Missing, placeholder or unverified proof cannot support the message.',OPERATOR_WEBSITE_ASSOCIATION_REQUIRED:'Record a verified business association for this exact website. Uncertain or mismatched ownership cannot support a domain statement.',OPERATOR_WEBSITE_FINDING_REQUIRED:'A parked-page finding needs a dated observation explicitly describing the parked destination. A checkbox or an uncertain finding is insufficient.',OPERATOR_PARKING_PROVIDER_REQUIRED:'Name GoDaddy only when the dated parked-page observation actually identifies it. Otherwise leave the provider unestablished.'};
 if(evidenceReasons[error])return evidenceReasons[error];
 if(failures.length){
  const contaminated=new Set(failures.filter(f=>['RAW_RESEARCH_LEAK','CONTACT_LEAK','VERBATIM_RESEARCH_EXCERPT','PROSPECT_LANGUAGE_JARGON','PLAIN_PUNCTUATION_REQUIRED'].includes(f.code)).map(f=>f.field));
  // URL digits and dump fragments also trip sentence/statistic checks. Keep
  // all machine failures, but show the operator the actionable primary cause.
  const derivative=new Set(['UNSUPPORTED_STATISTICS','UNSUPPORTED_ASSERTION','REASONING_STAGE_MISSING','BUSINESS_SPECIFIC_MECHANISM_REQUIRED']);
  return [...new Set(failures.filter(f=>!contaminated.has(f.field)||!derivative.has(f.code)).map(f=>f.reason))].join('\n');
 }
 if(error.startsWith('OUTBOUND_CONTENT_BLOCKED:'))return error.slice('OUTBOUND_CONTENT_BLOCKED:'.length).split(',').map(c=>describe(c).reason).join('\n');
 if(error==='INVALID_DRAFT_TEXT')return 'Draft blocked: message is empty, too long, or contains an em/en dash. Use commas or periods.';
 if(error==='INVALID_SUBJECT')return describe('EMAIL_SUBJECT_REQUIRED').reason;if(REASONS[error])return describe(error).reason;return '';
}
function plain(value){return text(value).replace(/\s*[\u2013\u2014]\s*/g,', ').replace(/([!?])\1+/g,'$1').replace(/\.{3,}/g,'.');}
module.exports={domains,evidence,scan,manual,hook,describe,rejection,restore,message,plain};
