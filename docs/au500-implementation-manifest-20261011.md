# Australia 500 integration: local implementation ready

The fourth source is implemented locally. Deployment, Google requests, source
writes, Data Table inserts and main promotion remain unapproved. This manifest
supersedes the estimates in the approved integration plan, not its safeguards.

## Reviewed changes

- `scripts/dataset-intake.js`: support exactly three or four separate registered
  workbooks; reject empty/duplicate logical IDs. Original three entries unchanged.
- `scripts/phase2-inbox.js`: recognize the exact fourth dataset as Australia.
- `scripts/phase2-copy-drafting.js`: optional explicit manual intake; the normal
  evidence-qualified drafting path remains unchanged.
- `scripts/au500-bootstrap.js`: new-tab-only, literal-value initialization using
  the existing 208 research headers plus 13 runtime headers. Independent readback
  precedes each next batch. All 500 holds are included in their first row write.
- `scripts/au500-manual-intake.js`: default-off, fixed-five selection; current
  cross-source duplicate checks, protections, audited NO_ROUTE placeholders,
  independent Queue verification and insert-only Inbox projection checks.
- `scripts/build-au500-integration.js`: preserve deployed graphs while replacing
  affected factories/registries; generate exact artifacts, granular node operations,
  temporary pilot controls, recovery operations and graph/file/SDK hashes locally.
- `tests/datasets.test.js`, `tests/parent-batch-index.test.js`: use synthetic
  three-source example configuration independently of private runtime configuration.
- `tests/au500-integration.test.js`, `tests/au500-build.test.js`,
  `tests/au500-private-fixtures.test.js`: boundary, preservation and generated-runtime
  outcome tests. Private fixture tests skip when saved inspection data is absent.
- `config/datasets.json` is private/ignored: add AUSTRALIA_500_20261011, Australia,
  ACMA enabled, primary `500 Sharp ICPs`, header 5, output `Arc Research`.

The approved plan and this manifest are versioned. Real source IDs, account
configuration, signing material, workflow exports and snapshots stay private.

## Exact workflow baselines and final candidate file hashes

These versions were read back during local preparation. Refresh them again before
deployment. A differing graph, version, activation state or preservation receipt
is a stop requiring reconciliation, not permission to rebase blindly.

| Workflow | Required baseline version | Candidate JSON file SHA256 |
|---|---|---|
| Research parent | a236b5a1-3a2f-4a1e-bcb7-6a207d577f5e | eae31d5dac511404e4aa4cb7bd000f17eea1bb3912a53457ea3121c2c3241d1e |
| Research worker | 5405f8b1-097f-4d87-9f43-844cf58eff08 | ef0f830e716abcebe05049c7b518cc550e652e6c70e1ba92187da0a529c4de1f |
| Draft Queue | 861aa8bd-1e5d-45b0-85db-2bb298694051 | e4678f6d628b4f89668ffe099f5c238aaa811e86208445cd9e553ccbdcce620b |
| Review actions | feca69c4-3758-487e-a78c-7a203b7757f0 | 8db5c39f9da502bd6a43d52b468d41b0678ce4947b45113f0bc6c0eecf5960ca |
| Inbox Sync | 2fc644ff-4638-4247-b67a-6a63e0311b2f | 374bffc3aeea641eeaf86cb72dd1ff8b029736d673f1953a239e2fe28740cebc |
| Outreach Inbox | f3a1e008-a761-4aaa-8a48-00072921a718 | 325bad52a4ffed6d44ceba21800e52cef1a656b7fba7ef3be78226542859f799 |

Unchanged Grounded Copy version: 5f46e1e8-d69c-478f-858b-5e5a9a6d01fa.
Unchanged Zoho version: 6a8ef600-0a22-414c-abb9-f88a2da531fe.
Temporary existing staging control baseline: 1336d6eb-7145-4ee7-b035-db267b3185a3.
Bootstrap candidate file SHA256:
`a841c398344ab9cadb8ee6a0c9f8afe420e48b6c7c573aad8507c4d9beedc0b3`.

Exact private `deployment-operations.json` SHA256:
`b311fb8969815e7b8c25e6c6865a0d04652755769fde0d40576003255e102340`.
It includes baseline-to-candidate, candidate-to-pilot, pilot restoration,
six-workflow rollback and staging restoration operations. Each carries required
and resulting normalized graph hashes. Hashing ignores explicit platform default
flags and object key ordering, while retaining identities, credentials, runtime
strings, parameters, positions, connections, groups and workflow settings.
`private/au500-implementation-20261011/manifest.json` also pins full SDK hashes and
both exact pilot artifacts. Nothing under that directory is committed.

## Node-level differences

Research parent, parameter-only changes:
Configure; Prepare workbook reads; Prepare source grids; Index one workbook;
Build eligibility index; Select bounded batch; Prepare selected lead read;
Materialize selected lead; Plan Arc Research writes; Confirm imported results.
Expected combined primary count becomes 1,189. Existing hold-selection safeguards
and provider logic are unchanged.

