'use strict';
// Read-only, bounded exports outside n8n. Never follows redirects or retries.
const fs=require('node:fs'),path=require('node:path'),https=require('node:https'),zlib=require('node:zlib'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..'),DIR=path.join(ROOT,'private/operator-stage1'),MAX_BYTES=8*1024*1024,MAX_XML=16*1024*1024;
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
function members(bytes){
 let end=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(bytes.readUInt32LE(i)===0x06054b50){end=i;break;}
 if(end<0)throw Error('INTEGRITY_INVALID_ZIP');
 const count=bytes.readUInt16LE(end+10);let at=bytes.readUInt32LE(end+16),total=0;const entries=[];
 if(count>500)throw Error('INTEGRITY_TOO_MANY_MEMBERS');
 for(let i=0;i<count;i++){
  if(at+46>bytes.length||bytes.readUInt32LE(at)!==0x02014b50)throw Error('INTEGRITY_INVALID_DIRECTORY');
  const method=bytes.readUInt16LE(at+10),size=bytes.readUInt32LE(at+20),plain=bytes.readUInt32LE(at+24),nameSize=bytes.readUInt16LE(at+28),extra=bytes.readUInt16LE(at+30),comment=bytes.readUInt16LE(at+32),offset=bytes.readUInt32LE(at+42),name=bytes.subarray(at+46,at+46+nameSize).toString('utf8');at+=46+nameSize+extra+comment;
  if(!/^(?:xl\/|_rels\/|\[Content_Types\]\.xml)/.test(name))continue;
  if(plain>MAX_XML||(total+=plain)>32*1024*1024)throw Error('INTEGRITY_XML_LIMIT');
  if(offset+30>bytes.length||bytes.readUInt32LE(offset)!==0x04034b50)throw Error('INTEGRITY_INVALID_MEMBER');
  const start=offset+30+bytes.readUInt16LE(offset+26)+bytes.readUInt16LE(offset+28);if(start+size>bytes.length)throw Error('INTEGRITY_TRUNCATED_MEMBER');
  const compressed=bytes.subarray(start,start+size),data=method===0?compressed:method===8?zlib.inflateRawSync(compressed,{maxOutputLength:MAX_XML}):null;
  if(!data||data.length!==plain)throw Error('INTEGRITY_UNSUPPORTED_MEMBER');
  entries.push({name,bytes:data.length,sha256:hash(data)});
 }
 if(!entries.some(e=>/^xl\/worksheets\/sheet\d+\.xml$/.test(e.name))||!entries.some(e=>e.name==='xl/workbook.xml')||!entries.some(e=>e.name==='xl/styles.xml'))throw Error('INTEGRITY_REQUIRED_CONTENT_MISSING');
 entries.sort((a,b)=>a.name.localeCompare(b.name));return {content_sha256:hash(JSON.stringify(entries)),entries};
}
function download(url){return new Promise((resolve,reject)=>{
 const request=https.get(url,{timeout:30000},response=>{
  if(response.statusCode!==200){response.resume();reject(Error('INTEGRITY_HTTP_'+response.statusCode+'_NO_REDIRECT_OR_RETRY'));return;}
  if(Number(response.headers['content-length']||0)>MAX_BYTES){response.destroy();reject(Error('INTEGRITY_COMPRESSED_LIMIT'));return;}
  const chunks=[];let bytes=0;response.on('data',part=>{bytes+=part.length;if(bytes>MAX_BYTES){response.destroy(Error('INTEGRITY_COMPRESSED_LIMIT'));return;}chunks.push(part);});response.on('error',reject);response.on('end',()=>resolve(Buffer.concat(chunks)));
 });request.on('timeout',()=>request.destroy(Error('INTEGRITY_TIMEOUT_NO_RETRY')));request.on('error',reject);
});}
async function run(phase){
 if(!['before','after'].includes(phase))throw Error('INTEGRITY_PHASE_REQUIRED');
 const ledgerFile=path.join(DIR,'continuation-ledger.json'),output=path.join(DIR,'external-source-'+phase+'.json');
 if(fs.existsSync(output)||fs.existsSync(output+'.partial'))throw Error('INTEGRITY_BASELINE_ALREADY_EXISTS_OR_STOPPED');
 const ledger=JSON.parse(fs.readFileSync(ledgerFile));if(ledger.consumption.sheetsGets+3>ledger.caps.sheetsGets)throw Error('INTEGRITY_REQUEST_CAP');
 const baseline=phase==='after'?JSON.parse(fs.readFileSync(path.join(DIR,'external-source-before.json'))):null,books=require('./build-phase2-cloud').datasets(),results=[];
 for(const book of books){
  const url='https://docs.google.com/spreadsheets/d/'+book.spreadsheet_id+'/export?format=xlsx';
  ledger.consumption.sheetsGets++;ledger.integrityRequests||=[];const receipt={phase,dataset:book.dataset_id,at:new Date().toISOString(),status:'DISPATCHED'};ledger.integrityRequests.push(receipt);fs.writeFileSync(ledgerFile,JSON.stringify(ledger,null,2));
  try{
   const bytes=await download(url),contents=members(bytes),result={dataset:book.dataset_id,spreadsheet_id:book.spreadsheet_id,at:new Date().toISOString(),compressed_bytes:bytes.length,...contents};
   fs.writeFileSync(path.join(DIR,'external-source-'+phase+'-'+book.dataset_id+'.xlsx'),bytes);results.push(result);receipt.status='READ_AND_HASHED';receipt.bytes=bytes.length;
   if(baseline){const prior=baseline.books.find(x=>x.dataset===result.dataset);if(!prior||prior.content_sha256!==result.content_sha256)throw Error('SOURCE_CONTENT_CHANGED_STOP');}
   console.log(JSON.stringify({dataset:result.dataset,bytes:bytes.length,members:contents.entries.length,sha256:contents.content_sha256,unchanged:baseline?true:undefined}));
  }catch(error){receipt.status='FAILED_STOPPED';receipt.error=error.message;fs.writeFileSync(ledgerFile,JSON.stringify(ledger,null,2));fs.writeFileSync(output+'.partial',JSON.stringify({phase,books:results,error:error.message},null,2));throw error;}
  fs.writeFileSync(ledgerFile,JSON.stringify(ledger,null,2));
 }
 const result={phase,books:results,source_writes:0,arc_research_writes:0,cloud_executions:0,format:'All XLSX workbook/cell/formula/style/shared-string members; excludes volatile document properties.'};fs.writeFileSync(output,JSON.stringify(result,null,2));return result;
}
module.exports={members,download,run};if(require.main===module)run(process.argv[2]).catch(error=>{console.error(error.message);process.exitCode=1;});
