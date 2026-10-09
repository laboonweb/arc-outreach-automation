# Stage 1 final report, 10 October 2026

**PASS within the approved isolated scope. Production release is still blocked
pending separately authorized real Zoho verification and final release approval.**

The final gate used exactly 28 external read-only AFTER Google GETs and one
manual ordinary-browser OAuth token exchange. It added zero n8n executions and
zero row mutations. Previously successful Cloud scenarios were not repeated.
All six rebuilt application candidate hashes remain those in the
[release manifest](release-candidate-20261009.md); validated implementation
source is develop commit `91b9539cf5057563839757c91abf76ecac231067`.

## Final results

| Gate | Outcome | Evidence |
|---|---|---|
| Saved BEFORE and pinned manifest | PASS | BEFORE receipt intact, complete 28-read coverage; manifest unchanged |
| Fresh prerequisites | PASS | Owner confirmed source writers/edits paused, 300 project / 60 user read quotas and no linked billing account; existing Desktop client and owner-only ACL verified locally |
| OAuth authorization | PASS | Exact spreadsheets.readonly scope; manual ordinary Chrome consent; one exchange; no token/credential logging, export or Git entry |
| Complete AFTER | PASS | Exactly 28/28 responses HASHED, VERIFIED progress, three complete books and 22 tabs |
| Source comparison | PASS | Every metadata hash, grid hash, sheet association, allocated dimension, requested range and coverage field matches BEFORE; all three Arc Research tabs retain all 208 required fields |
| Bounds and transport | PASS | TLS and pinned endpoints, no redirects/retries; all response/time/memory bounds satisfied |
| Production workflows | PASS | All six full graphs/settings and draft/published version IDs unchanged; five engines inactive/manual; only the pre-existing panel remains published |
| Production tables and protections | PASS | All four complete tables, 81 rows including timestamps, match retained baselines; suppression/history/provider-linked protections and stored Zoho receipts unchanged |
| Synthetic state | PASS | All four tables, 26 rows and eight identities exactly match the pre-AFTER checkpoint; S3 remains UNKNOWN_PROVIDER_RESULT, S8 remains CLAIMED, both unsent |
| Existing staging resources | PASS | Same four inactive unpublished restored workflows; no resource creation or workflow update in this final gate |
| Critical Cloud / local evidence | PASS, retained | Native five-engine integration, duplicates, failure recovery, payloads, manual panel lifecycle and mocked handoff proofs retained; full scoped local suite 472 passed, zero failures/skips |

This is a bounded validation result, not certification of untested concurrency,
arbitrary payload sizes, real provider behavior or real-device rendering.
The [critical validation report](stage1-critical-validation-20261009.md) preserves
the individual successful and failed executions, two fixes and prior incidents.

## Complete integrity receipts

Pinned request/implementation/schema manifest SHA-256:
`71507a82177fc262a58e105e09e0023daee1345d085fdbda8a241f6b04810cf1`.

| Workbook | Tabs | BEFORE = AFTER complete workbook hash |
|---|---:|---|
| AUSTRALIA | 7 | `d23221f851ede53fcec2990e56ec42459dcc27865545158a4055b63f629e08b3` |
| MANILA_LEGACY | 9 | `e0b90bc2f514f73b3d2584c052aad2958078ac9efbcbc79c270cdcf07d35dc2e` |
| MANILA_AUDIT_QUEUE | 6 | `7228eb8aa3081e3c036fdfd8a06aff1249d9400fd460512c16cc22fa398d3dba` |

Entered/calculated values, formulas, relevant entered/effective formatting,
notes, rich text, validation, dimensions and the selected complete Sheets API
metadata model are covered. Every required research field and complete physical
grid is included. Start/end metadata is stable. There is no partial certification.
Drive access/revisions and external embedded binary assets are outside this model.

Private files remain outside Git under `private/operator-stage1/`:

| Receipt | File SHA-256 |
|---|---|
| external-stream-before.json | `908bb8a5f1de69722b83089799d0115d95bacb40b9783c297fb07a4d6c289b3c` |
| external-stream-after.json | `48b686d298e1e283fff726f828205676d956d59a47dce51b6895b6b234a4789f` |
| external-stream-after-progress.json | `88a87d46cf5f553f0ee03d5bf0ab88a153a9319c164f9721ae4b923fbd220144` |

`final-after-comparison-20261010.json` records the independent comparison,
dimensions, coverage and metrics. `pre-after-preservation-20261009.json` and
`post-after-preservation-20261010.json` retain all workflow/table hashes.
`google-oauth/owner-after-authorization-ac8fccd9572d6edd42248489be3bca0e.json`
contains scope, accounting and AFTER_VERIFIED status, never an access token.
Original approval, failed probes, passing scenarios and recovery snapshots remain.

AFTER peak response: 35,046,171 bytes; heap: 41,767,432 bytes;
RSS: 146,399,232 bytes; longest grid request: 14,406 ms.
Unchanged bounds: grid 64 MiB, metadata 1 MiB, heap 64 MiB, RSS 192 MiB,
60-second request deadline. Workbook bodies stayed outside n8n Cloud and disk.

## Final cumulative accounting

| Resource | Actual counted use | Approved ceiling |
|---|---:|---:|
| Staging workflows | 4 | 4 |
| Synthetic tables | 4 | 4 |
| Synthetic identities | 8 | 8 |
| Cloud executions, including children/failures | 71 | 84 |
| Matched synthetic row mutations | 154 | 500 |
| Google GET slots | 67 | 67 |
| OAuth token POSTs | 5 | 5 |

Sixty-six Google HTTP GETs were dispatched; the earlier failed pre-dispatch
reservation stays conservatively counted as the 67th slot. BEFORE/AFTER used
56 successful reads. No reservations remain and no retry capacity remains.
Connector preservation reads and offline checks do not execute workflows.

Zero production/source/provider writes, real Zoho drafts, email/DM sends, paid
research calls, purchases, deployments or activations occurred. No unexpected
additional charge was observed; Google prerequisites and quota remained as
confirmed. This final gate altered only ignored local approvals/receipts and
sanitized documentation. No application source changed or tests were rerun.

## Release disposition

Recommend proceeding to the separately gated
[Stage 2 owner-only provider validation](stage2-owner-zoho-plan-20261010.md).
The neutral copy hash and frozen signature validate locally, but current provider
ownership, allowance/cost and actual unsent draft/readback remain unverified.
No Stage 2 provider call is authorized or performed by this report.

The exact production diff, expected old versions, candidate hashes and
history-preserving rollback are already prepared in the release manifest.
After Stage 2 passes, obtain final production approval before applying it or
publishing only the panel. Keep five engines inactive/manual, sending manual,
suppression authoritative and ambiguous provider claims locked.