Research worker, parameter-only changes:
Read current output context; Plan immediate upsert; Confirm durable result.

Draft Queue, parameter changes:
Prepare Arc Research reads; Plan truthful drafts and exclusions; Batch controls.
Add Explicit manual intake? and seven nodes: Prepare current duplicate references,
Read current duplicate references, Plan fixed five manual intake, Emit missing
manual records, Insert missing manual records, Read persisted manual records,
Confirm manual intake durability. The true branch ends after durable verification;
it cannot reach Grounded Copy or automatic Inbox refresh. Its seven persistence
nodes form one new group; original groups/members remain unchanged.

Review actions: Prepare Arc Research reads; Validate review actions.
Inbox Sync: Plan safe Inbox projection; Associate persisted Inbox rows.
Panel: Prepare panel research reads; Existing Inbox review logic; Render operator
panel; Plan safe Inbox projection; Associate persisted Inbox rows; Prepare held
diagnostic index; Prepare held exact research; Attach current held diagnostics.

Only Draft connections gain the explicit branch. Other six-candidate connections,
existing node IDs/positions, credentials, signing and groups remain unchanged.
Temporary Sync controls restrict writes to the five selected identities, replace
the two upserts with inserts and require exact link receipts. Restore those pilot
controls/writers before normal operator use. Default node behavior stops on error
and does not retry. No Zoho or Grounded Copy node changes are proposed.

## Exact targets and bounded deployment sequence

The reviewed private envelope contains five source IDs at rows 6, 56, 106, 156 and
206. Rows 419/433 remain excluded for their unresolved shared phone. All five IDs
are provided to the owner with the implementation result; no prospect data enters
Git. Dynamic duplicate checks must still pass before intake.

1. Freeze source/research writing and operator/Queue/Inbox mutations. Verify native
   n8n access, included capacity, original graphs/publications and all ten tables.
   Preserve fresh recovery snapshots. Check both registry and artifact hashes.
2. Temporarily use the existing inactive staging control for bootstrap, with raw
   workbook execution retention disabled. Its first metadata GET checks access,
   all three exact source tabs and absence of Arc Research, before any write.
   The next compact source GET is checked against the 8 MiB post-receipt cap before
   JSON parsing. Validate 55 headers, 500 contiguous source records, original IDs,
   no outreach history and complete source coverage before creating anything.
3. Create only the absent `Arc Research` in the new fourth workbook. Allocate the
   new native sheet ID from current metadata; never use offline fixture IDs.
   First batch creates a 501-row by 221-column sheet and writes A1:HM1. Twenty
   sequential batches write A2:HM501, 25 leads at a time, with independent exact
   readback of every header/chunk before advancing. All writes are literal
   userEnteredValue cells on that new sheet only. No source formatting requests.
   Finish by comparing the three source-tab hashes, then restore staging exactly.
4. Apply the six candidates against their pinned baselines. Republish the already
   active manual/callable research parent and worker compatibility versions and
   the panel, preserving their existing triggers/activation states. This does not
   execute research. Draft, Grounded Copy, Review, Sync and Zoho stay inactive.
   Zoho's three fail-closed backend barriers and absent HTTP transport remain.
5. Temporarily apply the exact five-ID Draft pilot. Four Arc Research reads plus
   three current duplicate-reference reads precede five absent Queue inserts.
   References cover all 13 relevant business/reference tabs in the existing three
   workbooks, plus their current research rows. Verify full Queue independently.
   Restore manual intake to off after this single run.
6. Run the exact five-ID Sync pilot once: five Inbox inserts, then five Links
   inserts. Independently read all tables to verify content/association and that
   the original 109 rows are byte-for-byte unchanged. Restore normal Sync controls.
7. Before the single intentional panel visit, locally preview projection against
   fresh table readbacks; require zero existing-row changes and no pending actions.
   Verify candidate metadata/groups/publications. Run one authenticated panel GET,
   inspect the response without reloading, then reconcile all tables/workflows.
   Success is 124 total records: the original 109 plus exactly 15 approved inserts.

No parent research run, copy engine run, review save, provider operation or main
promotion is included in these four executions. Do not incidentally load/reload
the live panel. Metadata/table readbacks do not execute n8n workflows.

## Corrected maximum resource budget

| Step | Cloud executions | Google GETs | New-output batchUpdate calls | New table rows |
|---|---:|---:|---:|---:|
| Bootstrap: metadata + source before/after + 21 independent readbacks | 1 | 24 | 21 | 0 |
| Five-ID Draft intake: four outputs + three duplicate-reference requests | 1 | 7 | 0 | 5 |
| Five-ID Inbox/Links projection | 1 | 0 | 0 | 10 |
| One intentional panel load: four indexes + at most four exact pages | 1 | 8 | 0 | 0 |
| **Maximum** | **4** | **39** | **21** | **15** |

Zero existing-row rewrites, protection-ledger writes, existing workbook/output
writes, provider calls, paid research calls, sends or automatic engine activation.
This is a separate proposed integration allowance, not reuse of Stage 1 budgets.
Any failure consumes its attempted slot; no retry or automatic budget expansion.

