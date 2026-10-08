'use strict';
const { norm, sha256, yes } = require('./helpers');
function messageHash({ recipient, subject, body }) {
  return sha256(JSON.stringify([norm(recipient), String(subject || ''), String(body || '')]));
}
function dispatchKey({ campaign_id, recipient, step = 'initial' }) {
  if (!campaign_id || !recipient) throw new Error('Campaign and recipient required');
  // Do not include body or lead ID: editing copy / duplicate business rows cannot bypass the lock.
  return sha256(JSON.stringify([norm(campaign_id), norm(recipient), norm(step)]));
}
function sendBlockReason(row) {
  if (yes(row.initial_outreach_blocked) || yes(row.initial_contact_recorded)) return 'INITIAL_OUTREACH_BLOCKED';
  if (yes(row.duplicate_review_required)) return 'DUPLICATE_REVIEW_REQUIRED';
  if (['DO_NOT_CONTACT','DISQUALIFIED','REPLIED','SENT','PARKED','FOLLOW_UP_DUE'].includes(row.arc_status)) return 'PROTECTED_STATUS';
  if (yes(row.suppressed) || /UNSUBSCRIBED|BOUNCED|COMPLAINT|NOT_INTERESTED/.test(row.outreach_status || '')) return 'SUPPRESSED';
  if (row.outreach_status === 'SENT' || row.sent_at || row.message_id) return 'ALREADY_SENT';
  if (['CLAIMED', 'SENDING', 'UNKNOWN_DELIVERY'].includes(row.outreach_status)) return 'RECONCILIATION_REQUIRED';
  if (row.approved !== 'YES') return 'NOT_APPROVED';
  return 'SENDING_NOT_IMPLEMENTED';
}
module.exports = { messageHash, dispatchKey, sendBlockReason };
