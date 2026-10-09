'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { save } = require('../scripts/write-integrity-state');
function fixture() { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'arc-integrity-state-synthetic-')); return { dir, file: path.join(dir, 'SYNTHETIC.json') }; }
function cleanup(dir) { if (path.dirname(path.resolve(dir)) !== path.resolve(os.tmpdir()) || !path.basename(dir).startsWith('arc-integrity-state-synthetic-')) throw Error('UNSAFE_CLEANUP'); fs.rmSync(dir, { recursive: true }); }
test('state writes flush and read back exact bytes; initial creation cannot replace history', () => {
  const { dir, file } = fixture(), original = fs.fsyncSync; let flushes = 0;
  try { fs.fsyncSync = fd => { flushes++; return original(fd); }; assert.equal(save(file, { synthetic: 1 }, true).readback_verified, true); assert.equal(save(file, { synthetic: 2 }).readback_verified, true); assert.equal(flushes, 2); assert.deepEqual(JSON.parse(fs.readFileSync(file)), { synthetic: 2 }); assert.throws(() => save(file, { synthetic: 3 }, true), /PERSISTENCE_STOP_EEXIST/); assert.deepEqual(JSON.parse(fs.readFileSync(file)), { synthetic: 2 }); }
  finally { fs.fsyncSync = original; cleanup(dir); }
});
test('a known transient Windows sharing refusal retries the same local rename only', () => {
  const { dir, file } = fixture(), original = fs.renameSync; let calls = 0;
  try { save(file, { synthetic: 1 }, true); fs.renameSync = (from, to) => { calls++; if (calls === 1) throw Object.assign(Error('synthetic Windows file sharing'), { code: 'EPERM' }); return original(from, to); }; assert.equal(save(file, { synthetic: 2 }).sharing_retries, 1); assert.equal(calls, 2); assert.deepEqual(JSON.parse(fs.readFileSync(file)), { synthetic: 2 }); }
  finally { fs.renameSync = original; cleanup(dir); }
});
test('permanent sharing refusal is bounded and leaves original plus complete recovery file', () => {
  const { dir, file } = fixture(), original = fs.renameSync; let calls = 0;
  try { save(file, { synthetic: 1 }, true); fs.renameSync = () => { calls++; throw Object.assign(Error('synthetic permanent sharing refusal'), { code: 'EBUSY' }); }; assert.throws(() => save(file, { synthetic: 2 }), /PERSISTENCE_STOP_EBUSY/); assert.equal(calls, 8); assert.deepEqual(JSON.parse(fs.readFileSync(file)), { synthetic: 1 }); const temp = fs.readdirSync(dir).find(n => n.includes('.new-')); assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, temp))), { synthetic: 2 }); }
  finally { fs.renameSync = original; cleanup(dir); }
});
test('unexpected mutation between replacement attempts stops instead of overwriting it', () => {
  const { dir, file } = fixture(), original = fs.renameSync; let calls = 0;
  try { save(file, { synthetic: 1 }, true); fs.renameSync = () => { calls++; fs.writeFileSync(file, JSON.stringify({ synthetic: 'concurrent writer' })); throw Object.assign(Error('synthetic sharing'), { code: 'EPERM' }); }; assert.throws(() => save(file, { synthetic: 2 }), /PERSISTENCE_STOP_CONFLICT/); assert.equal(calls, 1); assert.deepEqual(JSON.parse(fs.readFileSync(file)), { synthetic: 'concurrent writer' }); }
  finally { fs.renameSync = original; cleanup(dir); }
});
test('flush failure stops before replacement and never retries unknown IO errors', () => {
  const { dir, file } = fixture(), original = fs.fsyncSync, rename = fs.renameSync; let calls = 0;
  try { save(file, { synthetic: 1 }, true); fs.renameSync = (...args) => { calls++; return rename(...args); }; fs.fsyncSync = () => { throw Object.assign(Error('synthetic disk failure'), { code: 'ENOSPC' }); }; assert.throws(() => save(file, { synthetic: 2 }), /PERSISTENCE_STOP_ENOSPC/); assert.equal(calls, 0); assert.deepEqual(JSON.parse(fs.readFileSync(file)), { synthetic: 1 }); }
  finally { fs.fsyncSync = original; fs.renameSync = rename; cleanup(dir); }
});
