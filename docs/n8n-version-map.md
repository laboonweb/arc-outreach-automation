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
