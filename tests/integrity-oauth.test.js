'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const crypto = require('node:crypto'), http = require('node:http'), fs = require('node:fs');
const { EventEmitter } = require('node:events'), { Readable } = require('node:stream'), { execFileSync } = require('node:child_process');
const oauth = require('../scripts/authorize-integrity-google');
function client() { return { installed: { project_id: oauth.PROJECT, client_id: '123-syntheticclient.apps.googleusercontent.com', client_secret: 'synthetic-client-secret-local', auth_uri: 'https://accounts.google.com/o/oauth2/v2/auth', token_uri: 'https://oauth2.googleapis.com/token', redirect_uris: ['http://localhost'] } }; }
function grant() { return { scope: oauth.SCOPE, access_token: 'synthetic-access-token-memory-only', token_type: 'Bearer', expires_in: 3600, refresh_token: 'synthetic-refresh-discarded' }; }
function fakeRequest(value, options = {}) {
  const calls = [];
  const request = (url, opts, cb) => { const req = new EventEmitter(); req.destroy = () => {}; req.end = body => { calls.push({ url, opts, body }); queueMicrotask(() => { const bytes = Buffer.isBuffer(value) ? Buffer.from(value) : Buffer.from(JSON.stringify(value)); const res = Readable.from([bytes]); res.statusCode = options.status ?? 200; res.headers = { 'content-type': 'application/json', ...(options.encoding ? { 'content-encoding': options.encoding } : {}), ...(options.length === undefined ? {} : { 'content-length': options.length }) }; res.complete = options.complete ?? true; cb(res); }); }; return req; };
  return { request, calls };
}
function localGet(url, headers = {}) { return new Promise((resolve, reject) => { http.get(url, { headers }, res => { let body = ''; res.on('data', c => body += c); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body })); }).on('error', reject); }); }
test('desktop client requires exact project, Google endpoints, local redirect and bounded valid JSON', () => {
  const bytes = Buffer.from(JSON.stringify(client())), result = oauth.validateClient(bytes);
  assert.equal(result.project, oauth.PROJECT); assert.equal(result.client_sha256, crypto.createHash('sha256').update(bytes).digest('hex'));
  const legacy = client(); legacy.installed.auth_uri = 'https://accounts.google.com/o/oauth2/auth'; assert.equal(oauth.validateClient(Buffer.from(JSON.stringify(legacy))).project, oauth.PROJECT);
  for (const change of [c => c.installed.project_id = 'synthetic-other-project', c => c.web = {}, c => c.installed.token_uri = 'https://example.com/token', c => c.installed.auth_uri = 'https://example.com/auth', c => c.installed.redirect_uris = ['https://example.com'], c => c.installed.client_secret = '****']) { const c = client(); change(c); assert.throws(() => oauth.validateClient(Buffer.from(JSON.stringify(c))), /DESKTOP_PROJECT_CLIENT_REQUIRED/); }
  assert.throws(() => oauth.validateClient(Buffer.alloc(16385)), /CLIENT_SIZE/);
  assert.throws(() => oauth.validateClient(Buffer.from('{"installed":{},"installed":{}}')), /CLIENT_JSON/);
});
test('credential file and folder both require current owner and only trusted ACL principals', () => {
  const record = { owner: 'synthetic-owner', current: 'synthetic-owner', rules: [{ sid: 'synthetic-owner', allow: true }, { sid: 'S-1-5-18', allow: true }, { sid: 'S-1-5-32-544', allow: true }] };
  oauth.validateAcl([record, record]);
  for (const change of [r => r.owner = 'synthetic-other-owner', r => r.rules.push({ sid: 'S-1-5-32-545', allow: true }), r => r.rules = []]) { const copy = structuredClone(record); change(copy); assert.throws(() => oauth.validateAcl([record, copy]), /INTEGRITY_OAUTH/); }
  assert.throws(() => oauth.validateAcl([record]), /ACL_RECORDS_SHAPE/);
});
test('PKCE uses fresh high-entropy S256 and authorization requests only exact Sheets read-only online scope', () => {
  const a = oauth.pkce(), b = oauth.pkce(); assert.equal(a.verifier.length, 43); assert.notEqual(a.state, b.state); assert.notEqual(a.verifier, b.verifier);
  assert.equal(a.challenge, crypto.createHash('sha256').update(a.verifier).digest('base64url'));
  const u = new URL(oauth.authUrl(client().installed, 'http://127.0.0.1:12345', a));
  assert.equal(u.origin, 'https://accounts.google.com'); assert.equal(u.searchParams.get('scope'), oauth.SCOPE); assert.equal(u.searchParams.get('code_challenge_method'), 'S256'); assert.equal(u.searchParams.get('access_type'), 'online'); assert.equal(u.searchParams.get('include_granted_scopes'), 'false');
  assert.ok(!u.searchParams.has('client_secret')); assert.ok(!u.href.includes(a.verifier));
});
test('grant rejects absent or extra scope, invalid expiry and token type; refresh token is discarded', () => {
  const result = oauth.validateGrant(Buffer.from(JSON.stringify(grant()))); assert.equal(result.scope, oauth.SCOPE); assert.equal(result.refresh_token_discarded, true); assert.ok(!('refresh_token' in result));
  for (const change of [g => delete g.scope, g => g.scope += ' https://www.googleapis.com/auth/drive', g => g.token_type = 'Basic', g => g.expires_in = 0, g => g.access_token += '\n']) { const g = grant(); change(g); assert.throws(() => oauth.validateGrant(Buffer.from(JSON.stringify(g))), /GRANT_SCOPE_TYPE_OR_EXPIRY/); }
  assert.throws(() => oauth.validateGrant(Buffer.from('{"scope":"one","scope":"two"}')), /TOKEN_RESPONSE_INVALID/);
});
test('one token exchange pins strict TLS, POST endpoint and PKCE without cookies or retries', async () => {
  const f = fakeRequest(grant()), result = await oauth.exchangeCode(client().installed, 'synthetic-code', 'http://127.0.0.1:12345', 'synthetic-verifier', f.request);
  assert.equal(result.scope, oauth.SCOPE); assert.equal(f.calls.length, 1);
  const call = f.calls[0], body = new URLSearchParams(call.body);
  assert.equal(call.url, 'https://oauth2.googleapis.com/token'); assert.equal(call.opts.rejectUnauthorized, true); assert.equal(call.opts.method, 'POST'); assert.equal(call.opts.headers['Accept-Encoding'], 'identity'); assert.ok(!call.opts.headers.Cookie);
  assert.equal(body.get('code_verifier'), 'synthetic-verifier'); assert.equal(body.get('grant_type'), 'authorization_code');
});
test('token exchange stops on auth failure, redirect, oversized, compressed, truncated or invalid response', async () => {
  for (const opts of [{ status: 401 }, { status: 307 }, { length: 65537 }, { encoding: 'gzip' }, { length: 1 }, { complete: false }]) { const f = fakeRequest(grant(), opts); await assert.rejects(oauth.exchangeCode(client().installed, 'synthetic-code', 'http://127.0.0.1:12345', 'synthetic-verifier', f.request), /INTEGRITY_OAUTH/); assert.equal(f.calls.length, 1); }
  const f = fakeRequest(Buffer.alloc(65537)); await assert.rejects(oauth.exchangeCode(client().installed, 'synthetic-code', 'http://127.0.0.1:12345', 'synthetic-verifier', f.request), /TOKEN_BODY_LIMIT/); assert.equal(f.calls.length, 1);
});
test('token exchange deadline aborts once without retrying or leaking transport errors', async () => {
  let calls = 0, destroyed = 0; const old = global.setTimeout;
  global.setTimeout = (fn, ms, ...args) => old(fn, ms === 60000 ? 5 : ms, ...args);
  try {
    const request = () => { const req = new EventEmitter(); req.destroy = () => destroyed++; req.end = () => calls++; return req; };
    await assert.rejects(oauth.exchangeCode(client().installed, 'synthetic-code', 'http://127.0.0.1:12345', 'synthetic-verifier', request), /TOKEN_TIMEOUT_NO_RETRY/);
    assert.equal(calls, 1); assert.equal(destroyed, 1);
  } finally { global.setTimeout = old; }
});
test('ordinary-browser local page verifies state, prevents replays and returns no credential values', async () => {
  let resolveReady, resolveExchange; const opened = new Promise(r => resolveReady = r), exchanged = new Promise(r => resolveExchange = r); let calls = 0, claimed = 0;
  const finished = oauth.authorize({ client: client().installed, ready: resolveReady, beforeExchange: () => claimed++, exchange: async (...args) => { calls++; assert.equal(args[1], 'synthetic-code'); return exchanged; } });
  const url = await opened, page = await localGet(url); assert.equal(page.status, 200); assert.equal(page.headers['cache-control'], 'no-store'); assert.ok(!page.body.includes(client().installed.client_secret));
  const auth = new URL(page.body.match(/href="([^"]+)"/)[1].replace(/&amp;/g, '&')), callback = new URL(auth.searchParams.get('redirect_uri'));
  assert.equal((await localGet(url, { Host: 'example.com' })).status, 403); assert.equal((await localGet(url, { Origin: 'https://example.com' })).status, 403);
  callback.searchParams.set('state', auth.searchParams.get('state')); callback.searchParams.set('code', 'synthetic-code');
  const response = await localGet(callback.href); assert.equal(response.status, 303); assert.ok(!response.body.includes('synthetic-code'));
  assert.equal((await localGet(callback.href)).status, 404); assert.equal((await localGet(new URL('/complete', url).href)).status, 200); assert.equal(calls, 1); assert.equal(claimed, 1);
  resolveExchange(oauth.validateGrant(Buffer.from(JSON.stringify(grant())))); assert.equal((await finished).scope, oauth.SCOPE);
});
test('wrong state, duplicate state/code and owner denial all stop without token exchange', async () => {
  for (const kind of ['wrong-state', 'duplicate-state', 'duplicate-code', 'denied']) {
    let resolveReady; const opened = new Promise(r => resolveReady = r); let calls = 0;
    const finished = oauth.authorize({ client: client().installed, ready: resolveReady, exchange: async () => { calls++; return grant(); } });
    const rejection = assert.rejects(finished, /CALLBACK_STOP/), url = await opened, page = await localGet(url), auth = new URL(page.body.match(/href="([^"]+)"/)[1].replace(/&amp;/g, '&')), callback = new URL(auth.searchParams.get('redirect_uri'));
    callback.searchParams.set('state', kind === 'wrong-state' ? 'synthetic-wrong' : auth.searchParams.get('state')); callback.searchParams.set('code', 'synthetic-code');
    if (kind === 'duplicate-state') callback.searchParams.append('state', 'synthetic-wrong'); if (kind === 'duplicate-code') callback.searchParams.append('code', 'synthetic-other'); if (kind === 'denied') callback.searchParams.set('error', 'access_denied');
    assert.equal((await localGet(callback.href)).status, 400); await rejection; assert.equal(calls, 0);
  }
});
test('local authorization deadline stops without exchange or automatic browser opening', async () => {
  let calls = 0; await assert.rejects(oauth.authorize({ client: client().installed, ready: () => {}, timeoutMs: 20, exchange: async () => { calls++; } }), /OWNER_TIMEOUT_STOP/); assert.equal(calls, 0);
});
test('default CLI is offline and live path exposes only the single-probe runner', () => {
  const output = JSON.parse(execFileSync(process.execPath, ['scripts/authorize-integrity-google.js'], { encoding: 'utf8' })); assert.equal(output.live_calls, 0); assert.equal(output.scope, oauth.SCOPE);
  const source = fs.readFileSync('scripts/authorize-integrity-google.js', 'utf8'); assert.ok(source.includes('integrity.runProbe')); assert.ok(!source.includes('integrity.runPhase')); assert.ok(!source.includes('ARC_INTEGRITY_ACCESS_TOKEN')); assert.ok(!source.includes('launch(')); assert.ok(source.includes('owner-probe-authorization.json'));
});
