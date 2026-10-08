'use strict';
function scoreLead({ activity, activityConfidence = 90, gap, trigger, proof, legitimate, businessCase, decisionMaker, resolvedGap, operations = false, identityMismatch = false }) {
  if (identityMismatch) return {score:0,quality:'LOW',basis:'IDENTITY_UNRESOLVED'};
  if (activity === 'INACTIVE' || resolvedGap) return { score: 0, quality: 'DISQUALIFY', basis: resolvedGap ? 'RESOLVED_GAP' : 'CONFIRMED_INACTIVE' };
  const active = ['ACTIVE', 'LIKELY_ACTIVE'].includes(activity);
  const score = Math.min(100, (active ? 25 * activityConfidence / 100 : 0) + (legitimate ? 15 : 0) + (gap ? 35 : 0) + (businessCase ? 15 : 0) + (proof || operations ? 10 : 0) + (trigger ? 3 : 0) + (decisionMaker ? 2 : 0));
  if (active && legitimate && gap && businessCase) return {score:Math.round(score),quality:score>=90?'HIGH':'MEDIUM',basis:'VERIFIED_COMMERCIAL_CASE'};
  // MEDIUM potential is explicitly provisional, never a claim of a verified gap.
  if (active && activityConfidence>=65 && legitimate && (proof || operations)) return {score:Math.round(score),quality:'MEDIUM',basis:'PROVISIONAL_POTENTIAL_GAP_NOT_ESTABLISHED'};
  return {score:Math.round(score),quality:'LOW',basis:'INSUFFICIENT_COMMERCIAL_EVIDENCE'};
}
module.exports = { scoreLead };
