# Australian 500-prospect integration plan

Status: read-only inspection and offline compatibility checks complete. This is
a proposal, not a deployed source registration. The application, registry,
workflow versions and Git checkpoint remain unchanged at `82afa23`.

## Verified source and schema

The new workbook is `Arc_Web_Works_Australia_500_ICP_Research_2026-10-11`.
Its three tabs are Summary, 500 Sharp ICPs and Method & Compliance. The primary
header is row 5; 500 business records occupy rows 6–505. It has 55 columns,
500 distinct source place IDs and 500 distinct normalized business names.
The primary table contains 1,000 score/classification formulas. There is no
Arc Research output tab yet.

| Registered source | Primary records | Primary columns | Arc Research records | Output columns |
|---|---:|---:|---:|---:|
| AUSTRALIA | 250 | 53 | 216 | 221 |
| MANILA_LEGACY | 55 | 33 | 55 | 208 |
| MANILA_AUDIT_QUEUE | 384 | 24 | 138 | 221 |
| Proposed AUSTRALIA_500_20261011 | 500 | 55 | 0 | None yet |

The new source shares 48 header names with the existing Australian primary
table. Added names: Phone, Website Status, Target Role, Discovery Query, Audit
Date, Manual DM/Email Research and Compliance Review. It omits Pitch Type,
Failure Verified?, Website, Role and Cold Email Draft. No source-column rename
is necessary for business identity, phone, Maps or supported social candidates.
The existing adapter preserves all 55 source fields in raw source provenance.
Target Role, source scores, hooks, trigger descriptions and gap descriptions
remain source assertions; they do not become verified evidence.

The canonical output has 208 base columns. Cloud research adds 13 established
runtime columns, making 221. Existing outputs keep their current order, extra
columns, formulas, reviewer controls and values. No migration of the three
existing outputs is part of this integration.

## Qualification and duplicate findings

- Cached source classification: 62 A+, 438 A; High confidence is asserted for
  all 500. These labels do not meet the runtime's evidence contract by themselves.
- All 500 say No owned website verified. Maps website-link absence and probes
  of guessed domains do not establish that a business has no owned website.
- All 500 business/decision-maker email fields say Not publicly verified.
  There are zero usable email addresses in those fields. Public phone/Maps
  availability does not establish email permission or DM availability.
- Socials is populated in 88 rows; the current adapter recognizes supported
  Facebook/Instagram/LinkedIn candidates in 77. None is promoted to a verified
  messaging route. Other links remain in the raw source snapshot.
- Trigger Date and Audit Date are empty for every lead. A date in the title or
  gap narrative is retained as source text, not invented as a verified observation.
- Every record has Compliance Review Pending and Send Status Research only.

Duplicate comparison covered 689 existing primary leads, the existing research
outputs and every identifiable business table in the three registered exports:
2,800 existing business/reference rows, including repeated appearances of the
same businesses. It also checked current production queue identities/routes.
Keys included normalized exact business names, country-normalized phones,
place IDs/Maps CIDs, supported social identities and explicit email fields.

No cross-source or production-contact matches were found. One internal pair
shares a phone: source rows 419 and 433. Both require duplicate review; neither
is automatically merged, suppressed, qualified or released from a lock.
Names alone would be review candidates, not proof of identical businesses.

The source's claim about six earlier Australian exports is not independently
confirmed: only the three registered workbooks were available for comparison.
Near-name aliases, renamed businesses and unpublished contact routes can still
produce duplicates later. Existing recipient/contact/suppression checks must
run again when the operator supplies a contact route.

## Smallest proposed implementation

1. Add one distinct registry entry, AUSTRALIA_500_20261011, leaving the first
   three entries unchanged. Primary tab 500 Sharp ICPs, header 5, country
   Australia, Australian compliance enabled, output Arc Research, no colour-based
   outreach status rule and no automatically approved research hosts.
2. Change the registry count guard from exactly three to three or four. Keep
   separate-workbook, required-tab, safe-output and response-association checks;
   also reject duplicate or empty logical dataset IDs. Do not permit arbitrary
   workbook counts or turn aggregate filters into canonical states.
3. After separate Cloud-write approval, create only Arc Research in the new
   workbook. Initialize all 500 as NEEDS_RESEARCH with empty verified evidence
   and copy, pending compliance, and no fabricated research completion timestamp.
   Preserve source claims, row references and original place IDs as provenance.
   Append the existing runtime headers and set the existing durable
   `research_runtime_hold=MANUAL_ONLY_SOURCE_INTAKE` on all 500 records. The
   current parent index/selection/materialization guards already exclude held
   records from provider research. No discovery redesign or paid batch is needed.
