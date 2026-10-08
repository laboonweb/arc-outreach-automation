'use strict';
// Local rendering only: read-only ledger, no transport or provider adapter.
const fs=require('node:fs'),http=require('node:http'),{DatabaseSync}=require('node:sqlite');
const {renderDraftHtml,escapeHtml}=require('./composio-zoho');
const id=process.argv[2];if(!id)throw new Error('EXPLICIT_PREVIEW_DRAFT_REQUIRED');
const db=new DatabaseSync('private/phase2/draft-queue.sqlite',{readOnly:true});
const row=db.prepare('SELECT payload FROM drafts WHERE id=?').get(id);db.close();
if(!row)throw new Error('DRAFT_NOT_FOUND');
const d=JSON.parse(row.payload),fragment=renderDraftHtml(d.draft_body);
const page='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+escapeHtml(d.business)+' | Local HTML draft preview</title></head><body style="margin: 24px; max-width: 720px;">'+fragment+'</body></html>';
fs.writeFileSync('private/phase2/composio/draft-body.html',fragment+'\n');
fs.writeFileSync('private/phase2/composio/draft-preview.html',page+'\n');
console.log('Saved local HTML preview; no ledger changes or provider calls.');
if(process.argv.includes('--serve'))http.createServer((req,res)=>{
 res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
 if(req.method!=='GET'||!['127.0.0.1:4319','localhost:4319'].includes(req.headers.host)||!['/','/body.html'].includes(req.url)){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end(req.url==='/'?page:fragment);
}).listen(4319,'127.0.0.1',()=>console.log('Local preview: http://127.0.0.1:4319/'));
