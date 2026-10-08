'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {SIGNATURE}=require('../scripts/outreach-mvp');
const z=require('../scripts/composio-zoho');
const body='Hi Fixture Industrial team,\n\nA factual paragraph.\nAnother line.\n\n'+SIGNATURE+'\n\n'+z.FOOTER;
function visibleText(html){return html.replace(/^<div[^>]*>/,'').replace(/<\/div>$/,'').replace(/<p[^>]*>/g,'').replace(/<\/p>/g,'\n\n').replace(/<br>/g,'\n').replace(/<a[^>]*>/g,'').replace(/<\/a>/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/\n\n$/,'');}
test('HTML draft preserves all reviewed visible text, signature, footer and normal paragraphs',()=>{
 const request=z.buildExecuteRequest({from:z.SENDER,to:'fixture@example.org',subject:'Fixture preview',body},{connected_account_id:'ca_fixture',account_id:'9007199254740993123'});
 assert.equal(request.arguments.mailFormat,'html');assert.equal(request.arguments.mode,'draft');
 const html=request.arguments.content;assert.equal(visibleText(html),body);
 assert.match(html,/font-family: Verdana, Arial, Helvetica, sans-serif;/);assert.match(html,/font-size: 10px;/);
 assert.match(html,/<p style="margin: 0 0 10px;">A factual paragraph\.<br>Another line\.<\/p>/);
 assert.equal(visibleText(html).split(SIGNATURE).length-1,1);
 assert.equal((html.match(/<a href="https:\/\/arcwebworks\.com">arcwebworks\.com<\/a>/g)||[]).length,1);
 assert.ok(html.indexOf(z.FOOTER)>html.indexOf('Founder, Arc Web Works'));
 assert.ok(visibleText(html).endsWith(SIGNATURE+'\n\n'+z.FOOTER));
 assert.ok(!/<(?:b|strong|img|button|style|script)\b|color:|font-weight:/i.test(html));
});
test('all dynamic business and evidence text is escaped, including existing entities and link attacks',()=>{
 const dynamic='A&B <img src=x onerror="alert(1)"> \'quoted\' &lt;script&gt; </p><a href="javascript:alert(1)">';
 const input=body.replace('Fixture Industrial',dynamic).replace('A factual paragraph.',dynamic);
 const html=z.renderDraftHtml(input);
 assert.equal(visibleText(html),input);
 for(const escaped of ['A&amp;B','&lt;img','&quot;alert(1)&quot;','&#39;quoted&#39;','&amp;lt;script&amp;gt;','&lt;/p&gt;&lt;a'])assert.ok(html.includes(escaped));
 assert.equal((html.match(/<a\b/g)||[]).length,1);assert.ok(!/<img\b|<script\b|<a href="javascript:/i.test(html));
});
test('HTML rendering rejects a duplicated or altered signature before any draft content is constructed',()=>{
 for(const changed of [body+'\n'+SIGNATURE,body.replace('Briann Arcala','Someone Else'),body.replace(z.FOOTER,'')])assert.throws(()=>z.renderDraftHtml(changed),/EXACT_SIGNATURE/);
});
