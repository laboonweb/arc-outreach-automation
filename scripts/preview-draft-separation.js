'use strict';
// Inspect the actual Cloud-rendered response with every write routed to a
// local HTTP 405. No credentials, production POST or approval are used.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const file=path.join(__dirname,'../private/draft-send-separation/panel-preview.html');
const server=http.createServer((req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Referrer-Policy','no-referrer');
 if(req.method!=='GET'||req.url!=='/'){res.writeHead(405);res.end('This validation preview is read-only.');return;}
 const html=fs.readFileSync(file,'utf8').replaceAll('action="https://briann.app.n8n.cloud/webhook/arc-outreach-review-action"','action="/action-disabled"').replaceAll('href="https://briann.app.n8n.cloud/webhook/arc-outreach-review"','href="/"').replace(/name="token" value="[^"]*"/g,'name="token" value="READ_ONLY_PREVIEW"');
 res.end(html);
});
server.listen(4372,'127.0.0.1',()=>console.log('Read-only preview: http://127.0.0.1:4372/'));
