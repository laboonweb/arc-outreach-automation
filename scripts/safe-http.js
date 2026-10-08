'use strict';
// Optional local transport. n8n Cloud uses its native HTTP Request node instead.
const https = require('node:https');
const http = require('node:http');
const dns = require('node:dns').promises;
const { parsePublicUrl } = require('./helpers');
function isPublicIPv4(address) {
  const bytes = address.split('.').map(Number);
  if (bytes.length !== 4 || bytes.some(x => !Number.isInteger(x) || x < 0 || x > 255)) return false;
  const [a, b] = bytes;
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 ||
    a === 192 && (b === 168 || b === 0 || b === 2) ||
    a === 100 && b >= 64 && b <= 127 || a === 198 && [18, 19, 51].includes(b) ||
    a === 203 && b === 0);
}
async function safeGet(rawUrl) {
  const url = parsePublicUrl(rawUrl);
  const addresses = await Promise.race([
    dns.lookup(url.host, { all: true, family: 4 }),
    new Promise((_, reject) => { const t = setTimeout(() => reject(new Error('DNS_TIMEOUT')), 5000); t.unref(); }),
  ]);
  if (!addresses.length || addresses.some(x => !isPublicIPv4(x.address))) throw new Error('NON_PUBLIC_DNS');
  const pinned = addresses[0];
  return new Promise((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http;
    const req = client.get(url.url, {
      // Pin the verified address for this connection, avoiding a second DNS lookup.
      lookup: (_host, options, callback) => options.all ? callback(null, [pinned]) : callback(null, pinned.address, 4),
      headers: { 'user-agent': 'ArcResearch/1.0 (manual-reviewed business website checks)', accept: 'text/html', 'accept-encoding': 'identity' },
    }, res => {
      const chunks = [];
      let size = 0;
      res.on('data', chunk => {
        size += chunk.length;
        if (size > 1_000_000) req.destroy(new Error('RESPONSE_TOO_LARGE'));
        else chunks.push(chunk);
      });
      res.on('error', reject);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    const deadline = setTimeout(() => req.destroy(new Error('REQUEST_TIMEOUT')), 15000);
    req.on('close', () => clearTimeout(deadline));
    req.on('error', reject);
  });
}
module.exports = { safeGet, isPublicIPv4 };
