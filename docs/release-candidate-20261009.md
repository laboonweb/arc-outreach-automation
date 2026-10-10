# Production release candidate, 9 October 2026

**Prepared for review only. Not authorized for deployment.** Stage 1 passed on
10 October; Stage 2 and final production approval remain pending. Validated
implementation source: `91b9539cf5057563839757c91abf76ecac231067`. Documentation
checkpoint is resolvable with `git log -1 --format=%H -- docs/release-candidate-20261009.md`. Exact commit and
source/export digests are recorded in the private checkpoint receipt. Main stays
at `b187df8d9ad5a7b88aaff2f8e575e84ffdb5cc84`; Git never deploys n8n.

The [latest Stage 2 result](stage2-readonly-recovery-report-20261010.md) confirms one owner
draft and durable receipt in 1171; strict independent readback stopped in 1172
and the first recovery read stopped in 1173. Production preservation passed.
No CREATE retry or deployment is authorized. Exact independent unsent/content
verification and native replay remain the only unfinished Stage 2 tests.

## Exact artifacts and expected production baselines

| Component | Workflow ID | Required unchanged old versionId | Candidate JSON SHA-256 |
|---|---|---|---|
| panel | Sx3zqQF3egg8OGRZ | 5c0d43b7-a70a-416e-b922-126657729678 | `6c1e1222fd078faa1feb250f0ee68564aedafea98e828829f248a7e573d5047a` |
| draft | Hqm5e1qhO9yadbKz | 4ebb8aae-5b5f-4ead-ad2a-3f3746a9f42f | `22d2c18d8ac8d1c6ec1c4f7cc0a457640d596b59f9e363198ed9a9bb5b78a046` |
| review | 8A1NLpsHfLIRVyNB | 0b562c61-843a-40ae-aea7-9ad5505ad433 | `ce42d08cc9e584f0b013ebd38c7274dc9dbbf52284f8e08ac9b6df8834447160` |
| zoho | 7a5Sp3jrw5ftfEdn | 7e3fd0b9-e948-4847-a879-6c3f04422081 | `181ce5d84dcc586bcdc60eeb23a78668a1003f2e81827fa33d2784cbb222f034` |
| sync | Z3k7nFGP0uJOXRLO | ae513ee4-a085-49df-8b37-a40352c82ffa | `9759fd0f54caa7858b0dafb1a825ea7afa6e4f456c2a60b9bf500a7d096001ac` |
| copy | xhfcPgSl1n2eegQH | 141fc4fd-9ee5-409f-a334-28d0f4e3a5aa | `82016ed5c4327288cf4a9a73db3a782464665ce5423b08efe17bdfe43f8f22fe` |

Candidates are the six ignored `private/operator-lifecycle/*-local.json`
exports, rebuilt from the original retained `*-before.json` production baselines.
Candidate SDKs reconstruct the exact runtime bodies. The five engine SDKs pass
full native validation; panel exceeds 300,000 characters and uses local exact
round-trip/runtime compilation plus native structural node checks.
Production versions were freshly rechecked unchanged during Stage 1.

## Permitted release diff

- Panel: nine audited Code nodes; add Signed decision valid? and Show invalid
  review session, with the existing builder's invalid-session branch.
- Draft Queue: Plan truthful drafts and exclusions.
- Review Actions: Validate review actions.
- Zoho Handoff: Select one explicitly approved email; Verify persisted
  exact-content claim; Record unsent provider receipt; Unsent Zoho result;
  set Persist provider result.alwaysOutputData=true.
- Inbox Sync: Plan safe Inbox projection; Associate persisted Inbox rows.
- Grounded Copy: Compose from verified facts; Finish validated copy.

All other existing node parameters, credentials, connections and settings are
preserved, apart from the panel's stated two-node branch and provider write guard.
Apply reviewed node diffs, not wholesale replacement/import of a workflow.
Do not copy staging signing material, synthetic fixtures, mock provider nodes,
test table IDs or the external integrity probe into production.

No table/schema/source-sheet migration is required. Operator evidence, working
copy, verification, exact approval and append-only history reside in the existing
Review Queue payload. Inbox/links remain derived projections. No backfill,
bulk lead correction, research rerun or existing protection reset is included.

## Gates and release sequence

1. Complete matching BEFORE/AFTER integrity receipts for all three books and
   22 tabs; retain every stopped receipt. PASS: see the
   [final Stage 1 report](stage1-final-report-20261010.md).
2. [Separate Stage 2 approval](stage2-owner-zoho-plan-20261010.md): one real unsent draft to the verified owner's own
   mailbox, exact approved neutral copy, provider account/sender/recipient
   isolation, cost/capacity verification, durable claim, confirmed provider
   readback and duplicate refusal. No send and no existing provider-record edit.
   Stage 1's eight identities/budgets do not authorize another real test identity.
3. Review the validated develop commit and approve the exact production diff.
   Merge a reviewed checkpoint to main and tag only after declared gates pass;
   the tag and push themselves do not activate n8n.
4. Immediately before a separately approved release, re-read all six workflow
   versions and all four tables. Stop on changed versions or unexplained state.
   Preserve fresh full recovery snapshots and their hashes privately.
5. Update the five engines while they remain inactive/manual; verify exact
   approved node changes against readback. Update the panel draft, validate and
   publish only the panel after explicit final approval.
6. Run only a separately agreed post-release check. A production GET can project
   Inbox state, so do not call it under a read-only authorization. Record bounded
   expected writes before the smoke check; do not replay all Stage 1 scenarios.
7. Record commit, previous/new draft and published version IDs, candidate and
   readback hashes, test evidence and owner approval in the version map/private
   release receipt. Confirm all five engines inactive and zero outgoing messages.

Stage 2's bounded recovery allocation is exhausted; further Cloud execution
requires a separately reviewed scope. Steps 3-7 remain unauthorized.

## Rollback and recovery

Before any future release, retain a fresh production snapshot in addition to the
original baseline. Never delete snapshots or restore an old table dump over new
operator work, approvals, provider receipts or contact history.

If workflow update/readback fails, stop before publication. Restore only the
changed node bodies/settings and panel branch from the exact pre-release
workflow baseline. Re-read graph/settings/version and record rollback version
IDs; restored versions receive new IDs. Keep all five engines inactive. If a
published panel must be rolled back, restore and publish its original approved
graph only under the separately authorized rollback scope.

If canonical persistence fails, stop the command. Inspect the actual queue row
and audit event via read-only retrieval; do not assume no write or replay the
whole request. If the queue change persisted but Inbox/link projection failed,
run only the bounded projection repair after reviewing exact expected writes.
Stage 1 verified this path without repeating approval or erasing history.

If a provider call or its receipt is ambiguous, preserve CLAIMED or
UNKNOWN_PROVIDER_RESULT. Do not reset the claim, blindly create another draft or
mark SENT. A failed receipt write must throw PROVIDER_RECEIPT_WRITE_CONFLICT_STOP.
Use separately authorized read-only provider reconciliation of the exact account,
recipient, approved hash and attempt. Persist a confirmed receipt only through
an audited correction; never fabricate a draft ID or overwrite earlier history.

A rollback changes application workflow code, not protection truth. A data
recovery requires its own record-specific reviewed plan. Source workbooks and
Arc Research are read-only throughout this release scope.

See [test results, budgets and remaining limits](stage1-critical-validation-20261009.md).

