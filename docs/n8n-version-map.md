# Git to n8n version map

Checkpoint: the initial Git commit containing this file. Resolve its exact SHA
with `git log --reverse --format=%H`; the bootstrap receipt stores it privately.
This is the current local Stage 0 implementation plus bounded Stage 1 corrections.
**Cloud validation incomplete; not production validated; no deployment.**

These non-secret identifiers were read from the final saved preservation proof
and six-candidate manifest on 8 October 2026. They describe the last verified
production baselines, not deployment of this Git revision. Refresh them before
any separately approved Cloud write. The working tree's source hashes and private
candidate hashes are recorded in the bootstrap receipt.

| Component | Production workflow ID | Last verified versionId | Current candidate deployed? |
|---|---|---|---|
| Published panel baseline | Sx3zqQF3egg8OGRZ | 5c0d43b7-a70a-416e-b922-126657729678 | No |
| Draft Queue, inactive/manual | Hqm5e1qhO9yadbKz | 4ebb8aae-5b5f-4ead-ad2a-3f3746a9f42f | No |
| Review Actions, inactive/manual | 8A1NLpsHfLIRVyNB | 0b562c61-843a-40ae-aea7-9ad5505ad433 | No |
| Zoho Handoff, inactive/manual | 7a5Sp3jrw5ftfEdn | 7e3fd0b9-e948-4847-a879-6c3f04422081 | No |
| Inbox Sync, inactive/manual | Z3k7nFGP0uJOXRLO | ae513ee4-a085-49df-8b37-a40352c82ffa | No |
| Grounded Copy, inactive/manual | xhfcPgSl1n2eegQH | 141fc4fd-9ee5-409f-a334-28d0f4e3a5aa | No |

Add a dated mapping row for each future approved update with commit SHA, expected
old version, confirmed new version, export hash, inactive/published state and
evidence references. Record staging separately from production. Never infer a
production version from a local build, a Git merge or an execution number.

9 October 2026 development continuation: all six production versions and full
node/connection hashes above were rechecked unchanged, as were all four complete
production tables. The six local candidate JSON hashes also remained unchanged
after rebuilding. The development verification slice passed 417 local tests;
its proposed four-node integrity probe passed SDK validation but was not
installed or executed. No new production or staging workflow version exists.
Resolve the exact development Git SHA with `git log -1 --format=%H` on that
checkpoint; its private receipt records the SHA and unchanged candidate hashes.
See [readiness and pending integrity approval](readiness-20261009.md).

### Subsequent isolated integrity attempt, 9 October

The checkpoint above is Git `60d164c4cca7e22ca39de8a6a64babadf4d43bc5`.
After owner approval, only staging control `ml9StJJLEqWXjgC5` changed:

| Purpose | Confirmed staging version | State | Outcome |
|---|---|---|---|
| Original nine-node synthetic contracts | 916b40cb-86e0-4bcb-9ca0-246add048a0e | Inactive/unpublished | Preserved restoration source |
| Owner-approved four-node OAuth probe | b5294e38-0a8a-4a33-b448-1684295e469a | Inactive/unpublished | One GET succeeded, hash Code failed; no baseline |
| Restored nine-node synthetic contracts | bf6490c3-bfac-44b7-9d64-296cd1336385 | Inactive/unpublished | Nodes, connections, settings and groups exact to original |

The local correction checkpoint is Git
`f449668d19c63517c7e51a9a917b8a5e2c714a15`: 420 passing local tests, corrected
four-node SDK validation and unchanged six-candidate hashes. Production versions
above were freshly rechecked unchanged after the first failed probe.

### Approved corrected recovery and body-limit stop, 9 October

Only the same isolated control changed after the owner's direct approval:

| Purpose | Confirmed staging version | State | Outcome |
|---|---|---|---|
| Corrected 256-column Australia BEFORE probe | 88bba364-7a0f-41a2-8e72-186d09ff5b63 | Inactive/unpublished | GET succeeded; validator returned INTEGRITY_NATIVE_BODY_LIMIT; no baseline |
| Restored nine-node synthetic contracts | b924e389-dd0d-45cc-ba9a-62bb407b63c6 | Inactive/unpublished | Nodes, connections, settings and groups exact to original |

The latest recovery report's Git SHA is this section's commit; resolve it with
`git log -1 --format=%H -- docs/n8n-version-map.md`. No application logic changed.
All six production versions/graphs/settings and four complete production tables
were rechecked unchanged after this stop. Other three staging versions and all
26 synthetic rows were also unchanged. Cumulative use: 43/84 executions,
134/500 mutations, 6/14 integrity GETs. No further Cloud request or critical test
followed. This mapping records staging recovery, not a production release.


### Critical synthetic continuation, 9 October 2026

The develop commit containing this section includes the two Cloud-proven fixes
and complete compact BEFORE evidence; final AFTER remains pending. Resolve its
source SHA with `git log -1 --format=%H -- docs/n8n-version-map.md`.
All six production IDs, versions and complete graphs/settings in the table above
were freshly verified unchanged. All four production tables match their complete
baseline hashes. No current candidate is deployed.

