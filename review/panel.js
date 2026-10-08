'use strict';
const leads=Array.from(document.querySelectorAll('.lead'));
const statuses=new Set(['NEEDS_REVIEW','DRAFT_READY','DRAFT_READY_SEND_BLOCKED','MANUAL_SOCIAL_READY','ZOHO_DRAFT_CREATED','FOLLOW_UP_DUE','READY_TO_SEND']);
const filters=['status-filter','market-filter','channel-filter','search'].map(id=>document.getElementById(id));
let viewState={};try{viewState=JSON.parse(sessionStorage.getItem('arc-operator-view')||'{}');filters.forEach((f,i)=>{if(viewState.filters?.[i]!==undefined)f.value=viewState.filters[i];});}catch{}
function rememberView(){try{sessionStorage.setItem('arc-operator-view',JSON.stringify({filters:filters.map(f=>f.value),open:viewState.open}));}catch{}}
function filter(){
 const [status,market,channel,search]=filters.map(f=>f.value),query=search.toLowerCase().trim();let count=0;
 for(const lead of leads){const s=lead.dataset.status;lead.hidden=!((status==='ALL'||status==='ACTIONABLE'&&statuses.has(s)||status==='PRIORITY'&&['NEEDS_REVIEW','DRAFT_READY','DRAFT_READY_SEND_BLOCKED'].includes(s)||s===status)&&(market==='ALL'||lead.dataset.market===market)&&(channel==='ALL'||lead.dataset.channel===channel)&&lead.querySelector('strong').textContent.toLowerCase().includes(query));if(!lead.hidden)count++;}
 document.getElementById('record-count').textContent=count+(count===1?' record':' records');document.getElementById('empty').hidden=count!==0;
}
for(const f of filters)f.addEventListener('input',()=>{filter();rememberView();});filter();
for(const lead of leads){
 const heading=lead.querySelector('.lead-heading'),detail=lead.querySelector('.lead-detail');
 if(viewState.open===lead.dataset.id){heading.setAttribute('aria-expanded','true');detail.hidden=false;heading.querySelector('.expand').textContent='−';}
 heading.addEventListener('click',()=>{const open=heading.getAttribute('aria-expanded')!=='true';heading.setAttribute('aria-expanded',String(open));detail.hidden=!open;heading.querySelector('.expand').textContent=open?'−':'+';viewState.open=open?lead.dataset.id:null;rememberView();});
 const form=lead.querySelector('form'),error=lead.querySelector('.local-error');
 const evidence=lead.querySelector('.manual-evidence');
 for(const control of lead.querySelectorAll('[data-evidence-focus]'))control.addEventListener('click',()=>{evidence.open=true;evidence.querySelector('[data-evidence="type"]').value=control.dataset.evidenceFocus;evidence.querySelector('[data-evidence="excerpt"]').focus();});
 const claimList=lead.querySelector('.claim-list');
 function drawClaims(){claimList.replaceChildren();JSON.parse(form.elements.copy_claims.value).forEach((claim,index)=>{const item=document.createElement('li'),button=document.createElement('button');item.append(document.createTextNode(claim.statement+' '));button.type='button';button.textContent='Remove';button.disabled=lead.querySelector('[data-add-claim]').disabled;button.addEventListener('click',()=>{const claims=JSON.parse(form.elements.copy_claims.value);claims.splice(index,1);form.elements.copy_claims.value=JSON.stringify(claims);drawClaims();});item.append(button);claimList.append(item);});}
 if(claimList){drawClaims();lead.querySelector('[data-add-claim]').addEventListener('click',()=>{const statement=lead.querySelector('[data-claim="statement"]'),reference=lead.querySelector('[data-claim="evidence_id"]');if(!statement.value.trim()||!reference.value){error.textContent='Enter the exact factual statement and choose its recorded evidence.';error.hidden=false;return;}const claims=JSON.parse(form.elements.copy_claims.value);claims.push({statement:statement.value.trim(),evidence_id:reference.value});form.elements.copy_claims.value=JSON.stringify(claims);drawClaims();statement.value='';});}
 const approve=form.querySelector('button[value="APPROVE"]');
 function permissionReady(){const notes=form.elements.notes.value.replace(/\b(?:MESSAGING VERIFIED|SENT MANUALLY)\b/gi,'').trim(),compliance=form.elements.compliance.value;approve.disabled=approve.dataset.hardBlocked==='true'||compliance==='DO_NOT_CONTACT'||(lead.dataset.market==='Australia'?(compliance!=='SAFE_TO_CONTACT'||!notes):!['SAFE_TO_CONTACT','NOT_APPLICABLE'].includes(compliance))||(lead.dataset.channel!=='EMAIL'&&!form.elements.messaging_verified?.checked);}
 form.addEventListener('input',permissionReady);permissionReady();
 const useBasis=lead.querySelector('.use-compliance-basis');
 if(useBasis)useBasis.addEventListener('click',()=>{const notes=form.elements.notes,basis=useBasis.dataset.basis;if(!notes.value.includes(basis))notes.value=(notes.value.trim()+'\n\n'+basis).trim();permissionReady();notes.focus();});
 const suppression=lead.querySelector('.suppression-confirm');
 suppression.querySelector('.cancel-suppression').addEventListener('click',()=>{suppression.hidden=true;});
 suppression.querySelector('.confirm-suppression').addEventListener('click',()=>{form.dataset.suppressionConfirmed='true';form.requestSubmit(form.querySelector('button[value="DO_NOT_CONTACT"]'));});
 form.addEventListener('submit',event=>{
  const action=event.submitter?.value;let problem='';
  if(!action){event.preventDefault();return;}
  if(['SAVE_REEVALUATE','EDIT','CORRECT_CLASSIFICATION','SAVE_HISTORY_EVIDENCE'].includes(action)){
   const fields=Object.fromEntries(Array.from(evidence.querySelectorAll('[data-evidence]')).map(input=>[input.dataset.evidence,input.type==='checkbox'?input.checked:input.value]));
   if(fields.excerpt.trim()||fields.source_url.trim()){
    let observed_at='',fact_date='';try{observed_at=fields.observed_at?new Date(fields.observed_at+'Z').toISOString():'';fact_date=fields.fact_date?new Date(fields.fact_date+'T00:00:00Z').toISOString():observed_at;}catch{event.preventDefault();error.textContent='Enter a valid observation and fact date in UTC.';error.hidden=false;return;}
    const entry={type:fields.type,source_url:fields.source_url,excerpt:fields.excerpt,association_basis:fields.association_basis,observed_at,fact_date,verified:fields.verified};
    if(['contact','messaging','permission'].includes(fields.type)){entry.channel=fields.channel;entry.recipient=fields.recipient;}
    if(fields.type==='permission')entry.value=fields.permission;
    if(fields.type==='timezone')entry.value=fields.timezone;
    if(['gap','website_quality'].includes(fields.type)){if(fields.website_status)entry.website_status=fields.website_status;if(fields.parking_provider)entry.parking_provider=fields.parking_provider;}
    if(fields.supersedes)entry.supersedes=fields.supersedes;
    form.elements.evidence.value=JSON.stringify(entry);
   }else form.elements.evidence.value='';
  }else form.elements.evidence.value='';
  try{const encoded=form.elements.token.value.split('.')[0].replace(/-/g,'+').replace(/_/g,'/'),claims=JSON.parse(atob(encoded));if(claims.expires<=Date.now())problem='This review session expired. Refresh the panel and review this item again.';}catch{problem='Refresh the panel before submitting this review.';}
  if(action==='APPROVE'&&!problem){
   const notes=form.elements.notes.value.replace(/\b(?:MESSAGING VERIFIED|SENT MANUALLY)\b/gi,'').trim();
   if(lead.dataset.market==='Australia'&&form.elements.compliance.value!=='SAFE_TO_CONTACT')problem='Review contact permission and choose Safe to contact before approving.';
   else if(lead.dataset.market==='Australia'&&!notes)problem='Record the Australian contact permission basis in notes.';
   else if(lead.dataset.channel!=='EMAIL'&&!form.elements.messaging_verified.checked)problem='Verify the actual Message/contact option, then tick Messaging option verified.';
  }
  if(['MARK_SENT','MARK_FOLLOWUP_SENT'].includes(action)&&!form.elements.sent_confirmed.checked)problem='Confirm “I actually sent this message” only after the manual send.';
  if(problem){event.preventDefault();error.textContent=problem;error.hidden=false;error.scrollIntoView({block:'nearest',behavior:'instant'});return;}
  if(action==='DO_NOT_CONTACT'&&form.dataset.suppressionConfirmed!=='true'){event.preventDefault();suppression.hidden=false;return;}
  error.hidden=true;rememberView();event.submitter.textContent='Saving…';
 });
}
