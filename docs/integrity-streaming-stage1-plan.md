# Remaining Stage 1 execution plan, 9 October 2026

**Local proof passed; external access and a revised GET ceiling await approval.
Stage 1 and production release remain blocked.** No Cloud execution, Google data
request, provider operation or production change ran during this correction.
The previously reviewed develop commits were pushed through `6a80b5e` first;
main remains `b187df8`. Git does not deploy n8n.

## Complete external verification

Run `scripts/verify-source-integrity-streaming.js` on the owner's local computer,
using Node built-ins. Its default command prints a plan and makes no requests.
It never passes workbook bodies through n8n or writes them to disk. There is no
change to the native 8 MiB validator or the six application candidates.

Each workbook has a metadata-only read, one separately streamed read for every
registered sheet, then an identical metadata-only read. Repeat this sequence for
AFTER and compare every workbook hash with BEFORE. Known coverage is:

| Workbook | Sheets including Arc Research | BEFORE GETs | AFTER GETs |
|---|---:|---:|---:|
| Australia | 7 | 9 | 9 |
| Manila Legacy | 9 | 11 | 11 |
| Manila Audit Queue | 6 | 8 | 8 |
| Total | 22 | 28 | 28 |

The private, fixed URL manifest is
`private/operator-stage1/external-stream-request-manifest-20261009.json`.
Its hash is `432f58f720f331f264ce8c1850a9922db914ad326396063e7bdc24324afd4453`.
It pins the runner, parser and actual 208-column schema. Each grid request names
one registered sheet and A1:IV5000. Metadata must establish that this covers its
entire allocated grid, including blank formatted cells. Unknown/missing sheets,
non-grid sheets, grids above 5,000 rows or 256 columns, changed sheet associations,
invalid offsets, missing research headers or malformed data stop the phase.
Sparse trailing empty cells follow the Sheets API's normal representation;
they do not permit omission of populated cells or formatting.

Grid requests select the entire GridData subtree, including entered values and
formulas, calculated/display values, entered/effective formatting, notes, rich
text, validation, hyperlinks, pivots, data-source fields, chips and dimension
metadata. Metadata requests cover workbook properties/theme, URLs, named ranges,
developer metadata, data sources/schedules and all current Sheet metadata fields:
properties, merges, conditional formatting, filters, protections, charts, bands,
groups, slicers, tables and comment anchors. Comments are explicitly included;
lack of permission stops the read rather than silently omitting them.
See the primary [Spreadsheet](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets),
[Sheet/GridData](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/sheets)
and [CellData](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/cells)
schemas. This covers the Sheets API model; it does not certify Drive permissions,
revision history or embedded asset binaries outside that model.

The incremental parser retains bounded tokens/container hashes, not arrays of
cells or workbook JSON. Object key order, whitespace and UTF-8 chunk splits do
not change the semantic hash; array order, values, formatting and associations do.
Receipts contain hashes, coverage, byte counts and parser statistics, without
cell contents. Start/end metadata must match. BEFORE and AFTER are distinct
durable receipts; an incomplete or stopped BEFORE cannot authorize AFTER.
All source editing and source-writing workflows must stay paused during the
paired check. Multiple GETs are not a transactional snapshot. Concurrent edits,
volatile formula recalculation or external data refresh can cause a mismatch;
there is no automatic exemption or retry.

## Limits, credentials and costs before dispatch

| Item | Fixed plan |
|---|---|
| Sheets data requests | 56 new GETs; six previously consumed means **62 cumulative**, requiring ceiling 14 -> 62 |
| n8n executions / source writes for integrity | 0 / 0 |
| Response limits | 1 MiB buffered metadata; 64 MiB streamed per sheet, identity encoding only |
| Parser limits | 16 KiB decoder input; token 1 MiB, depth 32, 128 keys/object, 256-byte keys |
| Local process watchdog | Heap 64 MiB, RSS 192 MiB; stop on excess |
| Transport | Exact HTTPS Sheets API origin/registered IDs, strict TLS, 60 seconds/request, no redirects or retries |
| Pace | At least 2.1 seconds between starts, about 29 reads/minute |
| Persisted writes | One private lock, counted ledger entries, two compact progress files and two completed receipts; no raw response exports |

Actual production response sizes are unknown. The failed native receipt proves
only that its serialized body exceeded 8 MiB. The measured fixtures below are
design evidence, not production size estimates. Worst-case permitted response
content is 22 x 64 MiB + 6 x 1 MiB = 1,414 MiB per phase, 2,828 MiB for a complete
pair. These are response-content ceilings, not memory allocations or precise
network traffic: TLS/framing and ordinary socket read-ahead also use bandwidth.
An oversized header/body, timeout, 401/403/429, truncation, encoding mismatch,
memory or persistence failure stops without a usable phase receipt. No smaller
field mask, cap increase or blind repeat follows that stop.

