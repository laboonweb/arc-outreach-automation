'use strict';
// Local equivalent of n8n's native public HTTP request. No OAuth headers or redirects.
const https=require('node:https');
const {PROVIDER_URL,decodeProvider,documents,providerRequest}=require('./discovery-engine');
async function exaTransport(request){
 if(request.url!==PROVIDER_URL)throw Error('DISCOVERY_PROVIDER_NOT_ALLOWED');
 return new Promise((resolve,reject)=>{
  const req=https.request(PROVIDER_URL,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2024-11-05'}},res=>{
   const chunks=[];let size=0;
   res.on('data',chunk=>{size+=chunk.length;if(size>500000)req.destroy(Error('DISCOVERY_RESPONSE_TOO_LARGE'));else chunks.push(chunk);});
   res.on('error',reject);res.on('end',()=>resolve({statusCode:res.statusCode,body:Buffer.concat(chunks).toString('utf8')}));
  });
  const timer=setTimeout(()=>req.destroy(Error('DISCOVERY_TIMEOUT')),25000);req.on('close',()=>clearTimeout(timer));req.on('error',reject);req.end(JSON.stringify(request.body));
 });
}
if(require.main===module&&process.argv.includes('--schema-probe')){
 exaTransport({url:PROVIDER_URL,body:providerRequest('web_fetch_exa',{urls:['https://nodejs.org/en/about'],maxCharacters:1400},1)})
  .then(raw=>console.log(JSON.stringify({status:raw.statusCode,payload:decodeProvider(raw),documents:documents(decodeProvider(raw)).length}))).catch(e=>{console.error(e.message);process.exitCode=1;});
}
module.exports={exaTransport};
