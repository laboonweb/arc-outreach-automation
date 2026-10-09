'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { EventEmitter } = require('node:events'), { Readable } = require('node:stream');
const { JsonStream, semanticHash } = require('../scripts/integrity-json-stream');
const v = require('../scripts/verify-source-integrity-streaming'), headers = require('../scripts/dataset-output').ALL_HEADERS;
const books = [0, 1, 2].map(i => ({ dataset_id: 'SYNTHETIC_' + i, spreadsheet_id: 'synthetic-book-' + i, primary_sheet: 'Synthetic leads', supplemental_sheets: {}, reference_sheets: [] }));
function meta(book) { return { spreadsheetId: book.spreadsheet_id, spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/' + book.spreadsheet_id + '/edit', commentsViewMode: 'COMMENTS_VIEW_MODE_INCLUDED', properties: { title: 'Synthetic workbook', spreadsheetTheme: { primaryFontFamily: 'Synthetic' } }, namedRanges: [{ name: 'synthetic_range', range: { sheetId: 1, endColumnIndex: 208 } }], sheets: ['Synthetic leads', 'Arc Research'].map((title, i) => ({ properties: { title, sheetId: i, sheetType: 'GRID', gridProperties: { rowCount: 5000, columnCount: i ? 208 : 4 } }, protectedRanges: [{ description: 'Synthetic protection', range: { sheetId: i } }] })) }; }
function grid(book, title) { return { spreadsheetId: book.spreadsheet_id, sheets: [{ properties: meta(book).sheets.find(s => s.properties.title === title).properties, data: [{ rowData: [{ values: (title === 'Arc Research' ? headers : ['Synthetic header']).map(h => ({ userEnteredValue: { stringValue: h } })) }, { values: [{ userEnteredValue: { formulaValue: '=1+1' }, userEnteredFormat: { backgroundColorStyle: { rgbColor: { red: 1 } } }, effectiveFormat: { numberFormat: { type: 'NUMBER' } }, note: 'SYNTHETIC observation' }] }], rowMetadata: [{ pixelSize: 21 }], columnMetadata: [{ hiddenByUser: true }] }] }] }; }
function parse(value, size = 17) { const parser = new JsonStream(), bytes = Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)); for (let i = 0; i < bytes.length; i += size) parser.write(bytes.subarray(i, i + size)); return parser.finish(); }
function consume(value, book = books[0], title = 'Arc Research', size = 31) { const c = v.gridConsumer(v.metadata(meta(book), book), book, title), bytes = Buffer.from(JSON.stringify(value)); for (let i = 0; i < bytes.length; i += size) c.write(bytes.subarray(i, i + size)); return c.finish(); }
function fakeGet(body, { status = 200, encoding, length, complete = true } = {}) {
  const calls = [];
  const get = (url, options, callback) => { calls.push({ url: String(url), options }); const req = new EventEmitter(); req.destroy = () => {}; queueMicrotask(() => { const response = Readable.from((function* () { for (let i = 0; i < body.length; i += 4096) yield body.subarray(i, i + 4096); })()); response.statusCode = status; response.headers = { 'content-type': 'application/json', ...(encoding ? { 'content-encoding': encoding } : {}), ...(length === undefined ? {} : { 'content-length': String(length) }) }; response.complete = complete; callback(response); }); return req; };
  return { get, calls };
}
test('streaming semantic hash is deterministic across UTF8 splits, whitespace and object key order', () => {
  const a = { z: ['SYNTHETIC 🐟 日本語', 1, false, null, { formula: '=NOW()', format: 'red' }], a: { b: 2, c: 'x' } }, b = { a: { c: 'x', b: 2 }, z: a.z };
  assert.equal(parse(a, 1).sha256, semanticHash(a)); assert.equal(parse(JSON.stringify(b, null, 2), 3).sha256, semanticHash(a));
  const changed = structuredClone(a); changed.z.reverse(); assert.notEqual(parse(changed).sha256, semanticHash(a));
});
test('stream parser rejects truncation, duplicate keys, invalid UTF8, grammar and bounded state overflows', () => {
  for (const input of ['{"x":', '[1,]', '{"x":1,"x":2}', '{"x" 1}', '{"x":1} []', '1e999']) assert.throws(() => parse(input), /INTEGRITY_STREAM/);
  const p = new JsonStream(); assert.throws(() => p.write(Buffer.from([0xff])), /UTF8/);
  for (const [limits, input] of [[{ tokenBytes: 8 }, '"0123456789"'], [{ depth: 2 }, '[[[]]]'], [{ keys: 1 }, '{"a":1,"b":2}'], [{ keyBytes: 2 }, '{"abc":1}']]) { const parser = new JsonStream(() => {}, limits); assert.throws(() => { parser.write(Buffer.from(input)); parser.finish(); }, /LIMIT/); }
});
test('fixed manifest specifies exact paired GETs, individual sheets, metadata guards and no Cloud calls', () => {
  const realShape = [7, 9, 6].map((count, i) => ({ ...books[i], reference_sheets: Array.from({ length: count - 2 }, (_, j) => 'Synthetic reference ' + j) })), p = v.manifest(realShape);
  assert.equal(p.onePhaseGets, 28); assert.equal(p.pairedGets, 56); assert.equal(p.cloudExecutions, 0); assert.equal(p.schema_columns, 208);
  for (const d of p.datasets) for (const r of d.requests) { const url = new URL(r.url); assert.equal(url.origin, 'https://sheets.googleapis.com'); assert.equal(url.searchParams.getAll('ranges').length, r.role === 'grid' ? 1 : 0); if (r.role === 'grid') assert.equal(url.searchParams.get('fields'), 'spreadsheetId,sheets(properties,data)'); else { assert.ok(!url.searchParams.get('fields').includes('rowData')); assert.equal(url.searchParams.get('commentsViewMode'), 'COMMENTS_VIEW_MODE_INCLUDED'); assert.ok(url.searchParams.get('fields').includes('commentAnchors')); } }
  assert.equal(v.manifest(realShape).sha256, p.sha256); assert.throws(() => v.apiUrl({ ...books[0], spreadsheet_id: 'evil/id' }), /BOOK_ID/);
});
test('metadata requires all tabs, unique IDs, bounded entire grids and 208 research columns', () => {
  const book = books[0]; assert.ok(v.metadata(meta(book), book).sha256);
  for (const mutate of [x => x.sheets.pop(), x => x.sheets[1].properties.sheetId = 0, x => x.sheets[1].properties.gridProperties.columnCount = 207, x => x.sheets[0].properties.gridProperties.rowCount = 5001, x => x.sheets[0].data = [{}], x => x.spreadsheetId = 'wrong']) { const m = meta(book); mutate(m); assert.throws(() => v.metadata(m, book), /INTEGRITY_EXTERNAL/); }
});
test('streamed grid covers actual research header 208, physical dimensions, association and column 208 changes', () => {
  const book = books[0], value = grid(book, 'Arc Research'), before = consume(value); assert.equal(before.required_research_columns, 208); assert.equal(before.rows, 5000); assert.equal(before.complete_grid, true); assert.ok(!JSON.stringify(before).includes('SYNTHETIC observation'));
  const values = value.sheets[0].data[0].rowData[1].values;
  while (values.length < 208) values.push({}); values[207] = { note: 'SYNTHETIC last column change' }; assert.notEqual(consume(value).sha256, before.sha256);
  for (const mutate of [x => x.sheets[0].data[0].startColumn = 1, x => x.sheets[0].data = [], x => x.sheets[0].data.push({}), x => x.sheets[0].data[0].rowData[0].values.pop(), x => x.sheets[0].properties.sheetId = 99, x => x.spreadsheetId = 'wrong']) { const changed = grid(book, 'Arc Research'); mutate(changed); assert.throws(() => consume(changed), /INTEGRITY_EXTERNAL/); }
});
test('empty trailing cells are handled by Google sparse semantics without accepting bad grid shapes', () => {
  const book = books[0], value = grid(book, 'Synthetic leads'); value.sheets[0].data = [{}]; assert.equal(consume(value, book, 'Synthetic leads').complete_grid, true);
  value.sheets[0].data = [42]; assert.throws(() => consume(value, book, 'Synthetic leads'), /GRID_SHAPE/);
  value.sheets[0].data = [{ rowData: [{ values: [42] }] }]; assert.throws(() => consume(value, book, 'Synthetic leads'), /GRID_SHAPE/);
  const long = grid(book, 'Synthetic leads'); long.sheets[0].data[0].rowData[0].values[0].userEnteredValue.stringValue = 'SYNTHETIC '.repeat(100); assert.equal(consume(long, book, 'Synthetic leads').complete_grid, true);
});
test('original, calculated and display values, formats, notes, rich text and dimensions affect hashes', () => {
  const book = books[0], original = consume(grid(book, 'Arc Research')).sha256;
  for (const mutate of [c => c.userEnteredValue.formulaValue = '=1+2', c => c.userEnteredValue = { stringValue: 'SYNTHETIC changed literal' }, c => c.effectiveValue = { numberValue: 3 }, c => c.formattedValue = '3.00', c => c.note = 'changed', c => c.userEnteredFormat.backgroundColorStyle.rgbColor.red = 0, c => c.effectiveFormat.numberFormat.type = 'DATE', c => c.textFormatRuns = [{ startIndex: 0, format: { bold: true } }], c => c.dataValidation = { strict: true }, c => c.chipRuns = [{ startIndex: 0, chip: {} }]]) { const value = grid(book, 'Arc Research'); mutate(value.sheets[0].data[0].rowData[1].values[0]); assert.notEqual(consume(value).sha256, original); }
  const value = grid(book, 'Arc Research'); value.sheets[0].data[0].columnMetadata[0].hiddenByUser = false; assert.notEqual(consume(value).sha256, original);
});
test('external transport enforces TLS/host, one GET, streaming bytes, truncation and auth failures without retries', async () => {
  const book = books[0], body = Buffer.from(JSON.stringify(meta(book))), fake = fakeGet(body, { length: body.length });
  const result = await v.request(v.apiUrl(book), 'synthetic-token', v.metadataConsumer(book), v.META_BYTES, fake.get); assert.ok(result.sha256); assert.equal(fake.calls.length, 1); assert.equal(fake.calls[0].options.rejectUnauthorized, true); assert.equal(fake.calls[0].options.headers['Accept-Encoding'], 'identity'); assert.equal(fake.calls[0].options.method, 'GET');
  for (const options of [{ status: 307 }, { status: 401 }, { encoding: 'gzip' }, { length: body.length + 1 }, { complete: false }]) { const f = fakeGet(body, options); await assert.rejects(v.request(v.apiUrl(book), 'synthetic-token', v.metadataConsumer(book), v.META_BYTES, f.get), /INTEGRITY_EXTERNAL/); assert.equal(f.calls.length, 1); }
  const f = fakeGet(body); await assert.rejects(v.request(v.apiUrl(book), 'synthetic-token', v.metadataConsumer(book), 64, f.get), /BODY_LIMIT/);
  await assert.rejects(v.request('https://example.org/test', 'synthetic-token', {}, 64, f.get), /HOST_ALLOWLIST/); assert.equal(f.calls.length, 1);
});
test('metadata byte cap and partial or duplicate JSON never certify metadata', () => {
  const c = v.metadataConsumer(books[0]); assert.throws(() => c.write(Buffer.alloc(v.META_BYTES + 1)), /METADATA_LIMIT/);
  const partial = v.metadataConsumer(books[0]); partial.write(Buffer.from('{"spreadsheetId":')); assert.throws(() => partial.finish(), /TRUNCATED/);
});
function approval(plan) { return { status: 'OWNER_APPROVED', ownerApprovedAt: '2026-10-09T00:00:00Z', manifest_sha256: plan.sha256, credential_scope: 'https://www.googleapis.com/auth/spreadsheets.readonly', maxGoogleGets: plan.pairedGets, maxCloudExecutions: 0, preExecutionGates: { status: 'VERIFIED', checked_at: new Date().toISOString(), client_sha256: 'a'.repeat(64), granted_scope: 'https://www.googleapis.com/auth/spreadsheets.readonly', storage_verified: true, costs_verified: 'NO_ADDITIONAL_CHARGES', source_writers_paused: true, quota_reads_per_user_minute: 60, quota_reads_per_project_minute: 300 } }; }
test('single probe uses only one existing GET allowance; complete BEFORE still requires full paired capacity', () => {
  const plan = v.manifest(books), a = approval(plan), ledger = { consumption: { sheetsGets: 6 }, caps: { sheetsGets: 7 } };
  v.verifyApproval(a, plan, ledger, 'probe'); assert.throws(() => v.verifyApproval(a, plan, ledger, 'before'), /REQUEST_BUDGET/);
  ledger.consumption.sheetsGets = 7; assert.throws(() => v.verifyApproval(a, plan, ledger, 'probe'), /REQUEST_BUDGET/);
});
test('probe receipt replacement failure retains reserved count and stops before any Google fetch', async () => {
  const dir = temporary(), f = simulatedFetch(), original = fs.renameSync, probeFile = path.join(dir, 'external-stream-live-probe.json'); let refused = false;
  try {
    fs.renameSync = (from, to) => { if (to === probeFile && !refused && JSON.parse(fs.readFileSync(from, 'utf8')).status === 'DISPATCHED') { refused = true; throw Error('synthetic Windows receipt replacement refusal'); } return original(from, to); };
    await assert.rejects(v.runProbe({ dir, books, approval: approval(v.manifest(books)), token: 'synthetic-token', fetch: f.fetch }), /PERSISTENCE_STOP/);
    assert.equal(f.calls, 0); assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'continuation-ledger.json'))).consumption.sheetsGets, 7);
    const stopped = JSON.parse(fs.readFileSync(probeFile)); assert.equal(stopped.status, 'STOPPED'); assert.equal(stopped.grid, null);
    const failed = fs.readdirSync(dir).filter(n => n.startsWith('external-stream-live-probe.json.new-')); assert.equal(failed.length, 1); assert.equal(JSON.parse(fs.readFileSync(path.join(dir, failed[0]))).status, 'DISPATCHED');
    assert.equal(fs.existsSync(path.join(dir, 'external-stream-before.json')), false);
  } finally { fs.renameSync = original; cleanup(dir); }
});
function temporary() { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'arc-integrity-synthetic-')); fs.writeFileSync(path.join(dir, 'continuation-ledger.json'), JSON.stringify({ caps: { sheetsGets: 100 }, consumption: { sheetsGets: 6, executions: 43, rowMutations: 134 } })); return dir; }
function cleanup(dir) { const target = path.resolve(dir); if (path.dirname(target) !== path.resolve(os.tmpdir()) || !path.basename(target).startsWith('arc-integrity-synthetic-')) throw Error('UNSAFE_SYNTHETIC_TEST_CLEANUP'); fs.rmSync(target, { recursive: true }); }
function simulatedFetch({ corruptEnd = false, changedCell = false, failureAt = 0 } = {}) { let calls = 0; return { get calls() { return calls; }, async fetch(url, token, c) { calls++; if (calls === failureAt) throw Error('INTEGRITY_EXTERNAL_HTTP_401_STOP'); const u = new URL(url), book = books.find(b => u.pathname.endsWith('/' + b.spreadsheet_id)), range = u.searchParams.get('ranges'), body = range ? grid(book, range.match(/^'(.+)'!/)[1]) : meta(book); if (corruptEnd && calls === 4) body.properties.title = 'SYNTHETIC changed during read'; if (range && changedCell) body.sheets[0].data[0].rowData[1].values[0].note = 'SYNTHETIC changed between phases'; const bytes = Buffer.from(JSON.stringify(body)); for (let i = 0; i < bytes.length; i += 71) c.write(bytes.subarray(i, i + 71)); return { ...c.finish(), transport: { bytes: bytes.length, chunks: Math.ceil(bytes.length / 71), elapsed_ms: 20, peak_heap_bytes: 1000000, peak_rss_bytes: 1000000, status: 200, identity_encoding: true, complete: true } }; } }; }
test('explicit new probe attempt preserves the failed original and is used by complete phases', async () => {
  const dir = temporary(), f = simulatedFetch(), a = approval(v.manifest(books)); a.probeAttempt = '1'.repeat(32);
  const original = JSON.stringify({ status: 'STOPPED', synthetic: true }); fs.writeFileSync(path.join(dir, 'external-stream-live-probe.json'), original);
  try {
    const probe = await v.runProbe({ dir, books, approval: a, token: 'synthetic-token', fetch: f.fetch }); assert.equal(f.calls, 1); assert.equal(fs.readFileSync(path.join(dir, 'external-stream-live-probe.json'), 'utf8'), original);
    a.liveProbeReviewedSha256 = semanticHash(probe); const before = await v.runPhase({ dir, phase: 'before', books, approval: a, token: 'synthetic-token', fetch: f.fetch, pause: async () => {} }); assert.equal(before.ok, true); assert.equal(f.calls, 12);
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'continuation-ledger.json'))).integrityRequests[0].probe_attempt, a.probeAttempt);
    assert.throws(() => v.probeFile(dir, { probeAttempt: '../wrong' }), /PROBE_ATTEMPT_ID/); await assert.rejects(v.runProbe({ dir, books, approval: a, token: 'synthetic-token', fetch: f.fetch }), /EXISTING_ATTEMPT/); assert.equal(f.calls, 12);
  } finally { cleanup(dir); }
});
async function reviewedProbe(dir, plan, f) { const a = approval(plan), probe = await v.runProbe({ dir, books, approval: a, token: 'synthetic-token', fetch: f.fetch }); a.liveProbeReviewedSha256 = semanticHash(probe); return a; }
test('before/after receipts certify all three complete books, preserve accounting and retain no cell contents', async () => {
  const dir = temporary(), plan = v.manifest(books), f = simulatedFetch();
  try { const a = await reviewedProbe(dir, plan, f), before = await v.runPhase({ dir, phase: 'before', books, approval: a, token: 'synthetic-token', fetch: f.fetch, pause: async () => {} }); assert.equal(before.google_gets, 12); assert.equal(before.books.length, 3); assert.ok(!JSON.stringify(before).includes('SYNTHETIC observation')); const after = await v.runPhase({ dir, phase: 'after', books, approval: a, token: 'synthetic-token', fetch: f.fetch, pause: async () => {} }); assert.equal(after.ok, true); const ledger = JSON.parse(fs.readFileSync(path.join(dir, 'continuation-ledger.json'))); assert.deepEqual(ledger.consumption, { sheetsGets: 30, executions: 43, rowMutations: 134 }); await assert.rejects(v.runPhase({ dir, phase: 'before', books, approval: a, token: 'synthetic-token', fetch: f.fetch }), /EXISTING_ATTEMPT/); assert.equal(f.calls, 24); }
  finally { cleanup(dir); }
});
test('failure counts the request, stops without a baseline, and forbids resuming or silently retrying', async () => {
  const dir = temporary(), plan = v.manifest(books), f = simulatedFetch({ failureAt: 2 });
  try { const a = await reviewedProbe(dir, plan, f); await assert.rejects(v.runPhase({ dir, phase: 'before', books, approval: a, token: 'synthetic-token', fetch: f.fetch, pause: async () => {} }), /HTTP_401/); assert.equal(f.calls, 2); assert.equal(fs.existsSync(path.join(dir, 'external-stream-before.json')), false); const progress = JSON.parse(fs.readFileSync(path.join(dir, 'external-stream-before-progress.json'))); assert.equal(progress.status, 'STOPPED'); assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'continuation-ledger.json'))).consumption.sheetsGets, 8); await assert.rejects(v.runPhase({ dir, phase: 'before', books, approval: a, token: 'synthetic-token', fetch: f.fetch }), /EXISTING_ATTEMPT/); assert.equal(f.calls, 2); }
  finally { cleanup(dir); }
});
test('metadata drift within a read, missing approval and insufficient paired budget stop before certification', async () => {
  const p = v.manifest(books); assert.throws(() => v.verifyApproval({}, p, { caps: { sheetsGets: 100 }, consumption: { sheetsGets: 6 } }), /APPROVAL/); assert.throws(() => v.verifyApproval(approval(p), p, { caps: { sheetsGets: 20 }, consumption: { sheetsGets: 6 } }), /BUDGET/);
  const dir = temporary(), f = simulatedFetch({ corruptEnd: true }); try { const a = await reviewedProbe(dir, p, f); await assert.rejects(v.runPhase({ dir, phase: 'before', books, approval: a, token: 'synthetic-token', fetch: f.fetch, pause: async () => {} }), /METADATA_CHANGED/); assert.equal(f.calls, 4); assert.equal(fs.existsSync(path.join(dir, 'external-stream-before.json')), false); } finally { cleanup(dir); }
});
test('full metadata mask covers current root/sheet fields, comments and every metadata change', () => {
  for (const field of ['spreadsheetUrl', 'properties', 'namedRanges', 'developerMetadata', 'dataSources', 'dataSourceSchedules', 'comments', 'commentsViewMode', 'merges', 'conditionalFormats', 'filterViews', 'protectedRanges', 'basicFilter', 'charts', 'bandedRanges', 'rowGroups', 'columnGroups', 'slicers', 'tables', 'commentAnchors']) assert.ok(v.META_FIELDS.includes(field));
  const original = v.metadata(meta(books[0]), books[0]).sha256;
  for (const mutate of [m => m.comments = [{ commentId: 'synthetic', headPost: { content: 'SYNTHETIC comment' } }], m => m.sheets[1].commentAnchors = [{ anchorId: 'synthetic' }], m => m.properties.locale = 'en_PH', m => m.namedRanges[0].name = 'changed', m => m.sheets[0].protectedRanges[0].description = 'changed', m => m.sheets[0].properties.index = 1]) { const m = meta(books[0]); mutate(m); assert.notEqual(v.metadata(m, books[0]).sha256, original); }
  const m = meta(books[0]); delete m.commentsViewMode; assert.throws(() => v.metadata(m, books[0]), /METADATA_ID/);
});
test('malformed optional arrays cannot be mistaken for sparse empty data', () => {
  for (const block of [{ rowData: 42 }, { rowMetadata: false }, { columnMetadata: [42] }, { rowData: [{ values: null }] }]) { const value = grid(books[0], 'Synthetic leads'); value.sheets[0].data = [block]; assert.throws(() => consume(value, books[0], 'Synthetic leads'), /GRID_SHAPE/); }
});
test('streaming transport processes a real 208-column fixture above 8 MiB without assembling it', async () => {
  const demo = require('../scripts/demo-streaming-integrity'); let wireBytes = 0;
  const get = (url, options, callback) => { const req = new EventEmitter(); req.destroy = () => {}; queueMicrotask(() => { const response = Readable.from((function* () { for (const row of demo.stream(150)) for (let i = 0; i < row.length; i += 16384) { const chunk = row.subarray(i, i + 16384); wireBytes += chunk.length; yield chunk; } })()); response.statusCode = 200; response.headers = { 'content-type': 'application/json' }; response.complete = true; callback(response); }); return req; };
  const result = await v.request(v.apiUrl(demo.book, 'Arc Research'), 'synthetic-token', v.gridConsumer(null, demo.book, 'Arc Research'), v.GRID_BYTES, get);
  assert.ok(wireBytes > 8 * 1024 * 1024); assert.equal(result.body_bytes, wireBytes); assert.equal(result.complete_grid, true); assert.equal(result.required_research_columns, 208);
  assert.equal(result.transport.bytes, wireBytes); assert.ok(result.transport.chunks > 1); assert.equal(result.transport.complete, true);
});

