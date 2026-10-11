# Australia 500 deployment: execution receipt unavailable

Status: **STOPPED; deployment is not verified or complete**.

## What was applied

The owner approved the timeout-only amendment. It is committed on develop at
`6b33822cf751f1ea1b27f0be3a539b4d284f6b3e`; main was not promoted or pushed.
Fresh preflight reconciled all nine workflow objects, ten tables and 109 records.
The exact amended bootstrap graph was applied to the existing inactive control,
read back byte-for-byte under the reviewed graph normalization, and its existing
Google Sheets credentials were confirmed preserved. All 48 operations applied,
with no removed/skipped groups, assigned credentials or validation warnings.
Applied control version: `cdbadb21-e886-4ee4-b628-1b0a57dcff79`.

One manual execution was dispatched: **1181**, with status `started`.

## Exact verification failure

The first metadata lookup returned:

> Execution '1181' not found for workflow 'ml9StJJLEqWXjgC5'

A separate history query returned no retained execution. The bootstrap disables
manual, successful and failed execution retention. Its completion result and
per-chunk verification receipts are therefore unavailable through the connector.
No failure of the actual Google API, initialization logic or credentials has been
proved. Equally, a dispatched execution is not evidence of successful persistence.
No source hash, 500-row count or initialization completion is claimed.

The deployment phases were halted at this uncertain result. No Draft Queue,
Inbox Sync, production-candidate update or publication was dispatched. The writer
was not rerun, and no sheet, record or recovery evidence was deleted.

## Data-preserving recovery and independent reconciliation

After the 180-second execution window had elapsed, the current control was
reconciled against the exact applied graph. Its reviewed restoration operations
were applied once and independently read back. The original graph/groups/settings
and inactive state are restored at version
`24c9abe6-507a-4d3e-a577-3c4bb28a09c1`.

Fresh independent readbacks confirmed all eight production workflow objects and
versions remain identical, all ten tables remain present, and all 109 original
records remain byte-identical, including protections, history, synthetic records
and owner Zoho claims/receipts. This establishes zero Data Table mutations.
Zoho's three throwing barriers and absent provider transport remain intact because
its entire workflow object is unchanged. All five Phase 2 engines remain inactive.
The panel remains published at `f3a1e008-a761-4aaa-8a48-00072921a718`.

The **new workbook output remains unverified**: execution 1181 may have created
no output, partial held output, or complete output. No independent Google read
was made after the stop. Restoration changes graphs only; it preserves anything
already written to the new Arc Research tab. No existing source or old-workbook
write target exists in the exact executed bootstrap graph.

## Resource accounting

| Resource | Observed / reserved | Original ceiling |
|---|---|---:|
| Cloud execution dispatches | 1: execution 1181 | 4 |
| Google GETs | Unknown; conservatively reserve up to 24 | 39 |
| New-output batchUpdate calls | Unknown; conservatively reserve up to 21 | 21 |
| New Data Table rows | 0, independently reconciled | 15 |
| Existing-row rewrites | 0, independently reconciled | 0 |
| Provider calls / sends / deletes | 0 | 0 |

The two earlier failed atomic updates and the successful bootstrap apply/restore
are metadata operations, not Cloud executions. Native validation and preservation
lookups also consume no Google requests or workflow executions. The maximum
bootstrap branch allocation is retained rather than counting unavailable results
as zero. No additional charge, credential change or automatic activation was
introduced. Exact external call counts cannot be reconstructed from these receipts.

## Precise remaining gate

Before any further write, an independently readable, bounded **read-only**
reconciliation must establish whether Arc Research exists, its full headers and
500-row state, every required hold, exact lead association, and original-source
preservation against available evidence. Any partial or mismatched output must
remain held; completed batches must never be replayed blindly.

The remaining execution/read allowance must include that reconciliation and the
owner-deferred final visit. The original three remaining execution slots cannot
silently cover a new reconciliation execution plus Draft, Sync and the reserved
owner visit. No budget extension, new recovery graph or retention change has been
inferred. No further permission question or Cloud test was issued after this stop.

Private raw responses, applied graph pins, dispatch receipt, complete preservation
checks and restoration receipts are retained in the timestamped approved-run
folder under `private/au500-deployment-20261011/`. They are Git-ignored. Original
reviewed snapshots and Stage 1/2 evidence remain preserved.

The timeout amendment passed 34 local tests and native structural validation;
this report does not convert that local result into a deployment pass. Native
receipt availability and actual new-sheet state remain unchecked.

