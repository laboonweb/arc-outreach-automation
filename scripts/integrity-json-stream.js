'use strict';
// External-only streaming semantic hash. Never constructs a response/workbook.
const crypto = require('node:crypto');
const { TextDecoder } = require('node:util');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
function scalarHash(value) { return sha('scalar:' + JSON.stringify(value)); }
function objectHash(entries) {
  const hash = crypto.createHash('sha256').update('object:');
  for (const [key, value] of [...entries].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) hash.update(JSON.stringify(key) + ':' + value + ';');
  return hash.digest('hex');
}
function semanticHash(value) {
  if (Array.isArray(value)) { const hash = crypto.createHash('sha256').update('array:'); for (const item of value) hash.update(semanticHash(item) + ';'); return hash.digest('hex'); }
  if (value && typeof value === 'object') return objectHash(Object.entries(value).map(([key, item]) => [key, semanticHash(item)]));
  return scalarHash(value);
}
class JsonStream {
  constructor(observe = () => {}, limits = {}) {
    this.observe = observe; this.limits = { tokenBytes: 1024 * 1024, depth: 32, keys: 128, keyBytes: 256, ...limits };
    this.decoder = new TextDecoder('utf-8', { fatal: true }); this.stack = []; this.root = null; this.token = null;
    this.stats = { bytes: 0, peakTokenBytes: 0, peakDepth: 0, peakObjectKeys: 0 };
  }
  fail(code = 'JSON_SYNTAX') { throw Error('INTEGRITY_STREAM_' + code); }
  path() { const f = this.stack.at(-1); return f ? [...f.path, f.type === 'array' ? f.count : f.key] : []; }
  accept(hash, value, type, path) {
    this.observe({ type, path, hash, value }); const f = this.stack.at(-1);
    if (!f) { if (this.root !== null) this.fail(); this.root = hash; return; }
    if (f.type === 'array') { f.hash.update(hash + ';'); f.count++; }
    else { f.entries.set(f.key, hash); f.key = null; this.stats.peakObjectKeys = Math.max(this.stats.peakObjectKeys, f.entries.size); }
    f.mode = 'commaOrEnd';
  }
  close() {
    const f = this.stack.pop(), hash = f.type === 'array' ? f.hash.digest('hex') : objectHash(f.entries);
    this.observe({ type: 'container', kind: f.type, path: f.path, count: f.type === 'array' ? f.count : f.entries.size, hash });
    this.accept(hash, undefined, f.type, f.path);
  }
  tokenDone() {
    const token = this.token; this.token = null; let value;
    try { value = JSON.parse(token.raw); } catch { this.fail(); }
    if (typeof value === 'number' && !Number.isFinite(value)) this.fail('NUMBER_LIMIT');
    if (token.key) {
      const f = this.stack.at(-1);
      if (typeof value !== 'string' || Buffer.byteLength(value) > this.limits.keyBytes) this.fail('KEY_LIMIT');
      if (f.entries.has(value)) this.fail('DUPLICATE_KEY');
      if (f.entries.size >= this.limits.keys) this.fail('KEY_LIMIT');
      f.key = value; f.mode = 'colon';
    } else this.accept(scalarHash(value), value, 'scalar', token.path);
  }
  addToken(c) {
    const token = this.token; token.raw += c; token.bytes += Buffer.byteLength(c);
    this.stats.peakTokenBytes = Math.max(this.stats.peakTokenBytes, token.bytes);
    if (token.bytes > this.limits.tokenBytes) this.fail('TOKEN_LIMIT');
  }
  text(text) {
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (this.token) {
        const t = this.token;
        if (t.string) { this.addToken(c); if (!t.escape && c === '"') this.tokenDone(); else if (t.escape) t.escape = false; else if (c === '\\') t.escape = true; continue; }
        if (!/[\s,}\]]/.test(c)) { this.addToken(c); if (t.raw.length > 64) this.fail('NUMBER_LIMIT'); continue; }
        this.tokenDone(); i--; continue;
      }
      if (/\s/.test(c)) { if (!/[\x20\t\r\n]/.test(c)) this.fail(); continue; }
      const f = this.stack.at(-1);
      if (f?.mode === 'colon') { if (c !== ':') this.fail(); f.mode = 'value'; continue; }
      if (f?.mode === 'commaOrEnd') {
        if (c === (f.type === 'array' ? ']' : '}')) { this.close(); continue; }
        if (c !== ',') this.fail(); f.mode = f.type === 'array' ? 'value' : 'key'; continue;
      }
      if (f?.type === 'object' && ['key', 'keyOrEnd'].includes(f.mode)) {
        if (c === '}' && f.mode === 'keyOrEnd') { this.close(); continue; }
        if (c !== '"') this.fail(); this.token = { string: true, key: true, raw: '"', bytes: 1, escape: false }; continue;
      }
      if (f?.type === 'array' && f.mode === 'valueOrEnd' && c === ']') { this.close(); continue; }
      if (!f && this.root !== null) this.fail('TRAILING_DATA');
      const path = this.path();
      if (c === '{' || c === '[') {
        if (this.stack.length >= this.limits.depth) this.fail('DEPTH_LIMIT');
        const type = c === '[' ? 'array' : 'object';
        this.stack.push({ type, path, mode: type === 'array' ? 'valueOrEnd' : 'keyOrEnd', count: 0, key: null, entries: new Map(), hash: type === 'array' ? crypto.createHash('sha256').update('array:') : null });
        this.stats.peakDepth = Math.max(this.stats.peakDepth, this.stack.length); continue;
      }
      if (c === '"' || /[-0-9tfn]/.test(c)) { this.token = { string: c === '"', key: false, raw: c, bytes: 1, escape: false, path }; continue; }
      this.fail();
    }
  }
  write(bytes) {
    if (!Buffer.isBuffer(bytes)) this.fail('BYTE_INPUT_REQUIRED');
    this.stats.bytes += bytes.length;
    // Limit decoder input even when a test/custom transport hands us a large chunk.
    for (let i = 0; i < bytes.length; i += 16384) {
      let text; try { text = this.decoder.decode(bytes.subarray(i, i + 16384), { stream: true }); } catch { this.fail('UTF8'); }
      this.text(text);
    }
  }
  finish() {
    let tail; try { tail = this.decoder.decode(); } catch { this.fail('UTF8'); } this.text(tail);
    if (this.token && !this.token.string) this.tokenDone();
    if (this.token || this.stack.length || this.root === null) this.fail('TRUNCATED');
    return { sha256: this.root, ...this.stats };
  }
}
module.exports = { JsonStream, semanticHash };
