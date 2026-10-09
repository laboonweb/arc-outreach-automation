# Readiness continuation, 9 October 2026

**Release blocked. No production publication or deployment occurred.**
The application candidate is unchanged. The owner-approved OAuth integrity probe
temporarily replaced only the existing isolated control workflow. Its first run
failed in the hash-check node; the original control graph/settings were restored
and verified exactly, inactive and unpublished. No table/source/provider write
occurred. The corrected probe is local only, awaiting approval to resume after
the stop. This report includes both the original checkpoint and its continuation.

## Current results

| Check | Result |
|---|---|
| Editor authentication | PASS: the existing in-app editor loaded after two independent reloads. The native account dashboard and Data Table views also loaded. No ad hoc credential fetch or auth workaround was used. |
| Trial capacity and cost | Current native dashboard: Trial, nine days left, 33/1,000 executions used, 967 remaining. No upgrade, purchase, paid research, model or provider call occurred. |
| Storage | Current native UI shows all nine tables totaling less than 1 MB, including the four staging tables. Last exact native quota was 200 MiB on 8 October; the exact quota endpoint was not refreshed in this browser. Current n8n documentation also states a 200 MiB default. Do not describe the old exact-byte measurement as a fresh measurement. |
| Production preservation | PASS: all four complete production tables match the saved baselines, including system timestamps, provider linkage and historical outreach. All six production node graphs, connections, versions and active/published states match. Five production engines remain inactive/unpublished. |
| Passing synthetic evidence | Preserved. All 26 synthetic rows remain unchanged. Three staging workflows retain their versions; the control was temporarily replaced and restored exactly with a new version. Passing scenarios were not rerun. |
| Google redirect | Reviewed exact HTTPS Google export host, workbook path and sole `format=xlsx` query. Initial 307 recorded without following; destination issued as a separate counted GET, with no cookies or credentials forwarded. |
| Destination response | FAIL: HTTP 400. No workbook was downloaded or baseline established; no retry or further source request followed. The response does not establish whether the failure arose from URL lifetime, export-session requirements or another Google constraint. |
| Local validation | Latest full suite: 420 passed, zero failed/skipped. Earlier checkpoint: 417 passed. Local loopback fixture access was explicitly allowed; no external test call occurred. |
| Candidate rebuild | All six rebuilt candidate JSON hashes are unchanged. Application logic and existing research/compliance/protection/copy gates were not edited. |
| First OAuth source probe | Owner authorized and ran it once. Screenshot proves Basic Auth trigger and Google GET success, followed by hash Code failure. Retention was disabled; the exact exception became unavailable after the owner closed the editor. No usable baseline. Count the failed execution and GET. |
| Local correction | Confirmed defect: the output schema has 208 columns, exceeding the original 100-column range/ceiling. Corrected local probe uses A1:IV5000 (256 columns), retains the 8 MiB body gate and rejects incomplete coverage. Adds redacted failure JSON and HTTP 422 rather than losing a Code exception. Actual Cloud cause remains unconfirmed. Corrected SDK validates with four nodes and no warnings; not installed or rerun. |
| Recovery | PASS: the control's original nine nodes, connections, settings and groups were restored exactly. New version bf6490c3-bfac-44b7-9d64-296cd1336385 is inactive/unpublished. No execution remains running. All six production graphs/settings/versions and four complete production tables rechecked exact after the failure. |

