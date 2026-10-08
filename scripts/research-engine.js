'use strict';
const { text, norm, yes, normalizeRow, leadId, allowedUrl, parsePublicUrl, evidence, sheetSafe } = require('./helpers');
const { classifyWebsite } = require('./website-check');
const { extractContacts } = require('./contact-extractor');
const { validateEmail } = require('./email-validator');
const { reviewedFact, classifyActivity } = require('./activity-classifier');
const { timezoneFor } = require('./timezone');
const { DIMENSION_FIELDS, assessQualification, recalibrateResult } = require('./qualification');
const { reconcileStatus, PROTECTED } = require('./legacy-status');

const OUTPUT_FIELDS = ('lead_id business_name industry country city state maps_url website_url facebook_url instagram_url linkedin_url ' +
  'business_status business_status_confidence website_status website_final_url website_http_code website_redirect_target ' +
  'public_email email_source_url email_source_type email_confidence email_validation decision_maker_name decision_maker_role decision_maker_source ' +
  'phone social_status facebook_status instagram_status linkedin_status pain_point pain_evidence pain_verified business_consequence buying_trigger ' +
  'lead_quality lead_score confidence_score recommended_channel timezone timezone_source email_subject email_draft dm_draft ' +
  'research_notes research_required acma_status acma_reason evidence_json errors_json checked_at research_version ' +
  'dataset_id source_spreadsheet_id source_sheet source_row source_original_id sector location address rating reviews source_url ' +
  'activity_evidence website_evidence website_source website_check_status website_association decision_maker_confidence buying_trigger_source buying_trigger_date ' +
  'whatsapp_url whatsapp_status viber_url viber_status role_relevance suppression_status ' +
  'legacy_status arc_status legacy_colour legacy_status_imported legacy_snapshot_json legacy_recheck_required legacy_join_review_required legacy_colour_review_required ' +
  'first_contact_at first_contact_channel followup_due_at followup_channel followup_count last_reply_at reply_status initial_contact_recorded initial_outreach_blocked ' +
  'duplicate_review_required duplicate_matches_json duplicate_group_key website_candidates_json last_researched_at research_skipped').split(' ').concat(DIMENSION_FIELDS);

function prepareRows(rows) {
  const seen = new Set();
  return rows.map(raw => {
    const row = normalizeRow(raw);
    row.lead_id = leadId(row);
    if (seen.has(row.lead_id)) throw new Error('DUPLICATE_LEAD_ID: ' + row.lead_id + '; resolve duplicate rows or provide branch source_record_id');
    seen.add(row.lead_id);
    return row;
  });
}

function startResearch(raw, config = {}, now = new Date().toISOString()) {
  const row = normalizeRow(raw);
  const state = { row, config: { allowed_hosts: config.allowed_hosts || [] }, now, lead_id: leadId(row),
    queue: [], visited: [], observations: [], contacts: [], errors: [...(row.discovery_errors || [])], evidence: [...(row.discovery_observations || [])], no_solicitation: false,
    homepage: { status: text(row.website_url) ? 'UNKNOWN' : 'NO_WEBSITE', reason: text(row.website_url) ? 'Not checked yet.' : 'No website URL supplied; website absence is unverified.' },
    final_url: '', http_code: '', redirect_target: '', requests: 0 };
  if (config.rescore_existing === true) {
    const prior = row.previous_result;
    if (!prior || prior.lead_id !== state.lead_id || prior.dataset_id !== row.dataset_id || prior.source_spreadsheet_id !== row.source_spreadsheet_id || !prior.evidence_json) throw new Error('RECALIBRATION_PROVENANCE_MISMATCH');
    state.recalibration_result = Object.fromEntries(OUTPUT_FIELDS.map(f=>[f,prior[f]??'']));
    for (const f of ['business_status_confidence','lead_score','confidence_score']) state.recalibration_result[f] = Number(prior[f]) || 0;
    for (const f of ['research_required','pain_verified','legacy_status_imported','legacy_recheck_required','legacy_join_review_required','legacy_colour_review_required','initial_contact_recorded','duplicate_review_required','initial_outreach_blocked','research_skipped']) state.recalibration_result[f] = yes(prior[f]);
    return state;
  }
  if(row.autonomous_research){
    const official=row.autonomous_research.identities.find(i=>i.status==='AUTO_VERIFIED_OFFICIAL'&&i.source_type==='WEBSITE');
    state.homepage={status:official?'LIVE':'UNKNOWN',reason:official?'Identity-matched public website content retrieved during bounded discovery; origin HTTP status and form submission are not inferred.':'No owned website established during bounded discovery.'};
    state.association=official?'AUTO_VERIFIED_OFFICIAL':'UNVERIFIED';state.final_url=official?.url||'';
    return state;
  }
  if (text(row.website_url) && !yes(row.skip_research)) {
    try { state.queue.push({ url: allowedUrl(row.website_url, state.config.allowed_hosts).url, kind: 'home', redirects: 0 }); }
    catch (error) { state.errors.push({ stage: 'url_validation', code: error.message, source_url: text(row.website_url) }); }
  }
  return state;
}

