'use strict';
const fs=require('node:fs');const path=require('node:path');
const {DraftStore}=require('./draft-store');const {prepareManualDraft,recordManualReceipt}=require('./email-transport');
const {payloadCode}=require('./build-zoho-draft-workflow');
function run(action,id,file,dbFile='private/phase2/draft-queue.sqlite'){
 if(!id||!file)throw new Error('EXPLICIT_DRAFT_KEY_AND_PRIVATE_FILE_REQUIRED');
 const resolved=path.resolve(file),privateRoot=path.resolve('private/phase2');if(!resolved.startsWith(privateRoot+path.sep))throw new Error('PRIVATE_FILE_REQUIRED');
 const store=new DraftStore(dbFile);
 try{
  if(action==='prepare'){
   const envelope=prepareManualDraft(store,id,JSON.parse(fs.readFileSync(resolved,'utf8')));
   const output=path.join(privateRoot,'composio','armed-node.json');fs.mkdirSync(path.dirname(output),{recursive:true});
   try{fs.writeFileSync(output,JSON.stringify({mode:'runOnceForAllItems',jsCode:payloadCode(envelope)}));}
   catch{store.providerResult(id,'UNKNOWN_PROVIDER_RESULT');throw new Error('HANDOFF_WRITE_FAILED_RECONCILIATION_REQUIRED');}
   return {status:'CLAIMED',parameters_file:output,draft_key:id,provider_called:false};
  }
  if(action==='record'){
   const receipt=JSON.parse(fs.readFileSync(resolved,'utf8'));const d=recordManualReceipt(store,id,receipt);
   return {status:d.draft_status,provider_draft_id:d.provider_draft_id,sent:d.draft_status==='SENT',sent_at:d.sent_at,followup_due_at:d.followup_due_at,reply_status:d.reply_status};
  }
  if(action==='unknown'){store.providerResult(id,'UNKNOWN_PROVIDER_RESULT');return {status:'UNKNOWN_PROVIDER_RESULT',retry_allowed:false};}
  throw new Error('UNKNOWN_CONTROL_ACTION');
 }finally{store.close();}
}
if(require.main===module){try{console.log(JSON.stringify(run(...process.argv.slice(2))));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={run};
