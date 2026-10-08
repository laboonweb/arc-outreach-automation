# Verified business-email domain inspection

Phase 1 AUTONOMOUS_V2 checks a custom domain only after a public business email
and independently matched official source establish a current association. This
adds first-party destination evidence to the existing research pipeline. It does
not grant outreach consent or create drafts. Phase 2 has a separate deterministic
mapping for current canonical positive domain facts.

## Implementation

- `scripts/email-domain.js`: pure domain extraction, inspection state machine,
  classification, freshness, identity association and evidence projection.
- `scripts/email-domain-policy.js`: shared classifications, exclusions and TTL
  checks used by research and copy without importing the full discovery engine.
- `scripts/public-suffix-rules.js`: deterministic compressed ICANN and PRIVATE
  Public Suffix List snapshot dated 2026-10-07, under MPL-2.0. Source and original
  SHA256 are recorded in the file. Refresh this snapshot deliberately when rules
  change; no dependency package or runtime suffix lookup is used.
- `autonomous-discovery.js`: schedules these native HTTP jobs before the usual
  evidence-complete stop, keeps their requests outside Exa/Tavily counters and
  emits typed domain and gap facts.
- `autonomous-qualification.js` and `research-engine.js`: accept current strongly
  associated domain facts, project website state and use the existing tier rules.
- `cloud-research-runtime.js`: carries at most 100 compact observations between
  workers in the existing batch, without contact or business association data.
- `build-workflows.js`: adds an IF, one-second wait and native HTTP Request branch.
  Existing provider authentication, budgets, continuation and 25/50/100 controls
  are retained. Regenerate exports with `node scripts/build-workflows.js`.
- `email-domain-local.js`, `email-domain-refresh.js` and
  `build-email-domain-validation.js`: optional bounded regression tools. Private
  controls supply one exact canonical row. The write guard compares the current
  row and whitelists individual research cells; it is not an atomic transaction.

## Extraction and exclusions

Official-source extraction precedes domain inspection. When an independently
matched official social profile has no verified email yet, discovery can spend
one remaining page read on that profile or an explicitly linked same-profile
About/contact page before stopping for sufficient evidence. This stays inside
the existing two-page and five-total-provider-request ceilings. It invents no
contact URL. A literal public email in the introductory contact section, a
labelled contact line or a syntactic mailto link can supply the route. Post and
comment sections, scripts, unverified namesakes and directory contacts cannot.
The route retains source URL, observation time, official identity status,
identity score and DISCOVERY_VERIFIED provenance. Human-supplied facts are not
needed for this routine path.

