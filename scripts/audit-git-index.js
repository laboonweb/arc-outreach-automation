'use strict';
// Offline Git guard. Reads staged/committed blobs, never contacts n8n or a provider.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const git=args=>execFileSync('git',args,{encoding:'utf8',maxBuffer:16*1024*1024});
const root=git(['rev-parse','--show-toplevel']).trim(),revision=process.argv[2];
if(revision&&!/^[A-Za-z0-9_./-]+$/.test(revision))throw Error('INVALID_REVISION');
const files=(revision?git(['ls-tree','-r','--name-only','-z',revision]):git(['ls-files','-z'])).split('\0').filter(Boolean);
if(!files.length)throw Error('EMPTY_GIT_SELECTION');
const privateDir=path.join(root,'private/git-version-control');
function local(name,fallback){const file=path.join(privateDir,name);return fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):fallback;}
const lead=local('private-lead-denylist.json',{names:[],emails:[]}),secrets=local('private-secret-denylist.json',{values:[]}),findings=[];
const exceptions=JSON.parse(execFileSync('git',['show',revision?revision+':.github/git-audit-exceptions.json':':.github/git-audit-exceptions.json'],{encoding:'utf8'})),reviewed=[];
function add(file,text,at,kind){const line=text.slice(0,at).split('\n').length,lineHash=crypto.createHash('sha256').update(text.split('\n')[line-1]).digest('hex');
 const allowed=['literal_authorization','high_entropy_literal_review','credential_literal','credential_url'].includes(kind)&&exceptions.find(x=>x.file===file&&x.kind===kind&&x.line_sha256===lineHash);
 if(allowed)reviewed.push({file,line,kind,reason:allowed.reason});else findings.push({file,line,kind});}
const rules=[
 ['private_key',/-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/g],
 ['github_token',/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/g],
 ['google_api_key',/\bAIza[A-Za-z0-9_-]{30,}\b/g],
 ['aws_access_key',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
 ['provider_api_key',/\b(?:sk-(?:proj-|ant-)?[A-Za-z0-9_-]{24,}|xox[baprs]-[A-Za-z0-9-]{20,})\b/g],
 ['jwt',/\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}\b/g],
 ['literal_authorization',/\b(?:Bearer|Basic)\s+[A-Za-z0-9+/_=-]{16,}/g],
 ['credential_url',/https?:\/\/[^\s/:'"<>]+:[^\s/@'"<>]+@/g]
];
const forbidden=/(^|\/)(private|outputs|workflows|node_modules)(\/|$)|(^|\/)(datasets|n8n-workflows)\.json$|(^|\/)\.mcp\.json$|(^|\/)(?:credentials[^/]*|\.env(?:\..*)?)$|\.(?:pem|key|p12|pfx|sqlite(?:3)?|db|xlsx?|zip|log|bak|before)$|\.sdk\.js$|(^|\/)\.github\/workflows\//i;
const manifest=[];
for(const file of files){
 const bytes=execFileSync('git',['show',revision?revision+':'+file:':'+file],{maxBuffer:16*1024*1024}),text=bytes.toString('utf8');
 manifest.push({file,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
 if(file!=='.env.example'&&forbidden.test(file))add(file,text,0,'forbidden_artifact');
 if(bytes.includes(0)||bytes.length>512*1024)add(file,text,0,'binary_or_oversized_file');
 // Pattern definitions and private workbook deny rules are scanner source, not values.
 if(file!=='scripts/audit-git-index.js')for(const[kind,pattern]of rules)for(const m of text.matchAll(pattern))add(file,text,m.index,kind);
 const assigned=/\b(?:signing_secret|signingSecret|api_?key|access_token|refresh_token|client_secret|password|secret)\s*[:=]\s*['"]([^'"\r\n]{12,})['"]/gi;
 for(const m of text.matchAll(assigned))if(!/^(?:synthetic|fixture|test|wording-validation|demo|example|invalid|wrong|not-a)/i.test(m[1])&&!/fixture|synthetic/i.test(m[1]))add(file,text,m.index,'credential_literal');
 // Review high-entropy literals even if their variable name does not identify a secret.
 for(const m of text.matchAll(/['"]([A-Za-z0-9_+\/=.-]{32,})['"]/g)){
  const value=m[1];if(/^[a-f0-9]{40}$|^[a-f0-9]{64}$/i.test(value)||/^arc_[a-f0-9]{64}$/.test(value)||/[_./-](?:REQUIRED|INVALID|CHANGED|BLOCKED|MISSING|CONFIRMED|PROTECTED|VERIFIED|UNRESOLVED)/.test(value)||/^[A-Z_]+$/.test(value)||value.includes('example')||value.includes('fixture')||value.includes('synthetic'))continue;
  const counts={};for(const c of value)counts[c]=(counts[c]||0)+1;const entropy=Object.values(counts).reduce((n,c)=>n-(c/value.length)*Math.log2(c/value.length),0);
  if(entropy>=4.5)add(file,text,m.index,'high_entropy_literal_review');
 }
 for(const value of secrets.values){const at=text.indexOf(value);if(at>=0)add(file,text,at,'private_secret_match');}
 for(const value of lead.emails){const at=text.toLowerCase().indexOf(value.toLowerCase());if(at>=0)add(file,text,at,'private_lead_email_match');}
 for(const value of lead.workbookIds||[]){const at=text.indexOf(value);if(at>=0)add(file,text,at,'live_workbook_id');}
 // Only unchanged reviewed public suffix data can waive a short-name collision.
 const publicSuffix=exceptions.find(x=>x.file===file&&x.kind==='public_suffix_short_name_collision'&&x.file_sha256===manifest[manifest.length-1].sha256);
 for(const value of lead.names){const at=text.toLowerCase().indexOf(value.toLowerCase());if(at>=0&&!(publicSuffix&&value.length<=4))add(file,text,at,'private_lead_name_match');}
 if(file==='.env.example')for(const m of text.matchAll(/^(?![ \t]*#)[A-Z][A-Z0-9_]*[ \t]*=[ \t]*(\S.*)$/gm))add(file,text,m.index,'populated_environment_example');
}
const report={mode:revision?'committed':'staged',revision:revision||null,files:files.length,bytes:manifest.reduce((n,f)=>n+f.bytes,0),privateComparisonAvailable:secrets.values.length>0&&lead.names.length>0,findings,reviewed,manifest};
if(fs.existsSync(privateDir))fs.writeFileSync(path.join(privateDir,revision?'committed-audit.json':'staged-audit.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({mode:report.mode,files:report.files,bytes:report.bytes,privateComparisonAvailable:report.privateComparisonAvailable,reviewedExceptions:reviewed.length,findings},null,2));
if(!report.privateComparisonAvailable)console.warn('Private deny lists unavailable: pattern checks alone do not replace manual privacy review.');
if(findings.length)process.exitCode=1;