No usable local Google credential or gcloud installation was found. Do not
extract n8n's Google credential. An owner-approved desktop OAuth client with
Sheets API enabled and `spreadsheets.readonly` is needed. Use Google's
[desktop OAuth flow](https://developers.google.com/identity/protocols/oauth2/native-app):
PKCE S256, state verification and a loopback callback. Obtain a short-lived
access token for each phase; pass it privately in the process environment,
never a chat message, command-line literal or Git file. The runner removes its
environment entry after reading it and logs only redacted failure codes.
No refresh token or long-lived credential is needed. Plan at most two OAuth
token-exchange POSTs, separate from the 56 Sheets GETs; ordinary owner sign-in
browser traffic is not a spreadsheet integrity request. This grant reads Sheets
on the owner's account; the runner additionally restricts access to the three
registry IDs. OAuth provisioning is a remaining gate, not completed validation.
No project/client creation, token exchange or grant has occurred.

Google documents standard Sheets API use at no additional charge, with 60 reads
per user/project/minute and 300 per project/minute; it also announces possible
over-quota charges later in 2026. Verify the selected client's current allowance
and billing before access; buy no quota and stop on unaccounted costs.
[Current Google usage limits](https://developers.google.com/workspace/sheets/api/limits).
The integrity runner adds no n8n usage. Remaining synthetic tests use the existing
trial allowance only after a fresh authentication/capacity check. No paid
research, infrastructure rental, package installation or real provider call is
part of this plan. Local connectivity/TLS and the OAuth grant are still unproved.

## Local evidence

Full suite: **438 passed, zero failed/skipped**, including 18 new tests for
determinism, all 208 headers, full metadata/cell coverage, association changes,
invalid sparse shapes, incomplete/truncated JSON, duplicate keys, UTF-8, bounds,
authentication/redirect refusal, wire/memory caps, before/after mismatch,
persistence failure and counted no-retry behavior. The transport test streams an
actual 208-column synthetic response above 8 MiB without concatenating its body.

| Synthetic allocated grid | Populated data columns | Response bytes | Peak heap | Peak RSS |
|---|---:|---:|---:|---:|
| 400 x 208, original/calculated/display values, notes and formats | 208 | 37,612,634 | 14,555,888 | 82,268,160 |
| 700 x 208, same dense fields | 208 | 65,883,734 | 22,816,768 | 100,278,272 |
| 5,000 x 208, sparse short original/calculated/display values | 52 | 32,050,663 | 22,753,888 | 101,445,632 |

Every fixture includes all 208 required header cells. All produced complete
coverage receipts. Private demo evidence is
`external-stream-local-demo-complete-20261009.json`; the earlier narrower fixture
demo remains preserved. All six rebuilt application hashes match the previously
validated candidate exactly. No application logic or Cloud graph was changed.

## Execute only the remaining gates

1. After approval of this method/GET ceiling and establishment of the separate
   read-only grant, verify owner editor authentication, current trial/storage
   headroom and costs. Reconcile the saved production/staging baselines; establish
   the source editing pause. Run the 28 BEFORE GETs once. Any incomplete coverage
   or failed receipt stops before synthetic testing.
2. Reuse the four existing inactive/unpublished staging workflows, four tables
   and eight identities. Preserve all already passing manual research, saved
   copy, blocker, approval, social and mock-success evidence. Use S8 for remaining
   native integration/capacity/recovery fixtures and S3's pending mock request
   for ambiguity. Preserve the other six identities and append activity only.
   Proposed reservation, including all children and failures:

   | Remaining group | Execution ceiling | Attempted/matched mutation ceiling |
   |---|---:|---:|
   | Native Draft Queue -> Grounded Copy child -> Inbox Sync, plus standalone Review Actions and duplicate rerun | 12 | 120 |
   | Duplicate/stale exact-payload decisions | 4 | 32 |
   | ASCII/multibyte payload boundary and oversized refusal | 4 | 32 |
   | Controlled canonical/projection write failure and read-back recovery without command replay/history reset | 6 | 72 |
   | Missing provider ID, timeout/post-claim and receipt-write failure mocks; unknown claim replay stays locked | 6 | 64 |
   | Maximum | 32 | 320 |

   These are reservations, not claimed executions or completed native graphs.
   Pin each exact staged graph/fixture and worst-case child/write count before
   dispatch. Temporarily repurpose only existing resources and restore them.
   Replace every production table/child/provider reference explicitly; reject any
   remaining production or paid-provider link. Never run the original seed graph.
   Run irreversible mock unknown-claim cases last for each identity; do not clear
   claims or fabricate provider IDs to pass. Reconcile every mutation/read-back.
   Worst-case cumulative totals are **75/84 executions and 454/500 mutations**,
   leaving nine executions and 46 mutations; no extension is requested for these.
3. Obtain all 28 AFTER GET receipts with the same manifest and compare every hash.
   Recheck all six production versions/graphs/settings, all four full production
   tables and unchanged staging identities. Confirm five production engines are
   inactive, all test graphs restored/inactive, and zero source/prospect/provider
   writes or sends. Then issue the consolidated Stage 1 result.
4. Prepare the separately gated real Zoho proof: verify the owner account,
   sender/sole owner-controlled recipient and provider allowance read-only;
   pin the existing reviewed neutral message, a separate durable once-only claim
   and unsent-only operation. Seek separate approval before exactly one real
   draft creation and read-back. Do not create another Stage 1 identity or alter
   the existing business draft. Unknown results require read-only reconciliation,
   never another create, send, delete or claim reset.
5. Only after critical gates pass, present the release manifest: reviewed Git SHA,
   six candidate hashes, expected production version IDs, publication of the
   panel only, five engines inactive/manual, current private baselines and exact
   rollback/read-back steps. A source mismatch requires investigation, not a
   source restore. Queue persistence recovery reconciles canonical payloads and
   appends history; never restore an old table over new operator activity.
   Provider ambiguity remains locked. Stage 2 and production publication still
   require separate owner approval.

**New authorization needed:** ceiling 62 for the 56 new read-only Sheets GETs;
the external streaming/data/credential boundary above; and an owner-approved
read-only OAuth provisioning path, including at most two token exchanges.
The current live ledger still records 6/14 GETs, 43/84 executions and 134/500
mutations, with no reservations. No approval file or cap update has been made.
