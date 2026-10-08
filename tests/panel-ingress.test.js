'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),ingress=require('../scripts/phase2-panel-ingress'),controls=require('../scripts/phase2-panel-controls');
const secret='synthetic-ingress-secret-'.repeat(3),now=Date.parse('2026-10-08T04:00:00Z');
test('valid signed ingress preserves the native form; expired and forged requests have no body or private reads',()=>{
 const token=controls.tokenFor({id:1},{backend_hash:'fixture'},secret,now),body={token,action:'SAVE_REEVALUATE',draft:'Private working copy'};
 assert.deepEqual(ingress.read(body,secret,now),{request:{method:'POST',body}});
 for(const input of [undefined,{}, {...body,token:'forged'},body]){
  const result=ingress.read(input,secret,input===body?now+1800000:now);
  assert.deepEqual(result,{request:{rejected:true,error:'PANEL_REQUEST_EXPIRED'}});assert.ok(!JSON.stringify(result).includes('Private working copy'));
 }
 assert.throws(()=>ingress.read(body,'short',now),/SIGNING_SECRET/);
});
test('safe ingress response contains only a refresh action, with no records, signed inputs or credentials',()=>{
 const html=ingress.rejection('https://example.org/review?x="<');assert.match(html,/No changes were saved/);assert.ok(html.includes('viewport'));assert.ok(html.includes('&quot;&lt;'));assert.ok(!html.includes('<form'));assert.ok(!html.includes('token'));assert.ok(!html.includes(secret));
});
