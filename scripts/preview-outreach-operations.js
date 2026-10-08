'use strict';
const fs=require('node:fs'),path=require('node:path');const {DraftStore}=require('./draft-store'),{buildDraft}=require('./outreach-mvp');
function fixture(file){
 fs.mkdirSync(path.dirname(file),{recursive:true});const s=new DraftStore(file),now='2026-09-21T02:00:00.000Z';
 for(const [i,name] of ['Synthetic unsent draft','Synthetic follow-up due'].entries()){
 const row={lead_id:'synthetic-operations-'+i,business_name:name,country:'Philippines',timezone:'Asia/Manila',business_status:'ACTIVE',commercial_quality:'HIGH',research_confidence:'HIGH',pain_verified:true,research_required:false,public_email:'fixture'+i+'@example.org',email_confidence:'HIGH',email_source_url:'https://example.org/',evidence_json:JSON.stringify(['activity','legitimacy','gap','business_case','contact'].map(type=>({type,source_url:'https://example.org/',observed_at:now,verification:'HUMAN_REVIEWED_INPUT',excerpt:type==='contact'?'fixture'+i+'@example.org':'Synthetic reviewed '+type+' evidence. Not a real lead.'})))};
 const d=buildDraft(row,now);if(s.all().some(x=>x.lead_id===row.lead_id))continue;s.import([d]);s.action(d.draft_key,'APPROVE',{reviewer:'Synthetic reviewer',truthful:true,recipient_relevant:true,consent_reviewed:true,suppression_checked:true,compliance_basis:'Synthetic fixture only'},now);s.claimProvider(d.draft_key,now);s.providerResult(d.draft_key,'ZOHO_DRAFT_CREATED','synthetic-provider-'+i,now);if(i)s.action(d.draft_key,'MARK_SENT',{manual_send_confirmation:true},now);
 }s.close();return file;
}
if(require.main===module){const file=fixture(path.resolve('private/phase2/operations/synthetic-review.sqlite'));require('./review-server').start({port:4320,dbFile:file});console.log('Synthetic operational review: http://127.0.0.1:4320. No real leads or provider calls.');}
module.exports={fixture};
