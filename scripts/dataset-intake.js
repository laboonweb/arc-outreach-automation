'use strict';
const { text, norm, sha256, parsePublicUrl, normalizeRow, yes } = require('./helpers');
const { readTable, colourHex, sourceURL } = require('./sheet-grid');
const { businessKey, detectDuplicates } = require('./duplicate-detection');
const { interpretHistory, reconcileStatus, strongest } = require('./legacy-status');

const CONTROL_FIELDS = ['manual_status_override', 'manual_reset_at', 'manual_reset_reason', 'timezone_override',
  'website_ownership_verified', 'website_association_verified', 'website_quality_reviewed', 'gap_unresolved_verified',
  'business_case_verified', 'role_relevance_verified', 'no_solicitation_checked', 'consent_recipient',
  'activity_status', 'contact_email', 'contact_source_type', 'decision_maker_name_reviewed', 'decision_maker_role_reviewed',
  'instagram_status_reviewed', 'facebook_status_reviewed', 'linkedin_status_reviewed', 'whatsapp_status_reviewed', 'viber_status_reviewed',
  'reviewed_website_url', 'reviewed_facebook_url', 'reviewed_instagram_url', 'reviewed_whatsapp_url', 'reviewed_viber_url',
  'no_website_verified', 'legitimacy_verified', 'strong_site_solves_gap_verified', 'activity_signal_type',
  'activity_corroborated', 'activity_valid_until', 'activity_operating_since', 'identity_status_reviewed'];
for (const prefix of ['activity', 'gap', 'buying_trigger', 'proof', 'contact', 'decision_maker', 'instagram', 'facebook', 'linkedin', 'whatsapp', 'viber', 'consent', 'association', 'website_quality', 'legitimacy', 'business_case']) {
  CONTROL_FIELDS.push(...['verified', 'source_url', 'date', 'evidence'].map(s => prefix + '_' + s));
}
const REVIEW_FIELDS = [...new Set(CONTROL_FIELDS)];