The current [n8n Data Table documentation](https://docs.n8n.io/build/work-with-data/data-tables.md)
supports the storage default. The [trial documentation](https://docs.n8n.io/deploy/use-n8n-cloud/start-your-free-trial)
describes the included 1,000-execution allowance and trial expiry. The live dashboard,
not these general pages, established the current account plan and remaining allowance.

## Actual cumulative consumption

| Resource | Actual | Authorized ceiling |
|---|---:|---:|
| Isolated inactive/unpublished workflows | 4 | 4 |
| Synthetic tables / lead identities | 4 / 8 | 4 / 8 |
| Cloud executions including children/failures | 42 | 84 |
| Synthetic matched/attempted row mutations | 134 | 500 |
| Google integrity GETs | 5 | 14, explicitly approved by owner |
| Serialized synthetic application data | 193,437 UTF-8 bytes, unchanged | 5 MiB |
| Production workflow/table changes, source/Research writes | 0 | 0 |
| Provider calls, real drafts, sends, paid calls | 0 | 0 until separately gated authorization |

This continuation used two external Google GETs and one native OAuth GET in a
failed manual execution. The failed run is counted despite disabled retention
and the absence of a retrievable execution ID. The later one-use listener 404
did not reach Google. Two isolated control configuration updates installed the
probe and restored the original graph; no additional row mutation occurred.
Connector preservation reads and SDK validation are not Cloud executions.
All private snapshots, prior failed attempts and recovery evidence remain.

## OAuth replacement and corrected recovery requiring approval

The anonymous-export HTTP 400 stop is preserved. The owner subsequently approved
the native OAuth replacement and after-receipt byte-limit caveat. Its first GET
succeeded but its hash check failed. No retry followed. Local recovery corrects
the known coverage defect; it does not establish that this was the only Cloud
failure. A fresh native baseline is still required. Resume approval must cover
the wider fixed range and one additional total native attempt caused by the
failed run, within the unchanged cumulative ceilings.

1. Temporarily replace only the existing isolated **control** workflow
   `ml9StJJLEqWXjgC5`; create no workflow/table/lead. Preserve its current graph,
   settings and version receipt. Keep it inactive and unpublished.
2. Use the existing panel Basic Auth credential on a test-only GET listener.
   Configure one exact workbook per run; browser input cannot select an ID, URL,
   credential or request method. Owner Basic Auth sign-in may be needed before
   the first run. Stop on an authentication failure.
3. Perform exactly one `GET https://sheets.googleapis.com/v4/spreadsheets/{id}`
   per execution with the existing native Google credential. TLS validation stays
   on; redirects and retries stay off. No POST, sheet write or paid provider node.
   n8n may refresh its existing OAuth credential within its normal auth boundary;
   no token is copied outside n8n or permission broadened.
4. Request the registry's complete tab set, including Arc Research, with a field
   mask for original values/formulas, user formatting, notes, validation, text
   runs, dimensions, merges, conditional formatting, filters, protections and
   workbook/sheet metadata. Use `A1:IV5000` per tab. Reject any missing/unexpected
   tab, non-grid sheet, grid larger than 5,000 rows/256 columns, nonzero grid
   offset or dimension mismatch. A partial range cannot certify integrity.
5. Return only compact hashes and coverage through the authenticated response.
   Disable manual/success/error execution retention and progress saving. Raw
   workbook data exists transiently in the execution and editor memory; it must
   not be exported, committed or retained in execution history. Independently
   verify those settings before the first request and clear the editor view after
   capturing the compact receipt. Stop if retention cannot be established.
   A hash-check failure now returns redacted `{ok:false,error:...}` and HTTP 422,
   with no hash or source cell contents. A green n8n workflow execution alone is
   insufficient: only HTTP 200, `ok:true`, complete coverage and valid hashes
   establish an integrity receipt. HTTP, runner or transport failures still stop.
6. Run three complete BEFORE checks, then only the outstanding authorized
   synthetic tests, then the same three AFTER checks. Compare all hashes exactly.
   Restore the control graph/settings; keep all four staging workflows inactive.

Expected recovery increment: **6 fresh Cloud executions, 6 Google GETs, zero row
mutations** (three BEFORE, three AFTER). From current totals this reaches
48/84 executions and 11/14 GETs, leaving 36 executions, 366 mutations and three
unused GETs, before accounting for outstanding synthetic scenarios. The failed
native attempt makes seven total native integrity attempts. No cumulative budget
increase is requested. Unused GETs are not a retry
allowance. There are control workflow configuration writes for the temporary
probe/book selection and restoration; no production workflow or table write.

The decoded JSON body limit is 8 MiB and the request timeout 30 seconds; workflow
timeout is 60 seconds. **Native HTTP Request v4.2 has no verified streaming byte
cap. The 8 MiB rejection happens after receipt**, unlike the external export
downloader's streaming cap. Fixed ranges/field mask bound the requested content,
but cannot guarantee a small response when cells contain large strings.
The owner approved this after-receipt limitation; it remains in the corrected
probe. The wider range requires renewed approval. This graph's API field
mask, empty-grid representation and retention behavior still require actual
Cloud validation. It stops on any unsupported response instead of certifying a
partial baseline.

Google documents [the GET, field mask and range behavior](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/get).
Its [usage limits](https://developers.google.com/workspace/sheets/api/limits)
describe standard API use as carrying no additional cost within quota. Expected
incremental cost is $0 within the verified n8n trial and standard Sheets quota;
no quota purchase, upgrade or paid integration is authorized. Stop on a quota
or billing uncertainty. No additional request-budget extension is needed for
this six-GET replacement under the approved 14 ceiling.

Original failed candidate: `private/operator-stage1/integrity-probe-0.json` and
SDK, preserved. Corrected local recovery candidate:
`integrity-probe-recovery-0.json` and SDK. Existing credential references are kept
private. No corrected-probe update or second source execution was performed.

## Remaining release blockers and provider gate

After complete BEFORE integrity, prioritize full native Draft Queue / standalone
Review Actions / Grounded Copy child integration, stale/duplicate decisions,
ASCII and multibyte payload boundaries, controlled partial persistence recovery,
and mock ambiguous/timeout/post-claim/receipt-write failure paths. Reuse the four
staging resources and same eight identities. Reserve executions and worst-case
matched mutations before each run, reconcile each result, and never reseed or
erase the already passing evidence. Keep claim ambiguity locked; do not retry
provider creation or clear it to manufacture a passing state.

The separately gated real Zoho proof has an exact private content review artifact,
**not authorization to execute**: `owner-draft-review-20261009.json`. Proposed
subject: `[Arc Web Works test] Owner mailbox unsent draft check`. Core text:
"This draft checks the manual Arc Web Works handoff to the owner mailbox."
Then: "Please leave it unsent. This is a validation record, with no prospect
recipient." The canonical frozen signature and opt-out footer are appended;
HTML is produced by the existing renderer. Proposed sender/sole recipient is
the configured owner mailbox, pending fresh verification. Exact message hash:
`a00140cc0fc096aaa67b209d50215f79e7c3ff73c51e19ba26b61c2265805c3d`.
No connection/claim is attached, no ninth Stage 1 identity created and no provider
call made. Before its call, verify current owner account, exact sender and
owner-controlled mailbox read-only, establish provider allowance/cost, and review
the exact neutral test subject/body and their hash. Pin the only recipient to
the verified owner mailbox. Allow one CREATE_DRAFT operation, unsent mode only,
with an independently durable once-only claim isolated from live leads. Read the
draft back by confirmed provider ID, verify recipient/content/unsent status and
prove replay cannot create another. Do not alter the existing business draft,
any production lead or suppression. An ambiguous provider result stops the test;
read-only reconciliation precedes any future owner decision. No DELETE or SEND
operation is included.

The final release manifest remains gated on all critical outcomes above, paired
AFTER integrity and fresh production preservation. It must pin the reviewed Git
SHA, all six candidate hashes, expected current production version IDs, allowed
node/connection changes, five engines' inactive/manual states, publication of
only the panel, backup locations and verified rollback checks. It is not ready
for final production approval yet. A Git commit or SDK validation is not a
production release.

## Recovery

No production rollback is needed. Keep the current production versions and tables;
do not restore an older queue over the current 23 records. Preserve the original
external partial failure and the v2 stopped progress/ledger. Do not resume v2's
STOPPED or uncertain DISPATCHED state. A replacement baseline uses distinct
receipts and never overwrites either failed attempt.

For a failed read-only probe, stop the listener and preserve the compact
failure; restore only the isolated control's saved graph/settings after confirming
no execution remains active. Reconcile versions and production table hashes.
Do not repeat a source request until the failure is understood and the remaining
budget/authorization is reviewed. Production persistence ambiguity or an unknown
provider claim remains subject to the existing canonical-record reconciliation
and mailbox inspection procedure, with no blind command replay or history reset.

Private evidence: `readiness-preflight-20261009.json`,
`external-v2-before-progress.json`, `continuation-ledger.json`,
`readiness-failed-oauth-proof-20261009.json`,
`readiness-recovery-candidate-proof-20261009.json`,
`control-restored-20261009.jpg` and the full local test logs. Git excludes
all private exports, configuration, credential references and signing material.