4. Add an explicit, capped manual-intake branch to the existing Draft Queue
   planner. Require the reviewed new dataset and a fixed list of selected IDs;
   default it off. Reuse existing metadata, draft identity, queue packing,
   duplicate/contact indexes and native persistence. Insert absent records only,
   retain all protection checks and initialize an audited operator workspace.
   Use NEEDS_RESEARCH / UNREVIEWED / NO_ROUTE with blank subject and body.
   Do not relax the ordinary evidence-qualified draft planner.
5. Recognize this exact dataset as Australia in the shared Inbox market helper.
   Reuse the current operator research, evidence validation, working-copy,
   blocker-resolution and Save & Re-evaluate flows unchanged. New verification
   must come from genuine operator evidence, not source score labels.
6. Rebundle only affected nodes against fresh deployed graphs. Preserve canvas
   groups, cross-group links, signing, credentials and all three Zoho barriers;
   the Zoho HTTP transport stays absent. Grounded Copy and Zoho handoff graphs
   do not need modification. No Phase 2 engine is activated.

Expected canonical file changes after approval: `config/datasets.json` (private,
ignored), `scripts/dataset-intake.js`, `scripts/phase2-copy-drafting.js` and
`scripts/phase2-inbox.js`, plus focused tests and a small reviewed bootstrap
builder for the new workbook only. Existing builders supply the registry and
bundle shared code; regenerate their affected artifacts rather than editing
generated logic by hand. Any graph patch/build artifact containing real IDs,
source rows or credentials remains private and ignored.

## Exact expected workflow reach

| Workflow | Expected change |
|---|---|
| Research parent | Fourth Configure entry; count-guard bundles in Prepare workbook reads, Prepare source grids, Index one workbook, Build eligibility index, Select bounded batch, Prepare selected lead read, Materialize selected lead, Plan Arc Research writes and Confirm imported results. Existing durable hold enforces exclusion; selection logic stays unchanged. |
| Research worker | Refresh the count-guard bundles in Read current output context, Plan immediate upsert and Confirm durable result, because their carried registry can contain four entries even when an old-source lead is processed. Provider logic stays unchanged. |
| Draft Queue | Prepare Arc Research reads and Plan truthful drafts and exclusions: fourth read/decoder association plus explicitly selected manual intake. |
| Review actions | Prepare Arc Research reads and Validate review actions: fourth read/decoder association and refreshed shared market code. |
| Inbox Sync | Refresh market code in Plan safe Inbox projection and Associate persisted Inbox rows. Use the existing five-ID validation allowlist for the first pilot. |
| Outreach Inbox panel | Fourth source in Prepare panel research reads, Existing Inbox review logic, Prepare held diagnostic index, Prepare held exact research and Attach current held diagnostics; refresh the shared market bundle in those nodes and Render operator panel, Plan safe Inbox projection and Associate persisted Inbox rows. |

No existing Google read-node rename is needed merely because its label says
three; the requests are data-driven. No new production Data Table, provider
connection, credential change or automatic trigger is required.

## Bounded first import and persistence

Start with five owner-selected, nonduplicate leads. Expected new production
rows: five Review Queue, five Inbox and five Inbox Links, total 15. Zero existing
row rewrites and zero Protection Ledger changes are allowed in that pilot.
Conditional identity checks/readback must refuse collisions and ambiguous writes.
The intake audit records reviewer, time, source reference/hash and initial state.

All 500 can be registered and preserved in Arc Research, but they cannot all be
materialized into this panel at once: its current diagnostic guard caps held
records at 100. There are 22 held records now. Five new records produce 27;
25 produce 47. Intake must stop at the actual remaining headroom, including
pending additions. Bulk visibility of all 500 would need separately approved
pagination; raising/removing the guard is not part of this plan.

Measured offline sizes:

The XLSX-derived fixtures use local sheet IDs; production source references and
the new output sheet ID must come from fresh native Google metadata. No fixture
sheet ID or fixture-generated source URL is a deployable provenance reference.

- New source grid fixture: 5,258,449 bytes. This is an XLSX-derived fixture,
  not proof of the native Google API response size.
- One all-500 output write body: 4,973,003 bytes; do not send it as one request.
- Twenty sequential 25-row bootstrap batches: maximum 263,882 bytes per body.
  The first creates the tab/header; later batches append absent IDs to that same
  tab. One further batch appends runtime headers and records all durable holds.
