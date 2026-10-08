# Three-dataset schema

Version 2.1.0 extends V1. config/datasets.json is canonical and is embedded in the
parent Configure node during builds. Three workbooks remain separate. Source tabs,
values, headers, manual notes and fills stay intact.

| Dataset | Primary (header row) | Supplemental reads (header row) | Reference-only, not fetched |
|---|---|---|---|
| AUSTRALIA | 250 Sharp ICPs (5) | Cold Email Drafts (5), Compliance Queue (5) | Summary, Rejected Examples, Method & Scoring |
| MANILA_LEGACY | Sharp ICPs (5) | Outreach CRM (5), Email Outreach (7), Follow Up (1) | Audit Queue, Candidate Pool, Summary, Read Me |
| MANILA_AUDIT_QUEUE | Manual Check Queue (5) | Qualified (5), Audit Log (5), historical context only | Summary, Method |

Registry fields: dataset_id, spreadsheet_id, spreadsheet_url, primary_sheet,
header_row, supplemental_sheets, reference_sheets, country, timezone_rule,
status_rule, output_sheet, acma_applies and reviewed allowed_hosts. A provided URL
wins over the ID. Duplicate workbook IDs and unresolved placeholders fail preflight.
Output is always Arc Research in the corresponding workbook.

MANILA_LEGACY also has all_leads_previously_contacted=true, contact_history_confirmed_at
and an owner-confirmation note. On 2026-10-04 the owner confirmed every primary legacy
lead had received email, Instagram or Facebook outreach. All 55 import a contact lock.
Default state is SENT; explicit disqualified, suppression, reply and follow-up states
keep their precedence. Do not invent individual dates, channels or which unmarked
leads were disqualified. Confirmation is recorded in the historical snapshot.

## Identity and historical matching

Every output has lead_id, dataset_id, source_spreadsheet_id, source_sheet, source_row,
source_original_id and a source_url to the original row. lead_id is SHA-256 of
versioned dataset ID, primary tab and original ID/Rank. When absent, normalized
name/address/location forms the identity. Conversion and sorting do not change IDs.
Do not edit IDs/Rank or primary tab names without a migration.

Supplemental rows join on normalized name and matching ID/Rank where both exist.
Name-only joins require a unique primary name. Ambiguous matches and nearby Follow
Up names block initial outreach for review, without merging. Matched historical
fields, drafts, CRM notes and source links are retained in legacy_snapshot_json.
Above 45,000 characters, source links replace the snapshot. Originals remain intact.
Old research is not promoted to fresh verified evidence.

Email-source and first-evidence URLs are retained as additional website candidates.
They can be directories shared by unrelated businesses. A source-only candidate is
selected for fetching only after its exact host is reviewed and allowlisted; it does
not establish ownership or become an automatic domain identity match beforehand.

All primary leads are compared before batch selection. Signals: normalized name,
phone, candidate domain, Maps identity, address and social URL. Address alone does
not flag shared buildings. Name alone is a possible match; Maps identity or name
plus another key is stronger review. No automatic merges or disqualifications.
duplicate_matches_json records matched keys, other dataset/ID, contact history and
source. Possible duplicates set initial_outreach_blocked. This is conservative
matching, not complete entity resolution; aliases and unmatched history need review.

## Colours and status

Australia reads only the Business cell's effective background. Verified source
fills: FF0000 red, 4EA72E green (Office theme), FFFF00 yellow. Common green variants
are also accepted; theme colours resolve through spreadsheetTheme. Unknown coloured
cells require review. Manila amber manual-entry cells are not statuses.

Red imports DISQUALIFIED and skips research. Green imports SENT and prior initial
contact. Yellow imports PARKED and skips research. After legacy_status_imported is
persisted, colours no longer control reruns. Explicit history and saved protected
states outrank research: DO_NOT_CONTACT > DISQUALIFIED > REPLIED > FOLLOW_UP_DUE >
SENT > PARKED. SENT may refresh evidence but cannot become READY_EMAIL automatically.