The extractor applies the longest PSL exact/wildcard/exception rule, including
PRIVATE rules and URL-based IDN normalization. For example,
`hello@mail.example.com.au` becomes `example.com.au`, and `hello@team.example.co.uk`
becomes `example.co.uk`. A suffix alone, IP literal or invalid host is rejected.
See the authoritative [Public Suffix List](https://publicsuffix.org/list/).

The deterministic exclusion set covers the requested Gmail, Googlemail, Yahoo,
Hotmail, Outlook, Live, iCloud, Proton, AOL, GMX and Mail.com domains, plus common
shared aliases, consumer services and Australian ISP mailboxes. Exclusions also
apply to their subdomains, before registrable-domain reduction. These addresses
produce no candidate and no domain request.

## Bounds and classifications

Start with the HTTPS root. Follow at most three explicitly permitted redirects or
literal navigation targets, with at most four requests per domain and six across
all verified domains on a lead. A single public HTTP fallback is available after
a connection reset or timeout. Certificate validation is never disabled.
HTTP(S) redirects are followed manually. Sparse-page literal location assignments
and meta refresh targets are parsed as data; page JavaScript is never executed.
Only the strongly associated root and `www` are granted automatic inspection;
external destinations require an exact reviewed host allowlist. No crawl occurs.

The native HTTP timeout is 12 seconds, retries are disabled, and errors enter the
classifier instead of crashing research. Requests use a browser-like User-Agent,
HTML/plain-text Accept and en-AU/en Accept-Language headers, with TLS validation
enabled and automatic redirects disabled. A best-effort Range header asks for the
first 32 KiB. Analysis and retained fingerprints use at most 32,768 characters.
Native n8n HTTP can download more when a host ignores Range; this is **not a hard
network response-size cap**. The optional local transport pins public IPv4 DNS,
verifies TLS and aborts above 1 MB.

| Classification | Required result and qualification effect |
| --- | --- |
| ACTIVE_SITE | Functioning HTML with matching business name plus published contact/address identity; project active website state. |
| PARKED_DOMAIN | Short parking/sale page or known registrar parking template; eligible for VERIFIED_PARKED_DOMAIN. |
| PLACEHOLDER_SITE | Clear coming-soon/default-hosting page; eligible for VERIFIED_PLACEHOLDER_SITE. |
| BROKEN_DESTINATION | Root 404/410, two DNS failures/connection refusals, or two server errors; eligible for VERIFIED_BROKEN_DESTINATION. |
| ACTIVE_REDIRECT | Permitted destination with matching business identity; counts as an active site. |
| UNRELATED_REDIRECT | Unapproved external target or fetched destination whose business association is unestablished; no automatic gap. |
| ACCESS_BLOCKED | 401/403/429 or challenge page; no automatic gap. |
| UNKNOWN | Generic 200, sparse page, timeout/TLS failure, unsupported content or exhausted bounds; no automatic gap. |

Parking markers include visible domain parking/sale language and specific
GoDaddy/WSIMG parking-lander, Sedo, ParkingCrew and Bodis templates. Placeholder
markers include coming-soon headings and default hosting/under-construction
pages. Script text is excluded from visible language analysis. A long article
mentioning parking is not sufficient. GoDaddy attribution requires its marker.

## Identity, qualification and canonical evidence

Promotion requires a verified public-contact route, an independently verified
business-source identity with score at least 85, current contact/identity evidence,
HIGH destination confidence and an unexpired observation. Explicit contact and
unresolved identity review holds survive extraction. A weak candidate needs exact
host review for diagnostics and cannot create a verified commercial gap.

The typed `business_domain` fact records `email_domain`, `domain_inspected`,
`domain_status`, `domain_final_url`, `domain_http_status`, `domain_title`,
`domain_identity_confidence`, `domain_evidence_reason` and `domain_checked_at`,
plus the eight-state classification, requested/final URLs, redirect chain,
timestamp, bounded fingerprint/markers, transport attempts and contact provenance.
Compatible legacy domain statuses PARKED/PLACEHOLDER/BROKEN/LIVE are retained.
No raw registrar HTML is persisted or passed to outbound copy. No columns are
added: facts live in `evidence_json`; existing website and qualification fields
are updated through the existing protected Arc Research write path.

Verified gap facts can produce Tier A when the existing identity, activity and
route gates also pass. Active results suppress the generic platform-only owned
destination inference. Domain evidence does not establish activity, registrant
ownership, consent, lost revenue or conversion performance.

## Freshness and downstream boundary

TTL: parked/placeholder 72 hours, active 24 hours, broken 6 hours, blocked/unknown
1 hour. Persisted observations are reused on rerun. Within-batch cache entries
are deduplicated by exact registrable domain, but every lead must establish its
own association. A fresh strong stored fact survives weaker or older replacements.

Phase 2 automatically maps VERIFIED_PARKED_DOMAIN, VERIFIED_PLACEHOLDER_SITE and
VERIFIED_BROKEN_DESTINATION through `scripts/outreach-domain-gap.js`. It requires
the current HIGH-confidence, strongly associated typed fact, matching canonical
gap, verified custom-email contact provenance and the existing evidence gates.
GoDaddy wording additionally requires the registrar parking-template marker.
Unknown, blocked, expired, weak or mismatched facts cannot supply this mapping.
Controlled prospect wording receives no raw page HTML or source URLs. Services,
feedback, recent work and social-dominance claims still need their existing
evidence capabilities. Unmapped domain gaps cannot fall through to generic copy.
Safe replacement is limited to eligible unreviewed records; approvals, sent
history, provider claims and pending operator edits remain protected. A valid
copy preview does not bypass the separate activity or route eligibility gate.

The completion proof used exact-row, read-only helpers in n8n Cloud. Official
email discovery succeeded without human facts or a domain cache. The native
domain branch still encountered an HTTPS transport reset and HTTP fallback 403,
so its fresh result remained ACCESS_BLOCKED and Tier B. Existing local positive
evidence was tested separately through the automatic canonical composer; it is
not evidence that Cloud positively fetched that destination. Full uncached Cloud
positive verification remains unproved for that case. The worker changes remain
unpublished. The active Panel's draft compatibility update was rejected by
automatic approval review and is pending explicit authorization; its published
version and controls remain unchanged.

`scripts/build-email-domain-completion-validation.js` builds inactive probes that
read only the canonical header and one allowlisted row. They have no write,
approval, sending or Zoho nodes. Their private controls and proofs are ignored.
Source workbooks, review state, duplicate/history locks and Zoho are outside
this enhancement.

Domain checks use no Exa/Tavily or model requests. A cache hit adds zero origin
requests; uncached cases normally use one request, with bounded redirects,
corroboration or HTTP fallback up to the limits above. Existing provider ceilings
are unchanged. A decisive first-party result can avoid additional provider work
once the other research gates are satisfied.

Run `node --test tests/*.test.js` for local verification. SDK validation, native
Cloud behavior and real Sheets readback are separate proofs. Publishing a saved
worker draft requires user authorization under AGENTS.md.
