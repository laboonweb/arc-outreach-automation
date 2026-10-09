'use strict';
// A redirect is a separately reviewed GET, never an automatic follow or retry.
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const crypto = require('node:crypto');
const { members } = require('./verify-source-integrity-external');
const MAX_BYTES = 8 * 1024 * 1024;
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
function safeUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || url.hash) throw Error('INTEGRITY_UNSAFE_URL');
  return url;
}
function validateReview(pending, review) {
  const url = safeUrl(pending.url);
  if (!review || review.url_sha256 !== digest(pending.url) || review.hostname !== url.hostname || review.pathname !== url.pathname || !review.reviewed_at) throw Error('INTEGRITY_EXACT_REDIRECT_REVIEW_REQUIRED');
  if (!/^(?:docs\.google\.com|[a-z0-9-]+\.googleusercontent\.com)$/.test(url.hostname)) throw Error('INTEGRITY_NON_GOOGLE_EXPORT_HOST');
  if (!/\/export(?:\/|$)/.test(url.pathname)) throw Error('INTEGRITY_EXPORT_PATH_REQUIRED');
  if (!pending.spreadsheet_id || !url.pathname.endsWith('/' + pending.spreadsheet_id)) throw Error('INTEGRITY_REDIRECT_BOOK_MISMATCH');
  if (url.searchParams.get('format') !== 'xlsx' || [...url.searchParams.keys()].some(key => key !== 'format')) throw Error('INTEGRITY_REDIRECT_QUERY_NOT_REVIEWED');
  return url;
}
function download(url, get = https.get) {
  safeUrl(url);
  return new Promise((resolve, reject) => {
    const request = get(url, { timeout: 30000 }, response => {
      if (response.statusCode === 307) {
        const location = response.headers.location;
        response.resume();
        if (!location) return reject(Error('INTEGRITY_REDIRECT_LOCATION_MISSING'));
        try { const destination = safeUrl(new URL(location, url).href); resolve({ redirect: destination.href }); } catch (error) { reject(error); }
        return;
      }
      if (response.statusCode !== 200) { response.resume(); reject(Error('INTEGRITY_HTTP_' + response.statusCode + '_STOP')); return; }
      if (Number(response.headers['content-length'] || 0) > MAX_BYTES) { response.destroy(); reject(Error('INTEGRITY_COMPRESSED_LIMIT')); return; }
      const chunks = []; let length = 0;
      response.on('data', part => { length += part.length; if (length > MAX_BYTES) { response.destroy(Error('INTEGRITY_COMPRESSED_LIMIT')); return; } chunks.push(part); });
      response.on('error', reject);
      response.on('end', () => resolve({ bytes: Buffer.concat(chunks) }));
    });
    request.on('timeout', () => request.destroy(Error('INTEGRITY_TIMEOUT_NO_RETRY')));
    request.on('error', reject);
  });
}
function paths(dir, phase) {
  if (!['before', 'after'].includes(phase)) throw Error('INTEGRITY_PHASE_REQUIRED');
  return { ledger: path.join(dir, 'continuation-ledger.json'), progress: path.join(dir, 'external-v2-' + phase + '-progress.json'), output: path.join(dir, 'external-v2-' + phase + '.json'), lock: path.join(dir, 'external-v2.lock') };
}
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2));
function approve(dir, phase, dataset, review) {
  const p = paths(dir, phase), state = read(p.progress);
  if (state.status !== 'REDIRECT_REVIEW_REQUIRED' || state.pending.dataset !== dataset) throw Error('INTEGRITY_NO_PENDING_REDIRECT');
  validateReview(state.pending, review);
  state.pending.review = review; write(p.progress, state);
}
async function run(dir, phase, books, fetch = download) {
  const p = paths(dir, phase);
  if (fs.existsSync(p.output)) throw Error('INTEGRITY_BASELINE_ALREADY_EXISTS');
  const lock = fs.openSync(p.lock, 'wx');
  try {
    const state = fs.existsSync(p.progress) ? read(p.progress) : { phase, status: 'NEW', books: [], pending: null };
    if (['STOPPED', 'DISPATCHED'].includes(state.status)) throw Error('INTEGRITY_STOPPED_NO_RETRY');
    const baseline = phase === 'after' ? read(paths(dir, 'before').output) : null;
    for (const book of books) {
      if (state.books.some(x => x.dataset === book.dataset_id)) continue;
      const pending = state.pending;
      if (pending && pending.dataset !== book.dataset_id) throw Error('INTEGRITY_PENDING_DATASET_MISMATCH');
      const url = pending ? validateReview(pending, pending.review).href : 'https://docs.google.com/spreadsheets/d/' + book.spreadsheet_id + '/export?format=xlsx';
      const ledger = read(p.ledger);
      if (ledger.consumption.sheetsGets >= ledger.caps.sheetsGets) throw Error('INTEGRITY_REQUEST_CAP');
      const receipt = { phase: 'v2-' + phase, dataset: book.dataset_id, hop: pending ? 1 : 0, at: new Date().toISOString(), url_sha256: digest(url), status: 'DISPATCHED' };
      ledger.consumption.sheetsGets++; (ledger.integrityRequests ||= []).push(receipt); write(p.ledger, ledger);
      state.status = 'DISPATCHED'; write(p.progress, state);
      try {
        const response = await fetch(url);
        if (response.redirect) {
          if (pending) throw Error('INTEGRITY_SECOND_REDIRECT_STOP');
          state.status = 'REDIRECT_REVIEW_REQUIRED'; state.pending = { dataset: book.dataset_id, spreadsheet_id: book.spreadsheet_id, url: response.redirect, url_sha256: digest(response.redirect), received_at: new Date().toISOString() };
          receipt.status = 'REDIRECT_RECORDED_NOT_FOLLOWED'; write(p.ledger, ledger); write(p.progress, state);
          const target = safeUrl(response.redirect);
          return { status: state.status, dataset: book.dataset_id, hostname: target.hostname, pathname: target.pathname, url_sha256: state.pending.url_sha256 };
        }
        if (!Buffer.isBuffer(response.bytes) || response.bytes.length > MAX_BYTES) throw Error('INTEGRITY_INVALID_RESPONSE');
        const contents = members(response.bytes), result = { dataset: book.dataset_id, spreadsheet_id: book.spreadsheet_id, compressed_bytes: response.bytes.length, ...contents };
        fs.writeFileSync(path.join(dir, 'external-v2-' + phase + '-' + book.dataset_id + '.xlsx'), response.bytes, { flag: 'wx' });
        if (baseline && baseline.books.find(x => x.dataset === result.dataset)?.content_sha256 !== result.content_sha256) throw Error('SOURCE_CONTENT_CHANGED_STOP');
        state.books.push(result); state.pending = null; state.status = 'HASHED'; receipt.status = 'READ_AND_HASHED'; receipt.bytes = response.bytes.length;
        write(p.ledger, ledger); write(p.progress, state);
      } catch (error) {
        state.status = 'STOPPED'; state.error = error.message; receipt.status = 'FAILED_STOPPED'; receipt.error = error.message;
        write(p.ledger, ledger); write(p.progress, state); throw error;
      }
    }
    const result = { phase, status: 'VERIFIED', books: state.books, source_writes: 0, arc_research_writes: 0, cloud_executions: 0, excludes: ['volatile document properties'] };
    write(p.output, result); return { status: 'VERIFIED', phase, books: state.books.map(x => ({ dataset: x.dataset, compressed_bytes: x.compressed_bytes, members: x.entries.length, content_sha256: x.content_sha256, unchanged: baseline ? true : undefined })) };
  } finally { fs.closeSync(lock); fs.unlinkSync(p.lock); }
}
module.exports = { MAX_BYTES, digest, safeUrl, validateReview, download, approve, run };
if (require.main === module) {
  const dir = path.resolve(__dirname, '../private/operator-stage1');
  run(dir, process.argv[2], require('./build-phase2-cloud').datasets()).then(x => console.log(JSON.stringify(x))).catch(error => { console.error(error.message); process.exitCode = 1; });
}
