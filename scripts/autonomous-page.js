'use strict';
const {text,parsePublicUrl,visibleText,decodeHtml}=require('./helpers');
const {extractContacts}=require('./contact-extractor');
const {validateEmail}=require('./email-validator');
const {sourceType,host}=require('./autonomous-identity');
const {validProfile}=require('./qualification');
function profileURL(url,kind){try{const p=parsePublicUrl(url);if(/(?:^|\/)(?:login|logout|checkpoint|recover|help|privacy|policies|terms|accounts|oauth|dialog|redirect|sharer|shareArticle)(?:[/.]|$)/i.test(p.path)||/[?&](?:next|redirect_uri|login_attempt)=/i.test(p.url))return false;if(kind==='facebook'&&/(^|\.)(facebook\.com|fb\.com)$/.test(p.host)&&/^\/p\/[a-z][a-z0-9-]+-\d{8,}\/?$/i.test(p.path))return true;return validProfile(url,kind)&&!/(?:^|\/)(?:posts?|reels?|stories|photos?|videos?|watch|share|p|popular|explore|groups|media|events|search|marketplace)(?:\/|$)/i.test(p.path);}catch{return false;}}
function cleanProfileURL(url){const p=parsePublicUrl(url);return p.path==='/profile.php'?url.split('?')[0]+'?id='+(url.match(/[?&]id=(\d+)/)?.[1]||''):url.split('?')[0];}
function vendorProfile(page,url){return host(page.url)==='fresha.com'&&/\/(?:fresha(?:[-/]|$)|company\/shedul|shedul(?:\/|$))/i.test(parsePublicUrl(url).path);}
function publicURL(raw,base=''){try{const u=parsePublicUrl(decodeHtml(raw),base).url;return /[?&](?:access_token|api_?key|token|password|secret|authorization|auth)=/i.test(u)?'':u;}catch{return '';}}
function parsePage(doc,now){
 const raw=text(doc.text||doc.content||doc.markdown||doc.body).slice(0,100000),html=/<(?:html|body|main|div|a|form)\b/i.test(raw),extracted=html?extractContacts(raw,doc.url):null;
 const title=text(doc.title||(raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1])||'').slice(0,200),body=(extracted?.visible||raw).replace(/^Published:\s*[^\n]+\n/m,'').replace(/(?:\*\*|__)(?=[a-z\d.!#$%&'*+\/=?^_`{|}~-]+@)/gi,'').slice(0,30000);
 const links=[...(extracted?.links||[]),...(doc.links||[]).map(u=>publicURL(u)).filter(Boolean),...Array.from(raw.matchAll(/https?:\/\/[^\s<>"'\[\]()]+/gi),m=>publicURL(m[0].replace(/[.,;]+$/,''))).filter(Boolean)];
 for(const m of raw.matchAll(/\]\(([^\s)]+)\)/g)){const u=publicURL(m[1],doc.url);if(u)links.push(u);}
 // A mailto inside script/comment data is not a visibly published contact.
 const contactText=html?raw.replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<!--[\s\S]*?-->/g,' '):raw;
 const mailto=Array.from(contactText.matchAll(/(?:href\s*=\s*["']|\]\()mailto:([^\s?"'<>\)]+)/gi),m=>{try{return decodeURIComponent(m[1]).toLowerCase();}catch{return '';}});
 const emails=[...new Set([...(extracted?.emails||[]),...mailto,...(body.match(/[a-z\d.!#$%&'*+/=?^_`{|}~-]+@[a-z\d.-]+\.[a-z]{2,}/gi)||[])].map(e=>e.toLowerCase().replace(/[.,;]+$/,'')))].filter(e=>validateEmail(e).valid&&!/@(?:example\.(?:com|org|net)|sentry\.io)$|\.(png|jpg|svg|webp)$/i.test(e)&&!/^(noreply|no-reply)@/.test(e));
 const actualForm=html&&/<form\b/i.test(raw)&&/<(?:input|textarea)\b[^>]*(?:name|type)\s*=\s*["']?(?:email|message|enquiry|name)/i.test(raw)&&/(?:type\s*=\s*["']?submit|<button\b)/i.test(raw);
 return {url:publicURL(doc.url),title,text:body,links:[...new Set(links)].slice(0,100),emails,mailto,actual_form:!!actualForm,observed_at:now,provider:doc.provider||'EXA',published_at:doc.publishedDate||doc.published_at||'',http_status:doc.statusCode||null,restricted:/captcha|access denied|log in to continue|sign in to continue|content unavailable|temporarily blocked|enable javascript and cookies to continue/i.test(body)};
}
function excerpt(page,needle,max=450){const at=page.text.toLowerCase().indexOf(String(needle).toLowerCase());return page.text.slice(Math.max(0,at-70),Math.max(0,at-70)+max).replace(/\s+/g,' ');}
function activity(page,identity,now){
 const official=identity.status==='AUTO_VERIFIED_OFFICIAL',matched=official||identity.status==='VERIFIED_ASSOCIATED_SOURCE';if(!matched||page.restricted)return null;
 if(/permanently closed|ceased trading|no longer operating/i.test(page.text))return {status:'POSSIBLY_INACTIVE',confidence:65,kind:'CLOSURE_CANDIDATE',excerpt:excerpt(page,page.text.match(/permanently closed|ceased trading|no longer operating/i)[0]),fact_date:now};
 if(/coming soon|opening soon|not yet open/i.test(page.text))return null;
 const service=/\b(?:services?|menu|treatments?|products?|repair|construction|contractor|dining|delivery|classes|consultation)\b/i.exec(page.text),hours=/\b(?:opening hours|business hours|open (?:daily|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|mon(?:day)?\s*[-–]\s*(?:fri|sat|sun)|\d{1,2}(?::\d{2})?\s*(?:am|pm)\s*[-–])/i.exec(page.text),action=/\b(?:book online|book (?:an? )?appointment|make (?:a )?reservation|order online|contact us|enquir(?:y|ies)|call us|message us|dm (?:us|to))\b/i.exec(page.text);
 // Relative dates must be timestamp labels, never phrases inside old review prose.
 const relative=/^\s*[-*\[\s]*(\d{1,2})\s+(day|week|month)s?\s+ago[\s.*\]]*$/im.exec(page.text),dated=/\b(20\d{2})[-/](\d{2})[-/](\d{2})\b/.exec(page.text);
 let publication=dated?`${dated[1]}-${dated[2]}-${dated[3]}`:'';
 if(relative){const days=+relative[1]*({day:1,week:7,month:30}[relative[2].toLowerCase()]);publication=new Date(Date.parse(now)-days*86400000).toISOString();}
 const age=(Date.parse(now)-Date.parse(publication))/86400000;
 if(Number.isFinite(age)&&age>=0&&age<=365&&(official||identity.source_type==='LISTING')&&/review|posted|update|announcement|completed|opening|project|event/i.test(page.text))return {status:age<=183?'LIKELY_ACTIVE':'PROVISIONAL_ACTIVE',confidence:age<=90?85:age<=183?75:60,kind:relative?'RECENT_PUBLIC_RELATIVE_DATE':'DATED_PUBLIC_ACTIVITY',excerpt:excerpt(page,relative?.[0]||dated?.[0]||publication),fact_date:publication,relative_date:!!relative};
 if(official&&service&&(hours||action||page.actual_form))return {status:'LIKELY_ACTIVE',confidence:hours&&action?85:75,kind:'CURRENT_SERVICE_AND_CONTACT_PAGE',excerpt:excerpt(page,(hours||action||service)[0]),fact_date:now};
 if(identity.source_type==='LISTING'&&hours&&service&&/reviews?|rating|\d(?:\.\d)?\s*\/\s*5/i.test(page.text))return {status:'LIKELY_ACTIVE',confidence:65,kind:'CURRENT_HOURS_AND_REVIEW_LISTING',excerpt:excerpt(page,hours[0]),fact_date:now};
 return null;
}
function publicRoutes(page,identity){
 const official=identity.status==='AUTO_VERIFIED_OFFICIAL';if(page.restricted)return [];
 if(!official){if(identity.status!=='VERIFIED_ASSOCIATED_SOURCE')return [];return page.links.filter(url=>!vendorProfile(page,url)&&['facebook','instagram','linkedin'].some(p=>profileURL(url,p))).map(url=>({channel:host(url).includes('instagram')?'INSTAGRAM':host(url).includes('linkedin')?'LINKEDIN':'FACEBOOK',recipient:cleanProfileURL(url),status:'MANUAL_CANDIDATE',source_url:page.url,excerpt:'This identity-matched third-party source publishes a candidate profile; first-party ownership and messaging remain unverified.',confidence:'MEDIUM',messaging_tested:false}));}
 const routes=[];
 // Some official social contact panels publish the address on its own line.
 // Accept literal introductory contact lines, excluding posts/comments/reviews.
 const socialContact=sourceType(page.url)==='SOCIAL'&&['facebook','instagram','linkedin'].some(p=>profileURL(page.url,p)),intro=page.text.split(/^\s*#{1,6}\s+(?:Post by|Posts?|Comments?|Reviews?|Photos?|Videos?)\b/im)[0];
 for(const email of page.emails){const local=excerpt(page,email,350),escaped=email.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),publishedLabel=new RegExp('(?:email|e-mail|enquir(?:y|ies)|contact|booking|reservation)[^\\n]{0,60}'+escaped,'i').test(page.text),profileLine=socialContact&&new RegExp('^\\s*'+escaped+'\\s*$','im').test(intro);if(page.mailto.includes(email)||email.split('@')[1]===host(page.url)||publishedLabel||profileLine||/email|e-mail|enquir|contact|booking|reservation/i.test(local)){
  if(/website (?:by|design)|designed by|powered by|webmaster/i.test(local)&&email.split('@')[1]!==host(page.url))continue;
  routes.push({channel:'EMAIL',recipient:email,status:'PUBLIC_VERIFIED',source_url:page.url,excerpt:local,confidence:'HIGH'});
 }}
 const socialKind=/(^|\.)(facebook\.com|fb\.com)$/.test(host(page.url))?'FACEBOOK':/(^|\.)instagram\.com$/.test(host(page.url))?'INSTAGRAM':/(^|\.)linkedin\.com$/.test(host(page.url))?'LINKEDIN':null;
 if(socialKind&&profileURL(page.url,socialKind.toLowerCase())){const usable=/message us|send (?:us )?a message|dm (?:us|to)|message for|contact us via|message (?:the|this) (?:business|page)/i.exec(page.text);routes.push({channel:socialKind,recipient:page.url,status:usable?'PUBLIC_VERIFIED':'MANUAL_SOCIAL_CANDIDATE',source_url:page.url,excerpt:usable?excerpt(page,usable[0]):page.title,confidence:'HIGH',messaging_tested:false});}
 for(const url of page.links){const h=host(url);let channel='';if(h==='wa.me'&&/^\/\d{7,15}\/?$/.test(parsePublicUrl(url).path)||h==='api.whatsapp.com'&&/[?&]phone=\d{7,15}(?:&|$)/.test(url))channel='WHATSAPP';else if(h==='vb.me'||/(^|\.)viber\.com$/.test(h))channel='VIBER';
  if(channel)routes.push({channel,recipient:url,status:'PUBLIC_VERIFIED',source_url:page.url,excerpt:excerpt(page,url),confidence:'HIGH'});
  const social=h.includes('instagram')?'instagram':h.includes('linkedin')?'linkedin':'facebook';if(!vendorProfile(page,url)&&profileURL(url,social))routes.push({channel:social.toUpperCase(),recipient:cleanProfileURL(url),status:'MANUAL_SOCIAL_CANDIDATE',source_url:page.url,excerpt:'Public profile linked by the verified official business page. Messaging availability requires manual review.',confidence:'HIGH',messaging_tested:false});
 }
 const formText=/\b(?:contact form|enquiry form|send (?:us )?(?:a |your )?message|submit (?:your )?enquiry)\b/i.exec(page.text);
 if(page.actual_form||formText&&/name[\s\S]{0,250}(?:email|phone)[\s\S]{0,400}(?:message|enquiry)/i.test(page.text))routes.push({channel:'CONTACT_FORM',recipient:page.url,status:'PUBLIC_VERIFIED',source_url:page.url,excerpt:formText?excerpt(page,formText[0]):'A public contact form contains name/email/message fields and a submit control.',confidence:'HIGH',submission_tested:false});
 // Platform recommendation cards cannot establish this business's bookability.
 const businessText=page.text.split(/book online with venues nearby|venues? (?:nearby|near you)|you may also like|recommended (?:venues|businesses)|similar (?:businesses|venues)/i)[0];
 const booking=/book online|order online|online reservations|select (?:a )?(?:date|time|service)|choose (?:a )?(?:date|time|service)/i.exec(businessText);if(booking&&(identity.source_type==='BOOKING'||/booking|reservation|order/i.test(page.url)))routes.push({channel:'OTHER_MANUAL',recipient:page.url,status:'PUBLIC_VERIFIED',source_url:page.url,excerpt:excerpt(page,booking[0]),confidence:'MEDIUM',submission_tested:false});
 return routes;
}
function supportedGap(page,identity){
 if(identity.status!=='AUTO_VERIFIED_OFFICIAL'||identity.source_type!=='WEBSITE'||page.restricted)return null;
 const placeholder=/\blorem ipsum\b|\byour (?:company|business) name here\b|\b(?:insert|add) (?:your )?(?:testimonial|company description) here\b/i.exec(page.text);if(placeholder)return {type:'gap',source_url:page.url,excerpt:'The verified business page visibly publishes placeholder text: '+excerpt(page,placeholder[0],320),observed_at:page.observed_at,fact_date:page.observed_at,verification:'DISCOVERY_VERIFIED',confidence:'HIGH',gap_kind:'VISIBLE_PLACEHOLDER'};
 if(/domain is not connected|this domain is parked|wix.*domain.*not connected|domain has expired/i.test(page.text))return {type:'gap',source_url:page.url,excerpt:excerpt(page,page.text.match(/domain is not connected|this domain is parked|wix.*domain.*not connected|domain has expired/i)[0]),observed_at:page.observed_at,fact_date:page.observed_at,verification:'DISCOVERY_VERIFIED',confidence:'HIGH',gap_kind:'DISCONNECTED_OFFICIAL_DOMAIN'};
 return null;
}
module.exports={publicURL,parsePage,excerpt,activity,publicRoutes,supportedGap,profileURL,cleanProfileURL};
