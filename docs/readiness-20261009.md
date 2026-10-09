# Readiness continuation, 9 October 2026

**Release blocked. No production publication, deployment or Cloud change occurred.**
The existing application candidate is unchanged. This development slice adds
verification utilities, synthetic regression tests and this report.

## Current results

| Check | Result |
|---|---|
| Editor authentication | PASS: the existing in-app editor loaded after two independent reloads. The native account dashboard and Data Table views also loaded. No ad hoc credential fetch or auth workaround was used. |
| Trial capacity and cost | Current native dashboard: Trial, nine days left, 33/1,000 executions used, 967 remaining. No upgrade, purchase, paid research, model or provider call occurred. |
| Storage | Current native UI shows all nine tables totaling less than 1 MB, including the four staging tables. Last exact native quota was 200 MiB on 8 October; the exact quota endpoint was not refreshed in this browser. Current n8n documentation also states a 200 MiB default. Do not describe the old exact-byte measurement as a fresh measurement. |
| Production preservation | PASS: all four complete production tables match the saved baselines, including system timestamps, provider linkage and historical outreach. All six production node graphs, connections, versions and active/published states match. Five production engines remain inactive/unpublished. |
| Passing synthetic evidence | Preserved: all four staging workflow versions and all 26 synthetic rows match the previous completion receipt. Passing scenarios were not rerun. |
| Google redirect | Reviewed exact HTTPS Google export host, workbook path and sole `format=xlsx` query. Initial 307 recorded without following; destination issued as a separate counted GET, with no cookies or credentials forwarded. |
| Destination response | FAIL: HTTP 400. No workbook was downloaded or baseline established; no retry or further source request followed. The response does not establish whether the failure arose from URL lifetime, export-session requirements or another Google constraint. |
| Local validation | 417 passed, zero failed/skipped. The restricted first run failed because Windows sandboxing denied loopback fixture connections; the full rerun with local loopback access passed. After a test-fixture representation edit, all 11 new focused tests passed again. |
| Candidate rebuild | All six rebuilt candidate JSON hashes are unchanged. Application logic and existing research/compliance/protection/copy gates were not edited. |
| Proposed source probe | Local synthetic tests and n8n SDK validation pass for a four-node authenticated probe. It was not installed, armed or executed in Cloud. SDK validity does not prove API acceptance or Cloud behavior. |

The current [n8n Data Table documentation](https://docs.n8n.io/build/work-with-data/data-tables.md)
supports the storage default. The [trial documentation](https://docs.n8n.io/deploy/use-n8n-cloud/start-your-free-trial)
describes the included 1,000-execution allowance and trial expiry. The live dashboard,
not these general pages, established the current account plan and remaining allowance.

## Actual cumulative consumption

| Resource | Actual | Authorized ceiling |
|---|---:|---:|
| Isolated inactive/unpublished workflows | 4 | 4 |
| Synthetic tables / lead identities | 4 / 8 | 4 / 8 |
| Cloud executions including children/failures | 41 | 84 |
| Synthetic matched/attempted row mutations | 134 | 500 |
| Google integrity GETs | 4 | 14, explicitly approved by owner |
| Serialized synthetic application data | 193,437 UTF-8 bytes, unchanged | 5 MiB |
| Production workflow/table changes, source/Research writes | 0 | 0 |
| Provider calls, real drafts, sends, paid calls | 0 | 0 until separately gated authorization |

This continuation used two external Google GETs. Connector preservation reads and
SDK/type validation are not Cloud executions. No Cloud test execution or mutation
was added. Prior private snapshots, failed receipts and recovery evidence remain.

## Prepared replacement requiring approval

The approved anonymous-export approach ran outside n8n. Its HTTP 400 stop is
preserved. The proposed replacement uses the existing Google OAuth credential
inside n8n and therefore changes that execution/isolation approach. It does not
extract credentials or forward an authenticated export redirect.

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
   workbook/sheet metadata. Use `A1:CV5000` per tab. Reject any missing/unexpected
   tab, non-grid sheet, grid larger than 5,000 rows/100 columns, nonzero grid
   offset or dimension mismatch. A partial range cannot certify integrity.
5. Return only compact hashes and coverage through the authenticated response.
   Disable manual/success/error execution retention and progress saving. Raw
   workbook data exists transiently in the execution and editor memory; it must
   not be exported, committed or retained in execution history. Independently
   verify those settings before the first request and clear the editor view after
   capturing the compact receipt. Stop if retention cannot be established.
6. Run three complete BEFORE checks, then only the outstanding authorized
   synthetic tests, then the same three AFTER checks. Compare all hashes exactly.
   Restore the control graph/settings; keep all four staging workflows inactive.

Expected integrity-only increment: **6 Cloud executions, 6 Google GETs, zero row
mutations**. It would bring totals to 47/84 executions and 10/14 GETs, leaving
37 executions, 366 mutations and four unused GETs. Those four GETs are not a retry
allowance. There are control workflow configuration writes for the temporary
probe/book selection and restoration; no production workflow or table write.

The decoded JSON body limit is 8 MiB and the request timeout 30 seconds; workflow
timeout is 60 seconds. **Native HTTP Request v4.2 has no verified streaming byte
cap. The 8 MiB rejection happens after receipt**, unlike the external export
downloader's streaming cap. Fixed ranges/field mask bound the requested content,
but cannot guarantee a small response when cells contain large strings. Approve
this limitation explicitly or retain the current hold. This graph's API field
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

Prepared private artifact: `private/operator-stage1/integrity-probe-0.json` and
SDK, using credential references read from the current production intake and
staging panel. These are local candidates only. No Cloud update tool was called.

## Remaining release blockers and provider gate

After complete BEFORE integrity, prioritize full native Draft Queue / standalone
Review Actions / Grounded Copy child integration, stale/duplicate decisions,
ASCII and multibyte payload boundaries, controlled partial persistence recovery,
and mock ambiguous/timeout/post-claim/receipt-write failure paths. Reuse the four
staging resources and same eight identities. Reserve executions and worst-case
matched mutations before each run, reconcile each result, and never reseed or
erase the already passing evidence. Keep claim ambiguity locked; do not retry
provider creation or clear it to manufacture a passing state.

The separately gated real Zoho proof is **prepared, not authorized to execute
by this report**. Before its call, verify current owner account, exact sender and
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

For a failed proposed read-only probe, stop the listener and preserve the compact
failure; restore only the isolated control's saved graph/settings after confirming
no execution remains active. Reconcile versions and production table hashes.
Do not repeat a source request until the failure is understood and the remaining
budget/authorization is reviewed. Production persistence ambiguity or an unknown
provider claim remains subject to the existing canonical-record reconciliation
and mailbox inspection procedure, with no blind command replay or history reset.

Private evidence: `readiness-preflight-20261009.json`,
`external-v2-before-progress.json`, `continuation-ledger.json`,
`readiness-candidate-proof-20261009.json` and the local test logs. Git excludes
all private exports, configuration, credential references and signing material.
