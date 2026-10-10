# Restricted release: stopped attempt and grouping amendment

The owner-approved deployment at `1af29d4845470af57ba4b106bd1f3183462dfad8`
stopped before publication. **Deployment FAILED; data-preserving rollback PASS.**
The prior panel remains published at `5c0d43b7-a70a-416e-b922-126657729678`.
No production test, provider operation, Google request or row mutation occurred.
Main and the release tag were not changed.

## Actual failure and correction

n8n removed the original panel group because the new invalid-session branch
enters `Show review panel`, a non-root member of that group. All runtime nodes,
parameters, credentials, settings and connections matched the reviewed candidate;
the visual group membership did not. The exact-hash approval therefore stopped
publication. Earlier node-level validation missed this group topology constraint.

The smallest correction removes only `Show review panel` from the existing
`Review one decision and show the panel` canvas group's membership. The common
response remains connected to both reviewed branches. No node, parameter,
credential, setting, connection, application logic or evidence gate changes.
All other groups retain their IDs, names, descriptions and memberships.

The builder applies this correction only to the restricted panel. The original
six full candidate exports and previous approved panel are retained privately.
Reproduce with `node scripts/build-operator-lifecycle.js --restricted` using the
existing ignored production baseline files. The corrected panel differs from
the original approved panel only in this one group membership.

Corrected panel JSON SHA-256:
`9830fec90fcf1e4ca286b545faffb1338ca216eec43ee9d5ee9afef7fc28032e`.

Corrected panel SDK SHA-256:
`33ef75e128056dca5c28b19012daaa4df03b315904c5e2209c86e2f4d2c4f5d2`.

The other five candidate JSON/SDK hashes remain identical to
[the original manifest](restricted-release-20261010.md). Only this panel hash
supersedes that manifest. The exact development commit is provided in the handoff
and recorded with all six hashes in the ignored private checkpoint.

## Validation

- 13/13 restricted tests passed, no failures/skips. The new regression requires
  exactly one external entry and exit for each panel group. Existing exact SDK
  reconstruction and compiled Cloud decision/render tests still pass.
- Native structural workflow validation accepted all 61 nodes and the corrected
  groups/connections. Code bodies were replaced with schema placeholders solely
  for this structural check, keeping the validation SDK below the connector's
  300,000-character ceiling. One expression-output warning is caused by the
  synthetic output fixture lacking `request.rejected`; the actual compiled
  decision/render regression verifies the signed-request boundary.
- The original 79-test validation and browser evidence are retained. They were
  not broadly rerun; the group change has no browser/runtime effect.
- Fresh post-rollback reads matched all ten table definitions and 109/109 rows,
  including protections, history, synthetic state, owner claim/draft/hash and
  all prior STOP audits. Stage 1 source-integrity evidence remains unchanged.

## Rollback state and required fresh version baselines

The panel and four other engines were restored byte-for-byte in their runtime
nodes, settings, connections and original groups. Restoring code allocates new
draft version IDs; the published panel version did not change. Zoho intentionally
retains the approved three backend barriers and removed provider HTTP transport.
Its original group was restored after n8n's node replacement removed it.

| Component | Workflow ID | Current draft version |
|---|---|---|
| Panel | Sx3zqQF3egg8OGRZ | b260250a-3f2e-4189-afde-f0152bf366bd |
| Draft | Hqm5e1qhO9yadbKz | ddebee7d-889d-4e5e-a77d-95d7ee2c2eaa |
| Review | 8A1NLpsHfLIRVyNB | ee73e6e0-6585-4e25-8717-eb4b99a9dd71 |
| Zoho disabled | 7a5Sp3jrw5ftfEdn | 6a8ef600-0a22-414c-abb9-f88a2da531fe |
| Sync | Z3k7nFGP0uJOXRLO | a1c9443b-5b38-4a8d-8e47-3468950fd0bd |
| Copy | xhfcPgSl1n2eegQH | 8be25a62-457d-40c3-b113-743bb4b36283 |

All five engines remain inactive/unpublished. No engine execution took place.
The four staging workflows remain outside the release scope.
Complete original recovery snapshots, update outcomes, rollback checks and
post-rollback baselines are ignored under
`private/restricted-production-release-20261010/`.

Additional consumption: zero Cloud executions, provider reads, Google GETs,
OAuth exchanges, row mutations, sends, paid research or publication.
Cumulative limits remain 81/84 Cloud executions, 160/500 mutations, 11/13
provider reads, 67 counted Google GETs and 5 OAuth POSTs. Twelve workflow-update
requests applied the candidates, restored a Zoho group, and rolled back the
panel/four engines; these metadata changes are not workflow executions.
The authenticated editor showed 34/1,000 included executions used and survived
reload. No account upgrade, credential change or paid add-on was used.

## Narrow approval needed

Approve this one canvas-group amendment, its corrected development checkpoint
and panel hash, and these fresh version baselines as replacements for the
original panel hash/old version baseline portion of the prior approval.
Everything else in the original release authorization remains bounded:

- Reconcile current versions/rows and included allowance before modification.
  Zoho already matches the disabled candidate; verify it without executing it.
- Apply only the reviewed differences to the four inactive engines and corrected
  panel. Keep all five engines inactive/unpublished; publish only the panel.
- At most two Cloud executions, five read-only Google GETs (67 to 72 ceiling),
  zero row writes, provider calls, new records/tables, sends or paid research.
  Recalculate expected writes before GET and stop unless zero. Test one panel
  GET and one data-free forged-signature rejection; view the same response on
  desktop/375px without extra GETs.
- Reconcile all production/synthetic records and published/runtime versions.
  Promote only the exact approved corrected checkpoint to main and create
  `arc-operator-restricted-2026-10-10` after verification passes.
- On failure, restore workflow code while retaining disabled Zoho. Never restore
  an old Queue or overwrite operator history. No blind retry or budget increase.

This is prepared locally; the amended panel has not been applied or published.
Real Zoho readback and real-phone hardware remain unverified. The new manual
email branch is still locally validated rather than Cloud-executed.
