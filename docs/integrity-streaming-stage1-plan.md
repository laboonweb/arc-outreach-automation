# Remaining Stage 1 execution plan, 9 October 2026

**Current status supersedes the historical stop below:** the owner approved
67 counted Google GETs/five OAuth token POSTs. Complete compact BEFORE passed
all 28 reads and the critical synthetic Cloud continuation finished. Usage is
39/67 GET slots, 4/5 token POSTs, 71/84 executions and 154/500 mutations.
The only remaining Stage 1 execution is 28 AFTER reads after fresh prerequisites
and separate ordinary-browser consent. No further Cloud run is needed.
See the [consolidated report](stage1-critical-validation-20261009.md).
The following stopped attempts remain historical evidence, not current authority.

**The corrected live research-grid probe passed; complete BEFORE stopped on the
next source-tab response. Stage 1 and production release remain blocked.**
The owner approved 64 counted GETs/four OAuth token POSTs and conditional
probe-to-BEFORE continuation. It used three GETs/one POST; totals are now
11/64 GET slots, three/four token POSTs, 43/84 executions and 134/500 mutations.
All production graphs/versions/tables and original synthetic state passed fresh
preservation checks. No Cloud execution, provider operation or production write
ran during this gate. The compact request/transport correction below is local only.
The previously reviewed develop commits were pushed through `6a80b5e` first;
main remains `b187df8`. Git does not deploy n8n.

## Complete external verification

Run `scripts/verify-source-integrity-streaming.js` on the owner's local computer,
using Node built-ins. Its default command prints a plan and makes no requests.
It never passes workbook bodies through n8n or writes them to disk. There is no
change to the native 8 MiB validator. Two subsequent application fixes were
required by specific critical Cloud failures and are documented in the report.

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
The original manifest is preserved. The single-probe revision is saved separately
as `external-stream-gated-manifest-20261009.json`; the default offline command
prints its digest. Pin that digest in the private approval file. It pins the
runner, parser and actual 208-column schema. Each grid request names
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
| Sheets data requests | 11 counted slots now; 56 fresh GETs would mean **67 cumulative**. Active approved cap remains 64; 67 awaits approval. |
| OAuth token POSTs | Three consumed; fresh combined probe/BEFORE and separate AFTER need two more, **five cumulative**. Active approved ceiling four; five awaits approval. Default stays two. |
| n8n executions / source writes for integrity | 0 / 0 |
| Response limits | 1 MiB buffered metadata; 64 MiB streamed per sheet, identity encoding only |
| Parser limits | 16 KiB decoder input; token 1 MiB, depth 32, 128 keys/object, 256-byte keys |
| Local process watchdog | Heap 64 MiB, RSS 192 MiB; stop on excess |
| Transport | Exact HTTPS Sheets API origin/registered IDs, strict TLS, 60 seconds/request, no redirects or retries |
| Pace | At least 2.1 seconds between starts, about 29 reads/minute |
| Persisted writes | One private lock, counted ledger entries, one compact probe receipt, two progress files and two completed receipts; no raw response exports |

Actual production response sizes are unknown. The failed native receipt proves
only that its serialized body exceeded 8 MiB. The measured fixtures below are
design evidence, not production size estimates. Worst-case permitted response
content is 22 x 64 MiB + 6 x 1 MiB = 1,414 MiB per phase, 2,828 MiB for a complete
pair. These are response-content ceilings, not memory allocations or precise
network traffic: TLS/framing and ordinary socket read-ahead also use bandwidth.
An oversized header/body, timeout, 401/403/429, truncation, encoding mismatch,
memory or persistence failure stops without a usable phase receipt. No smaller
field mask, cap increase or blind repeat follows that stop.

