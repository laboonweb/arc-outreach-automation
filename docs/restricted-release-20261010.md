# Restricted operator release, 10 October 2026

**RESTRICTED RELEASE READY for final owner approval. Not deployed.**
The six candidates extend the signed-off Stage 1 implementation. Automated Zoho
handoff is disabled in the backend and its provider HTTP node is removed from
the restricted engine. Full release remains blocked by Stage 2 folder identity
and independent header/body/unsent readback. The original owner draft is retained.

This document is the current Path B manifest. The older
[full-release manifest](release-candidate-20261009.md) remains historical Path A
evidence and must not be substituted for these artifacts.

## Reproducible artifacts and production version map

From the reviewed develop commit containing this document, run
`node scripts/build-operator-lifecycle.js --restricted`. This uses the ignored,
retained production `*-before.json` files and writes six separate
`private/operator-lifecycle/*-restricted.json` and `*-restricted.sdk.js` files.
It preserves the original six `*-local.json` hashes and Stage 1 evidence.
The exact commit is recorded in the private Git checkpoint and final handoff;
resolve it with `git log -1 --format=%H -- docs/restricted-release-20261010.md`.

| Component | Existing workflow ID | Required old versionId | Restricted JSON SHA-256 |
|---|---|---|---|
| Panel | Sx3zqQF3egg8OGRZ | 5c0d43b7-a70a-416e-b922-126657729678 | `900818c14a9ebb64478cb3abd24dcf5bf4468dbbc205e3b2ead52ff7cfd10779` |
| Draft | Hqm5e1qhO9yadbKz | 4ebb8aae-5b5f-4ead-ad2a-3f3746a9f42f | `22d2c18d8ac8d1c6ec1c4f7cc0a457640d596b59f9e363198ed9a9bb5b78a046` |
| Review | 8A1NLpsHfLIRVyNB | 0b562c61-843a-40ae-aea7-9ad5505ad433 | `0d895067298bd15d8c7c962d11a6388f621fb82e6450f58ab6c264f57c4c700c` |
| Zoho disabled | 7a5Sp3jrw5ftfEdn | 7e3fd0b9-e948-4847-a879-6c3f04422081 | `de8b7b336678f4a014c18ab2a93791f3bc2ddd7801ae2cf4ef8b66992ebacfb8` |
| Sync | Z3k7nFGP0uJOXRLO | ae513ee4-a085-49df-8b37-a40352c82ffa | `da300f7716f9edb81640d5ffa341458dc2a0b1b5e81600e7bbcf08bd7deedd13` |
| Copy | xhfcPgSl1n2eegQH | 141fc4fd-9ee5-409f-a334-28d0f4e3a5aa | `82016ed5c4327288cf4a9a73db3a782464665ce5423b08efe17bdfe43f8f22fe` |

Only the panel is currently published; its active version equals the listed
draft version. All five engines have null activeVersionId and remain inactive.
The local candidates are deliberately inactive exports, not publication receipts.

| Component | Restricted SDK SHA-256 |
|---|---|
| Panel | `08c245f2df942c129cc98937611601c438c007d21161639dac383485958be489` |
| Draft | `1052f7b1e793e93d60cdde0a5f6a9e7c1ab0fe592220a5cceb3d6c49559a6bbf` |
| Review | `df021ff92e45077b11996007c5febc6e586d6e4be7feaa4f4e2ed0a525ee8ae8` |
| Zoho disabled | `7e307ad105fb369c2141a50ec3ae83606d69468a0f307c8a468b1b8473043732` |
| Sync | `e10b70be1c7cb8d6ca91bfa8bbbc8ad71dcc60dd0b253d3bef3ded61c25c90fa` |
| Copy | `c3b34be0de51a5b95d3e2f7a296bac7be64b353db24fa79e9051f8f5c828d792` |

## Exact production diff

Apply reviewed node changes, not a wholesale workflow import. Keep the existing
production signing material, Basic Auth and credential references. No staging
fixtures, test table IDs, owner test graph or OAuth helper enter production.

