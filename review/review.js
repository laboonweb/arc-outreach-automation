'use strict';
let data;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
async function load(){const response=await fetch('/api/queue');if(!response.ok)throw new Error('Queue unavailable');data=await response.json();render();}
async function action(d,action,review={}){try{const r=await fetch('/api/action',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':data.csrf},body:JSON.stringify({id:d.draft_key,action,review})});const body=await r.json();if(!r.ok)throw new Error(body.error);document.querySelector('#feedback').textContent='Recorded '+action+'. No message was sent.';await load();}catch(e){document.querySelector('#feedback').textContent=e.message;}}
function button(label,fn){const b=el('button',label);b.type='button';b.onclick=fn;return b;}
function render(){
 document.querySelector('#summary').textContent=`${data.summary.leads} records · ${data.summary.drafts} drafts · ${data.followups.length} follow-ups due · Manual email queue`;
 const filter=document.querySelector('#filter').value,queue=document.querySelector('#queue');queue.replaceChildren();
 const rows=filter==='FOLLOW_UP_DUE'?data.followups:data.rows.filter(d=>filter==='ALL'||(filter==='PARKED'?d.followups_parked||d.draft_status==='PARKED':d.draft_status===filter));
 if(!rows.length)queue.append(el('p','No records in this queue.'));
 for(const d of rows){const card=el('article');card.append(el('h2',d.business),el('p',`${d.routing} · ${d.channel} · ${d.draft_status}`,'meta'),el('p',`${d.commercial_quality} quality · ${d.research_confidence} confidence · ${d.compliance_status}`,'meta'));
  if(d.recipient){const a=el('a',d.recipient);a.href=d.channel==='EMAIL'?'mailto:'+d.recipient:d.recipient;a.target='_blank';a.rel='noopener noreferrer';card.append(a);}
  const dueText=d.followup_due_at||(d.source_state==='SENT'?'Historical date unavailable; no new initial touch':d.draft_body?'After a confirmed manual send':'Not scheduled');
  card.append(el('p',`Recommended: ${d.scheduled_local_time||'Not scheduled'} ${d.timezone}. Follow-up due: ${dueText}.`,'meta'));
  if(d.route_reason)card.append(el('p',d.route_reason,'reason'));
  if(d.queue==='FOLLOW_UP_DUE'){
   card.append(el('p',`Last contact: ${d.last_contact_at||'Unknown'}. Days since last contact: ${d.days_since_last_contact??'Unknown'}. Follow-ups recorded: ${d.followup_count}.`,'meta'));
   card.append(el('h3','Original subject / message'),el('p',d.original_subject||'No recorded subject'),el('pre',d.original_message||'Original message unavailable; review the source conversation.'));
   card.append(el('h3','Recommended follow-up draft'),el('pre',d.final_message||'No recommendation until the original conversation, contact date and route are verified.'));
   const history=el('details');history.append(el('summary','Previous conversation / history'),el('pre',d.conversation_history?.length?JSON.stringify(d.conversation_history,null,2):'No previous conversation text recorded.'));card.append(history);
  }else if(d.draft_body)card.append(el('h3',d.subject||'Manual message'),el('pre',d.draft_body));
  if(d.final_message||d.draft_body&&d.queue!=='FOLLOW_UP_DUE')card.append(button('Copy message',async()=>{await navigator.clipboard.writeText(d.final_message||d.draft_body);document.querySelector('#feedback').textContent='Message copied for manual use.';}));
  const detail=el('details');detail.append(el('summary','Evidence and written concept'));
  for(const f of JSON.parse(d.evidence_summary||'[]')){const p=el('p',`${f.type}: ${f.excerpt} `),a=el('a','Source');a.href=f.source_url;a.target='_blank';a.rel='noopener noreferrer';p.append(a,el('span',` · ${f.observed_at||f.fact_date}`));detail.append(p);}
  if(d.concept_plan)detail.append(el('p',d.concept_plan));card.append(detail);
  if(d.draft_status==='DRAFT_READY'){
   const checks=el('div',undefined,'checks');const review={};const reviewer=el('input');reviewer.type='text';reviewer.placeholder='Reviewer name';reviewer.setAttribute('aria-label','Reviewer name');checks.append(reviewer);
   for(const [key,label] of Object.entries({truthful:'Facts and specific friction checked',recipient_relevant:'Recipient route is relevant to this business message',consent_reviewed:'Consent and country requirements reviewed',suppression_checked:'Suppression and prior-contact history checked'})){const input=el('input');input.type='checkbox';input.onchange=()=>review[key]=input.checked;const l=el('label',label);l.prepend(input);checks.append(l);}
   const basis=el('input');basis.type='text';basis.placeholder='Compliance basis / evidence reference';basis.setAttribute('aria-label','Compliance basis');checks.append(basis,button('Approve for manual action',()=>action(d,'APPROVE',{...review,reviewer:reviewer.value,compliance_basis:basis.value})),button('Reject draft',()=>action(d,'REJECT')));card.append(checks);
  }
  if(d.provider_status)card.append(el('p',`Zoho draft: ${d.provider_status}${d.provider_draft_id?' · '+d.provider_draft_id:''}. Creating a draft records no send.`,'meta'));
  if(d.draft_status==='ZOHO_DRAFT_CREATED'&&d.review_status==='APPROVED')card.append(button('MARK_SENT',()=>{if(confirm('Confirm Briann has already sent this exact draft manually from Zoho. MARK_SENT records the current time and sends nothing.'))action(d,'MARK_SENT',{manual_send_confirmation:true});}));
  if(d.draft_status==='SENT'){
   card.append(button('REPLIED',()=>action(d,'REPLIED')),button('Record bounce/dead route',()=>action(d,'BOUNCED')));
  }
  if(d.queue==='FOLLOW_UP_DUE'){
   const sent=button('MARK_SENT',()=>{const reviewer=prompt('Reviewer name'),basis=prompt('Consent / compliance basis for this follow-up'),message=prompt('Exact follow-up message you already sent manually',d.final_message);if(reviewer&&basis&&message&&confirm('Confirm this follow-up was already sent manually and consent/compliance and conversation history were reviewed.'))action(d,'MARK_SENT',{step:d.step,reviewer,compliance_basis:basis,message,consent_reviewed:true,manual_send_confirmation:true});});sent.disabled=d.context_required;card.append(sent);
   if(d.draft_status!=='SENT')card.append(button('REPLIED',()=>action(d,'REPLIED')));
  }
  if(d.draft_status!=='DO_NOT_CONTACT')card.append(button('PARK',()=>{const reason=prompt('Reason to park (optional)');if(reason!==null)action(d,'PARK',{reason});}));
  if(!d.reply_status&&!d.route_invalid&&(d.sent_at||['SENT','FOLLOW_UP_DUE'].includes(d.source_state)))card.append(button('RESCHEDULE',()=>{const due_at=prompt('New future follow-up time, including timezone, e.g. 2026-10-20T10:00:00+08:00');if(due_at)action(d,'RESCHEDULE',{due_at});}));
  if(d.draft_status!=='DO_NOT_CONTACT')card.append(button('DO_NOT_CONTACT',()=>{if(confirm('Permanently suppress this lead and recipient in this queue?'))action(d,'DO_NOT_CONTACT');}));
  queue.append(card);
 }
}
document.querySelector('#filter').onchange=render;document.querySelector('#refresh').onclick=()=>load().catch(e=>document.querySelector('#feedback').textContent=e.message);load().catch(e=>document.querySelector('#feedback').textContent=e.message);
