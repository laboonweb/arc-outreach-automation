'use strict';
const {text,norm}=require('./helpers');
const evidence=require('./phase2-operator-evidence');
const CTAS=[...require('./outreach-human').CTAS,'Would you like to see a concept?','Would it be alright if I put one together and send it over in the next couple of days?','Worth showing you?','Would you like to discuss this?'].sort((a,b)=>b.length-a.length);
const sentences=s=>s.split(/(?<=[.!?])\s+|\n+/).map(text).filter(Boolean);
const observation=s=>norm(s).replace(/^(?:i noticed|i saw)\s+/,'').replace(/[.!?]$/,'');
function parked(statement,e){
 const s=observation(statement),match=/^(?:the|your) domain tied to your business email(?:,? ([a-z0-9.-]+),?)? currently lands on a parked( godaddy)? page$/.exec(s);
 if(!match)return /\b(?:parked|parking|godaddy)\b/.test(s)?false:null;
 return e.verified_business_domains.some(d=>d.status==='PARKED'&&d.email_domain_matches&&!require('./email-domain-policy').FREE.has(d.host)&&(!match[1]||match[1]===d.host)&&(!match[2]||d.parking_provider==='GoDaddy'));
}
function validate(d,source,now){
 const copy=require('./outreach-copy'),h=require('./research-history'),content=require('./outreach-content'),body=copy.core(d.draft_body),fs=h.currentFacts(source,now),e={...content.evidence(source,fs),business_name:d.business};
 // Scan every byte for links, metadata, contact leaks and punctuation. The
 // verbatim check below exempts only a bounded, matched operator statement.
 const issues=copy.leakage(d.subject,body,[],e);
 if(!body)issues.push('DRAFT_REQUIRED');if(copy.FORBIDDEN.test(body))issues.push('FORBIDDEN_CLAIM');
 if(d.channel==='EMAIL'){if(!text(d.subject)||d.subject.length>100||/[\r\n]/.test(d.subject))issues.push('EMAIL_SUBJECT_REQUIRED');if(!norm(d.subject).includes(norm(d.business)))issues.push('BUSINESS_SPECIFIC_SUBJECT_REQUIRED');try{require('./composio-zoho').assertSignature(d.draft_body);}catch{issues.push('EXACT_SIGNATURE_AND_FOOTER_REQUIRED');}}
 else if(d.subject||d.draft_body.includes(copy.SIGNATURE))issues.push('SOCIAL_SUBJECT_NOT_ALLOWED');
 if(!norm(body).includes(norm(d.business)))issues.push('BUSINESS_CONTEXT_REQUIRED');
 if(body.split(/\s+/).length<20||body.split(/\s+/).length>250)issues.push('DRAFT_LENGTH');
 const pieces=sentences(body.replace('Hi '+d.business+' team,','').replace('Briann here from Arc Web Works.','')),rawPieces=sentences(body);
 const claims=d.operator_workspace?.copy_claims||[];let used=0;
 for(const claim of claims){const f=fs.find(f=>h.identity(f)===claim.evidence_id),statement=text(claim.statement),supported=observation(statement);
  if(!f||!['identity','activity','website_quality','association','gap','opportunity','service','proof','review'].includes(f.type)||statement.length<8||statement.length>160||statement.split(/\s+/).length<3||!supported||!observation(f.excerpt).includes(supported)||evidence.UNCERTAIN.test(f.excerpt)){issues.push('OPERATOR_COPY_CLAIM_UNSUPPORTED');continue;}
  const preceding=observation(f.excerpt).slice(0,observation(f.excerpt).indexOf(supported)).slice(-40);
  if(/\b(?:no|not|without|never|doesn't|don't)\b/i.test(preceding)){issues.push('OPERATOR_COPY_CLAIM_UNSUPPORTED');continue;}
  if(parked(statement,e)===false){issues.push('BUSINESS_DOMAIN_CLAIM_NOT_VERIFIED');continue;}
  const index=pieces.findIndex(s=>observation(s)===supported);
  if(index>=0){const matched=pieces.splice(index,1)[0];used++;
   if(f.source_type==='OPERATOR_RECORDED'&&f.verification==='HUMAN_REVIEWED_INPUT'){const rawIndex=rawPieces.findIndex(s=>s===matched);if(rawIndex>=0)rawPieces.splice(rawIndex,1);}
  }
 }
 issues.push(...copy.leakage(d.subject,rawPieces.join('\n'),fs,e));
 if(!used)issues.push('OPERATOR_COPY_CLAIM_REQUIRED');
 let remaining=pieces.join('\n');for(const cta of CTAS)remaining=remaining.replace(sentences(cta).join('\n'),'');
 let proposal=false;const corpus=norm(fs.filter(f=>!evidence.UNCERTAIN.test(f.excerpt)&&!/not offered|do not offer|no longer offer/i.test(f.excerpt)).map(f=>f.excerpt).join(' '));
 if(/\b(?:feedback|reviews?|testimonials?)\b/i.test(body)&&!fs.some(evidence.customerProof))issues.push('UNSUPPORTED_PROOF_CONTEXT');
 for(const sentence of remaining.split(/(?<=[.!?])\s+|\n+/).map(text).filter(Boolean)){
  if(/^(?:Thanks|Thank you)\.$/.test(sentence))continue;
  if(!/^(?:I could|I would|I'd|A website could|A dedicated site could)\b/.test(sentence)||/\b(?:currently|already|always|every|best|most|only|you have|you offer|you are|your customers|because|today|now|still)\b|\d/i.test(sentence)){issues.push('UNSUPPORTED_ASSERTION');continue;}
  const services=sentence.toLowerCase().match(/\b(?:plumbing|dental|migration|immigration|automotive|vehicle|kitchen|cabinetry|pool|driving|lesson|venue|restaurant|menu|food|medical|legal|insurance|mortgage|pricing|calendar)\b/g)||[];
  if(services.some(s=>!corpus.includes(s)))issues.push('UNSUPPORTED_SERVICE');
  if(/\b(?:site|website|page)\b/.test(sentence)&&/enquir|contact|request|form/.test(sentence))proposal=true;
 }
 if(!proposal)issues.push('WEBSITE_MECHANISM_REQUIRED');if(!CTAS.some(x=>body.includes(x)))issues.push('OPERATOR_CTA_REQUIRED');
 return [...new Set(issues)];
}
module.exports={validate,CTAS};
