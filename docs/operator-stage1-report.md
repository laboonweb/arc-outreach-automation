# Operator lifecycle: Stage 1 Cloud smoke report

Latest result: see [Stage 1 continuation results](operator-stage1-continuation-report.md). The authorized continuation reached 41 executions, 134 synthetic mutations and two of seven integrity GETs, then stopped on a browser editor authentication 401. Production remains unchanged. The first-attempt report below is historical.

8 October 2026. Run `20261008-319ba8`.

**Result: FAIL / STOPPED at the first source-integrity execution. Stage 1 is not signed off. Hold Stage 2 and production release.** Capacity, cost, editor authentication and isolated configuration checks passed. Execution `1095` reported success for its read-only Google Sheets native node, then the workspace returned HTTP 503 and reported that it was restarting. The compact integrity receipt never arrived. No synthetic lead was seeded and no lifecycle test ran. The execution was not retried.

The instance returned online. Production table contents and all six workflow versions were checked against fresh pre-test baselines and remain unchanged. All four new workflows were archived; the four empty synthetic tables remain for review. Nothing was published or deployed.

## Capacity, costs and authentication

| Gate | Result | Observed evidence |
|---|---|---|
| Execution allowance | PASS | Trial; 33 of 1,000 used, 967 available. Reserving all 84 approved runs would leave 883. Displayed account counter remained 33 afterward. Our stricter ledger counts the one started manual execution regardless of billing or retention. |
| Data Table headroom | PASS | Actual configured quota: 209,715,200 bytes (200 MiB). Before: 626,688 bytes used. After: 643,072 bytes used, quota status `ok`; 209,072,128 bytes remain. Four empty table schemas account for the 16,384-byte increase. |
| Additional charges | PASS within existing trial | Trial expires 17 October. Billing showed no billing details. No purchase, upgrade, paid provider, AI or gateway service was invoked. Expected additional monetary cost is $0 within this trial; no additional charge was shown. |
| Editor login | PASS before execution | Earlier 401 stop was resolved by owner re-login and confirmation of a stable session. Normal editor login returned 200 after reload. |
| Panel Basic Auth / form requests | NOT RUN | No staging listener, panel GET, form POST or deliberately denied-auth request was started. Editor login is separate from webhook Basic Auth. |
| Runtime availability | FAIL | Browser `Connection lost`; health/MCP HTTP 503, `Workspace offline`, restart message. Admin Panel later showed Online, n8n 2.41.6. |

