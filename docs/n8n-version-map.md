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
