'use strict';
const { text, norm, yes } = require('./helpers');
const STATUSES = ['NEW', 'NEEDS_RESEARCH', 'READY_EMAIL', 'READY_DM', 'SENT', 'PARKED', 'DISQUALIFIED', 'FOLLOW_UP_DUE', 'REPLIED', 'DO_NOT_CONTACT'];
const PRIORITY = { DO_NOT_CONTACT: 100, DISQUALIFIED: 90, REPLIED: 80, FOLLOW_UP_DUE: 75, SENT: 70, PARKED: 60, NEEDS_RESEARCH: 20, NEW: 10 };
const PROTECTED = ['DO_NOT_CONTACT', 'DISQUALIFIED', 'REPLIED', 'SENT', 'FOLLOW_UP_DUE', 'PARKED'];
function statusText(value) {
  const s = norm(value).replace(/[–—]/g, '-');
  if (!s || /^(not contacted|not sent|no outreach sent|unreviewed|sharp icp|research only|ready after human review)/.test(s)) return '';
  const canonical = s.toUpperCase().replace(/[ -]+/g, '_');
  if (STATUSES.includes(canonical)) return canonical;
  if (/^(unsubscribe[ds]?|do not contact|do not email|opted out|suppressed|complaint|bounced|not interested)\b/.test(s)) return 'DO_NOT_CONTACT';
  if (/^(disqualified|disqualify|closed permanently|wrong business|duplicate confirmed)\b/.test(s)) return 'DISQUALIFIED';
  if (/^(replied|responded|interested|asking price|in conversation)\b/.test(s)) return 'REPLIED';
  if (/^(sent|contacted|first touch sent|proposal sent)\b/.test(s)) return 'SENT';
  if (/^(parked|park|hold|on hold)\b/.test(s)) return 'PARKED';
  return '';
}
function strongest(statuses, fallback = 'NEEDS_RESEARCH') {
  return statuses.filter(s => PRIORITY[s]).sort((a, b) => PRIORITY[b] - PRIORITY[a])[0] || fallback;
}
function interpretHistory(entries, now) {
  const signals = [], history = { first_contact_at: '', first_contact_channel: '', followup_due_at: '', followup_channel: '', followup_count: '', last_reply_at: '', reply_status: '', initial_contact_recorded: false };
  for (const entry of entries) {
    const v = entry.values;
    const get = (...keys) => keys.map(k => text(v[k])).find(Boolean) || '';
    const firstDate = get('first_contact_at', 'Date Contacted', 'Last Contact Date', 'First Contact Date');
    const firstTouch = get('First touch', 'first_contact_channel');
    const status = get('arc_status', 'Manual decision', 'Send Status', 'Send status', 'Stage', 'Status', 'Send recommendation');
    const suppressed = get('Unsubscribe / Suppression', 'Suppression', 'suppression_status');
    for (const value of [status, suppressed]) {
      const interpreted = statusText(value);
      if (interpreted) signals.push({ status: interpreted, source_url: entry.source_url, field_value: value });
    }
    if (yes(v.suppressed)) signals.push({ status: 'DO_NOT_CONTACT', source_url: entry.source_url, field_value: 'suppressed=true' });
    const response = get('Response', 'reply_status');
    if (response && !/^(none|no reply|no response|not yet|pending)$/i.test(response)) {
      const reply = statusText(response);
      signals.push({ status: reply === 'DO_NOT_CONTACT' ? reply : 'REPLIED', source_url: entry.source_url, field_value: response });
      history.reply_status = response;
    }
    const knownTouch = entry.sheet === 'Follow Up' && firstTouch && !/^(none|not sent|planned|not contacted)$/i.test(firstTouch);
    if (firstDate || knownTouch || signals.some(s => ['SENT', 'REPLIED', 'FOLLOW_UP_DUE'].includes(s.status))) {
      history.initial_contact_recorded = true;
      signals.push({ status: 'SENT', source_url: entry.source_url, field_value: firstDate || firstTouch || status });
      if (firstDate && (!history.first_contact_at || firstDate < history.first_contact_at)) history.first_contact_at = firstDate;
      history.first_contact_channel ||= firstTouch || get('Primary Channel', 'Channel');
    }
    const due = get('followup_due_at', 'Follow-up Date', 'Follow Up Date');
    if (due) history.followup_due_at = due;
    history.followup_channel ||= get('Follow-up channel', 'followup_channel');
    history.followup_count ||= get('followup_count', 'Follow-up Count');
    history.last_reply_at ||= get('last_reply_at', 'Last Reply Date');
  }
  if (history.initial_contact_recorded && history.followup_due_at && Number.isFinite(Date.parse(history.followup_due_at)) && Date.parse(history.followup_due_at) <= Date.parse(now)) {
    signals.push({ status: 'FOLLOW_UP_DUE', source_url: '', field_value: history.followup_due_at });
  }
  return { ...history, signals, status: strongest(signals.map(x => x.status)) };
}
function reconcileStatus(row, previous = {}, autoStatus = 'NEEDS_RESEARCH') {
  const signals = row.status_signals || [];
  const manual = text(previous.manual_status_override).toUpperCase();
  const reset = STATUSES.includes(manual) && text(previous.manual_reset_reason) && Number.isFinite(Date.parse(previous.manual_reset_at));
  const imported = yes(previous.legacy_status_imported);
  const statuses = signals.filter(x => !(x.kind === 'colour' && imported)).map(x => x.status);
  // A documented operator override is a manual reset. Suppression must still be cleared at its source.
  if (reset) {
    if (statuses.includes('DO_NOT_CONTACT')) return 'DO_NOT_CONTACT';
    return PROTECTED.includes(manual) ? manual : autoStatus;
  }
  const protectedStatuses = [...statuses, previous.arc_status].filter(s => PROTECTED.includes(s));
  return strongest(protectedStatuses, autoStatus);
}
module.exports = { STATUSES, PROTECTED, statusText, strongest, interpretHistory, reconcileStatus };