Canonical states: NEW, NEEDS_RESEARCH, READY_EMAIL, READY_DM, SENT, PARKED,
DISQUALIFIED, FOLLOW_UP_DUE, REPLIED, DO_NOT_CONTACT. None authorizes sending.
Follow Up first-touch records establish contact without inventing dates. Relative
phrases do not create timestamps. FOLLOW_UP_DUE needs a real due/past date.
Preserved fields: first_contact_at, first_contact_channel, followup_due_at,
followup_channel, followup_count, last_reply_at and reply_status.

Reset via reviewer columns manual_status_override, manual_reset_at (ISO timestamp),
and manual_reset_reason. NEEDS_RESEARCH reopens research; source suppression still
wins. Prior contact stays recorded even after reset, preventing a second initial touch.

## Output and reviewer ownership

scripts/research-engine.js OUTPUT_FIELDS defines the machine prefix. The generated
schemas/research-result.schema.json specifies types. Output groups cover provenance,
activity, technical website checks and association, contacts, optional people and
triggers, gap/evidence, qualification, route, timezone, ACMA, history, duplicates and
timestamps. Drafts remain blank. Unknown facts remain blank/UNCERTAIN.

Reviewer fields from dataset-intake.js REVIEW_FIELDS follow the machine prefix.
Upserts never rewrite those cells. Do not reorder/delete machine headers, sort rows,
or edit sheets mid-run. Changed headers and duplicate output IDs halt writes.

Qualification 2.1 appends thirteen machine fields after the original one hundred.
An exact 2.0 prefix is migrated with insertDimension in Arc Research before reviewer
controls, retaining their values, formulas, formats and unknown extra columns. New
review controls are appended to the existing header. Reruns do not insert them again.
Other unexpected machine schemas still halt writes.

Reviewed facts use <prefix>_verified, _source_url, _date, _evidence. Prefixes: activity,
gap, legitimacy, business_case, proof, buying_trigger, decision_maker, contact,
association, website_quality, consent, instagram, facebook, linkedin, whatsapp,
viber. Require YES/true, public source URL, excerpt and date within 90 days, not future.
Activity permits up to 365 days: up to 183 days is a strong dated signal; older evidence
requires corroboration. Current service pages require matching operating evidence.
activity_signal_type distinguishes operating sources from DIRECTORY_ONLY,
REGISTRATION_ONLY and HTTP_ONLY, which never establish activity alone.
activity_corroborated, activity_valid_until and activity_operating_since qualify
corroboration, expired events and future openings. identity_status_reviewed can record
MISMATCHED or UNCERTAIN; neither is commercial disqualification on its own.
Additional controls include activity_status, gap_unresolved_verified, contact_email,
contact_source_type, decision_maker_name_reviewed, decision_maker_role_reviewed,
<social>_status_reviewed=USABLE, reviewed_website_url, reviewed social URLs,
website_ownership_verified, website_quality_reviewed=STRONG_SITE,
strong_site_solves_gap_verified, no_website_verified and timezone_override.

Contact source types: OFFICIAL_WEBSITE, FACEBOOK_ABOUT, INSTAGRAM_CONTACT,
PROFESSIONAL_DIRECTORY, PUBLIC_BUSINESS_LISTING. Crawled emails require reviewed
association and matching domain. External/free-mail addresses need separate review.
SYNTAX_ONLY means neither deliverability nor consent. Phone numbers do not imply
WhatsApp/Viber availability. Historical contacts remain in the legacy snapshot.

## Qualification and routes

commercial_quality is HIGH, MEDIUM, LOW or DISQUALIFY. It no longer uses PARK.
lead_quality aliases this dimension; its schema retains PARK for historical records.
Core points: confidence-weighted activity up to 25, legitimacy 15, unresolved gap 35,
reasonable business case 15 and proof/operations 10. Optional trigger adds 3 and
decision-maker adds 2, capped at 100. A verified active/legitimate/gap/case lead is HIGH
at 90+, otherwise MEDIUM. Meaningful activity and legitimacy can also produce MEDIUM
provisional potential, explicitly labelled PROVISIONAL_POTENTIAL_GAP_NOT_ESTABLISHED.
This is not verified fit: the unresolved gap still needs evidence. Identity uncertainty
gives LOW. Only confirmed inactivity or a reviewed site resolving the original gap
gives DISQUALIFY. Contact weakness and suppression do not erase commercial merit.