test('one bounded probe stops for review, is counted once and fits the exact paired budget', async () => {
  const dir = temporary(), plan = v.manifest(books), f = simulatedFetch(), a = approval(plan);
  fs.writeFileSync(path.join(dir, 'continuation-ledger.json'), JSON.stringify({ caps: { sheetsGets: 6 + plan.pairedGets }, consumption: { sheetsGets: 6, executions: 43, rowMutations: 134 } }));
  try {
    const probe = await v.runProbe({ dir, books, approval: a, token: 'synthetic-token', fetch: f.fetch });
    assert.equal(f.calls, 1); assert.equal(probe.status, 'AWAITING_REVIEW'); assert.equal(probe.whole_phase_verified, false); assert.equal(fs.existsSync(path.join(dir, 'external-stream-before.json')), false);
    await assert.rejects(v.runPhase({ dir, phase: 'before', books, approval: a, token: 'synthetic-token', fetch: f.fetch }), /LIVE_PROBE_REVIEW_REQUIRED/); assert.equal(f.calls, 1);
    await assert.rejects(v.runProbe({ dir, books, approval: a, token: 'synthetic-token', fetch: f.fetch }), /REQUEST_BUDGET|EXISTING_ATTEMPT/); assert.equal(f.calls, 1);
    a.liveProbeReviewedSha256 = semanticHash(probe);
    await v.runPhase({ dir, phase: 'before', books, approval: a, token: 'synthetic-token', fetch: f.fetch, pause: async () => {} });
    await v.runPhase({ dir, phase: 'after', books, approval: a, token: 'synthetic-token', fetch: f.fetch, pause: async () => {} });
    assert.equal(f.calls, plan.pairedGets); assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'continuation-ledger.json'))).consumption.sheetsGets, 6 + plan.pairedGets);
  } finally { cleanup(dir); }
});

