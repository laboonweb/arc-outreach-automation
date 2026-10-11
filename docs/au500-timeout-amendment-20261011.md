# Australia 500: proposed timeout-only amendment

Status: **locally validated; not applied to n8n**.

Subsequent owner approval: the correction was committed as `6b33822`, applied
and exactly verified on the inactive staging control. Execution 1181 was
dispatched, but its receipt was unavailable with retention disabled. Staging
was restored without replaying writes. See the
[execution receipt stop report](au500-bootstrap-receipt-stop-20261011.md).
No production candidate was applied or published.

## Confirmed failure and preservation

The owner authorized one captured atomic retry of the original staging update.
That second attempt returned:

> executionTimeout (600s) exceeds this instance's maximum of 180s. Set executionTimeout to 180 or less.

This is a confirmed settings failure, not a payload-limit or authentication failure.
The first failure hid its detailed response; both failed attempts remain recorded.
The second attempt changed no workflow and dispatched no execution. Independent
readback at 2026-10-11T09:34:13.630Z confirmed the original staging graph, inactive state and
version `1336d6eb-7145-4ee7-b035-db267b3185a3`. Earlier complete reconciliation after the first failure
verified all nine workflows, ten tables and all 109 original records unchanged.
No intervening execution, source request or row mutation occurred.

## Exact proposed change

Starting checkpoint: `4de7f6ec117d7effbea1a29e5b5ccc9a995cf0b6` on develop, unchanged.
In `scripts/build-au500-integration.js`, change only the bootstrap's
`settings.executionTimeout` from 600 to 180 seconds. Add a regression test in
`tests/au500-build.test.js` covering absent, shorter and over-limit inherited
settings, inactive state, disabled success retention, the generated deployment
settings and unchanged recovery input.

No application runtime, source schema, batch size, hold, request parameters,
credential, group, connection, protection, provider barrier or release limit changes.
All six production candidates and both fixed-five pilot candidates remain
byte-identical, including their SDK and structural sidecars (24 artifacts).
All 64 original private files retain their exact previous hashes.
Only `bootstrap` and `bootstrap-restore` operation phases change. Bootstrap has
one timeout-setting change plus its expected graph hash; restore changes only
its required starting-graph hash. All other 16 phases, the complete restoration
operation list and the original restoration target remain exact.

Regenerated artifacts are stored separately under
`private/au500-timeout-amendment-20261011/`. The reviewed original directory and
recovery evidence remain untouched. The proposed source/test diff is uncommitted.

## Exact amended pins

| Artifact | SHA-256 |
|---|---|
| Bootstrap JSON file | `606ea3c743829dbe0acbb317fd8a934e0ceb42347b589b1000f38b4e18ff4610` |
| Bootstrap object | `5594ff13ac7b0e2e00938887b13da77a0ef7c9bc1b6238fed0511b7ab2b28f28` |
| Bootstrap normalized graph | `fa6e6d47e51dea5dc3286cb17a03d61b00f32d3d4b3094596f0bd595a89f57f0` |
| Bootstrap full SDK | `b55d4c590fae7af18500605387cf6ab4db6c07ff1945d84ced8d505e150b998b` |
| Bootstrap structural SDK | `7babc2a06566248d7808e3adfbf29ba95015fd0ed9c54ab0a4f45d965386534c` |
| Deployment operations file | `d457d17e594734105c8beb7cb13e87b7f7034dedb4df658b3e035fb2703087a9` |

Target remains staging control `ml9StJJLEqWXjgC5` with required
baseline version `1336d6eb-7145-4ee7-b035-db267b3185a3`.

## Validation

- 34 focused local tests passed, zero failures/skips. Source registration,
  500 held rows, fixed-five intake, duplicate/protection refusal, compatibility,
  exact SDK runtime preservation and graph restoration checks passed.
- Regeneration asserted that the bootstrap's complete object differs only at
  `settings.executionTimeout`. All Code bodies, request parameters, connections,
  credentials and groups remain exact.
- Corrected 13-node structure passed native n8n validation. Its existing
  `INVALID_EXPRESSION_PATH` warning for `$json.body` remains: structural sidecars
  replace Code bodies with hash markers and cannot declare the emitted fields.
  No warning was suppressed or interpreted as live runtime success.
- The full SDK remains 319,195 bytes, above the native validator's 300,000-character
  input ceiling. Unchanged runtime parameter receipts and local runtime tests
  are reused; structural validation is not a complete Cloud execution test.
- `git diff --check` passed. New private artifacts are Git-ignored. No commit,
  push, publication or deployment occurred.

## Consumption and narrowly bounded continuation

Two atomic workflow-update attempts failed; both changed nothing.
Deployment consumption remains 0/4 Cloud executions, 0/39 Google GETs,
0/21 new-output batchUpdates, 0/15 new Data Table rows, zero existing-row rewrites,
provider calls, sends or deletes. Native SDK validation consumes no workflow
execution or Google request.

The last authorization ended after a failed captured attempt and froze the
reviewed artifacts. Owner approval must supersede only these bootstrap timeout
and derived artifact/operation pins, and lift that recorded STOP. No budget
increase or other scope change is proposed. On approval, preserve a reviewed
amendment checkpoint, reconfirm exact current baselines, and resume the previously
approved bounded integration through the existing connector. Keep the final
single panel visit deferred to the owner as already approved.

## Runtime limitation and recovery

A 180-second execution ceiling is confirmed; successful completion of 21 writes
and 24 Google reads within it is **not yet demonstrated**. The bootstrap remains
sequential with no retry. If it reaches the ceiling or any persistence guard
fails, stop and independently reconcile exactly what was written. Keep all
written new research rows held and preserve their history; never delete the new
sheet or replay completed batches blindly. Restore graphs only through the
existing data-preserving recovery procedure. No higher timeout, smaller
coverage, automatic continuation or expanded execution budget is authorized.

