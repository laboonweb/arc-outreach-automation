'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {start}=require('../scripts/review-server'),{fixture}=require('../scripts/preview-outreach-operations');
test('review HTTP API records synthetic manual confirmations idempotently and rejects old bypass actions',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'arc-review-api-')),file=fixture(path.join(dir,'queue.sqlite')),port=14318,server=start({port,dbFile:file});await new Promise(resolve=>server.once('listening',resolve));t.after(async()=>{await new Promise(resolve=>server.close(resolve));if(!path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep))throw Error('UNSAFE_TEST_CLEANUP');fs.rmSync(dir,{recursive:true,force:true});});
 const base='http://127.0.0.1:'+port,queue=await (await fetch(base+'/api/queue')).json(),d=queue.rows.find(x=>x.draft_status==='ZOHO_DRAFT_CREATED');assert.equal(queue.followups.length,1);
 const post=async(action,review={})=>{const r=await fetch(base+'/api/action',{method:'POST',headers:{Origin:base,'X-CSRF-Token':queue.csrf,'Content-Type':'application/json'},body:JSON.stringify({id:d.draft_key,action,review})});return {status:r.status,json:await r.json()};};
 assert.equal((await post('SENT',{manual_send_confirmation:true})).json.error,'REVIEW_ACTION_NOT_ALLOWED');
 const first=await post('MARK_SENT',{manual_send_confirmation:true}),again=await post('MARK_SENT',{manual_send_confirmation:true});assert.equal(first.status,200);assert.deepEqual(again.json,first.json);assert.equal(first.json.draft_status,'SENT');assert.ok(first.json.followup_due_at);assert.equal(first.json.followup_count,0);
 await post('REPLIED');assert.equal((await (await fetch(base+'/api/queue')).json()).followups.length,1); // Only the other synthetic lead remains due.
 const denied=await fetch(base+'/api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:d.draft_key,action:'DO_NOT_CONTACT'})});assert.equal(denied.status,400);
});
