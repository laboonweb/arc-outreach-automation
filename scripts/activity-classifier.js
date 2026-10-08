'use strict';
const { yes, parsePublicUrl, evidence } = require('./helpers');
function reviewedFact(row, prefix, now, maxDays = 90) {
  const discovered = row.discovery_facts?.[prefix];
  if (discovered && (row[prefix + '_verified'] === undefined || String(row[prefix + '_verified']).trim() === '')) {
    const age = Date.parse(now) - Date.parse(discovered.fact_date);
    try { parsePublicUrl(discovered.source_url); } catch { return null; }
    if (discovered.verification === 'DISCOVERY_VERIFIED' && discovered.confidence === 'HIGH' && discovered.excerpt && Number.isFinite(age) && age >= 0 && age <= maxDays * 86400000) return discovered;
    return null;
  }
  const date = Date.parse(row[prefix + '_date']);
  const age = Date.parse(now) - date;
  try { parsePublicUrl(row[prefix + '_source_url']); } catch { return null; }
  if (!yes(row[prefix + '_verified']) || !String(row[prefix + '_evidence'] || '').trim() || !Number.isFinite(age) || age < 0 || age > maxDays * 86400000) return null;
  return evidence(prefix, row[prefix + '_source_url'], row[prefix + '_evidence'], now,
    { fact_date: row[prefix + '_date'], verification: 'HUMAN_REVIEWED_INPUT' });
}
function classifyActivity(row, now) {
  const fact = reviewedFact(row, 'activity', now, 365);
  if (!fact) return { status: 'UNCERTAIN', confidence: 0, evidence: [] };
  const status = row.activity_status;
  if (!['ACTIVE', 'LIKELY_ACTIVE', 'LIKELY_INACTIVE', 'INACTIVE'].includes(status)) return { status: 'UNCERTAIN', confidence: 0, evidence: [] };
  const age = (Date.parse(now) - Date.parse(row.activity_date || fact.fact_date)) / 86400000;
  const kind = row.activity_signal_type || 'REVIEWED_ACTIVITY';
  const matched = yes(row.activity_corroborated) || Boolean(reviewedFact(row, 'association', now));
  const expired = row.activity_valid_until && Date.parse(row.activity_valid_until) < Date.parse(now);
  const futureOpening = row.activity_operating_since && Date.parse(row.activity_operating_since) > Date.parse(now);
  if (expired || futureOpening) return { status: 'UNCERTAIN', confidence: 35, strength: 'WEAK', evidence: [fact] };
  if (['DIRECTORY_ONLY','REGISTRATION_ONLY','HTTP_ONLY'].includes(kind)) return { status: 'UNCERTAIN', confidence: 30, strength: 'WEAK', evidence: [fact] };
  if (['INACTIVE','LIKELY_INACTIVE'].includes(status)) return {status,confidence:status==='INACTIVE'?90:65,strength:'STRONG',evidence:[fact]};
  let confidence = age <= 90 ? (kind === 'ANNOUNCED_OPENING' ? 70 : status === 'ACTIVE' ? 90 : 85) : age <= 183 ? 75 : matched ? 60 : 35;
  if (kind === 'CURRENT_SERVICE_PAGE' && !matched) confidence = 35;
  return { status: confidence >= 60 ? status : 'UNCERTAIN', confidence,
    strength: confidence >= 85 ? 'VERY_STRONG' : confidence >= 70 ? 'STRONG' : confidence >= 60 ? 'USABLE' : 'WEAK', evidence: [fact] };
}
module.exports = { reviewedFact, classifyActivity };