- Panel: replace nine Code bodies: Decision request; Existing Inbox review
  logic; Refreshed render context; Render operator panel; Plan safe Inbox
  projection; Associate persisted Inbox rows; Prepare held diagnostic index;
  Prepare held exact research; Attach current held diagnostics. Add Signed
  decision valid? and Show invalid review session, with only the reviewed
  invalid-session branch. The decision and render options contain the literal
  `zoho_handoff_disabled:true`; form input cannot override it.
- Draft: Plan truthful drafts and exclusions.
- Review: Validate review actions.
- Zoho: Select one explicitly approved email and Verify persisted exact-content
  claim become unconditional `AUTOMATED_ZOHO_UNAVAILABLE` errors. Composio
  CREATE_DRAFT only becomes a Code node with that same unconditional error;
  remove its HTTP parameters and credential reference, preserve node identity
  and edges, stop on error, and disable retries. Rebuild Record unsent provider
  receipt and Unsent Zoho result; retain the reviewed Persist provider result
  `alwaysOutputData=true` guard.
- Sync: Plan safe Inbox projection; Associate persisted Inbox rows.
- Copy: Compose from verified facts; Finish validated copy.

This is 21 changed existing nodes and two added panel nodes. Other existing
parameters, credential references, settings and connections remain unchanged,
apart from the stated panel branch and disabled transport. The diagnostic helper
for the owner test is local only and is not added to these production graphs.

## What works and how to operate it

1. Use **All records**, **Needs research** or **Needs copy** to find held leads.
   Open a lead and enter your reviewer name. Status filters are views, not
   assignable lifecycle states.
2. Use a blocker's **Record …** button. Enter the actual observation, matching
   business/branch, public source URL and observation/fact dates. Confirm only
   evidence you actually checked. Save & Re-evaluate appends operator evidence
   separately from original Exa/Tavily research. Add identity, dated activity,
   service/opportunity, website findings and a published route as required.
3. Record permission for the exact channel and recipient. Australian public
   email alone is insufficient; existing suppression always wins. A verification
   checkbox without the required evidence cannot clear a blocker.
4. Write the email subject/core body or exact DM. Link factual statements to
   current supporting observations. **Save edit** or **Save & Re-evaluate**
   retains unfinished copy without approving it. Email saves preserve the frozen
   signature and opt-out footer. Missing evidence or unsupported claims still
   prevent approval; the saved failure explains the next correction.
5. **Request review**, inspect the saved message, then **Approve saved copy**.
   Unsaved edits cannot change an approval. Saving an edit revokes approval.
6. For approved email, copy the saved approved recipient, subject and complete
   email into Zoho Mail. Verify your sender, sole recipient and complete content.
   Clipboard denial selects the saved text for ordinary manual copy. For approved
   social copy, open the verified profile and prepare the exact DM manually.
   The restricted system never creates a provider draft or sends anything.
7. Only after actually sending the exact approved message yourself, check
   **I actually sent this message** and **Mark sent**. Email confirmation requires
   current evidence, permission, source, exact approval and suppression checks.
   It appends a manual send receipt and follow-up date without inventing a
   provider ID or ZOHO_DRAFT_CREATED state.
8. Record actual replies in Notes, schedule a UTC follow-up, or dismiss it with a
   reason. Each event appends to contact/audit history. Follow-up sends remain
   manual and require the existing context, permission and actual-send checks.

Existing provider-linked and contacted records retain their original recipient,
copy, claim and receipt. Existing unsent drafts can still be opened in Zoho Mail;
their history is not rewritten. Protected classification correction remains
evidence-gated and cannot remove suppression or contact history.

## Validation and preservation

- **79 targeted tests passed, zero failures/skips.** Command:
  `node --test tests/restricted-release.test.js tests/zoho-folder-checks.test.js tests/operator-lifecycle.test.js tests/operator-persistence.test.js tests/operator-build.test.js tests/phase2-panel.test.js tests/panel-ingress.test.js tests/zoho-owner-draft-validation.test.js`.
  The local persistence test required loopback permission after the initial
  sandbox EACCES; the permitted rerun passed. No application fix was needed for
  that sandbox error. The final 14 restricted/folder tests also passed after the
  clean-checkout snapshot skip guards were added.