function nextRequest(state) {
  state.pending = null;
  while (state.queue.length && state.requests < 6) {
    const item = state.queue.shift();
    if (state.visited.includes(item.url)) {
      state.errors.push({ stage: item.kind, code: 'REDIRECT_OR_LINK_LOOP', source_url: item.url });
      continue;
    }
    try { allowedUrl(item.url, state.config.allowed_hosts); }
    catch (error) { state.errors.push({ stage: item.kind, code: error.message, source_url: item.url }); continue; }
    state.pending = item;
    state.requests++;
    state.visited.push(item.url);
    break;
  }
  if (!state.pending && state.queue.length) {
    state.errors.push({ stage: 'crawl', code: 'REQUEST_LIMIT', source_url: '' });
    state.queue = [];
  }
  return state;
}

function consumeResponse(state, rawResponse) {
  const request = state.pending;
  if (!request) throw new Error('No request context');
  const headers = {};
  for (const [key, value] of Object.entries(rawResponse.headers || {})) headers[key.toLowerCase()] = value;
  const response = { ...rawResponse, headers, body: rawResponse.body ?? rawResponse.data ?? '' };
  const result = classifyWebsite(response);
  state.observations.push({ url: request.url, kind: request.kind, status: result.status, code: response.statusCode || 0 });
  state.evidence.push(evidence('website_check', request.url, result.reason, state.now,
    { status: result.status, http_code: response.statusCode || null }));
  if (request.kind === 'home') {
    state.homepage = result;
    state.http_code = Number(response.statusCode) || '';
    state.final_url = request.url;
  }
  if (result.status === 'UNKNOWN' || response.error) state.errors.push({ stage: request.kind, code: result.status, source_url: request.url, detail: result.reason });
  if (result.status === 'REDIRECT') {
    const target = headers.location;
    try {
      if (!target) throw new Error('REDIRECT_WITHOUT_LOCATION');
      const parsed = allowedUrl(String(target), state.config.allowed_hosts, request.url);
      if (request.kind === 'home') state.redirect_target = parsed.url;
      if (request.redirects >= 3) throw new Error('REDIRECT_LIMIT');
      state.queue.unshift({ ...request, url: parsed.url, redirects: request.redirects + 1 });
    } catch (error) {
      state.errors.push({ stage: 'redirect', code: error.message, source_url: request.url });
    }
    return state;
  }
  if (result.status !== 'LIVE') return state;
  const extracted = extractContacts(response.body, request.url);
  state.no_solicitation ||= extracted.no_solicitation;
  // Host approval only controls fetching. Ownership is a separate, human-reviewed assertion.
  const associationFact = reviewedFact(state.row, 'association', state.now);
  const associatedSource = associationFact && (associationFact.verification !== 'DISCOVERY_VERIFIED' || parsePublicUrl(associationFact.source_url).host.replace(/^www\./, '') === parsePublicUrl(state.row.website_url).host.replace(/^www\./, ''));
  const isOfficial = (yes(state.row.website_ownership_verified) || Boolean(associatedSource)) &&
    parsePublicUrl(request.url).host.replace(/^www\./, '') === parsePublicUrl(state.row.website_url).host.replace(/^www\./, '');
  if (request.kind === 'home') {
    const page = norm(extracted.visible).replace(/[^a-z0-9]/g, '');
    const name = norm(state.row.business_name).replace(/[^a-z0-9]/g, '');
    const phone = text(state.row.phone).replace(/\D/g, '');
    const address = norm(state.row.address).replace(/[^a-z0-9]/g, '');
    state.association = isOfficial ? 'REVIEWED_ASSOCIATION' : name.length > 4 && page.includes(name) &&
      ((phone.length >= 8 && page.includes(phone.slice(-8))) || (address.length >= 12 && page.includes(address))) ? 'NAME_AND_CONTACT_MATCH_REVIEW' : 'UNVERIFIED';
    state.evidence.push(evidence('website_association', request.url, state.association, state.now));
  }
  if (isOfficial) {
    const businessEmailHost = parsePublicUrl(request.url).host.replace(/^www\./, '');
    for (const email of extracted.emails) {
      if (email.split('@')[1] !== businessEmailHost) {
        state.evidence.push(evidence('email_candidate_needs_ownership_review', request.url, email, state.now));
        continue;
      }
      if (!state.contacts.some(x => x.email === email)) state.contacts.push({ email, source_url: request.url, source_type: 'OFFICIAL_WEBSITE' });
    }
  }
  if (request.kind === 'home') {
    const homeHost = parsePublicUrl(request.url).host;
    const contactPages = extracted.links.filter(url => parsePublicUrl(url).host === homeHost && /\/(?:contact|about|contact-us|about-us)(?:[/.?#-]|$)/i.test(parsePublicUrl(url).path));
    for (const url of contactPages.slice(0, 2)) state.queue.push({ url, kind: 'contact', redirects: 0 });
  }
  return state;
}

function socialState(row, platform, now) {
  const fact = reviewedFact(row, platform, now);
  let profileValid = false;
  try { profileValid = Boolean(parsePublicUrl(row[platform + '_url'])); } catch { /* missing profile */ }
  return fact && profileValid && row[platform + '_status_reviewed'] === 'USABLE' ? { status: 'USABLE', fact } : { status: text(row[platform + '_url']) ? 'UNVERIFIED' : 'NOT_SUPPLIED', fact: null };
}

function finishResearch(state) {
  if (state.recalibration_result) return recalibrateResult(state.recalibration_result, state.row, state.now);
  const row = state.row;
  let output = Object.fromEntries(OUTPUT_FIELDS.map(key => [key, '']));
  for (const key of ['business_name', 'industry', 'country', 'city', 'state', 'maps_url', 'website_url', 'facebook_url', 'instagram_url', 'linkedin_url', 'phone']) output[key] = text(row[key]);
  Object.assign(output, { lead_id: state.lead_id, website_status: state.homepage.status, website_final_url: state.final_url,
    website_http_code: state.http_code, website_redirect_target: state.redirect_target, checked_at: state.now, research_version: '1.0.0' });
  const notes = [state.homepage.reason];
  const facts = [...state.evidence];
  const activity = classifyActivity(row, state.now);
  output.business_status = activity.status;
  output.business_status_confidence = activity.confidence;
  facts.push(...activity.evidence);
  if (activity.status === 'UNCERTAIN') notes.push('Business activity needs a dated, source-backed review; an HTTP response alone is insufficient.');
  let contact = state.contacts[0];
  const reviewedContact = reviewedFact(row, 'contact', state.now);
  const reviewedEmail = validateEmail(row.contact_email);
  const sourceTypes = ['OFFICIAL_WEBSITE', 'FACEBOOK_ABOUT', 'INSTAGRAM_CONTACT', 'PROFESSIONAL_DIRECTORY', 'PUBLIC_BUSINESS_LISTING'];
  if (!contact && reviewedContact && reviewedEmail.valid && sourceTypes.includes(row.contact_source_type)) {
    contact = { email: reviewedEmail.email, source_url: reviewedContact.source_url, source_type: row.contact_source_type };
    facts.push(reviewedContact);
  }
  if (contact) {
    Object.assign(output, { public_email: contact.email, email_source_url: contact.source_url, email_source_type: contact.source_type,
      email_confidence: 'MEDIUM', email_validation: 'SYNTAX_ONLY' });
    facts.push(evidence('published_email', contact.source_url, contact.email, state.now));
  } else if (text(row.existing_email)) {
    output.email_source_type = 'EXISTING_SPREADSHEET';
    output.email_confidence = 'UNVERIFIED';
    output.email_validation = validateEmail(row.existing_email).verification;
    notes.push('Supplied email retained in Leads; public provenance not established, so public_email is blank.');
  } else output.email_validation = 'NOT_FOUND';
  if (text(row.website_url) && !yes(row.website_ownership_verified)) notes.push('Website ownership unverified; extracted addresses are not promoted.');
  const person = reviewedFact(row, 'decision_maker', state.now);
  if (person && text(row.decision_maker_name_reviewed)) {
    output.decision_maker_name = text(row.decision_maker_name_reviewed);
    output.decision_maker_role = text(row.decision_maker_role_reviewed);
    output.decision_maker_source = person.source_url;
    facts.push(person);
  }
  const socials = {};
  for (const platform of ['instagram', 'facebook', 'linkedin', 'whatsapp', 'viber']) {
    socials[platform] = socialState(row, platform, state.now);
    output[platform + '_status'] = socials[platform].status;
    if (socials[platform].fact) facts.push(socials[platform].fact);
  }
  output.social_status = Object.values(socials).some(x => x.status === 'USABLE') ? 'REVIEWED_ROUTE_AVAILABLE' : 'UNVERIFIED';
  const gap = yes(row.gap_unresolved_verified) ? reviewedFact(row, 'gap', state.now) : null;
  const defect = ['DNS_ERROR', 'SSL_ERROR', '404', 'EXPIRED_DOMAIN', 'DISCONNECTED_DOMAIN', 'PARKED', 'BROKEN'].includes(state.homepage.status);
  if (gap) {
    output.pain_point = text(row.gap_evidence);
    output.pain_evidence = gap.source_url + ' | ' + gap.excerpt;
    facts.push(gap);
  } else if (defect) {
    output.pain_point = `The supplied website URL showed ${state.homepage.status} during this check.`;
    output.pain_evidence = state.final_url + ' | ' + state.homepage.reason;
    // One failed request is a diagnostic candidate, never an automatically verified sales claim.
    notes.push('Recheck the defect in a browser and verify the URL is publicly linked before approving a pain claim.');
  }
  output.pain_verified = Boolean(gap);
  output.business_consequence = output.pain_point ? 'A visitor may have difficulty reaching the information or enquiry route. This is a hypothesis, not measured conversion loss.' : '';
  const trigger = reviewedFact(row, 'buying_trigger', state.now);
  output.buying_trigger = trigger ? trigger.excerpt : '';
  if (trigger) facts.push(trigger);
  else notes.push('Buying trigger not established; optional enrichment, not a qualification gate.');
  const proof = reviewedFact(row, 'proof', state.now);
  if (proof) facts.push(proof);
  const legitimate = reviewedFact(row, 'legitimacy', state.now);
  const businessCase = reviewedFact(row, 'business_case', state.now);
  const quality = reviewedFact(row, 'website_quality', state.now);
  for (const fact of [legitimate, businessCase, quality]) if (fact) facts.push(fact);
  const suppressed = yes(row.suppressed) || row.arc_status === 'DO_NOT_CONTACT' || ['UNSUBSCRIBED', 'BOUNCED', 'COMPLAINT', 'NOT_INTERESTED'].includes(row.outreach_status);
  const acmaApplies = norm(row.country) === 'australia';
  output.acma_status = acmaApplies ? 'QUESTIONABLE' : 'NOT_APPLICABLE';
  output.acma_reason = acmaApplies
    ? 'Public email is not consent. Review provenance, role relevance, no-solicitation notices and documented consent basis; address-harvesting restrictions also require review.'
    : 'Not an Australian lead; local consent/privacy review is still required before outreach.';
  if (suppressed || state.no_solicitation) {
    output.acma_status = acmaApplies ? 'DO_NOT_EMAIL' : 'NOT_APPLICABLE';
    output.acma_reason = suppressed ? 'Existing suppression or stop status.' : 'No-solicitation notice detected on the website.';
  } else {
    const consent = reviewedFact(row, 'consent', state.now);
    if (acmaApplies && contact && consent && norm(row.consent_recipient) === contact.email && yes(row.role_relevance_verified) && yes(row.no_solicitation_checked)) {
      output.acma_status = 'SAFE_TO_REVIEW';
      output.acma_reason = 'Documented consent basis and relevance supplied for human review. This is not send authorization.';
      facts.push(consent);
    }
  }
  const routes = { instagram: 'IG_MANUAL', facebook: 'FB_MANUAL', whatsapp: 'WHATSAPP_MANUAL', viber: 'VIBER_MANUAL', linkedin: 'LINKEDIN_MANUAL' };
  const socialRoute = ['instagram', 'facebook', 'whatsapp', 'viber', 'linkedin'].find(p => socials[p].status === 'USABLE');
  const emailCandidate = Boolean(contact) && output.acma_status !== 'DO_NOT_EMAIL';
  const platformCandidate = row.booking_status === 'USABLE' && Boolean(reviewedFact(row, 'platform', state.now));
  const socialFirst = /restaurant|caf[eé]|bar\b|aesthetic|salon|entertainment|lifestyle/i.test(output.industry + ' ' + text(row.category));
  output.recommended_channel = suppressed || state.no_solicitation || activity.status === 'INACTIVE' ? 'PARK' :
    socialFirst && socialRoute ? routes[socialRoute] : emailCandidate ? 'EMAIL_CANDIDATE' : socialRoute ? routes[socialRoute] : platformCandidate ? 'BUSINESS_CONTACT_MANUAL' : 'PARK';
  Object.assign(output, timezoneFor(row));
  output.timezone_source = output.source;
  delete output.source;
  notes.push('V1 drafts are intentionally blank. Review candidates before later analysis/drafting.');
  output.research_notes = notes.join(' ');
  output.evidence_json = JSON.stringify(facts);
  output.errors_json = JSON.stringify(state.errors);
  output.activity_evidence = JSON.stringify(activity.evidence);
  output.website_check_status = state.homepage.status;
  output.website_evidence = state.homepage.reason;
  output.website_source = state.final_url;
  output.website_association = state.association || 'UNVERIFIED';
  output.decision_maker_confidence = person ? 'REVIEWED' : 'UNKNOWN';
  output.buying_trigger_source = trigger?.source_url || '';
  output.buying_trigger_date = trigger?.fact_date || '';
  output.role_relevance = yes(row.role_relevance_verified) ? 'REVIEWED' : 'UNVERIFIED';
  output.suppression_status = suppressed || state.no_solicitation ? 'DO_NOT_CONTACT' : 'NONE_RECORDED';
  if (row.dataset_id) {
    const statusMap = { DNS_ERROR: 'DNS_ERROR', SSL_ERROR: 'SSL_ERROR', '404': '404', EXPIRED_DOMAIN: 'DEAD_DOMAIN',
      DISCONNECTED_DOMAIN: 'BROKEN_SITE', PARKED: 'BROKEN_SITE', BROKEN: 'BROKEN_SITE' };
    output.website_status = statusMap[state.homepage.status] || 'UNCERTAIN';
    const associated = state.association === 'REVIEWED_ASSOCIATION' || Boolean(reviewedFact(row, 'association', state.now));
    if (state.homepage.status === 'LIVE' && associated && quality && row.website_quality_reviewed === 'STRONG_SITE') output.website_status = 'LIVE_STRONG_SITE';
    else if (state.homepage.status === 'LIVE' && associated && gap) output.website_status = 'LIVE_SITE_WITH_GAP';
    else if (!text(row.website_url) && yes(row.no_website_verified) && gap) output.website_status = row.facebook_url || row.instagram_url ? 'SOCIAL_ONLY' : row.booking_url ? 'BOOKING_PLATFORM_ONLY' : row.third_party_url ? 'THIRD_PARTY_ONLY' : 'NO_WEBSITE';
  }
  Object.assign(output, assessQualification(output, row, state.now));
  // Carry provenance into the merge before deriving qualification. A weaker
  // retry cannot remove contacts or dated evidence used by qualification.
  for(const key of ['dataset_id','source_spreadsheet_id'])output[key]=row[key]||'';
  output=require('./research-history').mergeRows(row.previous_result||{},output,state.now);
  if(row.autonomous_research)Object.assign(output,require('./autonomous-qualification').qualify(output,row,state.now));
  if(row.autonomous_research)Object.assign(output,require('./email-domain').project(output,require('./research-history').list(output.evidence_json),state.now));
  return require('./research-history').mergeRows(row.previous_result||{},applyDatasetState(output, state),state.now);
}

function applyDatasetState(output, state) {
  const row = state.row, prior = row.previous_result || {};
  if (yes(row.skip_research)) {
    for (const field of OUTPUT_FIELDS) if (prior[field] !== undefined) output[field] = prior[field];
  }
  for (const field of ['dataset_id','source_spreadsheet_id','source_sheet','source_row','source_original_id','sector','location','address','rating','reviews','source_url',
    'whatsapp_url','viber_url','legacy_colour','legacy_snapshot_json','first_contact_at','first_contact_channel','followup_due_at','followup_channel','followup_count','last_reply_at','reply_status','duplicate_matches_json','duplicate_group_key','website_candidates_json']) output[field] = text(row[field]);
  for (const field of ['legacy_status_imported','legacy_recheck_required','legacy_join_review_required','legacy_colour_review_required','initial_contact_recorded','duplicate_review_required']) output[field] = yes(row[field]);
  // A changed identity match is not an explicit release of a prior duplicate/contact lock.
  output.duplicate_review_required ||= yes(prior.duplicate_review_required);
  output.initial_contact_recorded ||= yes(prior.initial_contact_recorded);
  if (!yes(row.duplicate_review_required) && yes(prior.duplicate_review_required)) {
    output.duplicate_matches_json = prior.duplicate_matches_json || output.duplicate_matches_json;
    output.duplicate_group_key = prior.duplicate_group_key || output.duplicate_group_key;
  }
  output.legacy_status = text(prior.legacy_status) || text(row.legacy_status);
  let auto = output.lead_quality === 'DISQUALIFY' ? 'DISQUALIFIED' : output.research_required ? 'NEEDS_RESEARCH' : output.recommended_channel === 'EMAIL_CANDIDATE' ? 'READY_EMAIL' : output.recommended_channel === 'PARK' ? 'PARKED' : 'READY_DM';
  if (output.outreach_readiness !== 'READY_FOR_REVIEW' && auto !== 'DISQUALIFIED') auto = 'NEEDS_RESEARCH';
  if (output.duplicate_review_required || yes(row.legacy_join_review_required) || yes(row.legacy_colour_review_required)) auto = 'NEEDS_RESEARCH';
  const protectedState = PROTECTED.includes(row.arc_status) || PROTECTED.includes(prior.arc_status);
  output.arc_status = output.suppression_status === 'DO_NOT_CONTACT' && !protectedState ? 'DO_NOT_CONTACT' : reconcileStatus(row, prior, auto);
  output.initial_outreach_blocked = yes(row.initial_outreach_blocked) || yes(prior.initial_outreach_blocked) || output.initial_contact_recorded || output.duplicate_review_required || PROTECTED.includes(output.arc_status);
  output.research_skipped = yes(row.skip_research);
  output.last_researched_at = yes(row.skip_research) ? text(prior.last_researched_at) : state.now;
  output.checked_at = state.now;
  output.research_version = '2.1.0';
  if(row.discovery_observations)output.research_version='2.1.0+discovery.1.5.0';
  if(row.autonomous_research)output.research_version='2.2.0+autonomous.2.0.0';
  if (output.research_skipped) output.research_notes = 'Research skipped due to protected legacy/user status. ' + text(prior.research_notes);
  return output;
}

function sheetRecord(result) {
  // Explicit research-only projection prevents overwrite of approvals, suppression or send history.
  return Object.fromEntries(OUTPUT_FIELDS.map(key => [key, sheetSafe(result[key] ?? '')]));
}

async function runResearch(row, config, transport, now) {
  let state = startResearch(row, config, now);
  for (;;) {
    state = nextRequest(state);
    if (!state.pending) return finishResearch(state);
    let response;
    try { response = await transport(state.pending.url); }
    catch (error) { response = { error: { code: error.code || '', message: String(error.message).slice(0, 200) } }; }
    state = consumeResponse(state, response);
  }
}
module.exports = { OUTPUT_FIELDS, prepareRows, startResearch, nextRequest, consumeResponse, finishResearch, sheetRecord, runResearch, applyDatasetState, recalibrateResult };
