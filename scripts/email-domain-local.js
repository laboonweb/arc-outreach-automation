'use strict';
// Optional bounded local regression adapter; routine research uses native Cloud HTTP.
const domain=require('./email-domain'),{safeGet}=require('./safe-http');
async function inspect(candidate,config={},now=new Date().toISOString(),cache=[]){
 const s=domain.start(candidate,config,now,cache);
 for(;;){domain.next(s);if(!s.pending)return s.result;let response;try{response=await safeGet(s.pending.url);}catch(e){response={error:{code:e.code||'',message:e.message}};}domain.consume(s,response);}
}
module.exports={inspect};