function get(values, ...headers) {
  for (const header of headers) {
    const key = Object.keys(values).find(k => norm(k) === norm(header));
    if (key && text(values[key])) return text(values[key]);
  }
  return '';
}
function urls(value) {
  const source = text(value);
  const found = source.match(/https?:\/\/[^\s|<>"']+/gi) || [];
  if (!found.length && /^(?:www\.)?[a-z\d][a-z\d.-]+\.[a-z]{2,}(?:\/[^\s]*)?$/i.test(source)) found.push(source);
  return [...new Set(found.map(u => { try { return parsePublicUrl(u.replace(/[),;.]+$/, '')).url; } catch { return ''; } }).filter(Boolean))];
}
function routeType(url) {
  let p;
  try { p = parsePublicUrl(url); } catch { return 'INVALID'; }
  if (/(^|\.)(facebook\.com|fb\.com|m\.facebook\.com)$/.test(p.host)) return p.path === '/' ? 'GENERIC_PLATFORM' : 'facebook';
  if (/(^|\.)instagram\.com$/.test(p.host)) return p.path === '/' ? 'GENERIC_PLATFORM' : 'instagram';
  if (/(^|\.)linkedin\.com$/.test(p.host)) return p.path === '/' ? 'GENERIC_PLATFORM' : 'linkedin';
  if (/(^|\.)(wa\.me|whatsapp\.com)$/.test(p.host)) return p.path === '/' ? 'GENERIC_PLATFORM' : 'whatsapp';
  if (/(^|\.)viber\.com$/.test(p.host)) return p.path === '/' ? 'GENERIC_PLATFORM' : 'viber';
  if (/(^|\.)(fresha\.com|booksy\.com|booking\.com|resdiary\.com|opentable\.com|nowbookit\.com)$/.test(p.host)) return 'BOOKING';
  if (/(^|\.)(google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl|linktr\.ee|tripadvisor\.[a-z.]+|zomato\.com)$/.test(p.host)) return 'THIRD_PARTY';
  return 'WEBSITE_CANDIDATE';
}
function parseLocation(value, country) {
  const location = text(value);
  if (country === 'Australia') {
    const m = /^(.*?)[,\s]+(NSW|VIC|QLD|WA|SA|TAS|NT|ACT)(?:\s+\d{4})?$/i.exec(location);
    if (m) return { city: m[1].trim(), state: m[2].toUpperCase(), location };
  }
  return { city: location || (country === 'Philippines' ? 'Metro Manila' : ''), state: '', location };
}
function validateRegistry(config) {
  if (!Array.isArray(config.datasets) || ![3,4].includes(config.datasets.length)) throw new Error('THREE_OR_FOUR_DATASETS_REQUIRED');
  const seen = new Set(), datasetIds = new Set();
  return config.datasets.map(d => {
    if (!text(d.dataset_id).trim() || datasetIds.has(d.dataset_id)) throw new Error('DUPLICATE_OR_EMPTY_DATASET_ID');
    datasetIds.add(d.dataset_id);
    const fromUrl = text(d.spreadsheet_url).match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)?.[1];
    const id = fromUrl || d.spreadsheet_id;
    if (!id || /SPREADSHEET_ID|REPLACE/.test(id) || !/^[a-zA-Z0-9_-]{15,}$/.test(id)) throw new Error('CONFIGURE_SPREADSHEET: ' + d.dataset_id);
    if (seen.has(id)) throw new Error('DATASETS_MUST_USE_SEPARATE_SPREADSHEETS');
    seen.add(id);
    if (d.output_sheet !== 'Arc Research' || [d.primary_sheet, ...Object.keys(d.supplemental_sheets)].includes(d.output_sheet)) throw new Error('UNSAFE_OUTPUT_TAB');
    return { ...d, spreadsheet_id: id };
  });
}
function metadataRequests(config) {
  return validateRegistry(config).map(d => ({ dataset_id: d.dataset_id, url: 'https://sheets.googleapis.com/v4/spreadsheets/' + d.spreadsheet_id + '?fields=' + encodeURIComponent('spreadsheetId,sheets.properties,properties.spreadsheetTheme') }));
}
function gridRequests(metadata, config) {
  const datasets = validateRegistry(config);
  if (metadata.length !== datasets.length) throw new Error('MISSING_DATASET_METADATA');
  return datasets.map(d => {
    const meta = metadata.find(m => m.spreadsheetId === d.spreadsheet_id);
    if (!meta) throw new Error('WRONG_SPREADSHEET_RESPONSE: ' + d.dataset_id);
    const titles = (meta.sheets || []).map(s => s.properties.title);
    const read = [d.primary_sheet, ...Object.keys(d.supplemental_sheets)];
    for (const title of read) if (!titles.includes(title)) throw new Error('MISSING_REQUIRED_SHEET: ' + d.dataset_id + '/' + title);
    if (titles.includes(d.output_sheet)) read.push(d.output_sheet);
    const fields = 'spreadsheetId,properties.spreadsheetTheme,sheets(properties,data(startRow,startColumn,rowData(values(formattedValue,effectiveValue,userEnteredValue,hyperlink,textFormatRuns,effectiveFormat(backgroundColor,backgroundColorStyle),userEnteredFormat(backgroundColor,backgroundColorStyle)))))';
    return { dataset_id: d.dataset_id, url: 'https://sheets.googleapis.com/v4/spreadsheets/' + d.spreadsheet_id + '?fields=' + encodeURIComponent(fields) + read.map(title => '&ranges=' + encodeURIComponent("'" + title.replace(/'/g, "''") + "'")).join('') };
  });
}
function normalizeDataset(snapshot, dataset, now = new Date().toISOString()) {
  const spreadsheetId = snapshot.spreadsheetId || dataset.spreadsheet_id;
  const byName = new Map((snapshot.sheets || []).map(s => [s.properties.title, s]));
  const primary = byName.get(dataset.primary_sheet);
  if (!primary) throw new Error('MISSING_PRIMARY_SHEET: ' + dataset.dataset_id);
  const table = readTable(primary, dataset.header_row);
  if (!table.headers.includes('Business')) throw new Error('UNEXPECTED_HEADER_ROW: ' + dataset.dataset_id);
  const previousSheet = byName.get(dataset.output_sheet);
  const previous = previousSheet?.data?.some(x => x.rowData?.some(r => r.values?.some(c => text(c.formattedValue)))) ? readTable(previousSheet, 1).rows : [];
  const priorById = new Map();
  for (const record of previous) {
    const id = record.values.lead_id;
    if (!id) throw new Error('OUTPUT_ROW_WITHOUT_ID');
    if (priorById.has(id)) throw new Error('DUPLICATE_OUTPUT_ID: ' + id);
    priorById.set(id, record.values);
  }
  const supplement = [];
  for (const [name, header] of Object.entries(dataset.supplemental_sheets)) {
    const sheet = byName.get(name);
    if (!sheet) throw new Error('MISSING_SUPPLEMENTAL_SHEET: ' + name);
    for (const item of readTable(sheet, header).rows) supplement.push({ ...item, sheet: name,
      source_url: sourceURL(spreadsheetId, sheet.properties.sheetId, item.source_row) });
  }
  const primaryNames = new Map();
  table.rows.forEach(r => { const key = businessKey(get(r.values, 'Business')); primaryNames.set(key, (primaryNames.get(key) || 0) + 1); });
  const seenIds = new Set();
  const leads = table.rows.filter(r => get(r.values, 'Business')).map(record => {
    const v = record.values;
    const name = get(v, 'Business');
    const originalId = get(v, 'ID', 'Rank');
    const address = get(v, 'Address');
    const loc = parseLocation(get(v, 'City', 'City / Location', 'Location'), dataset.country);
    const identity = originalId || [businessKey(name), businessKey(address), norm(loc.location)].join('|');
    if (!originalId && !address && !loc.location) throw new Error('IDENTITY_REVIEW_REQUIRED: ' + name);
    const id = 'arc_' + sha256(['arc-dataset-v2', dataset.dataset_id, dataset.primary_sheet, identity].join('|'));
    if (seenIds.has(id)) throw new Error('DUPLICATE_SOURCE_ID: ' + dataset.dataset_id + '/' + identity);
    seenIds.add(id);
    const old = priorById.get(id) || {};
    const ownSource = sourceURL(spreadsheetId, primary.properties.sheetId, record.source_row);
    const sameName = supplement.filter(r => businessKey(get(r.values, 'Business', 'Prospect')) === businessKey(name));
    const nearHistory = supplement.filter(r => {
      const a = businessKey(name), b = businessKey(get(r.values, 'Business', 'Prospect'));
      return r.sheet === 'Follow Up' && a !== b && Math.min(a.length, b.length) >= 5 && (a.includes(b) || b.includes(a));
    });
    const matched = sameName.filter(r => {
      const sid = get(r.values, 'ID', 'Rank');
      if (sid && originalId) return sid === originalId;
      return primaryNames.get(businessKey(name)) === 1;
    });
    // Audit reference sheets enrich historical context only, never import old strict rejection logic.
    const historyEntries = [{ values: v, sheet: dataset.primary_sheet, source_url: ownSource },
      ...matched.filter(r => !['Qualified', 'Audit Log'].includes(r.sheet))];
    const history = interpretHistory(historyEntries, now);
    const statusSignals = history.signals;
    if (yes(dataset.all_leads_previously_contacted)) {
      history.initial_contact_recorded = true;
      statusSignals.push({ kind: 'owner_confirmation', status: 'SENT', source_url: ownSource,
        confirmed_at: dataset.contact_history_confirmed_at, field_value: dataset.contact_history_note });
      history.status = strongest(statusSignals.map(s => s.status));
    }
    let fill = '', colourStatus = '';
    if (dataset.colour_status_column) {
      fill = colourHex(record.cells[table.headers.indexOf(dataset.colour_status_column)], snapshot.properties?.spreadsheetTheme);
      colourStatus = dataset.colour_map[fill] || '';
      if (colourStatus) statusSignals.push({ kind: 'colour', status: colourStatus, field_value: fill, source_url: ownSource });
    }
    const allEntries = [{ values: v, links: record.links, source_url: ownSource, sheet: dataset.primary_sheet }, ...matched];
    if (yes(dataset.all_leads_previously_contacted)) allEntries.push({ sheet: 'Owner confirmation', source_url: ownSource,
      values: { confirmed_at: dataset.contact_history_confirmed_at, note: dataset.contact_history_note } });
    const declaredWebsites = allEntries.flatMap(e => ['Website confirmed', 'Website', 'Possible owned-site result', 'Maps website field', 'Owned-site results'].flatMap(h => [...urls(get(e.values, h)), ...(e.links?.[h] || [])]));
    // Evidence sources include directories shared by unrelated businesses. Keep candidates,
    // but only select a source-only host after review; it is still not proof of ownership.
    const evidenceWebsites = allEntries.flatMap(e => ['Email source', 'Email sources', 'First evidence source'].flatMap(h => [...urls(get(e.values, h)), ...(e.links?.[h] || [])]));
    const websiteCandidates = [...declaredWebsites, ...evidenceWebsites];
    const socialCandidates = allEntries.flatMap(e => ['Socials', 'Facebook', 'Instagram', 'Contact Route', 'Contact Detail', 'Alternate route'].flatMap(h => [...urls(get(e.values, h)), ...(e.links?.[h] || [])]));
    const lead = { dataset_id: dataset.dataset_id, source_spreadsheet_id: spreadsheetId, source_sheet: dataset.primary_sheet,
      source_row: record.source_row, source_original_id: originalId, lead_id: id, source_record_id: identity, source_url: ownSource,
      business_name: name, industry: get(v, 'Sector'), sector: get(v, 'Sector'), category: get(v, 'Category'),
      country: dataset.country, ...loc, address, rating: get(v, 'Rating'), reviews: get(v, 'Reviews'),
      phone: get(v, 'Phone') || (get(v, 'Contact Route').match(/\+\d[\d ()-]{7,}/)?.[0] || '').trim(),
      maps_url: get(v, 'Google Maps', 'Maps route'), website_url: '', existing_email: '',
      status_signals: statusSignals, legacy_colour: fill, legacy_status: colourStatus || history.status,
      legacy_status_imported: true, previous_result: old, acma_applies: dataset.acma_applies,
      ...history, legacy_join_review_required: sameName.length !== matched.length || nearHistory.length > 0,
      legacy_snapshot_json: JSON.stringify(allEntries.map(e => ({ sheet: e.sheet, source_url: e.source_url, values: e.values }))),
      website_candidates_json: JSON.stringify([...new Set(websiteCandidates)]), legacy_recheck_required: true };
    for (const url of [...websiteCandidates, ...socialCandidates]) {
      const kind = routeType(url);
      if (kind === 'WEBSITE_CANDIDATE' && (declaredWebsites.includes(url) || (dataset.allowed_hosts || []).includes(parsePublicUrl(url).host))) lead.website_url ||= url;
      else if (['facebook', 'instagram', 'linkedin', 'whatsapp', 'viber'].includes(kind)) lead[kind + '_url'] ||= url;
      else if (kind === 'BOOKING') lead.booking_url ||= url;
      else if (kind === 'THIRD_PARTY') lead.third_party_url ||= url;
    }
    for (const entry of allEntries) {
      const email = get(entry.values, 'Public email', 'Business Email', 'Email');
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) lead.existing_email ||= email;
    }
    for (const field of REVIEW_FIELDS) if (text(old[field])) lead[field] = old[field];
    for (const platform of ['website', 'facebook', 'instagram', 'whatsapp', 'viber']) {
      if (old['reviewed_' + platform + '_url']) lead[platform + '_url'] = urls(old['reviewed_' + platform + '_url'])[0] || '';
    }
    if (get(v, 'Website confirmed').toUpperCase() === 'YES') lead.legacy_website_confirmation = 'YES';
    lead.initial_contact_recorded = history.initial_contact_recorded || colourStatus === 'SENT' || yes(old.initial_contact_recorded) || ['SENT', 'REPLIED', 'FOLLOW_UP_DUE'].includes(old.arc_status);
    for (const field of ['first_contact_at','first_contact_channel','followup_due_at','followup_channel','followup_count','last_reply_at','reply_status']) lead[field] ||= old[field] || '';
    lead.arc_status = reconcileStatus(lead, old);
    lead.skip_research = ['DO_NOT_CONTACT', 'DISQUALIFIED', 'PARKED'].includes(lead.arc_status);
    lead.initial_outreach_blocked = lead.legacy_join_review_required || lead.initial_contact_recorded || ['DO_NOT_CONTACT','DISQUALIFIED','PARKED','REPLIED','SENT','FOLLOW_UP_DUE'].includes(lead.arc_status);
    if (nearHistory.length) lead.legacy_snapshot_json = JSON.stringify([...JSON.parse(lead.legacy_snapshot_json), ...nearHistory.map(e => ({ sheet: e.sheet, source_url: e.source_url, possible_match_only: true, values: e.values }))]);
    lead.legacy_colour_review_required = fill.startsWith('UNRESOLVED') || Boolean(fill && !colourStatus && !['FFFFFF','000000'].includes(fill));
    if (lead.legacy_snapshot_json.length > 45000) {
      // Source rows remain untouched; retain every source link instead of exceeding a Sheets cell limit.
      lead.legacy_snapshot_json = JSON.stringify(allEntries.map(e => ({ sheet: e.sheet, source_url: e.source_url, note: 'See original row for full historical fields.' })));
    }
    return lead;
  });
  return { dataset, snapshot, leads };
}
function normalizeSnapshots(snapshots, config, now) {
  const datasets = config.datasets;
  if (snapshots.length !== datasets.length) throw new Error('INCOMPLETE_DATASET_SNAPSHOT');
  const contexts = datasets.map(d => {
    const snapshot = snapshots.find(s => s.spreadsheetId === d.spreadsheet_id || s.dataset_id === d.dataset_id);
    if (!snapshot) throw new Error('MISSING_DATASET: ' + d.dataset_id);
    return normalizeDataset(snapshot, d, now);
  });
  return { contexts, leads: detectDuplicates(contexts.flatMap(c => c.leads)) };
}
function selectBatch(intake, config) {
  const cap = Number(config.limit_per_dataset ?? 5), offset = Number(config.offset_per_dataset ?? 0);
  if (!Number.isInteger(cap) || cap < 1 || cap > 25 || !Number.isInteger(offset) || offset < 0) throw new Error('INVALID_BATCH_WINDOW');
  return config.datasets.flatMap(d => intake.leads.filter(l => l.dataset_id === d.dataset_id).slice(offset, offset + cap)
    .map(lead => ({ lead, config: { allowed_hosts: d.allowed_hosts || [], discovery: config.discovery || {enabled:false} } })));
}
module.exports = { REVIEW_FIELDS, get, urls, routeType, parseLocation, validateRegistry, metadataRequests, gridRequests, normalizeDataset, normalizeSnapshots, selectBatch };
