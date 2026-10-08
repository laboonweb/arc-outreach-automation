'use strict';
const controls=require('./phase2-panel-controls');
function read(body,secret,now=Date.now()){
 try{controls.verifyToken(body?.token,secret,now);return {request:{method:'POST',body}};}
 catch(error){
  // A configuration fault must still stop execution. Invalid signatures and
  // expired sessions take the data-free response branch, never the ledger reads.
  if(error.message!=='PANEL_REQUEST_EXPIRED')throw error;
  return {request:{rejected:true,error:'PANEL_REQUEST_EXPIRED'}};
 }
}
function rejection(readUrl){
 return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Review session expired</title><main><h1>Review session expired</h1><p>This review session is invalid or expired. No changes were saved.</p><p><a href="'+controls.escape(readUrl)+'">Refresh the panel and review the item again</a></p></main></html>';
}
module.exports={read,rejection};
