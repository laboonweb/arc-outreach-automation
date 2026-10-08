'use strict';
// Credential references live on native n8n HTTP nodes, never in this module.
const {text,parsePublicUrl}=require('./helpers');
const ENDPOINTS={EXA:{SEARCH:'https://api.exa.ai/search',FETCH:'https://api.exa.ai/contents'},TAVILY:{SEARCH:'https://api.tavily.com/search',FETCH:'https://api.tavily.com/extract'}};
function exaDirectory(value){try{const u=parsePublicUrl(value);return /(^|\.)exa\.ai$/i.test(u.host)&&/^\/(?:library|directory)(?:\/|$)/i.test(u.path);}catch{return false;}}
function request(provider,kind,value){
 if(provider==='TAVILY'&&kind==='FETCH'&&exaDirectory(value))throw Error('PROVIDER_UNSUPPORTED_FETCH_URL');
 const url=ENDPOINTS[provider]?.[kind];if(!url)throw Error('RESEARCH_PROVIDER_NOT_ALLOWED');
 const contents={text:{maxCharacters:12000},highlights:true,extras:{links:20}};
 const body=provider==='EXA'?(kind==='SEARCH'?{query:text(value).slice(0,400),type:'auto',numResults:6,contents}:{ids:[value],...contents}):
  kind==='SEARCH'?{query:text(value).slice(0,400),search_depth:'basic',max_results:6,include_raw_content:'markdown',include_answer:false,auto_parameters:false,include_usage:true}:
  {urls:[value],extract_depth:'basic',format:'markdown',include_usage:true};
 return {provider,kind,method:'POST',url,body,...(kind==='FETCH'?{target_url:value}:{})};
}
function decode(raw,provider){
 if(raw.error)throw Error('PROVIDER_NETWORK_ERROR');
 if(Number(raw.statusCode)<200||Number(raw.statusCode)>=300)throw Error('PROVIDER_HTTP_'+raw.statusCode);
 let body=raw.body??raw;if(typeof body==='string'){try{body=JSON.parse(body);}catch{throw Error('PROVIDER_INVALID_JSON');}}
 if(!body||typeof body!=='object'||body.error)throw Error('PROVIDER_INVALID_RESPONSE');
 return {documents:(Array.isArray(body.results)?body.results:[]).slice(0,6).map(d=>({url:d.url,title:text(d.title).slice(0,200),text:text(d.raw_content||d.text||d.content||(Array.isArray(d.highlights)?d.highlights.join('\n'):'' )).slice(0,18000),links:(d.extras?.links||[]).slice(0,30),publishedDate:d.publishedDate||d.published_date||'',provider})),
  cost_dollars:Number.isFinite(body.costDollars?.total)?body.costDollars.total:null,credits:Number.isFinite(body.usage?.credits)?body.usage.credits:null};
}
module.exports={ENDPOINTS,request,decode,exaDirectory};
