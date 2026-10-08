'use strict';

const crypto = require('crypto');
const text = (value) => String(value ?? '').trim();
const norm = (value) => text(value).normalize('NFKC').toLowerCase().replace(/\s+/g, ' ');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const yes = (value) => value === true || /^(yes|true|1)$/i.test(text(value));

// Deliberately conservative, portable to the n8n Cloud Code sandbox (no URL module).
function parsePublicUrl(raw, base = '') {
  let input = text(raw);
  if (!input || /[\s\\\u0000-\u001f]/.test(input)) throw new Error('INVALID_URL');
  if (base && !/^[a-z][a-z\d+.-]*:/i.test(input)) {
    const origin = parsePublicUrl(base);
    if (input.startsWith('//')) input = origin.protocol + input;
    else if (input.startsWith('/')) input = origin.origin + input;
    else input = origin.origin + origin.path.replace(/[^/]*$/, '') + input;
  }
  if (!/^[a-z][a-z\d+.-]*:/i.test(input)) input = 'https://' + input;
  const match = /^(https?):\/\/([a-z\d.-]+)(?::(\d+))?(\/[^?#]*)?(\?[^#]*)?(?:#.*)?$/i.exec(input);
  if (!match) throw new Error('UNSAFE_URL');
  const host = match[2].toLowerCase();
  if (!/^(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z]{2,63}$/.test(host) ||
      /\.(localhost|local|internal|home|lan|test|invalid)$/i.test(host) ||
      host === 'metadata.google.internal') throw new Error('NON_PUBLIC_HOST');
  const protocol = match[1].toLowerCase() + ':';
  const port = match[3] || '';
  if (port && port !== (protocol === 'https:' ? '443' : '80')) throw new Error('UNSAFE_PORT');
  const segments = [];
  for (const part of (match[4] || '/').split('/')) {
    if (part === '..') segments.pop();
    else if (part && part !== '.') segments.push(part);
  }
  const path = '/' + segments.join('/') + (match[4]?.endsWith('/') && segments.length ? '/' : '');
  const origin = protocol + '//' + host;
  return { url: origin + path + (match[5] || ''), host, origin, protocol, path };
}

function allowedUrl(raw, hosts, base = '') {
  const parsed = parsePublicUrl(raw, base);
  if (!Array.isArray(hosts) || !hosts.map(norm).includes(parsed.host)) throw new Error('HOST_NOT_APPROVED');
  return parsed;
}

function normalizeRow(raw) {
  const aliases = { businessname: 'business_name', business: 'business_name', company: 'business_name',
    website: 'website_url', googlemapsurl: 'maps_url', googlemaps: 'maps_url', email: 'existing_email',
    existingemail: 'existing_email', existingphone: 'phone', facebook: 'facebook_url',
    instagram: 'instagram_url', linkedin: 'linkedin_url', notes: 'input_notes' };
  const row = {};
  for (const [key, value] of Object.entries(raw)) {
    const compact = key.toLowerCase().replace(/[^a-z\d]/g, '');
    row[aliases[compact] || key.trim().toLowerCase().replace(/\s+/g, '_')] = value;
  }
  row.country = ({ au: 'Australia', australia: 'Australia', ph: 'Philippines', philippines: 'Philippines' })[norm(row.country)] || text(row.country);
  return row;
}

function identityKey(row) {
  // Branch identity; URL/email may change during enrichment without changing the ID.
  if (!text(row.business_name) || !text(row.country) || (!text(row.city) && !text(row.source_record_id))) {
    throw new Error('IDENTITY_REQUIRED: business_name, country, and city or source_record_id');
  }
  return ['arc-lead-v1', norm(row.business_name), norm(row.country), norm(row.city), norm(row.state), norm(row.source_record_id)].join('|');
}
function leadId(row) {
  if (text(row.lead_id)) {
    if (!/^arc_[a-f0-9]{64}$/.test(row.lead_id)) throw new Error('INVALID_EXISTING_LEAD_ID');
    return row.lead_id;
  }
  return 'arc_' + sha256(identityKey(row));
}
function decodeHtml(value) {
  return String(value).replace(/&#(x[\da-f]+|\d+);/gi, (_, n) => {
    const code = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
  }).replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&nbsp;/gi, ' ');
}
function visibleText(html) {
  return decodeHtml(String(html).replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}
function sheetSafe(value) {
  if (typeof value !== 'string') return value;
  return /^[\s]*[=+@-]/.test(value) ? "'" + value : value;
}
function evidence(type, source_url, excerpt, observed_at, extra = {}) {
  return { type, source_url, excerpt: text(excerpt).slice(0, 500), observed_at, ...extra };
}
module.exports = { text, norm, sha256, yes, parsePublicUrl, allowedUrl, normalizeRow, identityKey, leadId, decodeHtml, visibleText, sheetSafe, evidence };