- Tests cover invalid evidence, unsupported copy, AU permission, suppression,
  provider/history locks, exact approval, manual confirmation/replay, reply and
  follow-up history, restart persistence, Queue/Inbox/Links consistency, stale
  tokens, forged input, and all three unconditional provider barriers. The actual
  compiled panel render and decision Code nodes execute locally with synthetic
  Sheets responses and the literal restricted options.
- Six SDKs reconstruct exact runtime parameters and edges; all Code bodies
  compile. Native full-workflow validation passed freshly for Review (18 nodes),
  disabled Zoho (16) and Sync (15). Draft and Copy retain identical Stage 1
  validated hashes. Panel SDK is 339,275 characters, above the connector's
  300,000 ceiling: all 61 node configurations passed native structural validation
  in two batches (Code bodies substituted with a schema placeholder there),
  with full Code compilation, exact round-trip and compiled runtime tests local.
- Browser desktop and 375px touch emulation passed: saved approval copying,
  frozen tail, unsaved-editor isolation, denied-clipboard fallback, actual-send
  rejection, per-blocker evidence control, native evidence/working-copy save,
  reload persistence, retained filter, blocked incomplete approval and zero
  horizontal overflow. No console warnings/errors. The native select fill tool
  timed out; filter behavior was checked using its real input event instead.
  Real phone hardware and this new manual-email branch in Cloud were not rerun.
- Fresh read-only MCP reconciliation matched all ten complete workflow payloads,
  table metadata and **109/109 rows**: four production tables (81 rows), four
  Stage 1 tables (26), one owner receipt and one older synthetic record. All six
  production draft/published versions are unchanged; control remains restored
  at `1336d6eb-7145-4ee7-b035-db267b3185a3`, inactive/unpublished. The owner row's
  complete hash matches post-1176, including original CREATE claim, draft ID,
  exact content hash and every stopped audit. No new readback success is claimed.
- Fresh full production workflow snapshots and all ten tables/current rows are
  stored under ignored `private/restricted-release-20261010/`, with fingerprints
  verified against current Cloud reads. Existing snapshots were preserved.
- Stage 1 complete three-book/22-tab source comparison remains PASS, pinned to
  manifest `71507a82177fc262a58e105e09e0023daee1345d085fdbda8a241f6b04810cf1`.
  BEFORE receipt `908bb8a5f1de69722b83089799d0115d95bacb40b9783c297fb07a4d6c289b3c`;
  AFTER `48b686d298e1e283fff726f828205676d956d59a47dce51b6895b6b234a4789f`.
  No source API request or source write occurred in this preparation. These are
  preserved comparisons, not a new live workbook integrity run.

No schema/table migration, new record, source edit, production backfill, paid
research, provider read or draft creation was performed. Operator work remains
in the existing canonical Queue payload; Inbox and Links are projections.

## Resources and remaining limitations

This preparation added **zero Cloud executions, provider calls, Google GETs or
Cloud row mutations**. Native validation and MCP metadata reads do not execute
workflows. Local synthetic browser saves and private recovery copies are local.

| Existing cumulative allocation | Used / ceiling | Unused numerical capacity |
|---|---|---|
| Cloud executions | 81 / 84 | 3 |
| Provider reads | 11 / 13 | 2, still gated by the Stage 2 STOP |
| All synthetic row mutations | 160 / 500 | 340 |
| Owner receipt writes | 6 / 8 | 2, still gated |
| Real CREATE_DRAFT | 1 / 1 | 0 |
| Integrity Google GET slots | 67 / 67 | 0 |
| OAuth token POSTs | 5 / 5 | 0 |

Full release needs verified exact Drafts association, headers/content/unsent
state and real native replay refusal. See the
[local diagnostic and optional bounded request](zoho-folder-diagnostic-20261010.md).
No diagnostic is needed to publish this provider-disabled candidate.