contactability is STRONG for provenance-verified official public email, USABLE for
reviewed directory email or advertised social/WhatsApp/Viber enquiry routes, WEAK for
profile-only or phone-only details, NONE otherwise. contact_route_type records the
distinction. Public provenance never proves delivery, DMs enabled or consent.
research_confidence is HIGH/MEDIUM/LOW according to core evidence completeness and
activity confidence; identity mismatch forces LOW. confidence_score counts five
evidence dimensions plus optional trigger/person bonuses of 5 each, capped at 100.

research_required means critical identity, activity, legitimacy, unresolved gap or
business-case uncertainty. critical_uncertainties_json records actual missing facts.
Consent, named person, buying trigger, route testing and history do not create this
flag. Readiness precedence is protected/history/duplicate/suppression or commercial
disqualification -> BLOCKED; weak/no route -> PARK; critical facts -> NEEDS_RESEARCH;
unreviewed AU consent -> NEEDS_COMPLIANCE_REVIEW; unresolved operational controls ->
NEEDS_RESEARCH; otherwise READY_FOR_REVIEW. readiness_reasons_json explains the result.
The AU readiness value implements the owner's explicit compliance example in addition
to the four general readiness values. compliance_status separately mirrors acma_status.
Every readiness value still requires human approval before contact.
Prior contact and duplicate locks also survive a changed current identity match;
absence of a new match is not an explicit release of a recorded lock.

qualification_version and qualification_checked_at identify the assessment.
Re-score mode requires an existing same-ID/dataset/workbook result and performs no
website requests. It preserves checked_at, last_researched_at, evidence_json, source
details, outreach/history fields and arc_status, even when readiness changes.

Routes: EMAIL_CANDIDATE, IG_MANUAL, FB_MANUAL, WHATSAPP_MANUAL, VIBER_MANUAL,
LINKEDIN_MANUAL, BUSINESS_CONTACT_MANUAL, PARK. Reviewed usable social takes priority for social-oriented
sectors; otherwise reviewed public email goes first. URLs alone are unverified.
Opt-outs stop channel hopping. AU keeps SAFE_TO_REVIEW, QUESTIONABLE, DO_NOT_EMAIL;
SAFE_TO_REVIEW requires documented consent for the recipient, role relevance and
no-solicitation review. PH uses NOT_APPLICABLE for ACMA, never automatic permission.

Phase 1.5 discovery uses existing evidence_json for typed public-page facts,
confidence, observation/publication times, candidate URLs and unresolved review
holds. Contact-platform route URLs are recorded in those facts rather than added
to reviewer columns. BUSINESS_CONTACT_MANUAL denotes an explicitly published
booking/contact page that has not been submitted or tested end to end. The output
schema stays at the same machine-column width; reviewer controls are not migrated.
PH timezone is Asia/Manila. AU uses city/state and Broken Hill, Eucla/Lord Howe
exceptions; state defaults need review before scheduling.

Dataset website statuses: NO_WEBSITE, LIVE_STRONG_SITE, LIVE_SITE_WITH_GAP,
BROKEN_SITE, DEAD_DOMAIN, 404, DNS_ERROR, SSL_ERROR, SOCIAL_ONLY,
BOOKING_PLATFORM_ONLY, THIRD_PARTY_ONLY, UNCERTAIN. website_check_status keeps the
technical result. Search hits are candidates. Strong/gap live-site classes require
reviewed association and quality/gap. Missing URL alone stays UNCERTAIN; verified
absence plus gap can establish social-only/no-website. DNS does not prove expiry.

Evidence entries include type, source_url, observed_at and excerpts bounded to 500
characters. Manual facts include fact_date and verification. V1 does not independently
search the web or authenticate every manual fact; uncertain activity, ownership and
nuanced commercial gaps remain for human review.
