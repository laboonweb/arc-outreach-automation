'use strict';
const {text,yes,parsePublicUrl,evidence}=require('./helpers');
const providerAPI=require('./research-provider-api');
const {fallbackQuery}=require('./research-fallback-query');
const {matchIdentity,sourceType,host,meaningful}=require('./autonomous-identity');
const {publicURL,parsePage,excerpt,activity,publicRoutes,supportedGap}=require('./autonomous-page');
const emailDomains=require('./email-domain');
const LIMITS={searches:3,exa_searches:2,tavily_searches:1,reads:2,tavily_reads:1,total:5};
function protectedReason(row){
 const prior=row.previous_result||{};
 if(row.dataset_id==='MANILA_LEGACY')return 'CONTACT_HISTORY';
 for(const r of [row,prior]){
  if(['SENT','REPLIED','FOLLOW_UP_DUE','DO_NOT_CONTACT','PARKED','DISQUALIFIED'].includes(r.arc_status)||r.commercial_quality==='DISQUALIFY'||yes(r.initial_contact_recorded)||text(r.sent_at)||text(r.first_contact_at)||text(r.last_reply_at)||yes(r.suppressed)||r.suppression_status==='DO_NOT_CONTACT')return 'PROTECTED_HISTORY';
  if(yes(r.duplicate_review_required)||yes(r.initial_outreach_blocked)||yes(r.legacy_join_review_required))return 'CONTACT_LOCK';
  if(text(r.manual_status_override)||['MISMATCHED','UNCERTAIN','UNRESOLVED'].includes(r.identity_status_reviewed)||['REJECTED','APPROVED','RECONCILIATION_REQUIRED','SOURCE_CHANGED_REVIEW_REQUIRED'].includes(r.review_status))return 'REVIEWER_LOCK';
  if(['association','legitimacy','activity','contact','gap'].some(p=>r[p+'_verified']!==undefined&&text(r[p+'_verified'])!==''&&!yes(r[p+'_verified'])))return 'EXPLICIT_REVIEW_HOLD';
 }
 return '';
}
function start(lead,config,now){
 if(protectedReason(lead))throw Error('AUTONOMOUS_EXCLUDED:'+protectedReason(lead));
 if(config.discovery?.enabled!==true||config.discovery.provider_approved!==true)throw Error('DISCOVERY_PROVIDER_APPROVAL_REQUIRED');
 if(lead.routing!=='NEEDS_MANUAL_RESEARCH')throw Error('UNRESOLVED_SCOPE_REQUIRED');
 const fallback_query=fallbackQuery(lead);
 const queries=[`"${text(lead.business_name).slice(0,160)}" ${[lead.city,lead.state,lead.country].map(text).filter(Boolean).join(' ')} official website contact Instagram Facebook`,fallback_query];
 const circuits=JSON.parse(JSON.stringify(config.discovery.provider_circuits||{}));
 for(const circuit of Object.values(circuits))circuit.cooldown=false;
 const state={autonomous:true,version:'2.1.0-authenticated',lead,config,now,queries,candidates:[],pages:[],identities:[],routes:[],activities:[],gaps:[],errors:[],warnings:[],attempts:[],requests:0,searches:0,reads:0,exa_searches:0,tavily_searches:0,tavily_reads:0,pending:null,visited:[],blocked_hosts:[],provider_circuits:circuits,cost_dollars:0,tavily_credits:0};
 state.fallback_query=fallback_query;
 if(config.discovery.retry_reason){state.targeted_retry=require('./research-retry').plan({...lead.previous_result,...lead},config.discovery.retry_reason);state.queries=state.targeted_retry.search_allowed?[`"${text(lead.business_name).slice(0,160)}" ${[lead.city,lead.state,lead.country].map(text).filter(Boolean).join(' ')} official business identity published name address phone`,fallback_query]:[];}
 for(const u of [lead.website_url,lead.facebook_url,lead.instagram_url,lead.linkedin_url,lead.booking_url])addCandidate(state,u,'Supplied public candidate',true);
 return state;
}
function addCandidate(state,raw,title='',supplied=false,linked=false){const url=publicURL(raw);if(!url||state.candidates.some(c=>c.url===url)||state.candidates.length>=24)return;
 if(parsePublicUrl(url).path==='/'&&/(^|\.)(facebook\.com|fb\.com|instagram\.com|linkedin\.com|tiktok\.com|google\.[a-z.]+)$/.test(host(url)))return;
 const type=sourceType(url),name=meaningful(state.lead.business_name),h=host(url),branded=name.some(w=>w.length>=4&&h.includes(w));
 const relevant=name.filter(w=>text(title).toLowerCase().includes(w)).length/Math.max(1,name.length);
 const score=(type==='WEBSITE'?30:type==='SOCIAL'?20:type==='BOOKING'?25:5)+(branded?30:0)+(supplied?5:0)+(linked?40:0)+relevant*20;
 state.candidates.push({url,title:text(title).slice(0,200),score,supplied,linked,title_match:relevant>=0.8});
}
function next(state){
 state.pending=null;if(state.errors.some(e=>e.batch_fatal)||Object.values(state.provider_circuits).some(c=>c.open))return state;
 if((!state.targeted_retry||state.targeted_retry.scope==='DOMAIN')&&nextEmailDomain(state))return state;
 if(state.targeted_retry?.scope==='DOMAIN')return targetedNext(state);
 if(state.targeted_retry&&!state.targeted_retry.search_allowed)return targetedNext(state);
 if(state.requests>=LIMITS.total)return state;
 const open=p=>state.provider_circuits[p]?.open===true||state.provider_circuits[p]?.cooldown===true;
 // Search snippets can prove identity/activity while omitting the contact section.
 // Prefer one exact official social/profile or explicitly linked contact read
 // before sufficient-evidence stop, inside the existing two-page/total budgets.
 const contactSource=state.identities.find(i=>i.status==='AUTO_VERIFIED_OFFICIAL'&&i.source_type==='SOCIAL'&&!state.routes.some(r=>r.channel==='EMAIL'&&r.status==='PUBLIC_VERIFIED'&&r.source_url===i.url));
 const contactPage=contactSource&&state.candidates.find(c=>c.contact_parent===contactSource.url&&!state.visited.includes(c.url))||contactSource&&!state.visited.includes(contactSource.url)&&state.candidates.find(c=>c.url===contactSource.url);
 if(contactPage&&state.reads<LIMITS.reads&&!state.blocked_hosts.includes(host(contactPage.url))){
  const provider=!open('EXA')?'EXA':!open('TAVILY')&&state.tavily_reads<LIMITS.tavily_reads?'TAVILY':null;
  if(provider){state.reads++;if(provider==='TAVILY')state.tavily_reads++;state.visited.push(contactPage.url);state.pending=providerAPI.request(provider,'FETCH',contactPage.url);state.requests++;state.pending.attempt=state.requests;return state;}
 }
 if(sufficient(state))return state;
 const makeSearch=provider=>{state.searches++;state[provider==='EXA'?'exa_searches':'tavily_searches']++;state.pending=providerAPI.request(provider,'SEARCH',provider==='EXA'?state.queries.shift():state.fallback_query);};
 const choose=()=>state.candidates.map(c=>{const id=state.identities.find(i=>i.url===c.url);return {...c,identity:id,rank:c.score+(id?.name_match?40:0)+(id?.status==='AUTO_VERIFIED_OFFICIAL'?100:0)};}).filter(c=>!providerAPI.exaDirectory(c.url)&&!state.visited.includes(c.url)&&!state.blocked_hosts.includes(host(c.url))&&c.score>=25&&(c.identity?c.identity.name_match||c.identity.status==='AUTO_VERIFIED_OFFICIAL':c.supplied||c.linked||c.title_match)).sort((a,b)=>b.rank-a.rank)[0];
 state.fallback_query||=state.queries[0]||state.queries[1];
 const candidate=choose();
 if(!state.exa_searches&&!open('EXA'))makeSearch('EXA');
 else if(!open('EXA')&&!state.tavily_searches&&candidate&&state.reads<1){state.reads++;state.visited.push(candidate.url);state.pending=providerAPI.request('EXA','FETCH',candidate.url);}
 else if(!open('EXA')&&!state.tavily_searches&&state.exa_searches<LIMITS.exa_searches&&state.queries.length)makeSearch('EXA');
 else if(!open('TAVILY')&&!state.tavily_searches)makeSearch('TAVILY');
 else if(state.tavily_searches&&!open('TAVILY')&&candidate&&state.reads<LIMITS.reads&&state.tavily_reads<LIMITS.tavily_reads){state.reads++;state.tavily_reads++;state.visited.push(candidate.url);state.pending=providerAPI.request('TAVILY','FETCH',candidate.url);}
 if(state.pending){state.requests++;state.pending.attempt=state.requests;}return state;
}
function targetedNext(state){
 if(state.requests>=LIMITS.total||state.reads>=LIMITS.reads)return state;
 const inspectedDomains=new Set((state.email_domain_jobs||[]).filter(j=>j.done).map(j=>j.candidate.domain));
 const url=state.targeted_retry.urls.find(url=>!state.visited.includes(url)&&!state.blocked_hosts.includes(host(url))&&!(state.targeted_retry.scope==='DOMAIN'&&inspectedDomains.has(host(url))));if(!url){state.warnings.push({code:'TARGETED_OFFICIAL_SOURCE_REQUIRED',scope:state.targeted_retry.scope});return state;}
 const open=p=>state.provider_circuits[p]?.open||state.provider_circuits[p]?.cooldown;
 const provider=!open('EXA')?'EXA':!open('TAVILY')&&state.tavily_reads<LIMITS.tavily_reads?'TAVILY':null;if(!provider)return state;
 state.reads++;if(provider==='TAVILY')state.tavily_reads++;state.visited.push(url);state.pending=providerAPI.request(provider,'FETCH',url);state.pending.attempt=++state.requests;return state;
}
function nextEmailDomain(state){
 state.email_domain_jobs||=[];state.email_domain_requests||=0;
 const fs=emailDomains.routesFromLead(state.lead,state.now),prior=state.lead.previous_result||state.lead;
 let stored=[];try{stored=JSON.parse(prior.evidence_json||'[]').filter(f=>f.type==='business_domain');}catch{}
 const cache=[...stored,...(state.config.email_domain_cache||[])];
 for(const candidate of emailDomains.candidates(state.lead,[...state.routes,...fs],state.identities,state.now))if(!state.email_domain_jobs.some(s=>s.candidate.domain===candidate.domain))state.email_domain_jobs.push(emailDomains.start({...candidate,lead:state.lead},state.config,state.now,cache));
 for(const job of state.email_domain_jobs){
  if(job.done)continue;
  emailDomains.next(job,emailDomains.LIMITS.requests-state.email_domain_requests);
  if(job.pending){state.pending=job.pending;state.email_domain_requests++;return true;}
 }
 return false;
}
function usableRoute(r){return r.status==='PUBLIC_VERIFIED'||r.status==='MANUAL_SOCIAL_CANDIDATE';}
function sufficient(state){return state.identities.some(i=>i.status==='AUTO_VERIFIED_OFFICIAL')&&state.activities.some(a=>a.confidence>=60&&['LIKELY_ACTIVE','PROVISIONAL_ACTIVE'].includes(a.status))&&state.routes.some(usableRoute);}
function reassess(state){
 // Two passes allow a first-party page to corroborate linked social profiles.
 for(let pass=0;pass<2;pass++)for(const page of state.pages){
  const identity=matchIdentity(state.lead,page,state.identities),at=state.identities.findIndex(i=>i.url===page.url);if(at<0)state.identities.push(identity);else state.identities[at]=identity;
 }
 state.routes=[];state.activities=[];state.gaps=[...(state.transport_gaps||[])];
 for(const page of state.pages){const id=state.identities.find(i=>i.url===page.url);if(!id)continue;
  state.routes.push(...publicRoutes(page,id));const a=activity(page,id,state.now);if(a)state.activities.push({...a,source_url:page.url,observed_at:state.now});const gap=supportedGap(page,id);if(gap)state.gaps.push(gap);
  if(id.status==='AUTO_VERIFIED_OFFICIAL')for(const url of page.links){const kind=sourceType(url),p=parsePublicUrl(url).path,base=parsePublicUrl(page.url).path.replace(/\/$/,'');
   const contact=host(url)===host(page.url)&&(id.source_type==='SOCIAL'?p.startsWith(base+'/')&&/^\/(?:about|about_contact_and_basic_info|contact)\/?$/i.test(p.slice(base.length)):/\/(?:contact|about)(?:-us)?\/?$/i.test(p));
   if(contact||host(url)===host(page.url)&&/\/(?:contact|about|services|menu|treatments|locations|book|booking|enquiry|order)(?:[/.?#-]|$)/i.test(p)||['SOCIAL','BOOKING'].includes(kind))addCandidate(state,url,'Linked public business page',false,true);
   if(contact){const candidate=state.candidates.find(c=>c.url===url);if(candidate)candidate.contact_parent=page.url;}
  }
 }
 const routes=new Map();for(const r of state.routes){const key=r.channel+'|'+r.recipient,old=routes.get(key);if(!old||old.status!=='PUBLIC_VERIFIED'&&r.status==='PUBLIC_VERIFIED')routes.set(key,r);}state.routes=[...routes.values()];
}
function consume(state,raw){
 const p=state.pending;if(!p)throw Error('DISCOVERY_REQUEST_CONTEXT_REQUIRED');let success=false;
 if(p.kind==='EMAIL_DOMAIN'){
  const job=state.email_domain_jobs.find(s=>s.pending?.url===p.url);if(!job)throw Error('EMAIL_DOMAIN_ITEM_ASSOCIATION_FAILURE');
  emailDomains.consume(job,raw);state.pending=null;return state;
 }
 try{
  const provider=p.provider||'PUBLIC_ORIGIN',status=Number(raw.statusCode);
  if([429,401,403,402].includes(status)&&provider!=='PUBLIC_ORIGIN'){
   const retryAfter=Number(raw.headers?.['retry-after']),failures=(state.provider_circuits[provider]?.failures||0)+1;state.provider_circuits[provider]={open:status!==429||failures>=2,cooldown:true,failures,status,reason:status===429?'PROVIDER_RATE_LIMIT':'PROVIDER_AUTH_OR_CREDIT_UNAVAILABLE',retry_after_seconds:Number.isFinite(retryAfter)?Math.max(60,Math.min(3600,retryAfter)):300};
   throw Error(status===429?'PROVIDER_RATE_LIMIT':'PROVIDER_AUTH_OR_CREDIT_UNAVAILABLE');
  }
  const decoded=p.kind==='ORIGIN'?null:providerAPI.decode(raw,p.provider),docs=p.kind==='ORIGIN'?[{url:p.target_url,body:raw.body,statusCode:raw.statusCode,provider:'PUBLIC_ORIGIN'}]:decoded.documents;
  if(decoded){
   state.cost_dollars+=decoded.cost_dollars||0;state.tavily_credits+=decoded.credits||0;
   if(state.config.discovery.require_cost_metadata&&(p.provider==='EXA'?decoded.cost_dollars===null:decoded.credits===null))throw Error('PROVIDER_COST_METADATA_MISSING');
   if(state.cost_dollars>Number(state.config.discovery.remaining_exa_cost_usd??Infinity)||state.tavily_credits>Number(state.config.discovery.remaining_tavily_credits??Infinity))throw Error('PROVIDER_BATCH_COST_LIMIT');
   state.provider_circuits[p.provider]={open:false,failures:0};
  }
  if(p.kind==='ORIGIN'&&(raw.error||raw.statusCode>=400||raw.statusCode<200||raw.statusCode>=300))throw Error('ORIGIN_FETCH_UNAVAILABLE');
  if(!docs.length){state.warnings.push({provider:p.provider,code:p.kind==='SEARCH'?'SEARCH_NO_RESULTS':'PAGE_CONTENT_UNAVAILABLE'});state.attempts.push({number:p.attempt,provider:p.provider,kind:p.kind,target:p.target_url||'',success:false,status_code:status,observed_at:state.now});state.pending=null;return state;}
  for(const doc of docs){const url=publicURL(doc.url||doc.source_url||doc.URL);if(!url){state.errors.push({provider:p.provider,stage:p.kind,code:'PROVIDER_UNSUPPORTED_CANDIDATE_URL',source_url:p.url,attempt:p.attempt,retryable:false,batch_fatal:false,observed_at:state.now});continue;}
   if(providerAPI.exaDirectory(url)&&!state.warnings.some(w=>w.url===url))state.warnings.push({code:'EXA_DIRECTORY_CONTENT_ONLY',url});
   if(p.kind==='SEARCH'){addCandidate(state,url,doc.title);success=true;}
   if(p.kind!=='SEARCH'&&url!==p.target_url){state.warnings.push({code:'FETCH_TARGET_MISMATCH',requested:p.target_url,returned:url});continue;}
   const page=parsePage({...doc,url},state.now);if(page.restricted){state.blocked_hosts.push(host(url));state.warnings.push({code:'PUBLIC_ACCESS_RESTRICTED',url});continue;}
   if(page.text.length<80)continue;
   const index=state.pages.findIndex(x=>x.url===url);if(index>=0)state.pages[index]=page;else state.pages.push(page);success=true;
  }
  if(!success)state.warnings.push({provider:p.provider,code:'NO_USABLE_PROVIDER_CONTENT'});
  reassess(state);
 }catch(e){
  // Do not retain arbitrary provider/error text: it can include request headers.
  const code=/^(?:PROVIDER_|ORIGIN_)[A-Z0-9_]+$/.test(e.message)?e.message:'PROVIDER_RESPONSE_UNUSABLE';
  // Candidate/content failures do not trip a provider-wide circuit. Only repeated
  // 5xx/network failures or sustained 429 do; auth and accounting fail immediately.
  if(p.provider&&!state.provider_circuits[p.provider]?.cooldown&&(Number(raw.statusCode)>=500||code==='PROVIDER_NETWORK_ERROR')){const failures=(state.provider_circuits[p.provider]?.failures||0)+1;state.provider_circuits[p.provider]={open:failures>=2,cooldown:true,failures,reason:code};}
  const batch_fatal=!!state.provider_circuits[p.provider]?.open||['PROVIDER_BATCH_COST_LIMIT','PROVIDER_COST_METADATA_MISSING'].includes(code);
  state.errors.push({provider:p.provider||'PUBLIC_ORIGIN',stage:p.kind,code,source_url:p.target_url||p.url,attempt:p.attempt,retryable:true,batch_fatal,observed_at:state.now});
  if(p.kind==='FETCH'&&p.target_url)state.candidates=state.candidates.filter(c=>c.url!==p.target_url);
  const parent=state.pages.find(page=>page.links.includes(p.target_url)&&state.identities.some(i=>i.url===page.url&&i.status==='AUTO_VERIFIED_OFFICIAL'));
  if(p.kind==='ORIGIN'&&parent&&(Number(raw.statusCode)===404||Number(raw.statusCode)===410||raw.error?.code==='ENOTFOUND')&&(/\/(?:contact|book|booking|reservation|enquiry|order)(?:[/.?#-]|$)/i.test(p.target_url)||host(p.target_url)!==host(parent.url))){
   const marker=raw.error?.code||'HTTP_'+raw.statusCode;
   state.transport_gaps||=[];state.transport_gaps.push(evidence('gap',parent.url,'The independently verified official page publishes '+p.target_url+'; a controlled public read observed '+marker+'. This records the observed destination failure only.',state.now,{fact_date:state.now,verification:'DISCOVERY_VERIFIED',confidence:'HIGH',gap_kind:'BROKEN_PUBLISHED_DESTINATION',destination_url:p.target_url,transport_code:marker}));reassess(state);
  }
 }
 state.attempts.push({number:p.attempt,provider:p.provider||'PUBLIC_ORIGIN',kind:p.kind,target:p.target_url||'',success,status_code:Number(raw.statusCode)||null,observed_at:state.now});state.pending=null;return state;
}
function finish(state){
 const identities=state.identities.filter(i=>i.status!=='IDENTITY_UNRESOLVED'),official=identities.filter(i=>i.status==='AUTO_VERIFIED_OFFICIAL'),active=state.activities.filter(a=>a.confidence>=60&&['LIKELY_ACTIVE','PROVISIONAL_ACTIVE'].includes(a.status)).sort((a,b)=>b.confidence-a.confidence)[0],route=state.routes.filter(usableRoute).sort((a,b)=>Number(b.status==='PUBLIC_VERIFIED')-Number(a.status==='PUBLIC_VERIFIED')||['EMAIL','WHATSAPP','VIBER','CONTACT_FORM','OTHER_MANUAL','INSTAGRAM','FACEBOOK','LINKEDIN'].indexOf(a.channel)-['EMAIL','WHATSAPP','VIBER','CONTACT_FORM','OTHER_MANUAL','INSTAGRAM','FACEBOOK','LINKEDIN'].indexOf(b.channel))[0];
 const facts={},fields={},observations=[];
 const fact=(type,source_url,excerpt,extra={})=>evidence(type,source_url,excerpt,state.now,{fact_date:state.now,verification:'DISCOVERY_VERIFIED',confidence:'HIGH',...extra});
 for(const i of state.identities)observations.push(fact('discovery_identity_check',i.url,i.matched_evidence.join(' | ')||i.status,{verification:i.status==='IDENTITY_UNRESOLVED'?'NEEDS_HUMAN_REVIEW':'DISCOVERY_VERIFIED',confidence:i.confidence,identity_score:i.score,matching_signals:i.signals,conflicts:i.conflicts,official_status:i.status,source_urls:i.source_urls}));
 const primary=official.find(i=>i.source_type==='WEBSITE')||official[0]||identities[0];
 if(primary){facts.legitimacy=fact('legitimacy',primary.url,'The published business identity matches '+primary.signals.join(', ')+'.',{identity_score:primary.score,official_status:primary.status});facts.association=fact('association',primary.url,'Public source independently matched to the business.',{identity_score:primary.score,official_status:primary.status});}
 const website=official.find(i=>i.source_type==='WEBSITE');if(website)fields.website_url=website.url;
 for(const page of state.pages){if(!official.some(i=>i.url===page.url)||page.restricted)continue;const owner=/\b(owner|founder|director)\s*[:：]\s*([A-Z][\p{L}'-]+(?:\s+[A-Z][\p{L}'-]+){1,3})/u.exec(page.text);if(owner){facts.decision_maker=fact('decision_maker',page.url,excerpt(page,owner[0]));fields.decision_maker_name_reviewed=owner[2];fields.decision_maker_role_reviewed=owner[1];break;}}
 if(active){facts.activity=fact('activity',active.source_url,active.excerpt,{fact_date:active.fact_date,signal_type:active.kind,activity_confidence:active.confidence,relative_date:!!active.relative_date});fields.activity_status='LIKELY_ACTIVE';fields.activity_signal_type=active.kind;fields.activity_corroborated=identities.length>1;}
 for(const r of state.routes){const id=official.find(i=>i.url===r.source_url),sourceHost=host(r.source_url);observations.push(fact('public_contact_route',r.source_url,r.excerpt,{channel:r.channel,route_url:r.recipient,availability:r.status,messaging_tested:r.messaging_tested,submission_tested:r.submission_tested,confidence:r.confidence,official_status:id?.status,identity_score:id?.score}));if(r.channel==='EMAIL'&&r.status==='PUBLIC_VERIFIED'&&!facts.contact){facts.contact=fact('contact',r.source_url,'Published business email: '+r.recipient+'. '+r.excerpt,{email:r.recipient,official_status:id?.status,identity_score:id?.score});fields.contact_email=r.recipient;fields.contact_source_type=/(^|\.)(facebook\.com|fb\.com)$/.test(sourceHost)?'FACEBOOK_ABOUT':/(^|\.)instagram\.com$/.test(sourceHost)?'INSTAGRAM_CONTACT':'OFFICIAL_WEBSITE';}
  const prefix=r.channel.toLowerCase();if(['facebook','instagram','linkedin','whatsapp','viber'].includes(prefix)){fields[prefix+'_url']||=r.recipient;if(r.status==='PUBLIC_VERIFIED'){facts[prefix]=fact(prefix,r.source_url,r.excerpt,{route_url:r.recipient});fields[prefix+'_status_reviewed']='USABLE';}}
  if(['CONTACT_FORM','OTHER_MANUAL'].includes(r.channel)&&r.status==='PUBLIC_VERIFIED'){facts.platform=fact('platform',r.source_url,r.excerpt,{route_url:r.recipient,channel:r.channel,availability:'PUBLIC_ROUTE_NOT_SUBMITTED'});fields.booking_url=r.recipient;fields.booking_status='USABLE';}
 }
 const domainFacts=(state.email_domain_jobs||[]).filter(s=>s.result).map(s=>emailDomains.fact(s.candidate,s.result,state.now));
 for(const [i,f]of domainFacts.entries())facts['business_domain_'+i]=f;
 const activeDomain=domainFacts.find(f=>f.verification==='DISCOVERY_VERIFIED'&&['ACTIVE_SITE','ACTIVE_REDIRECT'].includes(f.classification));
 if(activeDomain)fields.website_url=activeDomain.final_url;
 const domainGap=domainFacts.map(f=>emailDomains.gap(f,state.now)).find(Boolean);
 if(domainGap||state.gaps.length){facts.gap=domainGap||state.gaps[0];facts.business_case=fact('business_case',facts.gap.source_url,domainGap?'Turn the business-associated domain into a functioning destination for services, proof and enquiries.':'Replace the observed incomplete public information with business-approved content and the published enquiry route.');}
 const socialPresence=official.find(i=>i.source_type==='SOCIAL'||i.source_type==='BOOKING');
 if(!facts.gap&&socialPresence&&!website&&!activeDomain){facts.opportunity=fact('opportunity',socialPresence.url,'Verified public business information and enquiry presence is available on this business platform. An owned destination could bring that published information and route together. Website absence is not established.',{opportunity_kind:'VERIFIED_PLATFORM_PRESENCE'});}
 const ambiguous=state.identities.filter(i=>i.status==='IDENTITY_UNRESOLVED'&&i.score>=55).map(i=>({url:i.url,score:i.score,signals:i.signals,conflicts:i.conflicts}));
 const bothFailed=['EXA','TAVILY'].every(p=>state.provider_circuits[p]?.open||state.errors.some(e=>e.provider===p))&&!sufficient(state),retryable=bothFailed;
 const discovery={version:state.version,status:primary?'EVIDENCE_FOUND':'UNRESOLVED',facts,fields,observations,routes:state.routes,identities:state.identities,activity:active||null,selected_route:route||null,ambiguous_matches:ambiguous,warnings:state.warnings,errors:state.errors,requests:state.requests,searches:state.searches,exa_searches:state.exa_searches,tavily_searches:state.tavily_searches,page_read_attempts:state.reads,tavily_page_reads:state.tavily_reads,pages_fetched:state.pages.length,attempts:state.attempts,observed_at:state.now,provider_status:bothFailed?'PROVIDER_RETRY_REQUIRED':state.errors.length?'COMPLETED_WITH_PROVIDER_ERRORS':'COMPLETED',provider_circuits:state.provider_circuits,cost_dollars:state.cost_dollars,tavily_credits:state.tavily_credits,retryable,candidates:state.candidates.map(c=>({url:c.url,title:c.title})),official_hosts:[...new Set(official.filter(i=>i.source_type==='WEBSITE').map(i=>host(i.url)))]};
 discovery.domain_facts=domainFacts;discovery.email_domain_requests=state.email_domain_requests||0;
 if(state.targeted_retry){
  discovery.targeted_retry=state.targeted_retry;const scope=state.targeted_retry.scope,allowed={ACTIVITY:['activity'],CONTACT:['contact','facebook','instagram','linkedin','whatsapp','viber','platform'],IDENTITY:['legitimacy','association'],JOURNEY:['gap','business_case','opportunity','platform'],DOMAIN:['gap','business_case']}[scope];
  discovery.facts=Object.fromEntries(Object.entries(facts).filter(([key,f])=>allowed.includes(f.type)||scope==='DOMAIN'&&f.type==='business_domain'));
  const fieldSets={ACTIVITY:['activity_status','activity_signal_type','activity_corroborated'],CONTACT:['contact_email','contact_source_type','facebook_url','facebook_status_reviewed','instagram_url','instagram_status_reviewed','linkedin_url','linkedin_status_reviewed','whatsapp_url','whatsapp_status_reviewed','viber_url','viber_status_reviewed','booking_url','booking_status'],IDENTITY:[],JOURNEY:['booking_url','booking_status'],DOMAIN:['website_url']};
  discovery.fields=Object.fromEntries(Object.entries(fields).filter(([key])=>fieldSets[scope].includes(key)));
  discovery.observations=observations.filter(f=>scope==='IDENTITY'?f.type==='discovery_identity_check':scope==='CONTACT'?f.type==='public_contact_route':false);
  if(scope!=='CONTACT'){discovery.routes=[];discovery.selected_route=null;}
  if(scope!=='ACTIVITY')discovery.activity=null;
 }
 return {lead:state.lead,config:state.config,discovery};
}
module.exports={LIMITS,protectedReason,start,next,consume,finish,reassess,sufficient};
