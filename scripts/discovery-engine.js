'use strict';
const {text,norm,parsePublicUrl,evidence}=require('./helpers');
const {validProfile}=require('./qualification');
const {validateEmail}=require('./email-validator');
const PROVIDER_URL='https://mcp.exa.ai/mcp';
const OBJECTIVE='Find official business website, Facebook or Instagram profile and current public business contact, booking and operating evidence. Exclude namesakes. Return source URLs and literal page excerpts, not inferred contacts.';
function providerRequest(tool,args,id){return {jsonrpc:'2.0',id,method:'tools/call',params:{name:tool,arguments:args}};}
function decodeProvider(raw){
 if(raw.error||Number(raw.statusCode)>=400)throw Error('DISCOVERY_PROVIDER_ERROR');
 let body=raw.body??raw;
 if(typeof body==='string'){
  try{body=JSON.parse(body);}catch{
   const events=body.split(/\r?\n/).filter(s=>s.startsWith('data:')).map(s=>s.slice(5).trim()).filter(s=>s!=='[DONE]');
   body=events.map(s=>{try{return JSON.parse(s);}catch{return null;}}).filter(x=>x?.result||x?.error).pop();
  }
 }
 if(!body||body.error)throw Error('DISCOVERY_PROVIDER_RESPONSE_INVALID');
 const result=body.result??body;
 if(result.isError)throw Error('DISCOVERY_PROVIDER_TOOL_ERROR');
 if(result.structuredContent)return result.structuredContent;
 const content=(result.content||[]).filter(x=>x.type==='text').map(x=>x.text).join('\n');
 try{return JSON.parse(content);}catch{return {text:content};}
}
function documents(payload){
 if(Array.isArray(payload))return payload;
 for(const key of ['results','documents','pages','data'])if(Array.isArray(payload?.[key]))return payload[key];
 // Exa text transport separates records with Title / URL / Text markers.
 const source=text(payload?.text);
 const blocks=source.split(/(?=^Title: |^#[^\n]+\nURL:)/m);
 return blocks.map(block=>{
  const url=block.match(/^URL:\s*(https?:\/\/\S+)/m)?.[1];
  return url?{url,title:block.match(/^Title:\s*(.*)/m)?.[1]||block.match(/^#\s*(.*)/m)?.[1]||'',text:block.replace(/^[\s\S]*?^URL:.*\n/m,''),content_kind:'PROVIDER_TEXT'}:null;
 }).filter(Boolean);
}
function candidateURL(raw){try{const u=parsePublicUrl(raw).url;return /[?&](?:access_token|api_?key|token|password|secret|authorization|auth)=/i.test(u)?'':u;}catch{return '';}}
function startDiscovery(lead,config={},now=new Date().toISOString()){
 if(config.discovery?.mode==='AUTONOMOUS_V2')return require('./autonomous-discovery').start(lead,config,now);
 if(config.discovery?.enabled!==true||lead.skip_research===true||/^(true|yes|1)$/i.test(String(lead.skip_research)))return {lead,config,now,disabled:true,pending:null};
 if(config.discovery.provider_approved!==true)throw Error('DISCOVERY_PROVIDER_APPROVAL_REQUIRED');
 if(!text(lead.business_name)||!text(lead.country))throw Error('DISCOVERY_IDENTITY_REQUIRED');
 const clean={...lead};delete clean.discovery_facts;delete clean.discovery_fields;
 return {lead:clean,config,now,phase:'SEARCH',requests:0,pending:null,candidates:[],pages:[],errors:[],warnings:[],visited:[],
  queries:[`${text(lead.business_name).slice(0,160)} ${text(lead.city).slice(0,160)} ${text(lead.country).slice(0,80)} official business website contact`,
   `${text(lead.business_name).slice(0,160)} ${text(lead.city).slice(0,160)} ${text(lead.country).slice(0,80)} Facebook Instagram recent business booking`],queue:[]};
}
function nextDiscoveryRequest(state){
 if(state.autonomous)return require('./autonomous-discovery').next(state);
 state.pending=null;if(state.disabled)return state;
 if(state.requests>=6){if(state.queries.length||state.queue.length)state.warnings.push('DISCOVERY_REQUEST_LIMIT');return state;}
 const query=state.queries.shift();
 if(query)state.pending={kind:'SEARCH',url:PROVIDER_URL,body:providerRequest('web_search_exa',{query,numResults:5,objective:OBJECTIVE},state.requests+1)};
 else{
  state.phase='FETCH';
  for(const u of [state.lead.website_url,state.lead.facebook_url,state.lead.instagram_url,state.lead.linkedin_url,state.lead.booking_url]){
   const url=candidateURL(u);if(url&&!state.candidates.some(x=>x.url===url))state.candidates.push({url,title:'Supplied candidate',supplied:true});
  }
  if(!state.queuePlanned){state.queuePlanned=true;
   for(const c of state.candidates.slice(0,12)){
    const host=parsePublicUrl(c.url).host;
    if(!(state.config.discovery.allowed_hosts||[]).includes(host)){state.warnings.push('HOST_REVIEW_REQUIRED: '+host);continue;}
    if(state.queue.length<4)state.queue.push(c.url);
   }
  }
  const url=state.queue.shift();
  if(url){state.visited.push(url);state.pending={kind:'FETCH',target_url:url,url:PROVIDER_URL,body:providerRequest('web_fetch_exa',{urls:[url],maxCharacters:12000},state.requests+1)};}
 }
 if(state.pending)state.requests++;return state;
}
function consumeDiscoveryResponse(state,raw){
 if(state.autonomous)return require('./autonomous-discovery').consume(state,raw);
 const pending=state.pending;if(!pending)throw Error('DISCOVERY_REQUEST_CONTEXT_REQUIRED');
 try{
  const payload=decodeProvider(raw),docs=documents(payload);
  if(!docs.length)state.warnings.push(pending.kind==='SEARCH'?'NO_DISCOVERY_MATCH':'FETCH_CONTENT_UNAVAILABLE');
  for(const doc of docs){
   const url=candidateURL(doc.url||doc.source_url||doc.URL);if(!url)continue;
   if(pending.kind==='SEARCH'){
    if(!state.candidates.some(c=>c.url===url)&&state.candidates.length<12)state.candidates.push({url,title:text(doc.title).slice(0,180)});
   }else{
    // Provider redirects do not silently replace the exact approved target.
    if(url!==pending.target_url){state.warnings.push('FETCH_TARGET_MISMATCH');continue;}
    const pageText=text(doc.text||doc.content||doc.markdown);
    if(pageText)state.pages.push({url,text:pageText.slice(0,12000),title:text(doc.title).slice(0,180),observed_at:state.now,
     published_at:doc.publishedDate||doc.published_at||'',transport:'EXA_PUBLIC_PAGE',content_kind:doc.content_kind||'FETCHED_PAGE'});
   }
  }
 }catch(error){state.errors.push({stage:'discovery_'+pending.kind.toLowerCase(),code:error.message,source_url:pending.target_url||PROVIDER_URL});}
 state.pending=null;return state;
}
function compact(s){return norm(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}]+/gu,'');}
function association(lead,page){
 const body=compact(page.title+' '+page.text),name=compact(lead.business_name);
 const named=name.length>=5&&body.includes(name);
 const phone=text(lead.phone).replace(/\D/g,'');
 const phoneText=page.text.replace(/\((\+?\d{1,4})\)/g,'$1');
 const numbers=[...phoneText.matchAll(/\+?\d[\d .-]{6,}\d/g)].map(m=>m[0].replace(/\D/g,''));
 const phoneMatch=phone.length>=8&&numbers.some(n=>n.length<=15&&n.endsWith(phone.slice(-8)));
 const address=compact(lead.address),addressMatch=address.length>=12&&body.includes(address);
 return {verified:named&&(phoneMatch||addressMatch),named,phone_match:phoneMatch,address_match:addressMatch,
  confidence:named&&(phoneMatch||addressMatch)?'HIGH':'LOW'};
}
function boundedExcerpt(page,needle){const i=norm(page.text).indexOf(norm(needle));return page.text.slice(Math.max(0,i-80),Math.max(0,i-80)+500);}
function fact(prefix,page,excerpt,extra={}){return evidence(prefix,page.url,excerpt,page.observed_at,{fact_date:page.observed_at,verification:'DISCOVERY_VERIFIED',confidence:'HIGH',...extra});}
function finishDiscovery(state){
 if(state.autonomous)return require('./autonomous-discovery').finish(state);
 if(state.disabled)return {lead:state.lead,config:state.config,discovery:{status:'DISABLED',facts:{},fields:{},candidates:[],warnings:[],errors:[]}};
 const facts={},fields={},observations=[],routes=[],ambiguous=[];
 for(const page of state.pages){
  if(/captcha|access denied|log in to continue|sign in to continue|content unavailable|temporarily blocked/i.test(page.text)){state.warnings.push('PUBLIC_ACCESS_RESTRICTED: '+page.url);continue;}
  const match=association(state.lead,page);
  observations.push(evidence('discovery_identity_check',page.url,match.verified?'Business name and published address/phone match.':'Identity not established by exact business name plus address/phone.',state.now,{confidence:match.confidence,identity:match}));
  if(!match.verified){ambiguous.push(page.url);continue;}
  facts.association||=fact('association',page,boundedExcerpt(page,state.lead.business_name));
  facts.legitimacy||=fact('legitimacy',page,boundedExcerpt(page,state.lead.business_name));
  const host=parsePublicUrl(page.url).host;
  const official=(state.config.discovery.official_hosts||[]).includes(host)||(state.config.discovery.official_urls||[]).includes(page.url);
  const service=official&&!/permanently closed|ceased trading|no longer operating|archived listing/i.test(page.text)&&/\b(book|booking|appointments?|enquir(?:y|ies)|contact|orders?|reservations?)\b/i.test(page.text)&&/\b(services?|menu|treatments?|products?|hours|open|delivery|dining|construction|design|clinic)\b/i.test(page.text);
  if(service){facts.activity||=fact('activity',page,boundedExcerpt(page,page.text.match(/\b(book|booking|appointments?|enquiry|contact|orders?|reservations?)\b/i)[0]),{signal_type:'CURRENT_SERVICE_PAGE',status:'LIKELY_ACTIVE'});fields.activity_status='LIKELY_ACTIVE';fields.activity_signal_type='CURRENT_SERVICE_PAGE';fields.activity_corroborated=true;}
  const social=['facebook','instagram','linkedin'].find(p=>validProfile(page.url,p));
  const platform=/facebook\.com$|instagram\.com$|linkedin\.com$|fresha\.com$|booksy\.com$|booking\.com$|opentable\.com$|cococart\.co$|linktr\.ee$/.test(host);
  if(social&&official){fields[social+'_url']=page.url;
   if(/\b(?:message us|dm (?:us|to)|send (?:us )?a message|message for (?:orders|bookings)|contact us via)\b/i.test(page.text)){facts[social]=fact(social,page,boundedExcerpt(page,page.text.match(/message us|dm (?:us|to)|send (?:us )?a message|message for (?:orders|bookings)|contact us via/i)[0]));fields[social+'_status_reviewed']='USABLE';}
  }else if(!platform&&official){fields.website_url||=page.url;fields.website_ownership_verified=true;}
  // Only business-facing publication text; quoted third-party addresses are candidates.
  const emailText=page.text.replace(/(^|[\s(])(?:\*\*|__)(?=[a-z\d][^\s]*@)/gi,'$1');
  const emailPattern=/\b(?:email|e-mail|enquiries|enquiry|reservations|bookings|contact)\s*(?:us|at|:)??\s*[:：-]?\s*([a-z\d.!#$%&'*+/=?^_`{|}~-]+@[a-z\d.-]+\.[a-z]{2,})/gi;
  for(const m of official?emailText.matchAll(emailPattern):[]){const e=validateEmail(m[1]);if(!e.valid)continue;
   facts.contact||=fact('contact',page,boundedExcerpt(page,m[0]));fields.contact_email||=e.email;fields.contact_source_type=social==='facebook'?'FACEBOOK_ABOUT':social==='instagram'?'INSTAGRAM_CONTACT':'OFFICIAL_WEBSITE';}
  // A literal email at the verified business's own domain is public provenance,
  // even when the publisher omits an Email label. Other domains still need one.
  if(official&&!platform&&!facts.contact)for(const m of emailText.matchAll(/[a-z\d][a-z\d.!#$%&'*+/=?^_`{|}~-]*@[a-z\d.-]+\.[a-z]{2,}/gi)){
   const e=validateEmail(m[0]);if(!e.valid||e.email.split('@')[1]!==host.replace(/^www\./,''))continue;
   facts.contact=fact('contact',page,boundedExcerpt(page,m[0]));fields.contact_email=e.email;fields.contact_source_type='OFFICIAL_WEBSITE';break;
  }
  const links=[...page.text.matchAll(/https?:\/\/[^\s<>\[\]()"']+/gi)].map(m=>candidateURL(m[0])).filter(Boolean);
  for(const url of official?links:[]){const p=parsePublicUrl(url);
   const kind=/(^|\.)wa\.me$/.test(p.host)&&/^\/\d{7,15}\/?$/.test(p.path)?'whatsapp':/(^|\.)viber\.com$/.test(p.host)&&p.path!=='/'?'viber':null;
   if(kind){facts[kind]=fact(kind,page,boundedExcerpt(page,url));fields[kind+'_url']=url;fields[kind+'_status_reviewed']='USABLE';}
   const linkedSocial=['facebook','instagram','linkedin'].find(k=>validProfile(url,k));if(linkedSocial&&!fields[linkedSocial+'_url']){fields[linkedSocial+'_url']=url;observations.push(evidence('published_social_profile',page.url,url,state.now,{confidence:'HIGH',profile_url:url,messaging_unverified:true}));}
   if(/book|order|contact|reserv|fresha|opentable|cococart/i.test(url)){routes.push({url,source_url:page.url,observed_at:state.now,confidence:'MEDIUM',availability:'UNVERIFIED'});}
  }
  const owner=/\b(?:owner|founder|director)\s*[:：]\s*([A-Z][\p{L}'-]+(?:\s+[A-Z][\p{L}'-]+){1,3})/u.exec(page.text);
  if(owner&&official){facts.decision_maker= fact('decision_maker',page,boundedExcerpt(page,owner[0]));fields.decision_maker_name_reviewed=owner[1];fields.decision_maker_role_reviewed=owner[0].split(':')[0];}
  const form=official&&/\b(?:contact form|enquiry form|book online|order online|online reservations)\b/i.exec(page.text);
  if(form){facts.platform=fact('platform',page,boundedExcerpt(page,form[0]),{route_url:page.url,availability:'PUBLIC_ROUTE_NOT_SUBMITTED'});fields.booking_url=page.url;fields.booking_status='USABLE';}
  const review=/\b(?:reviewed|review|posted|updated)\s*:?\s*(20\d{2}-\d{2}-\d{2})/i.exec(page.text);
  if(review)observations.push(evidence('dated_listing_or_review_candidate',page.url,boundedExcerpt(page,review[0]),state.now,{fact_date:review[1],confidence:'MEDIUM',activity_not_inferred:true}));
  if(official&&/\b(?:dm to order|message for bookings|orders? (?:by|via) (?:dm|messenger))\b/i.test(page.text))observations.push(evidence('conversion_gap_candidate',page.url,boundedExcerpt(page,page.text.match(/dm to order|message for bookings|orders? (?:by|via) (?:dm|messenger)/i)[0]),state.now,{confidence:'MEDIUM',gap_verified:false,note:'Published social ordering dependency; verify whether an owned alternative resolves this friction.'}));
  // No site absence, weak design or conversion defect is inferred from search failure.
 }
 const discovery={status:Object.keys(facts).length?'EVIDENCE_FOUND':'UNRESOLVED',facts,fields,candidates:state.candidates,observations,routes,
  ambiguous_matches:ambiguous,warnings:[...new Set(state.warnings)],errors:state.errors,requests:state.requests,observed_at:state.now};
 return {lead:state.lead,config:state.config,discovery};
}
async function runDiscovery(lead,config,transport,now){let state=startDiscovery(lead,config,now);for(;;){state=nextDiscoveryRequest(state);if(!state.pending)return finishDiscovery(state);let raw;try{raw=await transport(state.pending);}catch(e){raw={error:{message:e.message}};}state=consumeDiscoveryResponse(state,raw);}}
module.exports={PROVIDER_URL,providerRequest,decodeProvider,documents,startDiscovery,nextDiscoveryRequest,consumeDiscoveryResponse,finishDiscovery,runDiscovery,association};
