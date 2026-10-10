# Stage 2 schema diagnostic result, 10 October 2026

**Diagnostic PASS; Stage 2 remains incomplete.** Owner-approved execution **1174**
made exactly one folder read and one owner-row audit update, then stopped as
agreed. No subsequent provider operation or Cloud execution occurred. The draft
created in 1171 and its one-time claim remain preserved.

## Exact result

At `2026-10-10T07:01:29.609Z`, the frozen
`ZOHO_MAIL_FOLDERS_LIST_FOLDERS` tool, version `20260915_00`, returned a
3,073-byte valid response. Its Composio success flag and native numeric status
200 passed; no provider/HTTP error appeared. The durable fixed-field diagnostic
confirmed **`response.data.folders` is an array** and `response.data.data` is
absent. This resolves the envelope mismatch observed in 1173.

The diagnostic is `SCHEMA_OBSERVED`, with `verification_complete=false`.
It does not prove any folder item's identity, draft membership, recipient,
subject, body or current unsent state. No raw folder values or credentials were
retained. The earlier STOP receipt and complete audit prefix remain unchanged;
only one schema-probe field and one audit event were appended. All other owner
columns, provider ID, hashes, claim execution 1171 and null send/follow-up dates
match the pinned record. An independent Data Table read confirmed persistence.

Manual execution retention was disabled. The metadata lookup returned no retained
execution; the durable execution-bound audit and independently reread row are
the result evidence. This is not a retained native execution log.

Staging restoration passed: original nine nodes, connections, settings and groups
match exactly; control version **`18c3a6f5-6ec0-40b8-9ffd-5e14f4e06db3`** is
inactive/unpublished. Installed diagnostic version was
`4fed4785-d122-4fe5-8e16-5178227216b4`. All six production workflow/version objects,
nine pre-existing tables/108 rows/timestamps and other three staging workflows
match their before hashes. Protected/history/provider receipts and Stage 1 state
are unchanged. No Sheets requests, CREATE, sends, deletes, paid tools or deployment.

## Small local correction

`scripts/zoho-owner-draft-validation.js` now reads the observed `folders` member
only in the folder verifier, retaining native `data` compatibility. It rejects
ambiguous dual payloads, non-arrays, wrong-account URIs, duplicate/missing Drafts,
archived/wrong-path folders and unsafe IDs. The shared envelope still requires
bounded successful JSON and exact status 200. Header/content validation remains
strict; no undocumented aliases, content stripping or missing evidence accepted.

A resumed readback uses a new `owner_validation.readback_recovery` entry only
after the exact successful diagnostic/request hash matches the pinned connection.
It cannot erase the old STOP or probe, repeat an existing attempt or reset the
CREATE claim. The existing builder provides three durable CAS/reread checkpoints
and same-execution replay refusal after complete verification.

Two positive/negative synthetic regressions were added in
`tests/zoho-owner-draft-validation.test.js`. **52 relevant and 508 full tests
passed, zero failures/skips.** Prepared readback SDK passed full native validation
at **18 nodes**, plus exact parameter/connection reconstruction. Smaller synthetic
SDK output hints bring it to 298,946 characters without changing runtime code or
raising the 300,000-character validator ceiling. No production source or release
candidate artifact changed. The correction is local, not installed in Cloud.

## Consumption and preserved private evidence

| Resource | Diagnostic use | Current cumulative / ceiling |
|---|---:|---:|
| Cloud executions | 1 / 1 | **80 / 84** |
| Provider reads | 1 / 1 | **10 / 11** |
| Owner-row mutations | 1 / 1 | **159 / 500**; five owner writes of the original six |
| Real CREATE_DRAFT | 0 new | **1 / 1, exhausted** |
| Google GETs / OAuth token POSTs | 0 / 0 new | **67 / 67; 5 / 5** |
| Additional monetary charge | $0 expected within included Hobby allowance | No paid tool or billing upgrade; billing balance not reread |

Private `operator-stage1` evidence: schema diagnostic plan/ledger, exact approved
graph/SDK, before/after hash proofs, original control snapshot, independently read
owner row, passing test log and unexecuted final-readback plan/graph/SDK. No private
snapshots, exports or recovery evidence were deleted or selected for Git.

## Concrete remaining readback scope, not authorized

One manual execution of the existing inactive control; at most three provider
reads and three audited updates to the existing owner record, restoring staging:

1. Fresh folder read; verify exact pinned account URI and one non-archived Drafts.
2. `ZOHO_MAIL_MESSAGES_GET_MESSAGE_HEADERS` for the retained CREATE ID and newly
   verified Drafts ID, `raw=false`; require exact ID, sole owner sender/recipient,
   approved subject and no CC/BCC/resent/received headers.
3. `ZOHO_MAIL_MESSAGES_GET_MESSAGE_CONTENT` for those same IDs, pinned region and
   `include_block_content=false`; require exact ID and byte-exact rendered HTML.

Every read uses frozen version `20260915_00`, existing credential/connection,
30-second HTTP timeout, TLS, no redirects/retries/pagination, 1 MiB post-receipt
bound and no execution retention. Persist and independently reread each safe
outcome before the next read. Stop on the first error, mismatch, unknown schema,
persistence conflict, authentication/cost issue or preservation failure. Previous
successful Stage 1 scenarios are not repeated. Same execution verifies local
selection against the freshly persisted receipt refuses another CREATE; no
provider request on replay. No new table/record, CREATE, send, delete or research.

Required new authorization: one execution **80 to 81**, provider-read ceiling
**11 to 13**, and owner-table write allocation **6 to 8**. If all dispatched:
**81/84 executions, 13/13 reads, 162/500 total mutations**, eight owner writes.
The global execution/mutation ceilings are unchanged. Cost expected $0 within
included ordinary calls. This does not authorize retries or deployment.

Graph SHA-256:
`164bf4501e66e2755bb2b4182c29973190fb7ebb7ccd42787fa085cc523b919d`.
SDK SHA-256:
`3687f6cf5865f7f4921d1e59b3e565a8725b46ea664d8e9f24645c0b482110ab`.
The exact owner row, addresses, provider IDs and content remain pinned privately.
Remaining header/body response schemas have not been proven in Cloud; a differing
shape stops with the durable safe diagnostic rather than manufacturing a pass.

Complete exact readback and native replay remain the release gates. Only after
they pass should the [production release manifest](release-candidate-20261009.md)
be presented for separate final deployment approval.
