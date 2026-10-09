'use strict';
// Read-only EXTERNAL runner. Default CLI only plans; no n8n or provider calls.
const fs = require('node:fs'), path = require('node:path'), https = require('node:https'), crypto = require('node:crypto');
const { JsonStream, semanticHash } = require('./integrity-json-stream');
const { titles, RANGE, MAX_ROWS, MAX_COLUMNS } = require('./source-integrity-grid');
const HEADERS = require('./dataset-output').ALL_HEADERS;
const META_FIELDS = 'spreadsheetId,spreadsheetUrl,properties,namedRanges,developerMetadata,dataSources,dataSourceSchedules,comments,commentsViewMode,sheets(properties,merges,conditionalFormats,filterViews,protectedRanges,basicFilter,charts,bandedRanges,developerMetadata,rowGroups,columnGroups,slicers,tables,commentAnchors)';
// Read whole GridData subtrees, including calculated/display values and future cell fields.
const GRID_FIELDS = 'spreadsheetId,sheets(properties,data)';
const META_BYTES = 1024 * 1024, GRID_BYTES = 64 * 1024 * 1024, TOKEN_BYTES = 1024 * 1024;
const MAX_HEAP_BYTES = 64 * 1024 * 1024, MAX_RSS_BYTES = 192 * 1024 * 1024;
const fail = code => { throw Error('INTEGRITY_EXTERNAL_' + code); };
const errorCode = error => /^INTEGRITY_(?:EXTERNAL|STREAM)_[A-Z0-9_]{1,80}$/.test(error?.message || '') ? error.message : 'INTEGRITY_EXTERNAL_RUNTIME_STOP';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function apiUrl(book, sheet) {
  if (!/^[A-Za-z0-9_-]{5,100}$/.test(book.spreadsheet_id)) fail('BOOK_ID');
  const u = new URL('https://sheets.googleapis.com/v4/spreadsheets/' + book.spreadsheet_id);
  u.searchParams.set('fields', sheet === undefined ? META_FIELDS : GRID_FIELDS);
  if (sheet === undefined) u.searchParams.set('commentsViewMode', 'COMMENTS_VIEW_MODE_INCLUDED');
  if (sheet !== undefined) { if (!titles(book).includes(sheet)) fail('UNREGISTERED_SHEET'); u.searchParams.append('ranges', "'" + sheet.replace(/'/g, "''") + "'!" + RANGE); }
  return u.href;
}
function manifest(books) {
  if (books.length !== 3 || new Set(books.map(b => b.dataset_id)).size !== 3 || new Set(books.map(b => b.spreadsheet_id)).size !== 3) fail('THREE_DISTINCT_BOOKS_REQUIRED');
  const datasets = books.map(book => {
    const sheets = titles(book); if (sheets.length > 10 || sheets.length < 1) fail('TAB_LIMIT');
    return { dataset: book.dataset_id, spreadsheet_id: book.spreadsheet_id, sheets,
      requests: [{ role: 'metadata-start', url: apiUrl(book), maxBytes: META_BYTES }, ...sheets.map(sheet => ({ role: 'grid', sheet, range: RANGE, url: apiUrl(book, sheet), maxBytes: GRID_BYTES })), { role: 'metadata-end', url: apiUrl(book), maxBytes: META_BYTES }] };
  });
  const onePhaseGets = datasets.reduce((n, d) => n + d.requests.length, 0);
  const result = { method: 'EXTERNAL_STREAMING_SHEETS_V1', source_sha256: sha(fs.readFileSync(__filename)), parser_sha256: sha(fs.readFileSync(require.resolve('./integrity-json-stream'))), schema_sha256: semanticHash(HEADERS), schema_columns: HEADERS.length,
    datasets, onePhaseGets, pairedGets: onePhaseGets * 2, cloudExecutions: 0, sourceWrites: 0, tokenBytes: TOKEN_BYTES, gridBytes: GRID_BYTES, metadataBytes: META_BYTES, heapBytes: MAX_HEAP_BYTES, rssBytes: MAX_RSS_BYTES, requestTimeoutMs: 60000, minimumStartIntervalMs: 2100 };
  return { ...result, sha256: semanticHash(result) };
}
function metadata(body, book) {
  if (!body || body.spreadsheetId !== book.spreadsheet_id || !Array.isArray(body.sheets) || !body.properties || typeof body.properties !== 'object' || typeof body.spreadsheetUrl !== 'string' || body.commentsViewMode !== 'COMMENTS_VIEW_MODE_INCLUDED') fail('METADATA_ID');
  const names = body.sheets.map(s => s.properties?.title), expected = titles(book);
  if (new Set(names).size !== names.length || semanticHash([...names].sort()) !== semanticHash([...expected].sort())) fail('TAB_COVERAGE');
  if (new Set(body.sheets.map(s => s.properties?.sheetId)).size !== names.length) fail('SHEET_ASSOCIATION');
  for (const sheet of body.sheets) {
    const p = sheet.properties, g = p.gridProperties;
    if (!Number.isInteger(p.sheetId) || p.sheetId < 0 || (p.sheetType && p.sheetType !== 'GRID') || !g || !Number.isInteger(g.rowCount) || !Number.isInteger(g.columnCount) || g.rowCount < 1 || g.rowCount > MAX_ROWS || g.columnCount < 1 || g.columnCount > MAX_COLUMNS || sheet.data !== undefined) fail('GRID_COVERAGE');
    if (p.title === 'Arc Research' && g.columnCount < HEADERS.length) fail('RESEARCH_COLUMN_COVERAGE');
  }
  return { body, sha256: semanticHash(body) };
}
function gridConsumer(meta, book, title) {
  const expected = meta ? new Map(meta.body.sheets.map(s => [s.properties.title, s.properties])) : null, sheets = new Map(); let id;
  const parser = new JsonStream(event => {
    const p = event.path;
    if (event.type === 'scalar' && p.length === 1 && p[0] === 'spreadsheetId') id = event.value;
    if (p[0] !== 'sheets' || !Number.isInteger(p[1])) return;
    let s = sheets.get(p[1]); if (!s) { if (sheets.size >= 10) fail('TAB_LIMIT'); s = { properties: {}, blocks: new Map(), propertyHash: null }; sheets.set(p[1], s); }
    if (p[2] === 'properties') {
      if (event.type === 'scalar' && p.length === 4 && ['title', 'sheetId', 'sheetType'].includes(p[3])) s.properties[p[3]] = event.value;
      if (event.type === 'scalar' && p.length === 5 && p[3] === 'gridProperties' && ['rowCount', 'columnCount'].includes(p[4])) (s.properties.gridProperties ||= {})[p[4]] = event.value;
      if (event.type === 'container' && p.length === 3) s.propertyHash = event.hash;
    }
    if (p[2] !== 'data' || !Number.isInteger(p[3])) return;
    if (p[3] !== 0) fail('GRID_BLOCK_COVERAGE');
    let b = s.blocks.get(p[3]); if (!b) { b = { startRow: 0, startColumn: 0, rows: 0, maxValues: 0, rowMetadata: 0, columnMetadata: 0, headers: [] }; s.blocks.set(p[3], b); }
    if (p.length === 4 && ((event.type === 'container' && event.kind !== 'object') || event.type === 'scalar')) fail('GRID_SHAPE');
    if ((p.length === 5 && ['rowData', 'rowMetadata', 'columnMetadata'].includes(p[4]) || p.length === 7 && p[4] === 'rowData' && p[6] === 'values') && event.type === 'scalar') fail('GRID_SHAPE');
    if (p.length === 6 && ['rowMetadata', 'columnMetadata'].includes(p[4]) && ((event.type === 'container' && event.kind !== 'object') || event.type === 'scalar')) fail('GRID_SHAPE');
    if ([6, 8].includes(p.length) && p[4] === 'rowData' && (p.length === 6 || p[6] === 'values') && ((event.type === 'container' && event.kind !== 'object') || event.type === 'scalar')) fail('GRID_SHAPE');
    if (event.type === 'scalar' && p.length === 5 && ['startRow', 'startColumn'].includes(p[4])) b[p[4]] = event.value;
    if (event.type === 'container' && p.length === 5 && ['rowData', 'rowMetadata', 'columnMetadata'].includes(p[4])) { if (event.kind !== 'array') fail('GRID_SHAPE'); b[p[4] === 'rowData' ? 'rows' : p[4]] = event.count; }
    if (event.type === 'container' && p.length === 7 && p[4] === 'rowData' && p[6] === 'values') { if (event.kind !== 'array') fail('GRID_SHAPE'); b.maxValues = Math.max(b.maxValues, event.count); }
    if (title === 'Arc Research' && event.type === 'scalar' && p.length === 10 && p[4] === 'rowData' && p[5] === 0 && p[6] === 'values' && p[8] === 'userEnteredValue' && p[9] === 'stringValue') { if (p[7] >= MAX_COLUMNS || typeof event.value !== 'string' || Buffer.byteLength(event.value) > 256) fail('HEADER_LIMIT'); b.headers[p[7]] = event.value; }
  });
  return {
    write: bytes => parser.write(bytes),
    finish() {
      const digest = parser.finish(); if (id !== book.spreadsheet_id) fail('GRID_BOOK_ASSOCIATION');
      const actual = [...sheets.values()], matching = actual.filter(s => s.properties.title === title);
      if (matching.length !== 1 || new Set(actual.map(s => s.properties.title)).size !== actual.length) fail('GRID_SHEET_ASSOCIATION');
      for (const sheet of actual) {
        const props = expected ? expected.get(sheet.properties.title) : sheet.properties, g = props?.gridProperties;
        if (!props || !titles(book).includes(props.title) || !Number.isInteger(props.sheetId) || props.sheetId < 0 || (props.sheetType && props.sheetType !== 'GRID') || !g || !Number.isInteger(g.rowCount) || !Number.isInteger(g.columnCount) || g.rowCount < 1 || g.rowCount > MAX_ROWS || g.columnCount < 1 || g.columnCount > MAX_COLUMNS || (expected && sheet.propertyHash !== semanticHash(props))) fail('GRID_METADATA_CHANGED');
        if (sheet.properties.title !== title && sheet.blocks.size) fail('UNREQUESTED_GRID');
      }
      if (new Set(actual.map(s => s.properties.sheetId)).size !== actual.length) fail('GRID_SHEET_ASSOCIATION');
      const sheet = matching[0], props = expected ? expected.get(title) : sheet.properties, g = props.gridProperties, block = sheet.blocks.get(0);
      if (!block || sheet.blocks.size !== 1 || block.startRow !== 0 || block.startColumn !== 0 || block.rows > g.rowCount || block.maxValues > g.columnCount || block.rowMetadata > g.rowCount || block.columnMetadata > g.columnCount) fail('GRID_COVERAGE');
      if (title === 'Arc Research' && (g.columnCount < HEADERS.length || HEADERS.some((header, index) => block.headers[index] !== header))) fail('RESEARCH_HEADERS_INCOMPLETE');
      return { title, sheet_id: props.sheetId, rows: g.rowCount, columns: g.columnCount, requested_range: RANGE, complete_grid: true, required_research_columns: title === 'Arc Research' ? HEADERS.length : 0, sha256: digest.sha256, body_bytes: digest.bytes, property_refs: actual.map(s => ({ title: s.properties.title, sheet_id: s.properties.sheetId, sha256: s.propertyHash })), parser: { peak_token_bytes: digest.peakTokenBytes, peak_depth: digest.peakDepth, peak_object_keys: digest.peakObjectKeys } };
    }
  };
}
// No redirects, retries, compression expansion, cookies, filesystem data export,
// or generic URLs. Credentials are sent only to the pinned Sheets API origin.
async function request(url, token, consumer, maxBytes, get = https.get) {
  const target = new URL(url);
  if (target.origin !== 'https://sheets.googleapis.com' || target.username || target.password || target.hash || !/^\/v4\/spreadsheets\/[A-Za-z0-9_-]+$/.test(target.pathname)) fail('HOST_ALLOWLIST');
  if (typeof token !== 'string' || !token || /[\r\n]/.test(token)) fail('CREDENTIAL_REQUIRED');
  return new Promise((resolve, reject) => {
    let done = false, timer; const started = Date.now();
    const stop = code => { if (done) return; done = true; clearTimeout(timer); req.destroy(); reject(Error('INTEGRITY_EXTERNAL_' + code)); };
    const req = get(target, { method: 'GET', rejectUnauthorized: true, highWaterMark: 16384, headers: { Authorization: 'Bearer ' + token, 'Accept-Encoding': 'identity', Accept: 'application/json' } }, response => {
      if (response.statusCode !== 200) { response.destroy(); stop('HTTP_' + response.statusCode + '_STOP'); return; }
      if (!/^application\/json(?:;|$)/i.test(response.headers['content-type'] || '') || !['', 'identity'].includes(response.headers['content-encoding'] || '')) { response.destroy(); stop('CONTENT_ENCODING'); return; }
      const length = response.headers['content-length'];
      if (length !== undefined && (!/^\d+$/.test(String(length)) || Number(length) > maxBytes)) { response.destroy(); stop('BODY_LIMIT'); return; }
      let bytes = 0, chunks = 0, peakHeap = 0, peakRss = 0;
      response.on('data', chunk => {
        if (done) return; bytes += chunk.length; chunks++;
        if (bytes > maxBytes) { response.destroy(); stop('BODY_LIMIT'); return; }
        try { const usage = process.memoryUsage(); peakHeap = Math.max(peakHeap, usage.heapUsed); peakRss = Math.max(peakRss, usage.rss); if (peakHeap > MAX_HEAP_BYTES || peakRss > MAX_RSS_BYTES) fail('MEMORY_LIMIT'); consumer.write(chunk); } catch (error) { response.destroy(); if (!done) { done = true; clearTimeout(timer); req.destroy(); reject(Error(errorCode(error))); } }
      });
      response.on('error', () => stop('TRANSPORT_STOP'));
      response.on('aborted', () => stop('TRUNCATED'));
      response.on('end', () => {
        if (done) return;
        if (response.complete === false || (length !== undefined && bytes !== Number(length))) { stop('TRUNCATED'); return; }
        try { const receipt = consumer.finish(); done = true; clearTimeout(timer); resolve({ ...receipt, transport: { bytes, chunks, elapsed_ms: Date.now() - started, peak_heap_bytes: peakHeap, peak_rss_bytes: peakRss, status: 200, identity_encoding: true, complete: true } }); } catch (error) { done = true; clearTimeout(timer); req.destroy(); reject(Error(errorCode(error))); }
      });
    });
    timer = setTimeout(() => stop('TIMEOUT_NO_RETRY'), 60000);
    req.on('error', () => stop('TRANSPORT_STOP'));
  });
}
function metadataConsumer(book) {
  const chunks = [], parser = new JsonStream(); let bytes = 0;
  return { write(chunk) { bytes += chunk.length; if (bytes > META_BYTES) fail('METADATA_LIMIT'); parser.write(chunk); chunks.push(chunk); }, finish() { parser.finish(); let body; try { body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))); } catch { fail('METADATA_JSON'); } return { ...metadata(body, book), bytes }; } };
}
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
function atomic(file, data) {
  // Leave a failed replacement intact as recovery evidence; never retry it.
  const temp = file + '.new-' + crypto.randomUUID();
  try { fs.writeFileSync(temp, JSON.stringify(data, null, 2), { flag: 'wx' }); fs.renameSync(temp, file); }
  catch { fail('PERSISTENCE_STOP'); }
}
function verifyApproval(approval, plan, ledger, phase = 'before') {
  if (approval?.status !== 'OWNER_APPROVED' || !approval.ownerApprovedAt || approval.manifest_sha256 !== plan.sha256 || approval.credential_scope !== 'https://www.googleapis.com/auth/spreadsheets.readonly' || approval.maxGoogleGets !== plan.pairedGets || approval.maxCloudExecutions !== 0) fail('EXPLICIT_EXTERNAL_APPROVAL_REQUIRED');
  if (ledger.consumption.sheetsGets + (phase === 'before' ? plan.pairedGets : plan.onePhaseGets) > ledger.caps.sheetsGets) fail('REQUEST_BUDGET');
}
function verifyBefore(receipt, progress, plan) {
  if (!receipt?.ok || receipt.phase !== 'before' || progress?.status !== 'VERIFIED' || receipt.manifest_sha256 !== plan.sha256 || receipt.google_gets !== plan.onePhaseGets || !Array.isArray(receipt.books) || receipt.books.length !== plan.datasets.length) fail('BEFORE_INCOMPLETE');
  for (let i = 0; i < plan.datasets.length; i++) {
    const book = receipt.books[i], expected = plan.datasets[i];
    if (book.dataset !== expected.dataset || !Array.isArray(book.grids) || book.grids.length !== expected.sheets.length || book.grids.some((g, j) => g.title !== expected.sheets[j] || !g.complete_grid || !/^[a-f0-9]{64}$/.test(g.sha256)) || !/^[a-f0-9]{64}$/.test(book.metadata_sha256)) fail('BEFORE_INCOMPLETE');
    const hash = semanticHash({ metadata: book.metadata_sha256, grids: book.grids.map(g => ({ title: g.title, sheet_id: g.sheet_id, rows: g.rows, columns: g.columns, range: g.requested_range, sha256: g.sha256 })) });
    if (book.sha256 !== hash) fail('BEFORE_INCOMPLETE');
  }
}
function verifyPreconditions(approval) {
  const g = approval?.preExecutionGates;
  if (!g || g.status !== 'VERIFIED' || !/^[a-f0-9]{64}$/.test(g.client_sha256 || '') || g.granted_scope !== 'https://www.googleapis.com/auth/spreadsheets.readonly' || g.storage_verified !== true || g.costs_verified !== 'NO_ADDITIONAL_CHARGES' || g.source_writers_paused !== true || !Number.isFinite(g.quota_reads_per_user_minute) || g.quota_reads_per_user_minute < 30 || !Number.isFinite(g.quota_reads_per_project_minute) || g.quota_reads_per_project_minute < 30 || !g.checked_at || Date.now() - Date.parse(g.checked_at) < 0 || Date.now() - Date.parse(g.checked_at) > 60 * 60 * 1000 || !Number.isFinite(Date.parse(g.checked_at))) fail('PRE_EXECUTION_GATES_REQUIRED');
}
async function runProbe({ dir, books, approval, token, fetch = request }) {
  const plan = manifest(books), file = path.join(dir, 'external-stream-live-probe.json'), ledgerFile = path.join(dir, 'continuation-ledger.json');
  verifyApproval(approval, plan, read(ledgerFile)); verifyPreconditions(approval);
  if (!token) fail('CREDENTIAL_REQUIRED');
  if (fs.existsSync(file) || fs.existsSync(path.join(dir, 'external-stream-before-progress.json'))) fail('EXISTING_ATTEMPT_NO_RETRY');
  const lockFile = path.join(dir, 'external-stream.lock'), lock = fs.openSync(lockFile, 'wx');
  const book = books[0], step = plan.datasets[0].requests.find(s => s.role === 'grid' && s.sheet === 'Arc Research');
  const probe = { status: 'PREPARED', manifest_sha256: plan.sha256, dataset: book.dataset_id, url_sha256: sha(step.url), grid: null, whole_phase_verified: false };
  try {
    fs.writeFileSync(file, JSON.stringify(probe, null, 2), { flag: 'wx' });
    const ledger = read(ledgerFile), receipt = { phase: 'external-live-probe', dataset: book.dataset_id, role: 'grid', sheet: step.sheet, at: new Date().toISOString(), status: 'DISPATCHED', url_sha256: probe.url_sha256 };
    ledger.consumption.sheetsGets++; (ledger.integrityRequests ||= []).push(receipt); atomic(ledgerFile, ledger); probe.status = 'DISPATCHED'; atomic(file, probe);
    try {
      probe.grid = await fetch(step.url, token, gridConsumer(null, book, step.sheet), step.maxBytes);
      probe.grid_sha256 = semanticHash(probe.grid); probe.status = 'AWAITING_REVIEW'; receipt.status = 'HASHED'; receipt.bytes = probe.grid.body_bytes;
    } catch (error) { probe.status = 'STOPPED'; probe.error = receipt.error = errorCode(error); receipt.status = 'FAILED_STOPPED'; atomic(ledgerFile, ledger); throw error; }
    atomic(ledgerFile, ledger); atomic(file, probe); return probe;
  } catch (error) { probe.status = 'STOPPED'; probe.error = errorCode(error); try { atomic(file, probe); } catch { fail('PERSISTENCE_STOP'); } throw Error(probe.error); }
  finally { fs.closeSync(lock); fs.unlinkSync(lockFile); }
}
function verifyProbe(probe, approval, plan) {
  const t = probe?.grid?.transport;
  if (probe?.status !== 'AWAITING_REVIEW' || probe.manifest_sha256 !== plan.sha256 || probe.dataset !== plan.datasets[0].dataset || probe.grid_sha256 !== semanticHash(probe.grid) || probe.grid?.title !== 'Arc Research' || !probe.grid.complete_grid || probe.grid.required_research_columns !== HEADERS.length || !t?.complete || t.status !== 200 || t.identity_encoding !== true || !['bytes', 'chunks', 'elapsed_ms', 'peak_heap_bytes', 'peak_rss_bytes'].every(k => Number.isFinite(t[k]) && t[k] >= 0) || !Number.isInteger(t.chunks) || t.bytes !== probe.grid.body_bytes || t.bytes < 1 || t.bytes > GRID_BYTES || t.chunks < 1 || t.elapsed_ms >= 60000 || t.peak_heap_bytes > MAX_HEAP_BYTES || t.peak_rss_bytes > MAX_RSS_BYTES || approval.liveProbeReviewedSha256 !== semanticHash(probe)) fail('LIVE_PROBE_REVIEW_REQUIRED');
}
function probeMetadata(probe, start) {
  if (!Array.isArray(probe.grid.property_refs) || !probe.grid.property_refs.length) fail('PROBE_METADATA_CHANGED');
  for (const p of probe.grid.property_refs) { const actual = start.body.sheets.find(s => s.properties.title === p.title)?.properties; if (!actual || actual.sheetId !== p.sheet_id || semanticHash(actual) !== p.sha256) fail('PROBE_METADATA_CHANGED'); }
}
async function runPhase({ dir, phase, books, approval, token, fetch = request, pause = ms => new Promise(r => setTimeout(r, ms)) }) {
  if (!['before', 'after'].includes(phase)) fail('PHASE');
  const plan = manifest(books), ledgerFile = path.join(dir, 'continuation-ledger.json'), progressFile = path.join(dir, 'external-stream-' + phase + '-progress.json'), outputFile = path.join(dir, 'external-stream-' + phase + '.json');
  if (fs.existsSync(progressFile) || fs.existsSync(outputFile)) fail('EXISTING_ATTEMPT_NO_RETRY');
  const ledgerStart = read(ledgerFile), probe = read(path.join(dir, 'external-stream-live-probe.json'));
  if (!ledgerStart.integrityRequests?.some(r => r.phase === 'external-live-probe' && r.status === 'HASHED' && r.dataset === probe.dataset && r.url_sha256 === probe.url_sha256 && r.bytes === probe.grid?.body_bytes)) fail('PROBE_ACCOUNTING_INCOMPLETE');
  // BEFORE reuses exactly one reviewed GET, rather than exceeding the paired budget.
  verifyApproval(approval, plan, { ...ledgerStart, consumption: { ...ledgerStart.consumption, sheetsGets: ledgerStart.consumption.sheetsGets - (phase === 'before' ? 1 : 0) } }, phase); verifyPreconditions(approval); verifyProbe(probe, approval, plan); if (typeof token !== 'string' || !token) fail('CREDENTIAL_REQUIRED');
  const before = phase === 'after' ? read(path.join(dir, 'external-stream-before.json')) : null;
  if (before) verifyBefore(before, read(path.join(dir, 'external-stream-before-progress.json')), plan);
  const lockFile = path.join(dir, 'external-stream.lock'), lock = fs.openSync(lockFile, 'wx');
  const progress = { phase, status: 'NEW', requests: [], books: [] }; let lastStart = 0;
  try {
    atomic(progressFile, progress);
    for (let i = 0; i < books.length; i++) {
      const book = books[i], spec = plan.datasets[i]; let start; const grids = [];
      for (const step of spec.requests) {
        if (phase === 'before' && i === 0 && step.role === 'grid' && step.sheet === 'Arc Research') {
          probeMetadata(probe, start);
          grids.push(probe.grid); progress.requests.push({ status: 'REUSED_REVIEWED_PROBE', dataset: book.dataset_id, role: step.role, sheet: step.sheet, bytes: probe.grid.body_bytes }); atomic(progressFile, progress); continue;
        }
        const delay = Math.max(0, plan.minimumStartIntervalMs - (Date.now() - lastStart)); if (delay) await pause(delay);
        const ledger = read(ledgerFile); if (ledger.consumption.sheetsGets >= ledger.caps.sheetsGets) fail('REQUEST_BUDGET');
        const receipt = { phase: 'external-stream-' + phase, dataset: book.dataset_id, role: step.role, sheet: step.sheet, at: new Date().toISOString(), status: 'DISPATCHED', url_sha256: sha(step.url) };
        ledger.consumption.sheetsGets++; (ledger.integrityRequests ||= []).push(receipt); atomic(ledgerFile, ledger);
        progress.status = 'DISPATCHED'; progress.requests.push(receipt); atomic(progressFile, progress); lastStart = Date.now();
        try {
          const result = await fetch(step.url, token, step.role === 'grid' ? gridConsumer(start, book, step.sheet) : metadataConsumer(book), step.maxBytes);
          if (step.role === 'metadata-start') { start = result; if (phase === 'before' && i === 0) probeMetadata(probe, start); }
          else if (step.role === 'grid') grids.push(result);
          else if (result.sha256 !== start.sha256) fail('METADATA_CHANGED_DURING_READ');
          receipt.status = 'HASHED'; receipt.bytes = result.body_bytes ?? result.bytes;
          atomic(ledgerFile, ledger); atomic(progressFile, progress);
        } catch (error) {
          receipt.status = 'FAILED_STOPPED'; receipt.error = errorCode(error); progress.status = 'STOPPED'; progress.error = receipt.error;
          atomic(ledgerFile, ledger); atomic(progressFile, progress); throw Error(receipt.error);
        }
      }
      if (grids.length !== spec.sheets.length || semanticHash(grids.map(g => g.title).sort()) !== semanticHash([...spec.sheets].sort())) fail('INCOMPLETE_BOOK');
      const result = { dataset: book.dataset_id, metadata_sha256: start.sha256, grids, sha256: semanticHash({ metadata: start.sha256, grids: grids.map(g => ({ title: g.title, sheet_id: g.sheet_id, rows: g.rows, columns: g.columns, range: g.requested_range, sha256: g.sha256 })) }) };
      if (before && before.books[i].sha256 !== result.sha256) fail('SOURCE_CONTENT_CHANGED');
      progress.books.push(result); progress.status = 'BOOK_COMPLETE'; atomic(progressFile, progress);
    }
    const output = { ok: true, phase, method: plan.method, manifest_sha256: plan.sha256, books: progress.books, google_gets: progress.requests.length, cloud_executions: 0, source_writes: 0, research_writes: 0 };
    if (output.google_gets !== plan.onePhaseGets || output.books.length !== 3) fail('INCOMPLETE_PHASE');
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2), { flag: 'wx' }); progress.status = 'VERIFIED'; atomic(progressFile, progress); return output;
  } catch (error) { progress.status = 'STOPPED'; progress.error = errorCode(error); try { atomic(progressFile, progress); } catch { fail('PERSISTENCE_STOP'); } throw Error(progress.error); }
  finally { fs.closeSync(lock); fs.unlinkSync(lockFile); }
}
module.exports = { META_FIELDS, GRID_FIELDS, META_BYTES, GRID_BYTES, TOKEN_BYTES, MAX_HEAP_BYTES, MAX_RSS_BYTES, apiUrl, manifest, metadata, gridConsumer, metadataConsumer, request, verifyApproval, verifyBefore, verifyPreconditions, verifyProbe, runProbe, runPhase };
if (require.main === module) {
  const books = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../config/datasets.json'))).datasets;
  if (process.argv[2] === '--run') {
    const dir = path.resolve(__dirname, '../private/operator-stage1'), token = process.env.ARC_INTEGRITY_ACCESS_TOKEN; delete process.env.ARC_INTEGRITY_ACCESS_TOKEN;
    const options = { dir, phase: process.argv[3], books, token, approval: read(path.join(dir, 'external-stream-approval.json')) };
    (process.argv[3] === 'probe' ? runProbe(options) : runPhase(options)).then(v => console.log(JSON.stringify({ ok: v.ok, phase: v.phase, status: v.status, books: v.books?.length, google_gets: v.google_gets ?? 1 }))).catch(e => { console.error(errorCode(e)); process.exitCode = 1; });
  } else { const p = manifest(books); console.log(JSON.stringify({ method: p.method, manifest_sha256: p.sha256, books: p.datasets.map(d => ({ dataset: d.dataset, sheets: d.sheets.length, gets_per_phase: d.requests.length })), gets_before: p.onePhaseGets, gets_after: p.onePhaseGets, cloud_executions: 0, credentials_needed: 'New owner-approved local read-only OAuth access token; no n8n credential extraction', live_calls: 0 }, null, 2)); }
}
