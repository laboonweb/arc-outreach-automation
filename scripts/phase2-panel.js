'use strict';
const inbox=require('./phase2-inbox');
const {ACTIONS,INPUTS,yes,stripMarkers,verifyToken,visibleHash}=require('./phase2-panel-controls');
function request(body,queue,rows,links,secret,now=Date.now()){
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!INPUTS.has(k)))throw new Error('PANEL_INPUT_NOT_ALLOWED');
 if(body.lifecycle!==undefined&&body.lifecycle!=='1')throw Error('PANEL_INVALID_CONTROL');
 for(const key of ['reviewer','evidence','copy_claims','due_at','followup_message'])if(body[key]!==undefined&&(typeof body[key]!=='string'||body[key].length>({reviewer:100,evidence:5000,copy_claims:10000,due_at:40,followup_message:10000}[key])))throw Error('PANEL_INVALID_TEXT');
 if(body.lifecycle==='1'&&body.due_at&&!/Z$|[+-]\d\d:\d\d$/.test(body.due_at))body={...body,due_at:body.due_at+'Z'};
 const id=Number(body.id);if(!Number.isSafeInteger(id)||id<=0)throw new Error('PANEL_RECORD_REQUIRED');
 if(!ACTIONS.includes(body.action)||!inbox.COMPLIANCE.has(body.compliance))throw new Error('PANEL_INVALID_CONTROL');
 inbox.mapping(queue,rows,links);
 const current=rows.find(r=>r.id===id),link=links.find(l=>l.inbox_id===id),backend=link&&queue.find(r=>r.queue_key===link.queue_key);
 if(!current||!link||!backend)throw new Error('INBOX_MAPPING_RECONCILIATION_REQUIRED');
 const claims=verifyToken(body.token,secret,now);
 if(claims.id!==id||claims.backend!==inbox.digest(backend)||claims.backend!==link.backend_hash||claims.visible!==visibleHash(current))throw new Error('INBOX_STALE');
 if(current.action&&current.action!=='NONE')throw new Error('PANEL_PENDING_TABLE_ACTION');
 const copy={};
 // Native HTML form submissions encode textarea newlines as CRLF. Restore
 // their LF representation before exact-copy and signature checks.
 for(const key of ['subject','draft','notes']){if(typeof body[key]!=='string')throw new Error('PANEL_INVALID_TEXT');copy[key]=body[key].replace(/\r\n/g,'\n');if(copy[key].length>(key==='subject'?300:key==='notes'?5000:10000))throw new Error('PANEL_INVALID_TEXT');}
 // The editor contains only the core email. Reconstruct the frozen tail before
 // the existing exact-content approval and provider hashes are evaluated.
 if(current.channel==='EMAIL'&&copy.draft.trim())copy.draft=require('./outreach-copy').finalEmail(copy.draft);
 for(const key of ['messaging_verified','sent_confirmed'])if(body[key]!==undefined&&!['on',true,false].includes(body[key]))throw new Error('PANEL_INVALID_CONTROL');
 const sent=yes(body.sent_confirmed),messaging=yes(body.messaging_verified);
 if(body.action==='MARK_SENT'&&(!sent||!['ZOHO_DRAFT_CREATED','MANUAL_SOCIAL_READY'].includes(current.send_status)))throw new Error(sent?'PANEL_INVALID_SEND_STATE':'MANUAL_SEND_CONFIRMATION_REQUIRED');
 let notes=stripMarkers(copy.notes);
 if(messaging&&current.channel!=='EMAIL')notes+="\nMESSAGING VERIFIED";
 if(sent&&body.action==='MARK_SENT')notes+="\nSENT MANUALLY";
 return {...current,action:body.action,subject:copy.subject,draft:copy.draft,notes:notes.trim(),compliance:body.compliance};
}
function process(body,research,queue,locks,rows,links,options,secret,now=new Date().toISOString()){
 try{
  if(options.operator_lifecycle_required&&body?.lifecycle!=='1')throw Error('OPERATOR_LIFECYCLE_REQUIRED');
  const input=request(body,queue,rows,links,secret,Date.parse(now));
  // The full ledger and protections remain visible to the existing engine.
  // Only this explicit operator command enters its normal Inbox review logic.
  const scoped=rows.map(row=>row.id===input.id?input:{...row,action:'NONE'});
  const result=body.lifecycle==='1'?require('./phase2-operator-lifecycle').process(input,body,research,queue,locks,rows,links,options,now):inbox.process(research,queue,locks,scoped,links,{...options,mode:'PRODUCTION',cap:'ALL',operator:'Briann'},now);
  if(result.writes.length>1)throw new Error('PANEL_SINGLE_RECORD_REQUIRED');
  return {...result,operator_input:input};
 }catch(e){
  const error={inbox_id:Number(body?.id)||0,error:e.message,...(e.failures?{failures:e.failures}:{})};
  const failed={summary:{reviewed:0,provider_calls:0,emails_sent:0,dms_sent:0},writes:[],errors:[error],feedback:[error]};
  // Persist authenticated failed verification outcomes without applying the rejected edit.
  if(body?.lifecycle==='1'&&body.reviewer)try{const input=request(body,queue,rows,links,secret,Date.parse(now)),link=links.find(l=>l.inbox_id===input.id),row=queue.find(r=>r.queue_key===link.queue_key),d=JSON.parse(row.payload);require('./phase2-operator-lifecycle').audit(d,'REJECTED_'+body.action,body.reviewer,now,JSON.parse(row.payload),{outcome:e.message});failed.writes=[{...row,payload:JSON.stringify(d),cas_payload:row.payload}];failed.operator_input={...rows.find(r=>r.id===input.id),action:'NONE'};}catch{}
  return failed;
 }
}

module.exports={...require('./phase2-panel-controls'),...require('./phase2-panel-view'),request,process};