The owner configured the Desktop OAuth client in ordinary Chrome, with the
Sheets API enabled and only `spreadsheets.readonly`. The replacement client
JSON is in an owner-restricted private folder; the exposed older secret is
disabled. Do not extract n8n's Google credential. Use Google's
[desktop OAuth flow](https://developers.google.com/identity/protocols/oauth2/native-app):
PKCE S256, state verification and a loopback callback. Obtain a short-lived
access token for each phase; pass it privately in the process environment,
never a chat message, command-line literal or Git file. The runner removes its
environment entry after reading it and logs only redacted failure codes.
No refresh token is persisted. The original design planned two token-exchange
POSTs. Both were consumed by stopped probes. The prepared combined probe/BEFORE
phase and separate AFTER consent need four total; this increase and conditional
continuation await approval. Ordinary owner sign-in browser traffic is not a spreadsheet integrity
request. The grant reads Sheets on the owner's account; the runner additionally
restricts access to the three registry IDs. Exact read-only authorization passed;
the Sheets transport and complete live integrity coverage remain unverified.
The owner authorized a dedicated Google project, which was created with the
Sheets API enabled. The actual project quotas are 300 reads/minute/project and
60 reads/minute/user; project usage was zero. The owner confirmed no billing
account is linked and the normal Chrome console survives a reload. Codex's
billing/OAuth route stalled and a fresh tab could not load the project list.
A separately authorized Chrome connector reached sign-in, where Google rejected
the automation-controlled browser as potentially insecure. The owner supplied
the rejection screenshot. Stop without another login attempt, browser-security
changes, cookie extraction or a credential workaround. The owner subsequently
completed client setup and consent using ordinary Chrome, as recorded below.

The Sheets read-only scope applies to spreadsheets accessible to the account;
Google does not offer a read-only OAuth scope restricted to three file IDs. The
runner pins the exact three workbook IDs independently and cannot call a write
endpoint. Do not add Drive, Gmail or identity scopes or share any source sheet.
Store credentials using an owner-only ACL or Windows user-bound encryption;
the existing private directory's inherited broad local ACL is not sufficient
for plaintext tokens. Raw workbook bodies still must never be stored.

Google documents standard Sheets API use at no additional charge, with 60 reads
per user/project/minute and 300 per project/minute; it also announces possible
over-quota charges later in 2026. Verify the selected client's current allowance
and billing before access; buy no quota and stop on unaccounted costs.
[Current Google usage limits](https://developers.google.com/workspace/sheets/api/limits).
The integrity runner adds no n8n usage. Remaining synthetic tests use the existing
trial allowance only after a fresh authentication/capacity check. No paid
research, infrastructure rental, package installation or real provider call is
part of this plan. OAuth connectivity and the exact grant passed; a successful
bounded Sheets response is still required.

## Local evidence

Full suite: **470 passed, zero failed/skipped**, including 33 streaming tests for
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
   the source editing pause. With explicit conditional phase approval, run
   `--authorize-phase <attempt> before`: the first registered
   workbook's Arc Research grid, all 208 headers and complete allocated grid,
   under the existing 64 MiB streaming/60-second/memory bounds. This performs
   exactly one initial GET, not a complete baseline.
   Its receipt includes transport bytes/chunks/time/peak memory, association
   hashes and coverage. Every existing bound and completeness gate must pass
   before its exact receipt hash is pinned. A failed or altered probe cannot be
   resumed or retried. The approved conditional BEFORE continuation reuses this grid receipt, validates
   its property hashes against fresh metadata and makes the other 27 GETs.
   A separate manual consent for AFTER makes 28 GETs, preserving exactly 56 new GETs. Any incomplete coverage
   or failed receipt stops before synthetic testing. No native 8 MiB cap changes.
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

**Current gates:** the owner conditionally approved ceiling 62, read-only OAuth
setup and a single reviewed live request before continuation. Ordinary-Chrome
authorization passed; probe persistence failed before fetch, as detailed below.
The local correction passes 80 native writes; the later schema correction passes
all 465 tests. The corrected persistence probe failed its header-order check;
the local header fix has not run live. Changed budgets still await approval.
The ledger conservatively records 8/14 GET slots, 43/84 executions and 134/500
mutations. Private pinned single-probe approval and owner-restricted credentials
exist. No cap update or subsequent request has been made.
The owner subsequently configured the Desktop client in ordinary Chrome and
confirmed its sole read-only scope, Testing audience, owner test user and current
300/60 quotas, no linked billing and paused source edits/runs. Its replacement
JSON is local with verified owner-only ACLs; the screenshot-exposed older secret
was disabled. The new [PKCE helper](integrity-google-oauth.md) has 12 local OAuth
regressions and can invoke only the single probe. A new private manifest pins the
one-request budget gate; the earlier manifests and ledger baselines are preserved.
Private prerequisites started as VERIFIED_EXCEPT_OAUTH; exact granted scope was
then verified and retained in a separate credential-free approval receipt. The
probe remains failed and the active cap remains 14. A fresh probe needs
only one GET of current allowance, while a complete BEFORE continues to require
the full paired allowance. No automatic activation of ceiling 62 occurs.

The local gate revision passes five additional regressions: single-counted
probe/reuse/exact budget, missing/stale/scope/quota/cost/storage/pause refusal,
failed/tampered probe rejection, fresh metadata drift and actual transport
timeout/no retry. Existing passing Cloud scenarios are preserved.

## Ordinary-Chrome authorization result and required stop

The owner completed ordinary-Chrome consent. One OAuth token POST succeeded and
granted exactly Sheets read-only; credentials stay in the owner-restricted local
folder, and tokens were not persisted. The helper stopped on
`INTEGRITY_EXTERNAL_PERSISTENCE_STOP` replacing the probe's pre-dispatch receipt.
The failed temporary file has DISPATCHED status and no grid; its replacement
failure precedes the Google fetch call. A targeted local regression reproduces
that exact stage with zero fetches, a retained counted slot and preserved failed
receipt. No live payload, complete BEFORE, AFTER or probe certification exists.
The OS error was redacted by the earlier writer; its precise cause remains
unverified. Current file permissions and attributes are normal. Do not infer a
permission fix or repeat the live call.

Counters remain 43/84 executions and 134/500 mutations. GET accounting is now
7/14: six earlier GETs and one conservatively counted pre-dispatch reservation.
No Cloud graph/table, source data, provider record or candidate changed. The
remaining 55 GETs and all Cloud executions are stopped. The active cap stays 14;
if the failed reservation is retained, completing a fresh probe and remaining
55 GETs would total 63, beyond the conditional ceiling 62. Diagnose and locally
prove the receipt-write correction first. Present the bounded retry and either
an explicitly audited reservation reconciliation or ceiling 63 for owner review
before any new live request. Preserve the failed probe, original approval,
authorized grant metadata and ledger baselines; do not clear them to rerun.

## Original persistence recovery scope

The prepared scope before the latest single request was: keep the failed reservation counted and conditionally extend the cumulative GET
ceiling from 62 to 63; extend planned OAuth token POSTs from two to four. Neither
change permits an automatic retry or additional Cloud execution. Reconfirm
unchanged 300/60 read quotas, no billing and paused source edits/runs. Check the
existing client and owner-only ACL locally, pin the corrected manifest, and use
a new approved receipt identifier without replacing failed evidence.

For this gate only, the owner opens the fresh loopback page in ordinary Chrome
and grants exactly read-only Sheets access. The helper performs one bounded
token POST and one streamed AUSTRALIA Arc Research grid GET, then exits and
reports bytes, chunks, time, memory, physical grid and all 208 required columns.
It runs no remaining GET, Cloud execution, source/table write or provider call.
Successful receipt review is required before the remaining 27 BEFORE and 28
AFTER reads. All existing response/time/memory/completeness limits remain fixed.

The corrected shared writer passed 40 native writes in each of the two actual
private folders and recovered five temporary Windows sharing refusals. It allows
eight local rename attempts spaced 50 ms, verifies unchanged old and intact new
bytes, flushes writes and refuses unknown IO errors or conflicting mutations.
This retries local file replacement only. The responsible Windows process is
unknown; persistent sharing failures still stop before further requests.

## Single-probe result and next gate

The owner completed fresh manual consent. Exact Sheets read-only authorization
and local receipt persistence passed. One Sheets GET reached the final header
validation and stopped with `INTEGRITY_EXTERNAL_RESEARCH_HEADERS_INCOMPLETE`.
There is no usable probe or phase receipt. Numeric wire/time/memory metrics were
not retained when final validation threw; do not claim that gate is certified.
All remaining 55 requests and all Cloud executions stayed stopped.

The saved October 7 header receipts have 221/208/221 columns, all 208 required
fields and the fixed 113-field machine prefix. Only 143 fields match new-sheet
positions because reviewer order is preserved. The previous exact-position
check therefore rejected layouts the existing application supports. The narrow
local correction accepts reordered reviewer fields and extra columns, rejects
missing/duplicate headers and reordered machine fields, and continues hashing
the whole physical grid. All three saved layouts pass synthetic replay; the
full suite passes 465 tests. These old receipts do not certify today's live
schema. No live repeat has run after the correction.

Consumption is now 8/14 GET slots, two token POSTs, 43/84 Cloud executions and
134/500 mutations. Seven Google requests ran; one pre-dispatch reservation is
retained. A fresh complete pair would require conditional ceiling 64 instead of
62. The immediate new scope would be one additional token POST and one Sheets
GET, then another stop/report. Separate remaining phase consents would mean
five total token POSTs and need an approved, tested authorization guard change.
Neither resource extension nor another live request is authorized. Preserve
both stopped probes, their approvals, the saved layouts and all passing Cloud
evidence. Production release remains blocked.

## Prepared conditional continuation

To avoid another separate probe consent, the phase helper now locally proves
one probe plus the remaining 27 BEFORE reads under the same in-memory grant,
then stops before Cloud testing. AFTER requires its own fresh consent and all
28 comparisons. Two new regressions prove complete paired coverage, exact
accounting and refusal of missing approval, insufficient capacity or a failed
probe. Full local suite: 467 passed. This changes no application candidate.

The concrete permission delta is 64 cumulative counted GET slots and four
cumulative OAuth token POSTs, with conditional probe-to-BEFORE continuation.
The active ledger remains 14/84/500 and usage remains 8/43/134 until approved.
Fresh quota, no-billing and source-pause confirmation is required before consent.
No token is persisted and no helper invokes Cloud or providers. Earlier
single-probe stop scopes and failed evidence above remain historical records.

## Live probe passed; source transport stop and compact correction

The approved combined attempt passed the complete Australia Arc Research grid:
1,000 allocated rows, 221 physical columns and all 208 required fields;
49,811,250 bytes in 19,228 ms, heap 24,368,392 bytes and RSS 104,591,360 bytes.
The following metadata read passed at 24,292 bytes. The `250 Sharp ICPs` read
reported `INTEGRITY_EXTERNAL_TRUNCATED`. The helper stopped immediately and
preserved the valid probe, failed phase, exact grant metadata and all earlier
evidence. No complete BEFORE exists and no Cloud scenario ran.

Local native IncomingMessage regressions demonstrate that calling destroy before
settling a size/parser failure can synchronously emit aborted and mask the cause
as TRUNCATED. The corrected transport settles the initiating error first and
persists bounded numeric failure metrics; it still stops without retries or
partial certification. The initiating live cause cannot be recovered from the
old receipt and is not asserted as known.

Google's [Sheets discovery schema](https://raw.githubusercontent.com/googleapis/google-api-go-client/main/sheets/v4/sheets-api.json)
specifies prettyPrint=true by default. Setting it false removes indentation only.
The local complete 400 x 208 dense fixture hashes identically at 77,403,162
indented bytes and 37,612,634 compact bytes. Every original field, formula,
format, note, association, range and schema check remains included. Response,
memory, timeout and native Cloud limits are unchanged. This revised URL has not
run live and cannot be promised to fit every actual sheet.

A fresh fixed 56-read pair needs 67 cumulative counted slots and five cumulative
OAuth token POSTs. The active caps remain 64/four. No further request is
authorized after this stop. If that explicit recovery is approved, pin the
corrected manifest, retain every failed slot/receipt, use fresh manual consent
for the compact probe plus 27 BEFORE reads, and stop on any failed bound. Only a
complete BEFORE permits the already bounded remaining synthetic Cloud tests.
AFTER remains 28 reads with its own fresh consent. Do not weaken validation,
raise body limits, resume a failed phase or rerun passing Cloud scenarios.
