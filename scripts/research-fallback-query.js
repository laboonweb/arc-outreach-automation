'use strict';
const {text,parsePublicUrl}=require('./helpers');
const {publicURL,profileURL,cleanProfileURL}=require('./autonomous-page');
// Query only explicitly public fields, never notes, history or reviewer data.
function phrase(value,max){return text(value).replace(/["\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);}
function publicIdentifiers(row){
 const out={},phone=text(row.phone).replace(/^'/,'');
 if(/^\+?[\d () .-]+$/.test(phone)&&phone.replace(/\D/g,'').length>=8&&phone.replace(/\D/g,'').length<=15)out.phone=phone;
 for(const k of ['address','city','state','country'])if(phrase(row[k],140))out[k]=phrase(row[k],140);
 const site=publicURL(row.website_url);if(site){const p=parsePublicUrl(site);if(!/(^|\.)(docs\.google\.com|facebook\.com|instagram\.com|linkedin\.com)$/.test(p.host))out.website_url='https://'+p.host+'/';}
 for(const platform of ['facebook','instagram']){const u=publicURL(row[platform+'_url']);if(u&&profileURL(u,platform))out[platform+'_url']=cleanProfileURL(u);}
 // A spreadsheet email alone is unverified. Require independently recorded
 // public publication, including an exact email excerpt and public source URL.
 const published=row.published_business_email;
 const email=text(published?.email||row.public_email);
 let facts=[];try{facts=JSON.parse(row.evidence_json||'[]');}catch{}
 const proof=published||facts.find(f=>['published_email','contact'].includes(f.type)&&text(f.excerpt).toLowerCase().includes(email.toLowerCase())&&f.source_url===row.email_source_url);
 const source=publicURL(proof?.source_url),verified=['DISCOVERY_VERIFIED','HUMAN_REVIEWED_INPUT','REVIEWED_FACT'].includes(proof?.verification);
 if(email&&/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)&&email.length<=120&&source&&!/(^|\.)(docs\.google\.com|sheets\.googleapis\.com|api\.exa\.ai|api\.tavily\.com)$/.test(parsePublicUrl(source).host)&&verified&&text(proof.excerpt).toLowerCase().includes(email.toLowerCase()))out.published_business_email={email:email.toLowerCase(),source_url:source,verification:proof.verification,excerpt:text(proof.excerpt).slice(0,500)};
 return out;
}
function fallbackQuery(lead){
 const ids=publicIdentifiers(lead.public_business_identifiers||lead),name='"'+phrase(lead.business_name,120)+'"',suffix=' official business contact website Facebook Instagram';
 const domain=ids.website_url?parsePublicUrl(ids.website_url).host.replace(/^www\./,''):'';
 const anchors=[ids.phone,ids.published_business_email?.email,domain,ids.facebook_url,ids.instagram_url,ids.address].filter(Boolean),location=phrase([ids.city,ids.state,ids.country].filter(Boolean).join(' '),100),parts=[name];
 // Retain complete exact anchors rather than truncating a phone or profile URL.
 for(const a of anchors){const term='"'+a+'"';if([...parts,term,location,suffix].join(' ').length<=400)parts.push(term);}
 if(location&&[...parts,location,suffix].join(' ').length<=400)parts.push(location);
 if(parts.length===1&&!anchors.length)return [name,phrase(location,170),'business services hours contact official social profile'].filter(Boolean).join(' ').slice(0,400);
 return parts.join(' ')+suffix;
}
module.exports={publicIdentifiers,fallbackQuery};
