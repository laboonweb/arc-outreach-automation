# Stage 2 owner draft result, 10 October 2026

**INCOMPLETE. One approved draft was created and its receipt persisted. Strict
independent readback stopped; no retry or deployment is authorized.**

The owner explicitly approved one draft-only call, one isolated table/record,
three Cloud executions, six matched mutations and three bounded provider reads.
The earlier five-read account preflight remains passed in execution 1170.
Stage 1 is preserved and was not rerun.

## Results

| Gate | Result / evidence |
|---|---|
| Owner connection and content | PASS: pinned account/sender/recipient from 1170; reviewed content and frozen request hashes unchanged |
| Cost and capacity | PASS: Hobby included calls, additional permitted cost $0; editor survived reload; 33/1000 displayed account executions, nine tables about 0.82 MB without quota warning. Numeric instance storage limit was not exposed |
| Local validation | 501 full tests passed before dispatch; 45 relevant checks and 26 native node configs passed. Diagnostic-only changes pass 46 relevant checks; final full suite: 502 passed, zero failures/skips |
| Isolated durable seed | PASS: new table and exactly one owner administrative test record; all fields reread equal to the approved seed |
| Durable one-time claim | PASS: conditional APPROVED-to-CLAIMED update, independent Data Table reread, exact approval/connection/hash and execution-bound five-minute claim before HTTP |
| Single frozen CREATE_DRAFT | PASS: execution **1171**, success; exact tool/version `20260915_00`, draft mode, UTF-8 HTML, no receipts, attachments, CC or BCC; one returned string draft ID |
| Receipt persistence | PASS: frozen normalization and shared `persistedReceipt` guard; independent table reread confirms ZOHO_DRAFT_CREATED, exact ID/content association, no sent/follow-up timestamp |
| Independent live readback | **STOP: execution 1172**, `ZOHO_READ_SCHEMA_REQUIRED [line 43]`; expected native envelope was not established. No successful independent folder/header/body certification |
| Duplicate prevention | PASS locally against the actual retained receipt: selection refuses another CREATE with zero provider calls/writes. Third native replay execution was not run after the mandatory stop |
| Staging restoration | PASS: original nine nodes, connections, settings and groups restored exactly; inactive/unpublished; restored version `649ae1a3-0461-4bb0-a373-5c9b344cddc2` |
| Production preservation | PASS: six complete workflow/version hashes and all nine pre-existing table metadata/content hashes unchanged, including all 108 rows and timestamps |
| Other Stage 1 workflows | PASS: three untouched staging versions remain unchanged and inactive/unpublished |
| Sends/deletes/retries/source changes | 0; no further provider call or Cloud execution after 1172; real draft and owner receipt preserved |

Exact account selectors, mailbox addresses, draft ID, message, raw private
envelope and durable row are excluded from Git. The neutral approved message hash
is `a00140cc0fc096aaa67b209d50215f79e7c3ff73c51e19ba26b61c2265805c3d`;
frozen request hash is
`a1cc438c04b0648440f6365593107a03df0bfbf52f7f188f8131e7bccb139673`.
No changes were made to the production transport, validators, qualification,
compliance, protections or candidate workflows.

The test is an owner-requested administrative transport check, not a researched
prospect. It never fabricates business evidence or enters a production lead table.

## Changed files

- `scripts/zoho-owner-draft-validation.js`: isolated owner-record checks reuse
  the frozen claim, transport, receipt and persistence helpers. Readback rejects
  incomplete evidence; local diagnostics expose only bounded schema/type flags.
- `scripts/build-owner-draft-validation.js`: builds the temporary manual create,
  readback and replay graphs. No production caller imports these test helpers.
- `tests/zoho-owner-draft-validation.test.js`: 12 synthetic regressions cover
  durable claims, wrong accounts, changed approval, ambiguity, exact headers/body,
  size limits, persistence, replay refusal and generated Cloud Code execution.
- This report, the Stage 2 plan and release manifest record the result and stop.
  Private provider receipts, account selectors and execution artifacts stay local.

## Readback issue and retained uncertainty

Public Zoho documentation shows recipient headers are omitted by default from
email lists; the frozen Composio list tool exposes no include-To option. Within
the approved three-read ceiling, the preparation used an exact-ID header read
instead of listing other drafts: folders, exact draft headers with `raw=false`,
then exact message content. This narrows mailbox exposure and leaves the CREATE
request unchanged. Public schemas were reviewed at the frozen tool version.

