'use strict';
// Shared unchanged contact guards; no Phase 2 ledger or transport dependency.
const {text,norm,parsePublicUrl}=require('./helpers');
const {validateEmail}=require('./email-validator');
const {socialKey}=require('./duplicate-detection');
const CHANNELS=['EMAIL','INSTAGRAM','FACEBOOK','WHATSAPP','VIBER','LINKEDIN','OTHER_MANUAL','NO_ROUTE'];
function list(value){try{const a=typeof value==='string'?JSON.parse(value||'[]'):value;return Array.isArray(a)?a:[];}catch{return [];}}
function facts(row,now){return require('./research-history').currentFacts(row,now).filter(f=>!/^\s*[\[{]/.test(f.excerpt));}
function profile(url,channel){
 try{const u=parsePublicUrl(url);if(u.path==='/')return false;
  if(channel==='INSTAGRAM')return /(^|\.)instagram\.com$/.test(u.host)&&/^\/[^/]+\/?$/.test(u.path)&&!/^\/(p|reel|stories|explore|accounts)\/?$/.test(u.path);
  if(channel==='FACEBOOK')return /(^|\.)(facebook\.com|fb\.com)$/.test(u.host)&&!/(\/posts\/|\/videos\/|\/watch|\/share\/|\/reel|\/photo)/.test(u.path);
  if(channel==='LINKEDIN')return /(^|\.)linkedin\.com$/.test(u.host)&&/^\/(in|company)\/[^/]+\/?$/.test(u.path);
  if(channel==='WHATSAPP')return (u.host==='wa.me'&&/^\/\d{7,15}$/.test(u.path))||(u.host==='api.whatsapp.com'&&u.path==='/send');
  if(channel==='VIBER')return u.host==='vb.me'||/(^|\.)viber\.com$/.test(u.host);
  return true;
 }catch{return false;}
}
function selectChannel(row,now){
 const f=facts(row,now),routes=[];
 const officialPublication=list(row.evidence_json).some(x=>x.type==='published_email'&&norm(x.excerpt)===norm(row.public_email)&&x.source_url===row.email_source_url)&&row.email_source_type==='OFFICIAL_WEBSITE'&&f.some(x=>x.type==='legitimacy'&&x.source_url===row.email_source_url);
 if(validateEmail(row.public_email).valid&&row.email_source_url&&!['UNVERIFIED','UNKNOWN',''].includes(text(row.email_confidence))&&row.role_relevance!=='IRRELEVANT'&&
   (officialPublication||f.some(x=>['contact','published_email'].includes(x.type)&&norm(x.excerpt).includes(norm(row.public_email)))))routes.push({channel:'EMAIL',recipient:norm(row.public_email),source:row.email_source_url});
 for(const channel of CHANNELS.slice(1,-1)){
  const p=channel.toLowerCase(),url=channel==='OTHER_MANUAL'?row.booking_url:row[p+'_url'];
  const status=channel==='OTHER_MANUAL'?row.booking_status:row[p+'_status'];
  const type=channel==='OTHER_MANUAL'?'platform':p;
  const matched=f.find(x=>{
   if(x.type!==type)return false;
   if(channel==='FACEBOOK'){
    const key=socialKey(url);if(!key)return false;
    if(socialKey(x.source_url)===key)return true;
    if((text(x.excerpt).match(/https?:\/\/[^\s<>"']+/g)||[]).some(u=>socialKey(u.replace(/[),;.]+$/,''))===key))return true;
   }else if(norm(x.source_url).replace(/\/$/,'')===norm(url).replace(/\/$/,'')||norm(x.excerpt).includes(norm(url)))return true;
   if(channel==='INSTAGRAM'||channel==='FACEBOOK'){try{const handle=parsePublicUrl(url).path.replace(/^\//,'').replace(/\/$/,'');return handle!=='profile.php'&&norm(x.excerpt).includes('@'+norm(handle));}catch{return false;}}
   if(channel==='WHATSAPP'){const target=(text(url).match(/wa\.me\/(\d+)|[?&]phone=(\d+)/)||[]).slice(1).find(Boolean)||'';return target.length>=9&&[...text(x.excerpt).matchAll(/\+?\d[\d ().-]{6,}\d/g)].some(m=>m[0].replace(/\D/g,'').endsWith(target.slice(-9)));}
   return false;
  });
  if(status==='USABLE'&&profile(url,channel)&&matched)routes.push({channel,recipient:text(url),source:matched.source_url});
 }
 const preferred=text(row.preferred_channel).toUpperCase();
 return routes.find(r=>CHANNELS.includes(preferred)&&r.channel===preferred)||routes[0]||{channel:'NO_ROUTE',recipient:'',source:''};
}
function routeKey(channel,recipient){const value=text(recipient).replace(/^https?:\/\/[a-z]{2}-[a-z]{2}\.facebook\.com\//i,'https://www.facebook.com/');return channel==='EMAIL'?norm(recipient):socialKey(value)||norm(value).replace(/\/$/,'');}
function verifiedCandidate(row,now){
 const fs=facts(row,now);
 return list(row.verified_social_routes).filter(r=>['INSTAGRAM','FACEBOOK','LINKEDIN','WHATSAPP','VIBER'].includes(r.channel)&&['USABLE','MANUAL_SOCIAL_CANDIDATE'].includes(r.status)&&r.confidence==='HIGH').find(r=>{
  try{const u=parsePublicUrl(r.recipient);if(u.path==='/')return false;
   if(routeKey(r.channel,r.recipient)!==routeKey(r.channel,r.source_url)&&!fs.some(f=>norm(f.excerpt).includes(norm(r.recipient))))return false;
   if(r.channel==='FACEBOOK'&&(!/(^|\.)(facebook\.com|fb\.com)$/.test(u.host)||/\/posts\/|\/videos\/|\/watch|\/share\/|\/reel|\/photo/.test(u.path)))return false;
   if(r.channel==='INSTAGRAM'&&(!/(^|\.)instagram\.com$/.test(u.host)||!/^\/[^/]+\/?$/.test(u.path)||/^\/(p|reel|stories|explore|accounts)\/?$/.test(u.path)))return false;
   if(r.channel==='LINKEDIN'&&(!/(^|\.)linkedin\.com$/.test(u.host)||!/^\/(in|company)\/[^/]+\/?$/.test(u.path)))return false;
   if(r.channel==='WHATSAPP'&&!((u.host==='wa.me'&&/^\/\d{7,15}$/.test(u.path))||(u.host==='api.whatsapp.com'&&u.path==='/send')))return false;
   if(r.channel==='VIBER'&&!(u.host==='vb.me'||/(^|\.)viber\.com$/.test(u.host)))return false;
   if(['WHATSAPP','VIBER'].includes(r.channel)&&!fs.some(f=>f.type===r.channel.toLowerCase()&&norm(f.excerpt).includes(norm(r.recipient))))return false;
   return fs.some(f=>['legitimacy','identity','opportunity','structural_opportunity',r.channel.toLowerCase()].includes(f.type)&&routeKey(r.channel,f.source_url)===routeKey(r.channel,r.source_url));
  }catch{return false;}
 });
}
module.exports={selectChannel,verifiedCandidate,routeKey};
