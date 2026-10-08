'use strict';
const crypto=require('crypto');
const {sha256}=require('./helpers');
const FIELDS='business_name market channel contact subject draft why_this_lead compliance action notes send_status'.split(' ');
const userNotes=x=>String(x??'').split('\n').filter(line=>!line.startsWith('Inbox: ')).join('\n').trim();
const ACTIONS=['APPROVE','EDIT','REJECT','NEEDS_RESEARCH','DO_NOT_CONTACT','MARK_SENT','SAVE_REEVALUATE','REQUEST_REVIEW','REQUEST_ZOHO','REPLIED','RESCHEDULE','DISMISS_FOLLOWUP','MARK_FOLLOWUP_SENT','CORRECT_CLASSIFICATION','SAVE_HISTORY_EVIDENCE'];
const STATUSES=['NEEDS_REVIEW','DRAFT_READY','DRAFT_READY_SEND_BLOCKED','MANUAL_SOCIAL_READY','ZOHO_DRAFT_CREATED','FOLLOW_UP_DUE','SENT','NEEDS_RESEARCH','NEEDS_COPY','PROTECTED','REPLIED','PARKED'];
const ACTIONABLE=new Set(['NEEDS_REVIEW','DRAFT_READY','DRAFT_READY_SEND_BLOCKED','MANUAL_SOCIAL_READY','ZOHO_DRAFT_CREATED','FOLLOW_UP_DUE','READY_TO_SEND']);
const INPUTS=new Set(['id','token','action','subject','draft','notes','compliance','messaging_verified','sent_confirmed','lifecycle','reviewer','evidence','copy_claims','due_at','followup_message']);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=x=>JSON.parse(JSON.stringify(x));
const stripMarkers=notes=>userNotes(notes).replace(/\b(?:MESSAGING VERIFIED|SENT MANUALLY)\b/gi,'').replace(/\n{3,}/g,'\n\n').trim();
const visibleHash=row=>sha256(JSON.stringify(FIELDS.map(k=>row[k]||'')));
const yes=value=>value===true||value==='on';
function secretRequired(secret){if(typeof secret!=='string'||secret.length<48)throw new Error('PANEL_SIGNING_SECRET_REQUIRED');}
function sign(value,secret){secretRequired(secret);return crypto.createHmac('sha256',secret).update(value).digest('hex');}
function tokenFor(row,link,secret,now=Date.now()){
 const claims=JSON.stringify({id:row.id,backend:link.backend_hash,visible:visibleHash(row),expires:now+30*60*1000});
 return Buffer.from(claims).toString('base64url')+'.'+sign(claims,secret);
}
function verifyToken(token,secret,now=Date.now()){
 if(typeof token!=='string'||token.length>1500)throw new Error('PANEL_REQUEST_EXPIRED');
 const parts=token.split('.');if(parts.length!==2)throw new Error('PANEL_REQUEST_EXPIRED');
 let claims;try{claims=Buffer.from(parts[0],'base64url').toString('utf8');}catch{throw new Error('PANEL_REQUEST_EXPIRED');}
 const expected=sign(claims,secret);
 if(!/^[a-f0-9]{64}$/.test(parts[1])||!crypto.timingSafeEqual(Buffer.from(parts[1]),Buffer.from(expected)))throw new Error('PANEL_REQUEST_EXPIRED');
 let result;try{result=JSON.parse(claims);}catch{throw new Error('PANEL_REQUEST_EXPIRED');}
 if(!Number.isSafeInteger(result.id)||!Number.isFinite(result.expires)||result.expires<=now||result.expires>now+30*60*1000)throw new Error('PANEL_REQUEST_EXPIRED');
 return result;
}

module.exports={ACTIONS,STATUSES,ACTIONABLE,INPUTS,FIELDS,userNotes,escape,stripMarkers,visibleHash,yes,tokenFor,verifyToken};