- New output values fixture: approximately 3,006,870 bytes.
- Five blank queue records: approximately 15,109 bytes before database overhead;
  25 approximately 75,574 bytes. Operator evidence/history will add storage later.

A concrete approval scope for the first import would be at most four new Cloud
executions: new-workbook bootstrap, fixed-five manual intake, fixed-five Inbox
Sync and one intentional authenticated panel compatibility load. Suggested
Google ceiling is 36 GETs (metadata/source baseline 2, twenty chunk readbacks,
hold readback 1, source preservation read 1, four drafting input reads and eight
panel reads), plus 21 batchUpdate calls targeting only the new Arc Research tab.
The initial Data Table write ceiling is 15 inserted rows. These are proposed new
integration limits, not permission to reuse or exceed the exhausted Stage 1
validation budget. No such execution, Google REST request or write ran here.

After registration, an owner page load currently needs four research-index GETs
plus held exact-row pages. With the five-lead pilot that is eight Google GETs and
one Cloud execution; with 25 new held leads it is nine GETs. Counts can change
with the distribution of held records. Do not reload the panel as an incidental
metadata check. Existing manual operator saves will make their normal audited
table writes only when the owner intentionally uses them.

## Google API and authorization requirements

The Google Sheets API is already in use. No new API, desktop OAuth setup, Drive
scope, Gmail scope, paid research provider or dependency is required.
Browser export access does not prove that the n8n Google credential can read or
write this workbook. Verify that connection with one bounded native metadata
GET as the first approved Cloud gate, before modifying the registry or output.

The existing n8n connection needs read access to the new source and Editor
access to initialize its dedicated Arc Research tab. Use the existing Sheets
permission; the external Desktop read-only grant cannot perform the bootstrap.
Do not broaden credentials or share a workbook publicly. If the connected
account lacks access, request sharing with that exact existing account rather
than extracting its token or creating a new credential.

Keep current response limits/timeouts and fail closed on unexpected size,
schema, incomplete coverage or access errors; actual native payload sizes still
need a bounded measurement. Serialized chunks must stay below 2 MiB. Request
throttling must respect the actual project's and connected user's read/write
quotas, and preflight must verify n8n included executions and Data Table headroom.
Google currently documents 300 requests/project/minute and 60/user/project/minute
for each read/write class and a recommended 2 MB payload. Requests within quota
have no additional Sheets API charge; verify the applicable quota/billing account
before execution rather than assuming a new project's allowance.
[Official Sheets limits](https://developers.google.com/workspace/sheets/api/limits).

## Local validation and preservation receipts

28/28 offline proposal assertions passed: three/four-source registry boundaries,
duplicate ID/workbook rejection, missing source/response failures, immutable
existing identities and rows, sort-stable new IDs, unverified labels remaining
held, no transport invocation, new-tab-only write plans, 221-column decoding,
existing durable research holds excluding all 500 from provider selection,
ordinary drafting refusing all unverified leads, five-ID Inbox isolation,
25-record held-cap compatibility, all-500 refusal, contact/suppression locks,
sequential chunk completeness and unchanged source/production fixtures.

42/42 existing regression tests passed in datasets, Facebook duplicate identity,
parent-batch index, Inbox and panel diagnostics. Total 70 passing checks.
The manual-intake branch and final workflow artifacts are proposed, not yet
implemented or natively validated; their final tests follow local implementation.

Fresh n8n readbacks matched all seven before/after inspected workflow objects
and versions. A separate readback also matched the disabled Zoho graph against
its saved release snapshot. They also matched
the four production tables (81 records) and the existing isolated owner-draft
receipt. Provider IDs, claim and audit history remain unchanged. Existing
synthetic tables were not touched or executed. The new source and old exports
were opened/read only; local export hashes stayed unchanged.

Private evidence: `private/au500-integration-20261011/compatibility-results.json`,
`duplicate-review-private.json`, `preservation-results.json`,
`owner-receipt-preservation.json`, `zoho-preservation.json`,
`read-costs-and-storage.json` and
`existing-tests.tap`. Real workbook exports, identities and production snapshots
stay under the ignored private directory. The copied registry is private too.
No credentials were accessed, exposed or committed. No application edit, commit,
push, Cloud execution, direct Google Sheets REST call, Data Table/source mutation,
provider call, send, workflow activation or deployment occurred in this task.
Four browser XLSX exports and normal Google UI loads were used for inspection;
their underlying Google network request count is not instrumented.

Next: approve this scope, implement the narrow local changes and review their
generated artifact hashes/test results. Production import and publication still
require approval of the final exact manifest and new bounded resource limits.
