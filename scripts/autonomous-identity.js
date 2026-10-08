'use strict';
const {text,norm,parsePublicUrl}=require('./helpers');
const {phoneKey,socialKey}=require('./duplicate-detection');
const STOP=new Set('the and of for inc incorporated corp corporation company co pty ltd limited philippines australia services service main office branch'.split(' '));
function words(s){return norm(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean);}
function compact(s){return words(s).join('');}
function meaningful(s){return words(s).filter(w=>!STOP.has(w));}
function host(url){try{return parsePublicUrl(url).host.replace(/^www\./,'');}catch{return '';}}
function sourceType(url,body=''){
 const h=host(url);
 if(h==='fresha.com'&&/^\/lvp\//i.test(parsePublicUrl(url).path))return 'LISTING';
 if(/(^|\.)(facebook\.com|fb\.com|instagram\.com|linkedin\.com)$/.test(h))return 'SOCIAL';
 if(/(^|\.)(fresha\.com|booksy\.com|opentable\.com|nowbookit\.com|resdiary\.com|cococart\.co|booking\.com|treatwell\.[a-z.]+)$/.test(h))return 'BOOKING';
 if(/(^|\.)(google\.[a-z.]+|maps\.app\.goo\.gl|yelp\.[a-z.]+|yellowpages\.[a-z.]+|localsearch\.com\.au|truelocal\.com\.au|birdeye\.com|findglocal\.com|cybo\.com|bark\.com|hotfrog\.[a-z.]+|schoolandcollegelistings\.com|australia247\.[a-z.]+|businesslist\.ph|businesslist\.com\.au|yellow-pages\.ph|zoominfo\.com|dnb\.com|signalhire\.com|rocketreach\.co|abr\.business\.gov\.au|mara\.gov\.au|tripadvisor\.[a-z.]+|trip\.com)$/.test(h)||/claim (?:this|your) (?:business|listing)|add your business|business directory|write a review/i.test(body))return 'LISTING';
 if(/(^|\.)(exa\.ai|mapquest\.com|australiacheck\.com|hipages\.com\.au|find-open\.biz|muaythaimap\.com|oceaniabiz\.com|waze\.com|firmania\.biz|australian-local\.com|whitepages\.com\.au|cylex[^.]*\.[a-z.]+)$/.test(host(url))||/own this business|are you the owner|ai review summary|entity info|abn & acn/i.test(body))return 'LISTING';
 if(/\/(?:news|article|blog|press|author)\//i.test(url))return 'PUBLICATION';
 return 'WEBSITE';
}
function matchIdentity(lead,page,known=[]){
 const body=page.title+'\n'+page.text,flat=compact(body),name=meaningful(lead.business_name),title=meaningful(page.title),base=meaningful(text(lead.business_name).split(/\s[-|]\s|\(/)[0]);
 const named=base.length>0&&base.filter(w=>compact(body).includes(w)).length/base.length>=0.9;
 const titleMatch=base.length>0&&(base.filter(w=>title.includes(w)).length/base.length>=0.8||compact(page.title).includes(base.join('')));
 const exactName=compact(lead.business_name).length>=5&&flat.includes(compact(lead.business_name));
 const locality=meaningful(lead.city).filter(w=>!['metro','manila','sydney','melbourne'].includes(w));
 const city=words(lead.city),cityMatch=city.length>0&&city.filter(w=>words(body).includes(w)).length/city.length>=0.8;
 const phoneBody=body.replace(/(\+?\d[\d -]{5,}\d)\s*\((\+?\d[\d ()-]{6,}\d)\)/g,'$1 | $2');
 const phoneTokens=[...phoneBody.matchAll(/(?:\+?\d[\d ()\-.]{6,}\d)/g)].map(m=>({published:m[0],normalized:phoneKey(m[0],lead.country)})),numbers=phoneTokens.map(p=>p.normalized).filter(Boolean);
 const wantedPhone=phoneKey(lead.phone,lead.country),phoneMatch=!!wantedPhone&&numbers.includes(wantedPhone);
 const address=words(lead.address).filter(w=>!['australia','philippines','metro'].includes(w));
 const addressMatch=address.length>=4&&address.some(w=>/^\d+[a-z]?$/.test(w))&&address.filter(w=>words(body).includes(w)).length/address.length>=0.9;
 const branch=text(lead.business_name).match(/\s[-|]\s(.+)$/)?.[1]||'';
 const branchWords=meaningful(branch).filter(w=>!['main','office','head','corporate','inc','corporation'].includes(w));
 const branchMatch=branchWords.length>0&&branchWords.filter(w=>words(body).includes(w)).length/branchWords.length>=0.8;
 const targetHost=host(page.url),labels=targetHost.split('.'),domainName=(labels.at(/\.(?:com|net|org|co)\.[a-z]{2}$/.test(targetHost)?-3:-2)||labels[0]).replace(/-/g,'');
 const distinctive=base.filter(w=>w.length>=4&&!['construction','dental','clinic','restaurant','cafe','shop','design','studio','industrial','medical','migration','fitness','printing','muay','thai','repairs','accounting','services'].includes(w));
 const domainBrand=distinctive.some(w=>domainName.includes(w))||base.length>1&&domainName===base.map(w=>w[0]).join('');
 const linkedBy=known.filter(k=>k.status==='AUTO_VERIFIED_OFFICIAL'&&['WEBSITE','SOCIAL'].includes(k.source_type)&&(k.links||[]).some(u=>socialKey(u)===socialKey(page.url)||host(u)===targetHost&&sourceType(u)==='WEBSITE'));
 const sameOfficialDomain=known.some(k=>k.status==='AUTO_VERIFIED_OFFICIAL'&&k.source_type==='WEBSITE'&&host(k.url)===targetHost);
 const category=meaningful(lead.industry||lead.sector||lead.category),categoryMatch=category.some(w=>w.length>4&&words(body).includes(w));
 const signals=[];let score=0;
 for(const [signal,ok,weight] of [['EXACT_NAME',exactName,35],['NEAR_NAME',!exactName&&named,25],['PUBLISHED_PHONE',phoneMatch,55],['STREET_ADDRESS',addressMatch,55],['LOCALITY',cityMatch,15],['BRANCH',branchMatch,20],['CATEGORY',categoryMatch,5],['BRANDED_DOMAIN',domainBrand,10],['OFFICIAL_CROSS_LINK',linkedBy.length>0,65],['VERIFIED_DOMAIN_PAGE',sameOfficialDomain,90]])if(ok){signals.push(signal);score+=weight;}
 const conflicts=[];
 const firstHeading=page.text.match(/^\s*#\s+([^\n]+)/m)?.[1]||'';
 if(named&&!titleMatch&&!compact(firstHeading).includes(base.join(''))&&!sameOfficialDomain&&!linkedBy.length)conflicts.push('PRIMARY_BUSINESS_NOT_CONFIRMED');
 if(branchWords.length&&named&&!branchMatch&&!addressMatch&&!sameOfficialDomain)conflicts.push('BRANCH_NOT_CONFIRMED');
 if(locality.length&&named&&!cityMatch&&!addressMatch&&!phoneMatch&&!linkedBy.length&&!sameOfficialDomain)conflicts.push('LOCALITY_NOT_CONFIRMED');
 const strongAnchor=phoneMatch||addressMatch||linkedBy.length>0||sameOfficialDomain;
 const matched=(named||sameOfficialDomain)&&strongAnchor&&score>=85&&!conflicts.length;
 const kind=sourceType(page.url,page.text);
 const firstParty=kind==='SOCIAL'||kind==='BOOKING'||kind==='WEBSITE'&&(domainBrand&&titleMatch||linkedBy.length>0||sameOfficialDomain);
 const status=matched?(firstParty?'AUTO_VERIFIED_OFFICIAL':'VERIFIED_ASSOCIATED_SOURCE'):'IDENTITY_UNRESOLVED';
 const matchedEvidence=[page.title,phoneMatch?phoneTokens.find(p=>p.normalized===wantedPhone).published:'',addressMatch?body.slice(Math.max(0,body.toLowerCase().indexOf(address[0])-40),Math.max(0,body.toLowerCase().indexOf(address[0])-40)+400):''].filter(Boolean);
 return {status,score:Math.min(score,100),signals,conflicts,source_type:kind,confidence:matched?'HIGH':score>=55?'MEDIUM':'LOW',url:page.url,observed_at:page.observed_at,source_urls:[page.url,...linkedBy.map(k=>k.url)],matched_evidence:matchedEvidence,name_match:named,phone_match:phoneMatch,address_match:addressMatch,locality_match:cityMatch,branch_match:branchMatch,links:page.links||[]};
}
module.exports={words,compact,meaningful,host,sourceType,matchIdentity};
