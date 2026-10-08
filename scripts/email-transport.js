'use strict';
const {TOOL,emailPayload,envelopeFor,connectionConfig,buildExecuteRequest}=require('./composio-zoho');
async function createEmailDraft(store,id,adapter=null){
 const current=store.approvedEmail(id);
 if(!adapter)return {status:'MANUAL_EMAIL_QUEUE',draft:current,provider_called:false};
 if(adapter.tool!==TOOL||adapter.mode!=='CREATE_DRAFT_ONLY'||typeof adapter.createDraft!=='function')throw new Error('DRAFT_ONLY_ADAPTER_REQUIRED');
 const draft=store.claimProvider(id);
 try{
  // Never pass research/source/history/reviewer payloads to a provider.
  const result=await adapter.createDraft(emailPayload(draft));
  if(typeof result?.draft_id!=='string'||!result.draft_id.trim())throw new Error('AMBIGUOUS_DRAFT_RESULT');
  store.providerResult(id,'ZOHO_DRAFT_CREATED',result.draft_id);
  return {status:'ZOHO_DRAFT_CREATED',draft_id:result.draft_id,provider_called:true,sent:false};
 }catch(error){store.providerResult(id,'UNKNOWN_PROVIDER_RESULT');throw new Error('UNKNOWN_PROVIDER_RESULT: reconcile provider drafts before retrying');}
}
function prepareManualDraft(store,id,config,now=new Date().toISOString()){
 connectionConfig(config);
 buildExecuteRequest(emailPayload(store.approvedEmail(id)),config);
 const d=store.claimProvider(id,now);return envelopeFor(d,config,now);
}
function recordManualReceipt(store,id,receipt,now=new Date().toISOString()){
 const d=store.get(id),claim=store.providerStatus(id);
 if(!claim||receipt?.draft_key!==id||receipt.message_hash!==d.approved_hash||receipt.claimed_at!==claim.at||receipt.tool!==TOOL||receipt.sent!==false)throw new Error('PROVIDER_RECEIPT_ASSOCIATION_REQUIRED');
 if(receipt.status==='ZOHO_DRAFT_CREATED')return store.providerResult(id,'ZOHO_DRAFT_CREATED',receipt.draft_id,now);
 store.providerResult(id,'UNKNOWN_PROVIDER_RESULT','',now);throw new Error('UNKNOWN_PROVIDER_RESULT: reconcile provider drafts before retrying');
}
module.exports={TOOL,createEmailDraft,prepareManualDraft,recordManualReceipt};
