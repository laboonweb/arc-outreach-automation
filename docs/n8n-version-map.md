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

The corrected 256-column probe exists only locally. Its SDK passes validation;
no Cloud version represents that correction yet. The development recovery commit
also records 420 passing local tests and unchanged six-candidate hashes. Resolve
its SHA from this file's commit. Production versions above were freshly rechecked
unchanged after the failed probe; this staging version map is not a release.