The response guard requires a parsed native Zoho object, numeric status 200 and
a data member before validating folder, exact headers or byte-exact rendered
body. Execution 1172 did not satisfy that combined envelope condition. This does
not establish which field, read stage or provider transformation differed.
Do not infer a successful folder check, current unsent state, exact readback
recipient, subject or body from a submitted request or successful CREATE alone.

Execution retention was intentionally disabled. A read-only execution metadata
lookup confirmed 1172 is not retained. No raw response is available to diagnose,
and the precise per-stage provider call count cannot be recovered. Charge all
three read slots conservatively; actual dispatch was between one and three.
This uncertainty is a release blocker, not a pass or permission to retry.

The local guard now distinguishes object/status/type/success/data failures and
has a fixed, value-free schema projection. It still rejects every previously
invalid response; it does not accept a new provider envelope or relax checks.
This local diagnostic change has not been installed or executed in Cloud.

Two management-reference calls failed before provider dispatch; staging was
restored and then exact configuration/connection checks passed before 1171.
No provider request had occurred during that pause. The initial sandbox full
test run hit denied loopback/temp-file operations; its log is preserved. The
permitted synthetic-only run passed 501 checks with zero failures/skips.

## Accounting

| Resource | This authorized test | Cumulative / ceiling |
|---|---:|---:|
| Cloud executions | 2 / 3 | 78 / 84 |
| Matched row mutations | 3 / 6: seed, claim, receipt | 157 / 500 |
| New isolated table / record | 1 / 1 each | Existing nine tables and Stage 1 eight identities preserved |
| CREATE_DRAFT | **1 / 1, exhausted** | One owner-only draft; never repeat |
| Provider readback slots | 3 / 3 conservatively counted | Five preflight reads + three readback slots = 8; actual readback dispatch 1-3 |
| Google GET slots / OAuth POSTs | 0 / 0 new | 67 / 67 and 5 / 5 |
| Additional monetary charge | $0 expected within included Hobby allowance | No upgrade, paid service or Instant Tool; final billing balance not reread |

Unused execution/mutation capacity does not authorize provider retries after
the response stop. One-time claim, provider ID and audit chain remain durable.
The new receipt table and provider draft are retained, not deleted as cleanup.

Private receipts under `private/operator-stage1/`:

- `stage2-owner-draft-ledger-20261010.json`: authorization, bounds, pauses,
  consumption, execution receipts, stop and restoration.
- `stage2-owner-draft-created-row-20261010.json` and
  `stage2-owner-draft-readback-row-20261010.json`: matching persisted provider
  receipt, exact claim/execution, approved hash and audit trail; no tokens.
- `stage2-owner-draft-preservation-before-20261010.json` and
  `stage2-owner-draft-preservation-after-20261010.json`: complete content and
  workflow hash/count proof, without lead values.
- `stage2-owner-draft-local-replay-20261010.json`: refusal using the actual row.
- Failed sandbox, passing permitted and final local test logs remain private.

## Shortest remaining path

Do not create another draft or rerun Stage 1. A separately approved recovery can
reuse this exact draft ID, the same table/record and inactive staging control.
Propose at most **one remaining Cloud execution, three read-only provider calls
and three owner-row audit updates**, staying within the existing 79-execution /
six-new-mutation allocation. It needs **new authorization for up to three read
slots (8 to 11 cumulative) and lifting the unexpected-response stop**.

Each read must durably record its tool, stage, exact request/ID hash, counted
dispatch, fixed schema/type flags, and verification outcome before the next
read. Failure records its safe check name and stops immediately. No mailbox
headers/body, other draft metadata or credentials enter the diagnostic receipt.
No new table, identity, CREATE, send, delete, paid call or production change.
This recovery is a concrete proposal; its Cloud graph is not yet installed.
If all three checks pass, that same remaining execution must verify replay
refusal against the freshly persisted receipt without another HTTP/provider call.
There is no fourth execution in the proposal.

Actual provider-shape differences must be understood before a compatibility
correction. Do not simply make status/data optional, coerce unsafe IDs, strip
arbitrary HTML or accept missing sender/recipient/folder/body evidence.

Independent exact unsent verification and the native replay proof remain
unfinished. Final production approval is not requested while those gates remain
open. The [existing release manifest](release-candidate-20261009.md) and its
six candidate hashes, reviewed node diffs and rollback procedure remain intact.
