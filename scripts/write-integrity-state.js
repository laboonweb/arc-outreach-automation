'use strict';
// Only local receipt replacement may retry; an HTTP operation never does.
const fs = require('node:fs'), crypto = require('node:crypto');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fail = code => { throw Error('INTEGRITY_EXTERNAL_PERSISTENCE_STOP_' + (/^[A-Z0-9_]{1,32}$/.test(code || '') ? code : 'IO')); };
function hash(file) { try { return sha(fs.readFileSync(file)); } catch (e) { if (e.code === 'ENOENT') return null; throw e; } }
function write(file, bytes) {
  let fd;
  try { fd = fs.openSync(file, 'wx', 0o600); fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); }
  finally { if (fd !== undefined) fs.closeSync(fd); }
  if (hash(file) !== sha(bytes)) fail('READBACK');
}
function save(file, data, initial = false) {
  const bytes = Buffer.from(JSON.stringify(data, null, 2)), expected = sha(bytes);
  let temp;
  try {
    if (initial) { write(file, bytes); return { sharing_retries: 0, readback_verified: true }; }
    const previous = hash(file); temp = file + '.new-' + crypto.randomUUID(); write(temp, bytes);
    for (let attempt = 0; attempt < 8; attempt++) {
      if (hash(file) !== previous || hash(temp) !== expected) fail('CONFLICT');
      try { fs.renameSync(temp, file); if (hash(file) !== expected) fail('READBACK'); return { sharing_retries: attempt, readback_verified: true }; }
      catch (e) {
        const current = hash(file);
        if (current === expected && hash(temp) === null) return { sharing_retries: attempt, readback_verified: true };
        if (current !== previous || hash(temp) !== expected) fail('CONFLICT');
        if (!['EPERM', 'EACCES', 'EBUSY'].includes(e.code) || attempt === 7) throw e;
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
      }
    }
  } catch (e) { if (/^INTEGRITY_EXTERNAL_PERSISTENCE_STOP_[A-Z0-9_]+$/.test(e.message || '')) throw e; fail(e.code); }
}
module.exports = { save };
