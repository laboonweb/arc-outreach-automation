'use strict';
// Shared evidence policy; no fetching, page parsing or domain discovery.
const VERSION='email-domain-1.0.0';
const STATES=['ACTIVE_SITE','PARKED_DOMAIN','PLACEHOLDER_SITE','BROKEN_DESTINATION','ACTIVE_REDIRECT','UNRELATED_REDIRECT','ACCESS_BLOCKED','UNKNOWN'];
const LIMITS={requests:6,redirects:3,sample:32768,cache:100};
const FREE=new Set(('gmail.com googlemail.com yahoo.com yahoo.com.au yahoo.co.uk yahoo.co.jp yahoo.com.ph ymail.com rocketmail.com hotmail.com hotmail.co.uk hotmail.com.au outlook.com outlook.com.au live.com live.com.au live.co.uk msn.com icloud.com me.com mac.com proton.me protonmail.com pm.me aol.com aim.com gmx.com gmx.net gmx.de mail.com email.com consultant.com accountant.com engineer.com usa.com fastmail.com fastmail.fm hey.com tutanota.com tuta.com tutamail.com zoho.com zohomail.com mail.ru inbox.ru bk.ru list.ru rambler.ru yandex.com yandex.ru qq.com 163.com 126.com foxmail.com rediffmail.com hushmail.com iinet.net.au optusnet.com.au bigpond.com bigpond.net.au internode.on.net westnet.com.au tpg.com.au').split(' '));
function ttl(o){return ['PARKED_DOMAIN','PLACEHOLDER_SITE'].includes(o.classification)?72:['ACTIVE_SITE','ACTIVE_REDIRECT'].includes(o.classification)?24:o.classification==='BROKEN_DESTINATION'?6:1;}
function reusable(o,now){const age=Date.parse(now)-Date.parse(o?.observed_at);return !!o&&o.version===VERSION&&STATES.includes(o.classification)&&Number.isFinite(age)&&age>=0&&age<=ttl(o)*3600000;}
module.exports={VERSION,STATES,LIMITS,FREE,ttl,reusable};
