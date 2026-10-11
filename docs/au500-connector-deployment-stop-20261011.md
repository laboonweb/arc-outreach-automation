# Australia 500 connector deployment: stopped before execution

Subsequent captured attempt: the owner approved one retry, which also changed
nothing. Its preserved response confirms `executionTimeout (600s)` exceeds the
instance maximum of 180 seconds. The timeout-only proposed correction and exact
new pins are documented in [the amendment report](au500-timeout-amendment-20261011.md).
Both failed attempts remain recorded; all deployment resource counters remain zero.

Status: **FAILED at the first staging update; production integration has not started.**

The owner approved connector-only continuation on 2026-10-11, including reuse
of the last UI allowance/storage observations and deferral of the one panel
visit. The approved implementation remains
`4de7f6ec117d7effbea1a29e5b5ccc9a995cf0b6`.

## Passed preflight

- All nine workflow objects and versions exactly matched the recovery baselines.
- All ten Data Tables and 109 records exactly matched the preserved rows.
- All nine candidate/pilot/bootstrap JSON, SDK and normalized graph hashes matched.
  The exact deployment operations file hash also matched.
- Five Phase 2 engines remained inactive/manual. Zoho's three throwing barriers
  and absent provider HTTP transport were verified.
- Fresh private recovery copies and the preflight receipt were saved.
- The existing connected account's Editor-access confirmation and both approved
  storage/managed-Google-quota risk exceptions remain recorded. No fresh UI quota
  measurement is claimed. Last UI observations were 37/1,000 executions and
  approximately 0.83 MB table usage; their reuse was separately approved.

## Exact stop

At 2026-10-11 16:41 Manila time, one atomic `update_workflow` call attempted the
48 approved bootstrap operations against the existing inactive staging control.
The tool returned `isError`. My orchestration response helper discarded that
response and raised the generic `TOOL_ERROR`, hiding the underlying message.
That was a reporting mistake; targeted local recovery logs did not retain the
nested response. The helper now preserves raw failures before throwing, and
two synthetic error/success self-checks passed. Application code is unchanged.

The operation payload is 945,960 bytes. A payload-limit failure is **not confirmed**.
No error cause, approval-review rejection or authentication failure is inferred
from the generic result.

Independent readback confirmed the staging control's original exact graph and
version `1336d6eb-7145-4ee7-b035-db267b3185a3` were unchanged. No execution was
dispatched. A complete second reconciliation at 16:47 Manila time confirmed
all nine original workflow objects, ten tables and 109 records unchanged.
The control's metadata includes `workflow:update` permission; this does not
prove why the attempted update failed.

## Actual consumption and preservation

| Resource | Used | Authorized ceiling |
|---|---:|---:|
| Cloud executions | 0 | 4 |
| Google Sheets GETs | 0 | 39 |
| New-output batchUpdate calls | 0 | 21 |
| New Data Table rows | 0 | 15 |
| Existing-row rewrites | 0 | 0 |
| Provider calls / sends / deletes | 0 | 0 |

One staging workflow-update attempt failed without changing its graph or version.
Metadata/table readbacks consumed no Cloud executions or Google requests.
No production workflow was updated or published. No output creation, new lead
import, browser visit, credential change, main promotion or release tag occurred.
No rollback or deletion was needed. The previously published panel version
remains `f3a1e008-a761-4aaa-8a48-00072921a718`.

Private evidence: the timestamped connector-resume recovery directory under
`private/au500-deployment-20261011/` contains `preflight.json` and
`staging-update-stop.json`. No private files were committed.

## Prepared narrowly bounded continuation

The approved failure policy requires stopping on an unexpected failure without
blind retry. The next possible diagnostic therefore requires explicit permission
to lift this stop for one further attempt of the **same atomic staging update**.
Capture its complete raw response privately before parsing; independently read
back its graph/version. Do not alter the pinned code or raise resource limits.

If the update and exact graph/group/settings readback pass, resume only the
already approved integration and native pre-write gates. If the update fails,
stop with its actual message and do not attempt another update or execution.
No Cloud execution or Google/data write may precede successful graph verification.
All existing four/39/21/15 ceilings and the owner-deferred final visit remain.

Remaining unvalidated work: native workbook metadata/schema/payload checks,
500 held research rows, five Queue plus five Inbox plus five Links imports,
compatibility publication, and the final owner panel visit. The source/provider
records, protection history, approved checkpoint and prior passing tests remain
preserved.