Human evidence, consent and send confirmations are attestations; software cannot
prove their real-world truth. Reviewer names are operator-entered, not individual
account authentication. The existing 100-target/20-row diagnostic bounds remain.
Operator workspace history stops at 1,000 audits or 180,000 serialized characters;
it does not silently purge history. Data Tables are not a transactional send
ledger; use one operator execution at a time. The current numerical storage
ceiling is not exposed by MCP. Release creates no table or record and expects no
row growth; ordinary later operator edits still consume existing table storage.
Panel/Sync retention settings inherit existing account defaults; this release
does not change account retention or credentials. Existing account access policy
therefore continues to govern retained private execution data.

## Exact final approval request and release sequence

Authorize the reviewed develop SHA reported in the handoff, this six-hash
manifest, and the following bounded release only:

1. Reconfirm editor/MCP authentication, available included execution allowance,
   unchanged versions/rows and artifact hashes; preserve a fresh release-time
   recovery baseline. Stop for owner reauthentication or unexplained changes.
   No paid add-on or capacity increase is included.
2. Update the existing disabled Zoho engine first and verify all three barriers
   plus absence of HTTP transport. Update the other four engines while keeping
   all five inactive/unpublished. Apply only the listed node diffs.
3. Update and verify the panel draft, its existing authentication, signing key
   and reviewed edges; publish **only the panel**. No engine execution/activation.
4. Before the single production GET, record exact expected writes from current
   rows. Offline planning on the current 23 Queue records predicts **zero**.
   If refreshed planning differs, stop before GET; this approval does not allow
   projection writes. GET's current branch reaches no Data Table write node.
   The current 22 diagnostic targets are 13 AU and nine Manila: three read-only
   header/ID indexes plus two exact-row reads, **five Google GETs**. Authorize
   these separately from the exhausted integrity allocation (67 to at most 72
   cumulative slots); no OAuth exchange, broad workbook export or retry.
5. Use at most **two additional Cloud executions**: that one authenticated panel
   GET and one forged-signature POST to the data-free rejection branch. Limit
   all row mutations to **zero**, provider calls to zero. View the same loaded
   HTML at desktop/mobile widths without another GET. Make no live lead action.
   Stop on auth/coverage/persistence/preservation failure or unexpected cost.
6. Re-read all production/staging records and version maps. Confirm the approved
   code changes only, all rows unchanged, no provider/send/source activity.
   Map Git SHA, six old/new versions, panel published version and runtime hashes
   in the private release receipt. Only after success, promote the reviewed Git
   checkpoint to main and tag `arc-operator-restricted-2026-10-10`. No automatic
   n8n deployment is configured.

Expected additional cash charge: **$0**, subject to confirming included Cloud
allowance immediately before execution. This scope uses no Composio tool call,
paid research, new storage allocation or paid service. Projected test usage is
83/84 Cloud executions, 160/500 mutations and 11/13 provider reads.

## Rollback and recovery included in the proposed approval

Stop on an unexpected result; do not rerun a command or copy an old table dump.
Before publication, restore only modified workflow code/edges/settings from the
fresh pre-release baseline if readback differs. Leave the disabled provider
transport in place even when reverting the other five graphs. Never restore the
full Zoho HTTP transport under this restricted approval.

If the published panel fails, restore and republish its fresh pre-release graph
while keeping the disabled Zoho engine inactive and inaccessible. If that old
panel exposes a handoff button, the engine remains unable to make a provider
request; stop operator use until corrected. Verify restored runtime bodies and
record newly allocated workflow version IDs. Rollback requires no test execution,
provider call or Data Table write; it never removes newer operator work.

For a later operator persistence error, read the actual Queue row and audit first.
If canonical work persisted but projection failed, preserve it and prepare a
record-specific, bounded projection repair; never replay approval/send or restore
an old Queue over current history. Existing CLAIMED/UNKNOWN_PROVIDER_RESULT and
the owner receipt remain locked for separately authorized reconciliation.

No publication, main promotion, tag, provider operation or production mutation
has occurred under this preparation. Final owner release authorization is still
required.
