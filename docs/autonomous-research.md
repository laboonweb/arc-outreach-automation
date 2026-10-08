# Autonomous research validation

The 2026-10-05 research extension operates only on currently unresolved,
uncontacted, unlocked leads. It leaves the email transport, renderer, review UI,
manual-send/follow-up logic, contact locks and transactional ledger unchanged.

## Discovery boundary

`AUTONOMOUS_V2` is an explicit opt-in discovery mode. The default remains off.
Authenticated Exa is primary; Tavily basic search is fallback. Each lead has at
most two Exa searches, one Tavily search, two content fetches total and five
requests, sequentially. At most one fetch follows Tavily. Useful search-returned
text/highlights feed identity and extraction directly. Strong identity, activity
and a route stop discovery without another provider. Provider payloads
contain only bounded public business name, locality, region, country and URLs.
Source identifiers, history, reviewer notes and unpublished contacts are excluded.

Searches return candidates. Fetches return normalized public page documents;
identity, extraction and qualification consume those documents independently of
the provider transport. research-provider-api.js normalizes Exa text/highlights
and Tavily raw content. Native HTTP nodes reference existing Header Auth:
Arc n8n Research for api.exa.ai and Tavily API for api.tavily.com. Secrets never
enter Code-node state or local files. Anonymous MCP remains isolated to existing
Phase 1.5 mode; AUTONOMOUS_V2 does not call it. Discovery defaults stay off.

## Identity and evidence

High-confidence deterministic identity replaces mandatory manual official-host
approval for this mode. Exact published phone/address or an already verified
official cross-link supplies a strong anchor, with matching name/locality/branch
and a score of at least 85. The audit retains each signal, conflict, source,
timestamp and confidence. Known listings and directories remain associated
third-party evidence and cannot become owned websites. Website identity also
requires a matching business domain and title, or a verified cross-link. An
unconfirmed named branch remains unresolved. Business text is data, never a
source of instructions or authority to raise limits.

Once a site is identified, relevant linked contact/about/service/location/booking
pages may consume the remaining read budget. Published emails, forms and social
links are extracted literally. A strongly verified official profile is a
MANUAL_SOCIAL_CANDIDATE when DM availability is unknown; that alone does not
force Tier C. Unverified listing links remain MANUAL_CANDIDATE. A post/reel cannot
itself become a profile route; a literally published profile crosslink may.
Login, album, sharing and platform-vendor links are excluded. Unclaimed Fresha
lvp listings and nearby-venue recommendations do not establish bookability.
Phone numbers never become WhatsApp/Viber links automatically. Forms and booking
routes are observed, never submitted. Owner/decision-maker evidence is optional.

Activity confidence distinguishes meaningful current services/contact/hours,
dated activity and corroborated listings. HTTP success and registration alone do
not establish operation. Provider publication metadata and relative phrases in
old review prose cannot establish current business activity.

Tier A requires an observed unresolved gap, Tier B a supported structural
opportunity, and Tier C records remaining critical uncertainty. Missing owner,
trigger or email does not by itself force Tier C. A functional website with no
supported opportunity is not assigned invented pain. Australian compliance stays
separate from commercial quality and never authorizes sending.

## Failures, validation and persistence

Insufficient primary evidence permits one alternate Exa query. Exa failure or
unresolved identity/activity/contact permits Tavily. 429/401/403/402 immediately
opens that provider circuit; two transient failures also open it. Native nodes
do not retry outside the budget. Both-provider failure records
PROVIDER_RETRY_REQUIRED, never commercial rejection. provider_circuits is returned
to the caller; sequential validation carries it into the next lead. A future
batch caller must carry that state too. This patch enables no bulk discovery.
Blocked sites are not repeatedly fetched. Redirects and TLS bypass remain off.

The fixed thirty-lead selection is persisted before discovery. A fresh read of
those records verifies scope, source/history/reviewer controls and complete grid
hashes including colours. Local tests and cached re-evaluation never count as new
live requests. Private audit files retain actual provider observations and each
before/after result. Every result checks frozen component hashes and five ledger
tables; no provider draft or send is created.

Existing Arc Research machine columns remain the output contract. New identity,
route, provider and tier details use `evidence_json`, `commercial_basis` and
`contact_route_type`; reviewer columns and source schemas are unchanged. The
initial anonymous test was local. The authenticated retest uses the exact same
persisted IDs in manual n8n Cloud executions, with no Sheets writes. See
private/provider-retest/comparison.md and comparison.json for all metrics,
execution receipts, diagnostic repetitions, the unretained pilot limitation and
request/usage totals. Frozen hashes and ledger tables were checked before and
after. Normal retention is restored and all Arc workflows remain inactive. The
remaining 539 leads are outside this test.

## Authorized public-identifier fallback and first batch

The accepted authenticated validation is followed by the narrowly scoped
public-identifier fallback and fail-stop batch documented in
[First research batch](research-batch-01.md). Provider bounds and qualification
rules remain unchanged. The first batch is stopped after a provider HTTP 400;
the remaining selected leads require review before any continuation. Newly
qualified entries are already available in the existing Phase 2 queue.
