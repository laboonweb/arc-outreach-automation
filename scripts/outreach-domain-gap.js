'use strict';
// Deterministic translations of current canonical domain facts only.
const {reusable,FREE}=require('./email-domain-policy');
const {validateEmail}=require('./email-validator');
const {text,yes,parsePublicUrl}=require('./helpers');
const KINDS={PARKED_DOMAIN:'VERIFIED_PARKED_DOMAIN',PLACEHOLDER_SITE:'VERIFIED_PLACEHOLDER_SITE',BROKEN_DESTINATION:'VERIFIED_BROKEN_DESTINATION'};
function select(row,fs,now){
 if(text(row.contact_verified)&&!yes(row.contact_verified)||text(row.gap_verified)&&!yes(row.gap_verified)||text(row.gap_unresolved_verified)&&!yes(row.gap_unresolved_verified)||['MISMATCHED','UNCERTAIN','UNRESOLVED'].includes(row.identity_status_reviewed))return null;
 for(const f of fs.filter(f=>f.type==='business_domain').sort((a,b)=>Date.parse(b.observed_at)-Date.parse(a.observed_at))){
  const email=validateEmail(row.public_email||row.verified_email),emailHost=email.email?.split('@')[1]||'';
  if(!email.valid||!reusable(f,now)||f.verification!=='DISCOVERY_VERIFIED'||f.confidence!=='HIGH'||f.domain_identity_confidence<85||!KINDS[f.classification]||f.association_verified!==true||f.email_domain_matches!==true||!(emailHost===f.domain||emailHost.endsWith('.'+f.domain))||[...FREE].some(p=>emailHost===p||emailHost.endsWith('.'+p)))continue;
  try{if(parsePublicUrl('https://'+f.domain).host!==f.domain||parsePublicUrl(f.source_url).host!==f.domain)continue;}catch{continue;}
  const contact=fs.find(c=>['contact','published_email','public_contact_route'].includes(c.type)&&c.source_url===f.contact_source_url&&text(c.excerpt).toLowerCase().includes(email.email));
  const canonicalGap=fs.find(g=>g.type==='gap'&&g.gap_kind===KINDS[f.classification]&&g.domain===f.domain&&g.source_url===f.source_url&&g.observed_at===f.observed_at);
  if(!contact||!canonicalGap)continue;
  // Registrar names require their specific observed marker, never free text.
  const provider=f.parking_provider==='GoDaddy'&&f.markers?.includes('REGISTRAR_PARKING_TEMPLATE')?'GoDaddy':'';
  const observation=f.classification==='PARKED_DOMAIN'?'The domain tied to your business email currently lands on a parked'+(provider?' GoDaddy':'')+' page.':f.classification==='PLACEHOLDER_SITE'?'The domain tied to your business email currently shows an unfinished website page.':'The website destination tied to your business email currently fails to load a working page.';
  return {kind:KINDS[f.classification],classification:f.classification,domain:f.domain,provider,observation};
 }
 return null;
}
module.exports={KINDS,select};
