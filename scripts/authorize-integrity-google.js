'use strict';
// Owner-operated system-browser OAuth; one explicitly approved integrity scope.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const http = require('node:http'), https = require('node:https'), { execFileSync } = require('node:child_process');
const integrity = require('./verify-source-integrity-streaming');
const { JsonStream, semanticHash } = require('./integrity-json-stream');
const { save } = require('./write-integrity-state');
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const PROJECT = 'arc-integrity-stage-1', AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN = 'https://oauth2.googleapis.com/token', MAX_TOKEN_RESPONSE = 65536;
const fail = code => { throw Error('INTEGRITY_OAUTH_' + code); };
const redacted = e => /^INTEGRITY_(?:OAUTH|EXTERNAL|STREAM)_[A-Z0-9_]{1,80}$/.test(e?.message || '') ? e.message : 'INTEGRITY_OAUTH_RUNTIME_STOP';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function validateClient(bytes) {
  if (bytes.length > 16384) fail('CLIENT_SIZE');
  let json; try { const parser = new JsonStream(); parser.write(bytes); parser.finish(); json = JSON.parse(bytes.toString('utf8')); } catch { fail('CLIENT_JSON'); }
  const c = json.installed;
  if (!c || json.web || c.project_id !== PROJECT || !/^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(c.client_id || '') || typeof c.client_secret !== 'string' || !/^[A-Za-z0-9_-]{16,256}$/.test(c.client_secret) || ![AUTH, 'https://accounts.google.com/o/oauth2/auth'].includes(c.auth_uri) || c.token_uri !== TOKEN || !Array.isArray(c.redirect_uris) || !c.redirect_uris.includes('http://localhost')) fail('DESKTOP_PROJECT_CLIENT_REQUIRED');
  return { client: c, client_sha256: sha(bytes), project: PROJECT };
}
function validateAcl(records) {
  if (!Array.isArray(records) || records.length !== 2) fail('ACL_RECORDS_SHAPE');
  for (const r of records) {
    if (!r.owner || r.owner !== r.current) fail('ACL_OWNER_MISMATCH');
    if (!Array.isArray(r.rules) || !r.rules.length || !r.rules.some(a => a.sid === r.owner && a.allow) || r.rules.some(a => a.allow && ![r.owner, 'S-1-5-18', 'S-1-5-32-544'].includes(a.sid))) fail('OWNER_ONLY_STORAGE_REQUIRED');
  }
}
function readClient(file) {
  if (process.platform !== 'win32' || fs.lstatSync(file).isSymbolicLink() || fs.lstatSync(path.dirname(file)).isSymbolicLink()) fail('OWNER_ONLY_STORAGE_REQUIRED');
  const script = "$ErrorActionPreference='Stop'; $current=[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value; $items=@($env:ARC_OAUTH_CLIENT_FILE,[IO.Path]::GetDirectoryName($env:ARC_OAUTH_CLIENT_FILE)); $out=@(foreach($item in $items){$a=if([IO.Directory]::Exists($item)){[IO.Directory]::GetAccessControl($item)}else{[IO.File]::GetAccessControl($item)}; [pscustomobject]@{owner=$a.GetOwner([System.Security.Principal.SecurityIdentifier]).Value;current=$current;rules=@($a.GetAccessRules($true,$true,[System.Security.Principal.SecurityIdentifier])|ForEach-Object{[pscustomobject]@{sid=$_.IdentityReference.Value;allow=($_.AccessControlType -eq 'Allow')}})}}); ConvertTo-Json -InputObject $out -Depth 5 -Compress";
  let records; try { records = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { encoding: 'utf8', windowsHide: true, timeout: 10000, maxBuffer: 16384, env: { ...process.env, ARC_OAUTH_CLIENT_FILE: file }, stdio: ['ignore', 'pipe', 'pipe'] })); } catch { fail('ACL_CHECK_STOP'); }
  validateAcl(records); return readClientBytes(file);
}
function readClientBytes(file) { return validateClient(fs.readFileSync(file)); }
function pkce() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  return { verifier, challenge: crypto.createHash('sha256').update(verifier).digest('base64url'), state: crypto.randomBytes(32).toString('base64url') };
}
function authUrl(client, redirect, p) {
  const u = new URL(AUTH);
  for (const [k, value] of Object.entries({ client_id: client.client_id, redirect_uri: redirect, response_type: 'code', scope: SCOPE, code_challenge: p.challenge, code_challenge_method: 'S256', state: p.state, access_type: 'online', prompt: 'consent select_account', include_granted_scopes: 'false' })) u.searchParams.set(k, value);
  return u.href;
}
function validateGrant(bytes) {
  let value; try { const p = new JsonStream(); p.write(bytes); p.finish(); value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { fail('TOKEN_RESPONSE_INVALID'); }
  if (value.scope !== SCOPE || value.token_type !== 'Bearer' || typeof value.access_token !== 'string' || !/^[A-Za-z0-9._~+\/-]{16,8192}$/.test(value.access_token) || !Number.isInteger(value.expires_in) || value.expires_in < 60 || value.expires_in > 7200) fail('GRANT_SCOPE_TYPE_OR_EXPIRY');
  // No refresh token, authorization code or token response is persisted or logged.
  return { token: value.access_token, scope: value.scope, expires_at: new Date(Date.now() + value.expires_in * 1000).toISOString(), refresh_token_discarded: typeof value.refresh_token === 'string' };
}
function exchangeCode(client, code, redirect, verifier, request = https.request) {
  const body = new URLSearchParams({ client_id: client.client_id, client_secret: client.client_secret, code, redirect_uri: redirect, code_verifier: verifier, grant_type: 'authorization_code' }).toString();
  return new Promise((resolve, reject) => {
    let done = false, timer;
    const stop = reason => { if (done) return; done = true; clearTimeout(timer); req.destroy(); reject(Error('INTEGRITY_OAUTH_' + reason)); };
    const req = request(TOKEN, { method: 'POST', rejectUnauthorized: true, headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body), 'Accept-Encoding': 'identity', Accept: 'application/json' } }, res => {
      if (res.statusCode !== 200) { res.destroy(); stop('TOKEN_HTTP_' + res.statusCode); return; }
      if (!/^application\/json(?:;|$)/i.test(res.headers['content-type'] || '') || !['', 'identity'].includes(res.headers['content-encoding'] || '')) { res.destroy(); stop('TOKEN_CONTENT_TYPE'); return; }
      const length = res.headers['content-length'];
      if (length !== undefined && (!/^\d+$/.test(String(length)) || Number(length) > MAX_TOKEN_RESPONSE)) { res.destroy(); stop('TOKEN_BODY_LIMIT'); return; }
      let bytes = 0; const chunks = [];
      res.on('data', chunk => { if (done) return; bytes += chunk.length; if (bytes > MAX_TOKEN_RESPONSE) { res.destroy(); stop('TOKEN_BODY_LIMIT'); } else chunks.push(chunk); });
      res.on('error', () => stop('TOKEN_TRANSPORT_STOP')); res.on('aborted', () => stop('TOKEN_TRUNCATED'));
      res.on('end', () => {
        if (done) return;
        if (res.complete === false || (length !== undefined && Number(length) !== bytes)) { stop('TOKEN_TRUNCATED'); return; }
        const buffer = Buffer.concat(chunks);
        try { const grant = validateGrant(buffer); done = true; clearTimeout(timer); resolve(grant); } catch (e) { done = true; clearTimeout(timer); reject(Error(redacted(e))); } finally { buffer.fill(0); for (const c of chunks) c.fill(0); }
      });
    });
    timer = setTimeout(() => stop('TOKEN_TIMEOUT_NO_RETRY'), 60000);
    req.on('error', () => stop('TOKEN_TRANSPORT_STOP')); req.end(body);
  });
}
async function authorize({ client, ready, exchange = exchangeCode, beforeExchange = () => {}, timeoutMs = 600000, phase = 'probe' }) {
  if (!['probe', 'before', 'after'].includes(phase)) fail('PHASE_APPROVAL_REQUIRED');
  const operation = phase === 'probe' ? 'One bounded integrity probe runs after consent, then stops.' : phase === 'before' ? 'One bounded probe must pass before the remaining 27 BEFORE reads run. The helper then stops before Cloud testing.' : 'Exactly 28 AFTER integrity reads compare the complete baseline, then the helper stops.';
  const p = pkce(), startPath = '/start/' + crypto.randomBytes(24).toString('hex');
  let server, timer, used = false, settled = false;
  return new Promise((resolve, reject) => {
    const finish = (e, grant) => { if (settled) return; settled = true; clearTimeout(timer); if (e) { server.close(); reject(Error(redacted(e))); } else { setTimeout(() => server.close(), 1000); resolve(grant); } };
    server = http.createServer(async (req, res) => {
      const port = server.address().port, host = '127.0.0.1:' + port, redirect = 'http://' + host;
      const send = (status, text) => { res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'" }); res.end(text); };
      if (req.method !== 'GET' || req.headers.host !== host || req.socket.remoteAddress !== '127.0.0.1' || req.headers.origin) { send(403, 'Local request refused.'); return; }
      if (req.url === startPath && !used) { send(200, '<h1>Arc Integrity Stage 1</h1><p>Choose your owner account. Approve only read-only Google Sheets access.</p><p><a rel="noreferrer" href="' + authUrl(client, redirect, p).replace(/&/g, '&amp;') + '">Continue to Google in this browser</a></p><p>' + operation + '</p>'); return; }
      if (req.url === '/complete') { send(200, '<p>Authorization returned to the local helper. Check Codex for the approved ' + phase + ' result. No Cloud execution, source write or provider call runs here.</p>'); return; }
      let u; try { u = new URL(req.url, redirect); } catch { send(400, 'Invalid callback.'); return; }
      if (u.pathname !== '/' || used) { send(404, 'Local page unavailable.'); return; }
      used = true;
      if (u.searchParams.getAll('state').length !== 1 || u.searchParams.get('state') !== p.state || u.searchParams.has('error') || u.searchParams.getAll('code').length !== 1 || !/^[A-Za-z0-9_./~-]{1,8192}$/.test(u.searchParams.get('code') || '')) { send(400, 'Authorization refused. Stop and report this message.'); finish(Error('INTEGRITY_OAUTH_CALLBACK_STOP')); return; }
      res.writeHead(303, { Location: '/complete', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }); res.end();
      try { beforeExchange(); const grant = await exchange(client, u.searchParams.get('code'), redirect, p.verifier); finish(null, grant); } catch (e) { finish(e); }
    });
    server.maxHeadersCount = 32; server.requestTimeout = 10000; server.headersTimeout = 10000;
    server.on('error', () => finish(Error('INTEGRITY_OAUTH_LOCAL_LISTENER_STOP')));
    server.listen(0, '127.0.0.1', () => { timer = setTimeout(() => finish(Error('INTEGRITY_OAUTH_OWNER_TIMEOUT_STOP')), timeoutMs); try { ready('http://127.0.0.1:' + server.address().port + startPath); } catch (e) { finish(e); } });
  });
}
function verifyTokenBudget(dir, approval) {
  const cap = approval.maxOAuthTokenPosts ?? 2;
  if (!Number.isInteger(cap) || cap < 1 || cap > 5) fail('TOKEN_POST_BUDGET_STOP');
  let count = 0;
  for (const name of fs.readdirSync(dir).filter(n => /^owner-(?:probe|before|after)-authorization(?:-[a-f0-9]{32})?\.json$/.test(n))) {
    const n = JSON.parse(fs.readFileSync(path.join(dir, name))).token_posts_dispatched;
    if (![0, 1].includes(n)) fail('TOKEN_POST_ACCOUNTING_STOP'); count += n;
  }
  if (count >= cap) fail('TOKEN_POST_BUDGET_STOP');
  return count;
}
async function runApprovedScope(options, phase) {
  if (phase === 'probe') return integrity.runProbe(options);
  if (!['before', 'after'].includes(phase) || options.approval.singleProbeOnly !== false || !Array.isArray(options.approval.allowedPhases) || !options.approval.allowedPhases.includes(phase)) fail('PHASE_APPROVAL_REQUIRED');
  integrity.verifyApproval(options.approval, integrity.manifest(options.books), JSON.parse(fs.readFileSync(path.join(options.dir, 'continuation-ledger.json'))), phase);
  if (phase === 'before') {
    if (options.approval.continueAfterValidatedProbe !== true) fail('PROBE_CONTINUATION_APPROVAL_REQUIRED');
    const probe = await integrity.runProbe(options);
    options.approval = { ...options.approval, liveProbeReviewedSha256: semanticHash(probe) };
    integrity.verifyProbe(probe, options.approval, integrity.manifest(options.books));
    save(path.join(options.dir, 'reviewed-probe-approval-' + options.approval.probeAttempt + '.json'), options.approval, true);
  } else {
    const reviewed = JSON.parse(fs.readFileSync(path.join(options.dir, 'reviewed-probe-approval-' + options.approval.probeAttempt + '.json')));
    if (reviewed.manifest_sha256 !== options.approval.manifest_sha256 || reviewed.probeAttempt !== options.approval.probeAttempt) fail('PROBE_REVIEW_CHANGED');
    options.approval = { ...options.approval, liveProbeReviewedSha256: reviewed.liveProbeReviewedSha256 };
  }
  return integrity.runPhase({ ...options, phase });
}
async function main(mode, attempt, requestedPhase) {
  if (!['--check', '--authorize-probe', '--authorize-phase'].includes(mode)) { console.log(JSON.stringify({ live_calls: 0, scope: SCOPE, modes: ['--check (offline client and ACL check)', '--authorize-probe (manual consent; one probe only)', '--authorize-phase <attempt> <before|after> (requires separate explicit phase approval)'] })); return; }
  const dir = path.resolve(__dirname, '../private/operator-stage1'), credentialDir = path.join(dir, 'google-oauth');
  const selected = readClient(path.join(credentialDir, 'credentials-google-desktop.json'));
  if (mode === '--check') { console.log(JSON.stringify({ ok: true, project: selected.project, desktop: true, owner_only_storage: true, client_sha256: selected.client_sha256, live_calls: 0 })); return; }
  const phase = mode === '--authorize-phase' ? requestedPhase : 'probe';
  if (!['probe', 'before', 'after'].includes(phase) || (mode === '--authorize-phase' && (!attempt || phase === 'probe'))) fail('PHASE_APPROVAL_REQUIRED');
  const books = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../config/datasets.json'))).datasets;
  if (attempt !== undefined && !/^[a-f0-9]{32}$/.test(attempt)) fail('PROBE_ATTEMPT_ID');
  const suffix = attempt ? '-' + attempt : '', approval = JSON.parse(fs.readFileSync(path.join(dir, 'external-stream-approval' + suffix + '.json'))), plan = integrity.manifest(books);
  if (approval.probeAttempt !== attempt) fail('PROBE_ATTEMPT_ID');
  if ((phase === 'probe' ? approval.singleProbeOnly !== true : approval.singleProbeOnly !== false || !Array.isArray(approval.allowedPhases) || !approval.allowedPhases.includes(phase) || (phase === 'before' && approval.continueAfterValidatedProbe !== true) || approval.authorizer_sha256 !== sha(fs.readFileSync(__filename))) || approval.preExecutionGates?.status !== 'VERIFIED_EXCEPT_OAUTH' || approval.preExecutionGates?.client_sha256 !== selected.client_sha256) fail('SELECTED_CLIENT_OR_SINGLE_PROBE_GATE');
  const ledgerFile = path.join(dir, 'continuation-ledger.json'), startingLedger = JSON.parse(fs.readFileSync(ledgerFile));
  integrity.verifyApproval(approval, plan, startingLedger, phase);
  // Validate non-OAuth prerequisites before consent; actual granted scope is checked at exchange.
  integrity.verifyPreconditions({ ...approval, preExecutionGates: { ...approval.preExecutionGates, status: 'VERIFIED', granted_scope: SCOPE } });
  if (fs.existsSync(path.join(dir, 'external-stream.lock')) || (phase !== 'after' && (fs.existsSync(integrity.probeFile(dir, approval)) || fs.existsSync(path.join(dir, 'external-stream-before-progress.json')))) || (phase === 'after' && fs.existsSync(path.join(dir, 'external-stream-after-progress.json')))) fail('EXISTING_PROBE_OR_LOCK_STOP');
  if (phase === 'after') integrity.verifyBefore(JSON.parse(fs.readFileSync(path.join(dir, 'external-stream-before.json'))), JSON.parse(fs.readFileSync(path.join(dir, 'external-stream-before-progress.json'))), plan);
  verifyTokenBudget(credentialDir, approval);
  const file = path.join(credentialDir, 'owner-' + phase + '-authorization' + suffix + '.json'), receipt = { status: 'WAITING_FOR_OWNER', phase, probe_attempt: attempt, client_sha256: selected.client_sha256, project: PROJECT, requested_scope: SCOPE, token_posts_dispatched: 0, sheets_gets: 0, cloud_executions: 0 };
  save(file, receipt, true);
  try {
    let grant = await authorize({ client: selected.client, phase, ready: url => console.log('Open manually in ordinary Chrome: ' + url), beforeExchange: () => { verifyTokenBudget(credentialDir, approval); receipt.token_posts_dispatched = 1; receipt.status = 'TOKEN_EXCHANGE_DISPATCHED'; save(file, receipt); } });
    receipt.status = 'AUTHORIZED'; receipt.granted_scope = grant.scope; receipt.expires_at = grant.expires_at; receipt.refresh_token_discarded = grant.refresh_token_discarded; save(file, receipt);
    approval.preExecutionGates = { ...approval.preExecutionGates, status: 'VERIFIED', granted_scope: grant.scope };
    save(path.join(credentialDir, 'authorized-' + phase + '-approval' + suffix + '.json'), approval, true);
    const result = await runApprovedScope({ dir, books, approval, token: grant.token }, phase); grant = null;
    const currentLedger = JSON.parse(fs.readFileSync(ledgerFile));
    receipt.sheets_gets = currentLedger.consumption.sheetsGets - startingLedger.consumption.sheetsGets;
    if (receipt.sheets_gets !== (phase === 'probe' ? 1 : plan.onePhaseGets)) fail('ACCOUNTING_CHANGED_STOP');
    currentLedger.status = phase === 'probe' ? 'STOPPED_SINGLE_EXTERNAL_PROBE_AWAITING_REVIEW' : phase.toUpperCase() + '_INTEGRITY_VERIFIED'; save(ledgerFile, currentLedger);
    receipt.status = phase === 'probe' ? 'PROBE_STOP_FOR_REVIEW' : phase.toUpperCase() + '_VERIFIED'; save(file, receipt);
    console.log(JSON.stringify({ status: receipt.status, google_gets: receipt.sheets_gets, phase, cloud_executions: 0, whole_phase_verified: result.ok === true }));
  } catch (e) {
    receipt.status = 'STOPPED'; receipt.error = redacted(e);
    try { const stopped = JSON.parse(fs.readFileSync(ledgerFile)); receipt.sheets_gets = stopped.consumption.sheetsGets - startingLedger.consumption.sheetsGets; stopped.status = 'STOPPED_EXTERNAL_' + receipt.error.replace(/^INTEGRITY_(?:OAUTH|EXTERNAL|STREAM)_/, ''); save(ledgerFile, stopped); } catch { receipt.sheets_gets = 'UNKNOWN_SEE_LEDGER'; }
    save(file, receipt); throw Error(receipt.error);
  }
}
module.exports = { SCOPE, PROJECT, MAX_TOKEN_RESPONSE, validateClient, validateAcl, pkce, authUrl, validateGrant, exchangeCode, authorize, verifyTokenBudget, runApprovedScope };
if (require.main === module) main(process.argv[2], process.argv[3], process.argv[4]).catch(e => { console.error(redacted(e)); process.exitCode = 1; });
