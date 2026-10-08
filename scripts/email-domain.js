'use strict';
// Pure, bounded Phase 1 logic. Native HTTP nodes own Cloud network access.
const {text,norm,yes,parsePublicUrl,visibleText,sha256}=require('./helpers');
const {validateEmail}=require('./email-validator');
const suffixRules=require('./public-suffix-rules');
const {matchIdentity}=require('./autonomous-identity');
const {VERSION,STATES,LIMITS,FREE,reusable}=require('./email-domain-policy');
let rules;
function registrableDomain(value){
 let host;try{host=parsePublicUrl('https://'+norm(value)).host;}catch{return '';}
 if(!rules){let prior='';rules=new Set();for(const encoded of suffixRules.match(/[\u0100-\u01ff][^\u0100-\u01ff]*/g)){prior=prior.slice(0,encoded.charCodeAt(0)-256)+encoded.slice(1);rules.add(prior.split('.').reverse().join('.'));}}
 const labels=host.split('.');let size=1;
 for(let i=0;i<labels.length;i++){
  const tail=labels.slice(i).join('.');
  if(rules.has('!'+tail)){size=labels.length-i-1;break;}
  if(rules.has(tail))size=Math.max(size,labels.length-i);
  if(i>0&&rules.has('*.'+tail))size=Math.max(size,labels.length-i+1);
 }
 return labels.length>size?labels.slice(-size-1).join('.'):'';
}
function emailDomain(value){const e=validateEmail(value);if(!e.valid)return '';const host=e.email.split('@')[1];if([...FREE].some(p=>host===p||host.endsWith('.'+p)))return '';const d=registrableDomain(host);return d&&!FREE.has(d)?d:'';}
function list(v){try{const a=typeof v==='string'?JSON.parse(v):v;return Array.isArray(a)?a:[];}catch{return [];}}
function fresh(at,now,hours){const age=Date.parse(now)-Date.parse(at);return Number.isFinite(age)&&age>=0&&age<=hours*3600000;}
function verified(f,now){return ['DISCOVERY_VERIFIED','REVIEWED_FACT','HUMAN_REVIEWED_INPUT'].includes(f.verification)&&fresh(f.fact_date||f.observed_at,now,90*24)&&text(f.excerpt)&&!f.conflicts?.length;}
function routesFromLead(lead,now){
 const row={...lead,...lead.previous_result},fs=list(row.evidence_json),out=[];
 const emails=[row.public_email,...fs.filter(f=>f.type==='public_contact_route'&&f.channel==='EMAIL'&&f.availability==='PUBLIC_VERIFIED').map(f=>f.route_url)];
 for(const email of new Set(emails.filter(Boolean))){
  const contact=fs.find(f=>['contact','published_email','public_contact_route'].includes(f.type)&&verified(f,now)&&norm(f.excerpt).includes(norm(email))&&(!f.lead_id||f.lead_id===lead.lead_id));
  if(!contact)continue;
  let source;try{source=parsePublicUrl(contact.source_url).url;}catch{continue;}
  const identity=fs.find(f=>['legitimacy','identity','discovery_identity_check'].includes(f.type)&&verified(f,now)&&(f.source_url===source||list(f.source_urls).includes(source))&&(f.official_status==='AUTO_VERIFIED_OFFICIAL'||['REVIEWED_FACT','HUMAN_REVIEWED_INPUT'].includes(f.verification)&&f.association_verified===true));
  if(!identity)continue;
  const score=Number(identity.identity_score||identity.identity_confidence)||(['REVIEWED_FACT','HUMAN_REVIEWED_INPUT'].includes(identity.verification)?95:0);
  out.push({channel:'EMAIL',recipient:norm(email),status:'PUBLIC_VERIFIED',source_url:source,excerpt:contact.excerpt,identity_confidence:score,identity_observed_at:identity.observed_at,contact_observed_at:contact.observed_at,official_status:identity.official_status||'REVIEWED_ASSOCIATION'});
 }
 return out;
}
function candidates(lead,routes,identities,now){
 const out=[];
 if(text(lead.contact_verified)&&!yes(lead.contact_verified))return out;
 for(const r of [...routes,...routesFromLead(lead,now)]){
  if(r.channel!=='EMAIL'||r.status!=='PUBLIC_VERIFIED'||!text(r.excerpt).toLowerCase().includes(norm(r.recipient)))continue;
  const domain=emailDomain(r.recipient);if(!domain||out.some(c=>c.domain===domain))continue;
  let source;try{source=parsePublicUrl(r.source_url).url;}catch{continue;}
  const id=identities.find(i=>i.url===source&&i.status==='AUTO_VERIFIED_OFFICIAL'&&fresh(i.observed_at,now,90*24));
  const score=id?Number(id.score)||0:Number(r.identity_confidence)||0;
  // Public provenance is required even for diagnostics; promotion also requires >=85.
  if(!id&&!r.official_status)continue;
  const identityHeld=['MISMATCHED','UNCERTAIN','UNRESOLVED'].includes(lead.identity_status_reviewed);
  out.push({domain,email:norm(r.recipient),contact_source_url:source,contact_observed_at:r.contact_observed_at||id?.observed_at||now,identity_confidence:identityHeld?0:score,identity_observed_at:r.identity_observed_at||id?.observed_at||now,identity_reason:identityHeld?'Current identity review holds domain association.':id?'Email visibly published on independently identity-matched official business source.':'Current canonical public email and independently verified business-source identity.',strong:!identityHeld&&score>=85});
 }
 return out;
}
function observationOnly(o){const keys=['version','candidate_domain','requested_url','final_url','redirect_chain','http_status','title','markers','fingerprint','sample_bytes','observed_at','classification','confidence','evidence_reason','parking_provider','attempts','requests'];return Object.fromEntries(keys.map(k=>[k,o[k]]));}
function start(candidate,config={},now=new Date().toISOString(),cache=[]){
 const prior=cache.filter(o=>o.candidate_domain===candidate.domain&&reusable(o,now)).sort((a,b)=>Date.parse(b.observed_at)-Date.parse(a.observed_at))[0];
 const root='https://'+candidate.domain+'/';
 // The owner-authorized policy grants only the exact root/www of a verified public
 // business email, never raw source-cell URLs. External redirects still need review.
 const approved=[...(config.allowed_hosts||[]),...(config.domain_inspection?.allowed_hosts||[])];
 if(candidate.strong)approved.push(candidate.domain,'www.'+candidate.domain);
 const state={candidate,now,approved:[...new Set(approved)],queue:[root],visited:[],attempts:[],redirect_chain:[],requests:0,pending:null,done:false,requested_url:root,allow_http_fallback:config.domain_inspection?.allow_http_fallback!==false};
 if(prior){state.result={...observationOnly(prior),cache_hit:true};state.done=true;state.queue=[];}
 else if(!state.approved.includes(candidate.domain))complete(state,{classification:'UNKNOWN',confidence:'LOW',evidence_reason:'Exact business-email domain requires host review because association is weak.'});
 return state;
}
function complete(s,result){s.result={version:VERSION,candidate_domain:s.candidate.domain,requested_url:s.requested_url,final_url:s.pending?.url||s.visited.at(-1)||s.requested_url,redirect_chain:s.redirect_chain,http_status:null,title:'',markers:[],fingerprint:'',sample_bytes:0,observed_at:s.now,attempts:s.attempts,requests:s.requests,...result};s.done=true;s.pending=null;s.queue=[];return s;}
function next(s,remaining=LIMITS.requests){
 s.pending=null;if(s.done)return s;
 if(s.requests>=4||remaining<=0||!s.queue.length)return complete(s,{classification:'UNKNOWN',confidence:'LOW',evidence_reason:'Bounded domain request or redirect limit reached.'});
 const url=s.queue.shift();
 try{const p=parsePublicUrl(url);if(!s.approved.includes(p.host))throw Error('HOST_NOT_APPROVED');s.pending={kind:'EMAIL_DOMAIN',provider:'PUBLIC_ORIGIN',url:p.url,target_url:p.url};s.requests++;s.visited.push(p.url);}catch{complete(s,{classification:'UNKNOWN',confidence:'LOW',evidence_reason:'Unapproved or unsafe domain destination.'});}
 return s;
}
function classify(s,raw){
 const code=Number(raw.statusCode)||0,body=String(raw.body??raw.data??'').slice(0,LIMITS.sample),title=visibleText(body.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'').slice(0,200),visible=visibleText(body),heading=visibleText(body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||''),short=visible.length<5000;
 const info={http_status:code||null,title,markers:[],fingerprint:sha256(body),sample_bytes:body.length};
 const result=(classification,confidence,evidence_reason,markers=[],extra={})=>({...info,classification,confidence,evidence_reason,markers,...extra});
 if([401,403,429].includes(code)||/checking your browser|verify you are human|just a moment|captcha|access denied|enable javascript and cookies/i.test(title+' '+visible.slice(0,700)))return result('ACCESS_BLOCKED','LOW','Access restriction or anti-bot response prevents verification.',['ACCESS_RESTRICTION']);
 const error=String(raw.error?.code||raw.error?.message||raw.error||'');
 if(raw.error||!code){
  const dns=/ENOTFOUND|EAI_NONAME/.test(error),refused=/ECONNREFUSED/.test(error),previous=s.attempts.slice(0,-1).some(a=>a.url===s.pending.url&&a.failure===(dns?'DNS_FAILURE':refused?'CONNECTION_REFUSED':''));
  if((dns||refused)&&previous)return result('BROKEN_DESTINATION','HIGH',dns?'Two bounded checks returned DNS resolution failure.':'Two bounded checks returned connection refusal.',[dns?'REPEATED_DNS_FAILURE':'REPEATED_CONNECTION_REFUSED']);
  return result('UNKNOWN','LOW','Transport failure is inconclusive; a timeout or TLS failure is not a verified commercial gap.');
 }
 if(code>=500){if(s.attempts.slice(0,-1).some(a=>a.url===s.pending.url&&a.http_status>=500))return result('BROKEN_DESTINATION','HIGH','Two bounded root checks returned server errors.',['REPEATED_SERVER_ERROR']);return result('UNKNOWN','LOW','A single server error may be temporary.');}
 if([404,410].includes(code))return result('BROKEN_DESTINATION','HIGH','The business-associated root destination returned HTTP '+code+'.',['ROOT_HTTP_'+code]);
 if(code<200||code>=300)return result('UNKNOWN','LOW','Destination state is not established by this response.');
 const headers=Object.fromEntries(Object.entries(raw.headers||{}).map(([k,v])=>[k.toLowerCase(),String(v)]));
 if(headers['content-type']&&!/text\/html|application\/xhtml|text\/plain/i.test(headers['content-type']))return result('UNKNOWN','LOW','Non-HTML response does not establish a functioning business site.');
 const godaddy=/godaddy|parked-content\.godaddy\.com|img1\.wsimg\.com\/parking-lander\//i.test(body),parking=/this domain (?:name )?is (?:parked|for sale)|get this domain|buy this domain|domain parking|this domain is registered, but may still be available/i.test(title+' '+heading+' '+visible);
 const template=/parked-content\.godaddy\.com|img1\.wsimg\.com\/parking|sedoparking\.com|parkingcrew\.net|bodis\.com\/parking/i.test(body);
 if(short&&(parking||template))return result('PARKED_DOMAIN','HIGH',godaddy?'The business-associated domain currently resolves to a GoDaddy parked-domain page.':'The business-associated domain currently resolves to a registrar parking or domain-sale page.',[...(parking?['VISIBLE_DOMAIN_PARKING']:[]),...(template?['REGISTRAR_PARKING_TEMPLATE']:[])],{parking_provider:godaddy?'GoDaddy':/sedo/i.test(body)?'Sedo':/afternic/i.test(body)?'Afternic':''});
 const placeholder=/^(?:website )?coming soon[.!]?$/i.test(title.trim())||/^(?:website )?coming soon[.!]?$/i.test(heading.trim())||short&&/website coming soon|default (?:web|hosting) page|welcome to nginx|apache2.*default page|domain (?:is )?not connected|site (?:is )?under construction/i.test(title+' '+visible);
 if(placeholder)return result('PLACEHOLDER_SITE','HIGH','The business-associated domain currently displays an unfinished or default website page.',['VISIBLE_PLACEHOLDER']);
 if(visible.length<100)return result('UNKNOWN','LOW','Sparse response cannot establish a functioning business destination.');
 const page={url:s.pending.url,title,text:visible,links:[],observed_at:s.now},identity=matchIdentity(s.candidate.lead||{},page,[]);
 const named=identity.name_match&&(identity.phone_match||identity.address_match||visible.toLowerCase().includes(s.candidate.email));
 if(named)return result(s.redirect_chain.length?'ACTIVE_REDIRECT':'ACTIVE_SITE','HIGH','A functioning HTML destination contains matching business identity and published contact details.',['BUSINESS_NAME_AND_CONTACT_MATCH']);
 return result(s.redirect_chain.length&&registrableDomain(parsePublicUrl(s.pending.url).host)!==s.candidate.domain?'UNRELATED_REDIRECT':'UNKNOWN','LOW','Functioning HTML was retrieved but business association was not established.');
}
function consume(s,raw){
 if(!s.pending)throw Error('EMAIL_DOMAIN_REQUEST_CONTEXT_REQUIRED');
 const code=Number(raw.statusCode)||0,error=String(raw.error?.code||raw.error?.message||raw.error||''),failure=/ENOTFOUND|EAI_NONAME/.test(error)?'DNS_FAILURE':/ECONNREFUSED/.test(error)?'CONNECTION_REFUSED':raw.error||!code?'TRANSPORT_FAILURE':'';
 s.attempts.push({url:s.pending.url,http_status:code||null,failure,observed_at:s.now});
 if([301,302,303,307,308].includes(code)){
  const headers=Object.fromEntries(Object.entries(raw.headers||{}).map(([k,v])=>[k.toLowerCase(),v]));let target;
  try{target=parsePublicUrl(String(headers.location||''),s.pending.url);}catch{return complete(s,{classification:'UNKNOWN',confidence:'LOW',http_status:code,evidence_reason:'Unsafe or missing redirect destination.'});}
  s.redirect_chain.push({from:s.pending.url,to:target.url,http_status:code});
  if(!s.approved.includes(target.host))return complete(s,{classification:'UNRELATED_REDIRECT',confidence:'LOW',http_status:code,final_url:target.url,evidence_reason:'External redirect requires independent business association and exact host review; target was not fetched.'});
  if(s.redirect_chain.length>LIMITS.redirects||s.visited.includes(target.url))return complete(s,{classification:'UNKNOWN',confidence:'LOW',http_status:code,evidence_reason:'Redirect loop or bounded redirect limit.'});
  s.queue.push(target.url);s.pending=null;return s;
 }
 const result=classify(s,raw);
 // Optional public HTTP root after a connection reset/timeout, never certificate
 // validation bypass. A failed fallback remains UNKNOWN, never a sales claim.
 if(!code&&s.allow_http_fallback&&!s.http_fallback_used&&s.pending.url===s.requested_url&&/ECONNRESET|ETIMEDOUT|REQUEST_TIMEOUT|connection.*closed unexpectedly/i.test(error)&&!/CERT_|certificate|SSL_|TLS_/i.test(error)){
  s.http_fallback_used=true;s.queue.push('http://'+s.candidate.domain+'/');s.pending=null;return s;
 }
 // Parse only a literal navigation target on a sparse page. Never execute JS.
 const sample=String(raw.body??raw.data??'').slice(0,LIMITS.sample),sparse=visibleText(sample).length<100;
 const literal=sparse&&(sample.match(/(?:window\.)?location(?:\.href)?\s*=\s*["']([^"'\s]+)["']/i)?.[1]||sample.match(/<meta\b[^>]*http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"'\s;]+)/i)?.[1]);
 if(code>=200&&code<300&&literal&&result.classification==='UNKNOWN'){
  let target;try{target=parsePublicUrl(literal,s.pending.url);}catch{return complete(s,{...result,evidence_reason:'Unsafe literal page-navigation destination.'});}
  s.redirect_chain.push({from:s.pending.url,to:target.url,http_status:code,kind:'STATIC_PAGE_NAVIGATION'});
  if(!s.approved.includes(target.host))return complete(s,{...result,classification:'UNRELATED_REDIRECT',final_url:target.url,evidence_reason:'Literal external page navigation requires independent host and identity review; target was not fetched.'});
  if(s.redirect_chain.length>LIMITS.redirects||s.visited.includes(target.url))return complete(s,{...result,evidence_reason:'Literal page-navigation loop or bounded redirect limit.'});
  s.queue.push(target.url);s.pending=null;return s;
 }
 if(result.classification==='UNKNOWN'&&s.requests<2&&(failure==='DNS_FAILURE'||failure==='CONNECTION_REFUSED'||code>=500)){s.queue.push(s.pending.url);s.pending=null;return s;}
 return complete(s,result);
}
function fact(candidate,o,now){
 const strong=candidate.strong&&fresh(candidate.contact_observed_at,now,90*24)&&fresh(candidate.identity_observed_at,now,90*24)&&reusable(o,now),legacy={PARKED_DOMAIN:'PARKED',PLACEHOLDER_SITE:'PLACEHOLDER',BROKEN_DESTINATION:'BROKEN',ACTIVE_SITE:'LIVE',ACTIVE_REDIRECT:'LIVE'};
 return {type:'business_domain',source_url:o.requested_url,observed_at:o.observed_at,fact_date:o.observed_at,excerpt:o.evidence_reason,verification:strong?'DISCOVERY_VERIFIED':'NEEDS_HUMAN_REVIEW',confidence:strong?o.confidence:'LOW',...observationOnly(o),domain:candidate.domain,email_domain:candidate.domain,domain_inspected:o.requests>0,domain_status:legacy[o.classification]||o.classification,domain_identity_confidence:candidate.identity_confidence,domain_evidence_reason:o.evidence_reason,domain_checked_at:o.observed_at,domain_final_url:o.final_url,domain_http_status:o.http_status,domain_title:o.title,association_verified:strong,email_domain_matches:true,official_status:strong?'AUTO_VERIFIED_OFFICIAL':'UNVERIFIED',contact_source_url:candidate.contact_source_url,contact_observed_at:candidate.contact_observed_at,identity_reason:candidate.identity_reason};
}
function gap(f,now){
 if(f.verification!=='DISCOVERY_VERIFIED'||f.domain_identity_confidence<85||f.confidence!=='HIGH'||!reusable(f,now)||!['PARKED_DOMAIN','PLACEHOLDER_SITE','BROKEN_DESTINATION'].includes(f.classification))return null;
 return {version:VERSION,type:'gap',source_url:f.source_url,observed_at:f.observed_at,fact_date:f.observed_at,verification:'DISCOVERY_VERIFIED',confidence:'HIGH',excerpt:f.excerpt,gap_kind:'VERIFIED_'+f.classification,domain:f.domain,domain_status:f.domain_status,domain_identity_confidence:f.domain_identity_confidence,contact_source_url:f.contact_source_url,status_code:f.http_status};
}
function project(row,fs,now){
 const current=require('./research-history').mergeFacts([],fs);
 const strong=current.filter(f=>f.type==='business_domain'&&f.verification==='DISCOVERY_VERIFIED'&&f.confidence==='HIGH'&&f.domain_identity_confidence>=85&&!f.superseded_by&&reusable(f,now));
 const active=strong.find(f=>['ACTIVE_SITE','ACTIVE_REDIRECT'].includes(f.classification)),domain=active||strong.find(f=>gap(f,now));if(!domain)return row;
 const isActive=!!active;
 return {...row,website_url:domain.requested_url,website_final_url:domain.final_url,website_http_code:domain.http_status||'',website_redirect_target:domain.redirect_chain?.at(-1)?.to||'',website_check_status:domain.classification,website_status:isActive?'LIVE':'BROKEN_SITE',website_association:'VERIFIED',website_source:domain.source_url,website_evidence:domain.excerpt,...(!isActive?{business_consequence:''}:{})};
}
function append(fs,newFacts,now){
 return require('./research-history').mergeFacts(fs,newFacts);
}
module.exports={VERSION,STATES,LIMITS,FREE,registrableDomain,emailDomain,fresh,verified,routesFromLead,candidates,reusable,observationOnly,start,next,consume,fact,gap,project,append};