The extra three GETs replace stale-export-only duplicate decisions. Holds are
written atomically with each row, so no separate hold-writing pass is needed.
The Sheets API/credential already exists; no new API, credential, Drive scope or
external OAuth flow is required. The connected account needs Editor access to the
new workbook and read access to the existing three; sharing must be verified with
that exact account. Do not retrieve its token or broaden scopes.

Preflight must establish at least four included n8n executions, current read/write
quotas for the existing connection, no unaccounted costs, and sufficient Data Table
headroom. The pilot fixture adds roughly 54 KiB before database overhead; require
at least 256 KiB measured free space as a pilot reserve, plus normal operational
growth capacity. This reserve is not a bound on future operator evidence/history.
Throttle requests to the verified actual per-user/project quotas. Do not assume
that the separately configured integrity OAuth project's quota is this credential's.

Local measurements: complete native-shaped source fixture 5,275,043 bytes; new
output values response 3,030,962 bytes; largest write 363,412 bytes; three duplicate
reference responses 1,466,411 / 786,361 / 711,890 bytes. Five Queue records total
48,019 bytes; five Inbox fixtures 2,094 bytes; Links 3,234 bytes. Production native
sizes and storage overhead remain preflight gates. Google source/reference caps
are 8 MiB after receipt, before parse; write bodies are capped at 2 MiB. Native
HTTP cannot provide a verified streaming byte cap. Keep source range/field bounds
and stop rather than increasing limits if the actual response exceeds them.

## Validation and preservation

140 focused local tests passed, zero failures/skips. Coverage includes three/four
source compatibility, all 500 unverified rows, 221-column bounded persistence,
durable holds including targeted retry, wrong identities/truncation/oversize,
fixed-five IDs, source/contact/suppression duplicates, AU compliance, protection
and provider barriers, held capacity, operator persistence and existing copy gates.

Nine candidate/pilot/bootstrap graphs passed native structural SDK validation.
All 55 final changed/pilot/bootstrap node configurations passed exact native
parameter validation (reusing matching prior receipts and validating eight final
variants). The full SDK transport reconstructs byte-identical runtime code; some
full artifacts exceed the validator's 300,000-character SDK limit. Structural
sidecars replace Code bodies with hash markers solely for graph validation and
are never deployable. Exact Code-node parameter checks and local execution of
generated pilot nodes complement structural validation. Frozen-path expression
warnings come from synthetic output declarations; they are retained in receipts,
not misclassified as Cloud execution evidence.

The private-fixture test executed the actual generated intake, persistence,
projection and link-result Code nodes against saved source/research/table data.
It verified 909 current research rows, current duplicate references, five new
records, rerun refusal, 27 held diagnostics, zero existing projection writes and
unchanged fixture records. Granular operation tests reconstruct and restore every
candidate/pilot/staging graph locally. All four original XLSX hashes match saved
inspection receipts. Fresh table readbacks matched all ten tables/all 109 records,
including protections, synthetic data and the owner-only Zoho claim/receipt.
The original three private registry entries are unchanged.

Private receipts and artifacts are under `private/au500-implementation-20261011/`:
manifest.json, deployment-operations.json, native-validation-receipts.json,
final-focused-tests.tap, offline-runtime-results.json, fresh-table-preservation.json,
export-preservation.json and before/candidate/pilot workflow files. Actual workflow
metadata readbacks are current; source exports are saved inspection evidence,
not newly fetched Google data. No Cloud execution, Google request/write, table
mutation, provider call, activation or publication occurred during implementation.

## Stops and data-preserving recovery

Stop immediately on authentication/capacity/cost failure, changed source schema,
missing coverage, unexpected duplicate/protection, mismatched workflow version,
oversized payload, ambiguous persistence or a changed original record. Preserve
failed receipts and do not repeat partially successful batches or insert calls.

Native Data Tables have no atomic unique constraint for these inserts. Hold an
exclusive intake/projection window, keep engines inactive, and pause operator
saves throughout the pilot. A partial/ambiguous result must be reconciled by exact
keys and native row readback; this approval would not authorize a retry.

Restore temporary pilot controls/staging first, then the six saved workflow graphs
and their previous publication states if recovery is necessary. Use fresh recovery
versions and verify graph/groups/signing/credential hashes. Do not delete or reset
the new Arc Research sheet, inserted records, audit history or recovery evidence.
Leave written leads held; restore the previous three-source registry if integration
is stopped. Partial new output/rows require a separately reviewed completion or
reconciliation plan. Existing source/output data never needs restoration because
the proposed write targets cannot reach it.

## Remaining limitations

Live credential access, native response sizes, actual quota/cost/headroom and the
four integration executions have not been validated. Source preservation hashes
cover values/formulas/hyperlinks/colors and selected sheet metadata; full font and
all formatting attributes are not rehashed. No write targets any source cell or
format. The 100-held-record panel cap remains; this implementation deliberately
exposes only the five selected new records, with 500 held in research. Near-name
aliases and future contact changes still require operator duplicate review.