test('missing, stale, excessive scope, quota, storage, cost or source-pause gates block the first request', async () => {
  const dir = temporary(), plan = v.manifest(books), f = simulatedFetch();
  try {
    for (const mutate of [a => delete a.preExecutionGates, a => a.preExecutionGates.checked_at = 'invalid', a => a.preExecutionGates.checked_at = '2000-01-01', a => a.preExecutionGates.granted_scope += ' https://www.googleapis.com/auth/drive', a => a.preExecutionGates.quota_reads_per_user_minute = 29, a => a.preExecutionGates.storage_verified = false, a => a.preExecutionGates.costs_verified = 'UNKNOWN', a => a.preExecutionGates.source_writers_paused = false]) {
      const a = approval(plan); mutate(a); await assert.rejects(v.runProbe({ dir, books, approval: a, token: 'synthetic-token', fetch: f.fetch }), /PRE_EXECUTION_GATES_REQUIRED/);
    }
    assert.equal(f.calls, 0); assert.equal(fs.existsSync(path.join(dir, 'external-stream-live-probe.json')), false);
  } finally { cleanup(dir); }
});

test('failed or altered probe cannot authorize continuation, retry or a partial phase receipt', async () => {
  const dir = temporary(), plan = v.manifest(books), f = simulatedFetch({ failureAt: 1 }), a = approval(plan);
  try {
    await assert.rejects(v.runProbe({ dir, books, approval: a, token: 'synthetic-token', fetch: f.fetch }), /HTTP_401/);
    const probe = JSON.parse(fs.readFileSync(path.join(dir, 'external-stream-live-probe.json'))); assert.equal(probe.status, 'STOPPED'); assert.equal(f.calls, 1);
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'continuation-ledger.json'))).consumption.sheetsGets, 7);
    await assert.rejects(v.runProbe({ dir, books, approval: a, token: 'synthetic-token', fetch: f.fetch }), /EXISTING_ATTEMPT/);
    await assert.rejects(v.runPhase({ dir, phase: 'before', books, approval: a, token: 'synthetic-token', fetch: f.fetch }), /PROBE_ACCOUNTING/); assert.equal(f.calls, 1);
  } finally { cleanup(dir); }
  const clean = temporary(), good = simulatedFetch();
  try {
    const approved = await reviewedProbe(clean, plan, good), probe = JSON.parse(fs.readFileSync(path.join(clean, 'external-stream-live-probe.json')));
    for (const mutate of [p => p.grid.sha256 = '0'.repeat(64), p => p.grid.transport.bytes++, p => p.grid.required_research_columns = 207, p => p.grid.transport.elapsed_ms = 60000, p => p.grid.transport.peak_rss_bytes = v.MAX_RSS_BYTES + 1]) { const changed = structuredClone(probe); mutate(changed); assert.throws(() => v.verifyProbe(changed, approved, plan), /LIVE_PROBE_REVIEW/); }
  } finally { cleanup(clean); }
});