| Restored staging workflow | Confirmed versionId | State |
|---|---|---|
| Panel yue6cjy20A2LJSHf | f234e927-87ce-4be9-bdf6-f5fe041523b3 | Inactive/unpublished |
| Sync 4KtsLYoEoumiTjC3 | 7e9f25d3-6fa5-4758-bdc6-01180f4909a7 | Inactive/unpublished |
| Mock handoff jmHDRypCGpv3XF4q | 52a29fdf-d5dd-42c5-9bf8-7bae78347654 | Inactive/unpublished |
| Control ml9StJJLEqWXjgC5 | f508e8d2-3c7e-4627-91ab-760a5db97af1 | Inactive/unpublished |

Restoration preserves original graph and configuration semantics. Mock handoff
Batch controls has an explicit runOnceForAllItems Code mode, equal to the omitted
original default. Temporary native/mocked test graphs are retained privately.
See the [release manifest](release-candidate-20261009.md) for all six rebuilt
candidate hashes and exact future diff; this mapping does not imply deployment.

### Stage 1 complete, 10 October 2026

Validated implementation remains Git `91b9539cf5057563839757c91abf76ecac231067`;
the current documentation checkpoint adds final receipts and Stage 2 scope only.
All six production versions above and all four restored staging versions were
freshly verified unchanged before and after the final 28 external integrity reads.
All four production tables and all 26 synthetic rows match their saved hashes.
Complete BEFORE/AFTER covers three books/22 tabs and matches every grid/metadata
hash. No workflow update or Cloud execution ran in this final gate.

Final cumulative use: 71/84 executions, 154/500 row mutations, 67/67 counted
Google GET slots and five/five OAuth token POSTs. Source/candidate hashes remain
unchanged; only the existing baseline panel is published. Stage 2 and production
deployment require separate approval. See the
[final Stage 1 report](stage1-final-report-20261010.md) and
[owner-only Stage 2 scope](stage2-owner-zoho-plan-20261010.md).

### Stage 2 preflight stop, 10 October 2026

The owner authorized three read-only provider operations and the bounded recovery
after execution 1166. Metadata recovery 1167 passed; account read 1168 stopped on
the owner identity/state guard. No provider draft, table creation or record write
occurred. All six production versions above were freshly rechecked unchanged;
five engines remain inactive/manual. No Stage 1 tests were repeated.

Only staging control `ml9StJJLEqWXjgC5` was temporarily changed. Its restored
version is `9b735fa5-00dd-4c57-b39f-808f7ba4abe7`, inactive/unpublished, with the
original nine nodes, connections, settings and groups verified equal to saved
version `f508e8d2-3c7e-4627-91ab-760a5db97af1`. The staging version change is
expected recovery history, not a production deployment.

Cumulative use is 74/84 Cloud executions and 154/500 matched mutations.
Preflight provider reads are exhausted at three/three. An additional diagnostic
read is proposed, not approved or executed. Resolve this documentation checkpoint
with `git log -1 --format=%H -- docs/stage2-preflight-report-20261010.md`.
See the [stopped preflight report](stage2-preflight-report-20261010.md).

The owner then explicitly approved one additional diagnostic read. Execution
1169 identified only PRIMARY_ADDRESS mismatch; it did not create or send anything.
The final staging control restoration is `7b529805-ecfb-4be6-985d-6f905bba599a`,
inactive/unpublished, with the same nine-node graph, settings and groups verified
equal to its pre-diagnostic checkpoint. Cumulative use is now 75/84 executions,
154/500 matched mutations and four/four authorized preflight reads. The instruction
to stop after that diagnostic result is honored; no further provider operation is
authorized. Production versions were not modified.

### Owner draft and read-only recovery, 10 October 2026

Preflight 1170 passed. The single owner-approved draft and durable claim/receipt
passed in 1171; independent readback stopped in 1172. Approved recovery 1173
made one folder read and one durable failure audit, then stopped on the missing
native payload member. No new CREATE, send or production update occurred.

| Staging control `ml9StJJLEqWXjgC5` | Confirmed versionId | State |
|---|---|---|
| Original graph before recovery | `649ae1a3-0461-4bb0-a373-5c9b344cddc2` | Inactive/unpublished |
| Audited 18-node recovery graph | `0599d0b5-126c-4f5a-a511-d3823c46faba` | Inactive/unpublished |
| Restored original nine-node graph | `046871f5-1036-4663-a133-d2c38e7634c4` | Inactive/unpublished; exact nodes/connections/settings/groups |

All six production versions in the original table, nine pre-existing tables/108
rows and other three Stage 1 workflow versions were freshly verified unchanged.
The one owner record retains its original claim/provider ID and adds a safe STOP
audit. Cumulative use: 79/84 executions, 158/500 mutations, 9/11 counted provider
reads, one/one CREATE, 67/67 Google GETs and five/five OAuth token POSTs.

This section's develop commit is a tested diagnostic checkpoint, not production
validation or deployment. Resolve its exact SHA with
`git log -1 --format=%H -- docs/stage2-readonly-recovery-report-20261010.md`.
Local tests: 506 passed. The proposed single-read diagnostic passed eight-node
native validation and remains local, uninstalled and unauthorized. See the
[recovery report and remaining gate](stage2-readonly-recovery-report-20261010.md).
