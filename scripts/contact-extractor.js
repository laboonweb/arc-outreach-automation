'use strict';
const { decodeHtml, visibleText, parsePublicUrl } = require('./helpers');
const { validateEmail } = require('./email-validator');
function extractContacts(html, sourceUrl) {
  const cleaned = String(html).replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
  const visible = visibleText(cleaned);
  const candidates = [...(visible.match(/[a-z\d.!#$%&'*+/=?^_`{|}~-]+@[a-z\d.-]+\.[a-z]{2,}/gi) || [])];
  const links = [];
  for (const match of cleaned.matchAll(/<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
    const href = decodeHtml(match[1] ?? match[2] ?? match[3]);
    if (/^mailto:/i.test(href)) {
      try { candidates.push(decodeURIComponent(href.slice(7).split('?')[0])); } catch { /* malformed mailto */ }
    } else {
      try { links.push(parsePublicUrl(href, sourceUrl).url); } catch { /* non-HTTP link */ }
    }
  }
  const emails = [...new Set(candidates.map(x => x.replace(/[.,;]+$/, '').toLowerCase()))]
    .filter(x => validateEmail(x).valid && !/\.(png|jpg|jpeg|webp|svg|gif)$/i.test(x) &&
      !/@(?:example\.(?:com|org|net)|sentry\.io)$/i.test(x) && !/^(?:noreply|no-reply|donotreply)@/i.test(x));
  const host = parsePublicUrl(sourceUrl).host.replace(/^www\./, '');
  emails.sort((a, b) => Number(b.endsWith('@' + host)) - Number(a.endsWith('@' + host)) || a.localeCompare(b));
  return { emails: emails.slice(0, 10), links: [...new Set(links)].slice(0, 100), visible,
    no_solicitation: /(?:no|do not|don't|not accept).{0,35}(?:unsolicited|solicitations|marketing emails|sales emails)/i.test(visible) };
}
module.exports = { extractContacts };