test('probe property drift stops after the first metadata read without repeating the grid', async () => {
  const dir = temporary(), plan = v.manifest(books), f = simulatedFetch();
  try {
    const a = await reviewedProbe(dir, plan, f); let calls = 0;
    const fetch = async (url, token, c) => { calls++; const body = meta(books[0]); body.sheets[1].properties.gridProperties.rowCount--; c.write(Buffer.from(JSON.stringify(body))); return c.finish(); };
    await assert.rejects(v.runPhase({ dir, phase: 'before', books, approval: a, token: 'synthetic-token', fetch, pause: async () => {} }), /PROBE_METADATA_CHANGED/);
    assert.equal(calls, 1); assert.equal(f.calls, 1); assert.equal(fs.existsSync(path.join(dir, 'external-stream-before.json')), false);
  } finally { cleanup(dir); }
});

test('the actual 60-second transport timeout aborts once and never finishes the consumer', async () => {
  const original = global.setTimeout; let calls = 0, destroyed = 0, finished = false;
  try {
    global.setTimeout = (callback, ms) => { assert.equal(ms, 60000); return original(callback, 5); };
    const get = () => { calls++; const req = new EventEmitter(); req.destroy = () => destroyed++; return req; };
    await assert.rejects(v.request(v.apiUrl(books[0]), 'synthetic-token', { write() {}, finish() { finished = true; } }, v.META_BYTES, get), /TIMEOUT_NO_RETRY/);
    assert.equal(calls, 1); assert.equal(destroyed, 1); assert.equal(finished, false);
  } finally { global.setTimeout = original; }
});
test('external 64 MiB wire cap aborts before completion and memory guard rejects before consumption', async () => {
  let written = 0, finished = false;
  const get = (url, options, callback) => { const req = new EventEmitter(); req.destroy = () => {}; queueMicrotask(() => { const chunk = Buffer.alloc(16384, 32), response = Readable.from((function* () { for (let i = 0; i <= v.GRID_BYTES / chunk.length; i++) yield chunk; })()); response.statusCode = 200; response.headers = { 'content-type': 'application/json' }; response.complete = true; callback(response); }); return req; };
  await assert.rejects(v.request(v.apiUrl(books[0]), 'synthetic-token', { write: b => written += b.length, finish: () => { finished = true; } }, v.GRID_BYTES, get), /BODY_LIMIT/); assert.equal(written, v.GRID_BYTES); assert.equal(finished, false);
  const previous = process.memoryUsage;
  try { process.memoryUsage = () => ({ heapUsed: v.MAX_HEAP_BYTES + 1, rss: 1 }); const f = fakeGet(Buffer.from('{}')); await assert.rejects(v.request(v.apiUrl(books[0]), 'synthetic-token', { write() { assert.fail('must stop before parsing'); } }, v.META_BYTES, f.get), /MEMORY_LIMIT/); } finally { process.memoryUsage = previous; }
});
test('AFTER stops on content mismatch and incomplete or persistence-ambiguous BEFORE evidence', async () => {
  const dir = temporary(), plan = v.manifest(books), f = simulatedFetch();
  try { const a = await reviewedProbe(dir, plan, f), before = await v.runPhase({ dir, phase: 'before', books, approval: a, token: 'synthetic-token', fetch: f.fetch, pause: async () => {} });
    for (const mutate of [b => b.google_gets--, b => b.books[0].grids.pop(), b => b.books[0].grids[0].sha256 = '0'.repeat(64)]) { const b = structuredClone(before); mutate(b); assert.throws(() => v.verifyBefore(b, { status: 'VERIFIED' }, plan), /BEFORE_INCOMPLETE/); }
    assert.throws(() => v.verifyBefore(before, { status: 'STOPPED' }, plan), /BEFORE_INCOMPLETE/);
    const changed = simulatedFetch({ changedCell: true }); await assert.rejects(v.runPhase({ dir, phase: 'after', books, approval: a, token: 'synthetic-token', fetch: changed.fetch, pause: async () => {} }), /SOURCE_CONTENT_CHANGED/); assert.equal(changed.calls, 4); assert.equal(fs.existsSync(path.join(dir, 'external-stream-after.json')), false);
  } finally { cleanup(dir); }
});
test('local persistence failure stops before a Google dispatch and preserves earlier evidence', async () => {
  const dir = temporary(), original = fs.renameSync, f = simulatedFetch(); fs.writeFileSync(path.join(dir, 'previous-recovery-proof.json'), 'SYNTHETIC preserved');
  try { fs.renameSync = () => { throw Error('synthetic persistence failure'); }; await assert.rejects(v.runProbe({ dir, books, approval: approval(v.manifest(books)), token: 'synthetic-token', fetch: f.fetch }), /PERSISTENCE_STOP/); assert.equal(f.calls, 0); assert.equal(fs.readFileSync(path.join(dir, 'previous-recovery-proof.json'), 'utf8'), 'SYNTHETIC preserved'); assert.equal(fs.existsSync(path.join(dir, 'external-stream-before.json')), false); }
  finally { fs.renameSync = original; cleanup(dir); }
});