Execution allowance and table quota do **not** establish runtime RAM headroom. n8n currently documents 320 MiB RAM for Trial and warns that large data and manual editor execution can exhaust memory and make an instance inaccessible. Memory pressure is a plausible explanation, **not a confirmed diagnosis**: instance logs and restart cause were unavailable. Existing maintenance settings also permit upgrades at any time. No account setting was changed. [n8n Cloud memory and data management](https://docs.n8n.io/deploy/use-n8n-cloud/configure-cloud/manage-your-data.md).

No plan change is required or authorized by this report. Trial expiry remains a retention/availability concern for a later release. [Free-trial terms](https://docs.n8n.io/deploy/use-n8n-cloud/start-your-free-trial/).

## Configuration and first execution

Four inactive, unpublished workflows were created under one unique prefix. Complete native graphs were installed through the SDK/MCP path and read back: panel 59 nodes, mocked handoff 16, sync 15, control 15. Per-node parameter and connection hashes matched local staging definitions, including the configured first integrity intent. Exact current table schemas were copied.

The three synthetic graphs reference only the four staging tables and staging sync. Research HTTP reads became deterministic fixtures. Real provider connection identifiers became a mock connection; provider HTTP and credentials were removed. The panel retained Basic Auth references, a separate private synthetic signing key and test URLs. The control's sole network node is an allowlisted Sheets GET with raw execution retention disabled. Native persistence, business gates and receipt nodes were not pinned.

Pre-execution comparison caught an unfinished `STAGE1_SYNC` placeholder. It was replaced with the staging sync ID and rechecked. A nested-parameter API update was rejected; replacing the complete parameters succeeded. A control canvas grouping warning was corrected. These setup issues involved no production reference or execution.

Execution `1095` started once from the authenticated n8n editor with explicit `INTEGRITY`, workbook index 0, phase `before`; the seed branch was not taken. Browser runtime metadata confirmed the trigger, intent, branch and allowlist nodes succeeded. `Read source integrity once` reported success in 7,442 ms, consuming one authorized Sheets GET. The Google response status and body were not independently verified; native node completion does not establish valid source data. No `Compact integrity receipt` output was observed before the connection loss.

After recovery, execution lookup returned `not found` and execution search returned no retained record. Control settings disabled manual, successful and error data retention. Absence is consistent with that policy and proves neither terminal success nor a particular failure. Terminal status, source hash and source payload size remain unconfirmed.

No retry, further integrity request, synthetic write, operator-issued restart or account-setting change followed the stop. External effects were staging metadata, normal browser/session activity, one read-only source request and a temporary shared-workspace outage. Data isolation did not isolate compute or availability from the live panel.

## Pass/fail results

| Required validation | Result | Disposition |
|---|---|---|
| Capacity, costs and stable editor login | PASS | Established before creation. |
| Isolation, schemas and native graph read-back | PASS | Four drafts/four tables; references checked; no publication/activation. |
| Complete before/after source values/formulas/formats/theme/row association | FAIL / incomplete | One GET attempted and native node reported success; no verified payload, hash receipt or comparison. Remaining five GETs not attempted. |
| Data Table durability, coercion, later-execution read-back, CAS, duplicates and interrupted-write recovery | NOT RUN | Independent post-incident reads confirm all four staging tables empty. |
| Panel browser Basic Auth, native GET/POST, token/origin/expiry/replay | NOT RUN | No listener or panel request. |
| S1 manual email: six facts, saved working copy, re-evaluation, review, approval and mock draft/replay | NOT RUN | No lead seeded. |
| S2 social: route/messaging observation, permission and readiness | NOT RUN | Checkbox bypass and legitimate readiness untested in Cloud. |
| S3 Australia: public-email rejection, consent approval, unknown mock outcome/replay | NOT RUN | AU compliance/provider ambiguity untested. |
| S4 history and S6 suppression: correction/route/edit rejection | NOT RUN | Production preservation passed; synthetic mutation paths untested. |
| S5 seeded SENT, replies and follow-up schedule/dismiss/count | NOT RUN | No new send or fabricated send event. |
| S7 existing mock receipt protection/access | NOT RUN | Production stored linkage remains exact; mailbox not queried. |
| S8 ASCII/Unicode payload bounds, faults and exact receipt reconciliation | NOT RUN | No payload or recovery proof. |
| Supported observation/parked-domain/CTA wording and unsupported claim rejection | NOT RUN in Cloud | Signed-off Stage 0 local regressions remain the evidence. |
| Canonical intake/review/copy rerun preservation in Cloud | NOT RUN | Original engines remained inactive/manual and were not executed. |
| Production tables and six workflow versions after the stop | PASS | Exact content hashes and version/active-state comparisons. |
| Archive four new drafts; retain labelled tables | PASS | Four successful archive receipts; no table deletion. |

Stage 0's **396 passing local tests** remain the previously approved result. Stage 1 changed no product runtime or validator, and did not rerun that suite. The new staging builder passed `node --check`; staging graphs passed native import/update validation and parameter/connection read-back. Configuration checks do not establish persistence or lifecycle behavior.

## Actual consumption

| Resource | Actual | Approved maximum |
|---|---:|---:|
| New workflow drafts | 4, subsequently archived | 4 |
| New synthetic tables | 4, retained empty | 4 |
| Synthetic lead identities persisted | 0; eight fixtures exist locally only | 8 |
| Initial row inserts | 0 | 26 |
| Cloud executions, including children | 1 control; 0 panel/handoff/sync; 0 children | 84 |
| Synthetic matched/attempted row mutations | 0 | 500 |
| Serialized staging application data persisted | 0 bytes | 5 MiB |
| Physical Data Table storage added | 16,384 bytes | Verified headroom |
| Read-only Sheets integrity GETs | 1 | 6 |
| Deliberately denied-auth smoke requests | 0 | 6, executions included in 84 |
| Production workflow/table/source/provider mutations | 0 | 0 |
| Real Zoho calls/drafts, sends/DMs, paid research/AI calls | 0 | 0 |

Execution count comes from the HTTP 200 start receipt and returned ID, not retained execution search. Diagnostics, production read-back and archival were not workflow executions. Sheets API requests have quotas but no additional usage charge. [Google Sheets API limits](https://developers.google.com/workspace/sheets/api/limits).

## Preservation and retained artifacts

Fresh full production rows were captured before setup. After the incident, sorted rows including system timestamps were compared using canonical SHA-256. Every count and hash matches:

| Production table | Rows | Before and after SHA-256 |
|---|---:|---|
| Queue | 23 | `b763eda42569b654b4389963b77b9a4fef65658fb987899f06bb2a0589ec8b6a` |
| Protections | 12 | `22da18107a802de087feaec914488d41f3fc6da0493c7b0a0b7a450b2e6e91af` |
| Inbox | 23 | `1c4fa7f2fada88bb5fddc137456ee5889eda94e0d376d2f78f6a818245d3837f` |
| Links | 23 | `5706faa7cbec587ca27b10c809220b4523d02c280df61c09a93047e8247af11b` |

This includes SENT/protected/suppressed records, historical outreach, messages, approvals, claims and stored provider receipts. All six production version IDs and active-version IDs match the fresh baseline. The panel retains its original active/published version; Draft Queue, Review Actions, Zoho Handoff, Inbox Sync and Grounded Copy remain inactive/unpublished. Saved rollback files passed the earlier 10-of-10 hash check and were not overwritten.

No source/Arc Research write node was present or invoked. Full source integrity nevertheless remains unconfirmed because its hash gate failed. No Zoho API was called: canonical linkage preservation is verified; independent mailbox contents are not part of this attempt's proof.

| Role | Archived workflow ID | Retained empty table ID |
|---|---|---|
| Panel / Queue | `yue6cjy20A2LJSHf` | `EDa7ATVDphSiJgW5` |
| Mock handoff / Protections | `jmHDRypCGpv3XF4q` | `kEJ02QrTlEKYGuiG` |
| Sync / Inbox | `4KtsLYoEoumiTjC3` | `Ce0726VO2fekCg1c` |
| Control / Links | `ml9StJJLEqWXjgC5` | `QXplaaYB3X2a8aQA` |

Names use `Arc Operator Smoke 20261008-319ba8`. A continuation must account for cumulative limits and reuse these artifacts where supported; creating another four workflows/tables is not authorized. Deleting tables or changing isolation scope needs separate approval.

Private, gitignored `private/operator-stage1/` contains fresh baselines, isolated configuration/fixtures/SDKs, `run.json`, `preservation-proof.json` and `stop-receipt.json`. Source cells and credentials are absent from compact receipts and this report. The synthetic signing key stays private.

## Remaining risks and recommendation

| Open risk | Required proof before release |
|---|---|
| Shared instance availability/RAM | Establish restart cause; bound source payload and Code/UI memory duplication; complete integrity without disrupting the instance. Storage headroom is insufficient. |
| Source integrity | Matching before/after hashes for all three books, with complete value/formula/relevant format/theme/association coverage. Verify coverage before bounding populated ranges. |
| Data Table durability/types | Native saves, later-execution read-back, exact hashes and actual field coercion. |
| Payload/storage limits | ASCII/multibyte around existing 64 KB payloads and workspace bounds; over-limit rejection without truncation; measured storage growth. |
| CAS/projection/recovery | Stale requests, zero matches, canonical/projection faults and reconciliation without lost pending edits or duplicate audit. |
| Authentication/browser | Actual Basic Auth/forms/token/origin/expiry/replay. Published URL/CSP remains a later separately approved boundary. |
| Evidence/copy/blockers | Invalid/missing/stale/future/private evidence rejection; dates/provenance preserved; truthful wording and coherent missing/stale feedback. |
| Lifecycle/compliance | Exact saved-copy/current-route approvals, AU evidence gate, no label-only state, checkbox bypass or invented SENT/provider state. |
| Protection/history | Cloud rejection paths, permissible audited corrections, append-only replies/follow-ups and due/count rules. Current preservation alone does not test edits. |
| Mock provider | Draft-only envelope, claim expiry/association, success/malformed outcomes, post-claim/receipt failures, locked replay and reconciliation. |
| Real Zoho | Separately approved Stage 2 OAuth/account/region, actual receipt shape, draft access, ambiguous-result recovery and duplicates. Mocks cannot prove it. |
| Retention/observability | Durable compact receipts across crashes without saving source cells. Disabled raw retention prevented terminal reconciliation here. |
| Scale/devices/maintenance/rollback | Eight fixtures do not prove queue-wide memory/pagination or real devices. Review maintenance interruptions, trial expiry and old-code compatibility with new operator data. |

**Hold Stage 2 and deployment.** Review this failure and a revised bounded Stage 1 integrity/receipt design before any further Cloud execution. Do not rerun the original full-grid manual read or claim memory exhaustion was proven. Any continuation after the stop must respect cumulative budgets and all source/protection/provider boundaries. If complete coverage requires more than six Sheets GETs or extra resources, return a revised scope for approval first. No upgrade, live restart, instance-setting change or provider test is authorized.

No production rollback is needed: no production artifact changed. The workspace recovered without an operator-issued restart. Four test workflows are archived and their tables remain empty. For later persistence/provider failures, identify the exact canonical commit point and preserve CLAIMED/UNKNOWN before reconciliation. Never blind-retry a provider call, restore an old whole table, clear suppression or erase history. The [saved-baseline rollback procedure](operator-cloud-validation-plan.md#rollback-and-recovery) remains applicable.

Changed local files: `scripts/build-operator-smoke.js` (staging-only builder), this report, and the status update in `docs/operator-cloud-validation-plan.md`. Product runtime, signed-off candidate logic, source spreadsheets and production workflows remain unchanged. This workspace has no Git repository; no commit or push was attempted.
