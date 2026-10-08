'use strict';
const { visibleText } = require('./helpers');
const WEBSITE_STATUSES = ['LIVE', 'NO_WEBSITE', 'DNS_ERROR', 'SSL_ERROR', '404', 'EXPIRED_DOMAIN', 'DISCONNECTED_DOMAIN', 'REDIRECT', 'PARKED', 'BROKEN', 'STRONG_SITE', 'WEAK_SITE', 'UNKNOWN'];
function classifyWebsite(response) {
  const code = Number(response.statusCode || 0);
  const error = JSON.stringify(response.error || '');
  if (error && /ENOTFOUND|EAI_NONAME/.test(error)) return { status: 'DNS_ERROR', reason: 'DNS resolution failed during this check.' };
  if (/CERT_HAS_EXPIRED|ERR_TLS_CERT_ALTNAME_INVALID|UNABLE_TO_VERIFY_LEAF_SIGNATURE|DEPTH_ZERO_SELF_SIGNED_CERT|CERT_UNTRUSTED|certificate has expired/i.test(error)) return { status: 'SSL_ERROR', reason: 'TLS certificate validation failed during this check.' };
  if (!code || response.error) return { status: 'UNKNOWN', reason: 'Request failed or timed out; website condition remains unconfirmed.' };
  if ([301, 302, 303, 307, 308].includes(code)) return { status: 'REDIRECT', reason: 'HTTP redirect observed.' };
  if (code === 404 || code === 410) return { status: '404', reason: `Requested page returned HTTP ${code}.` };
  if ([401, 403, 429].includes(code)) return { status: 'UNKNOWN', reason: `HTTP ${code}: access or rate restriction; not evidence of a broken site.` };
  if (code >= 500) return { status: 'BROKEN', reason: `Server returned HTTP ${code} during this check; may be temporary.` };
  if (code < 200 || code >= 300) return { status: 'UNKNOWN', reason: `Unclassified HTTP ${code}.` };
  const body = String(response.body || '');
  const contentType = String(response.headers?.['content-type'] || '');
  if (body.length > 1_000_000) return { status: 'UNKNOWN', reason: 'HTML analysis limit exceeded.' };
  if (contentType && !/html|text\/plain/i.test(contentType)) return { status: 'UNKNOWN', reason: 'Response is not an HTML page.' };
  const visible = visibleText(body);
  // Provider error signatures must describe the page itself, not a long article about errors.
  const title = visibleText((body.match(/<(?:title|h1)\b[^>]*>([\s\S]*?)<\/(?:title|h1)>/i) || [])[1] || '');
  const shortPage = visible.length < 1800;
  if (shortPage && /wix/i.test(body) && /(?:domain.{0,45}(?:isn['’]?t|is not|not) connected|connect (?:your|this) domain)/i.test(visible)) return { status: 'DISCONNECTED_DOMAIN', reason: visible.slice(0, 240) };
  if (shortPage && /(?:this domain (?:name )?(?:has expired|is expired)|domain registration has expired)/i.test(title + ' ' + visible)) return { status: 'EXPIRED_DOMAIN', reason: visible.slice(0, 240) };
  if (shortPage && /(?:this domain (?:name )?is (?:for sale|parked)|buy this domain|domain parking)/i.test(title + ' ' + visible)) return { status: 'PARKED', reason: visible.slice(0, 240) };
  if (visible.length < 80 || /checking your browser|verify you are human|just a moment|enable javascript to continue/i.test(title + ' ' + visible.slice(0, 250))) return { status: 'UNKNOWN', reason: 'Sparse or challenge page; browser review needed.' };
  return { status: 'LIVE', reason: 'An HTML page responded successfully; ownership, activity and conversion quality require separate evidence.' };
}
module.exports = { classifyWebsite, WEBSITE_STATUSES };
