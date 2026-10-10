# Stage 2 read-only recovery, 10 October 2026

Current continuation: the owner-approved single diagnostic **1174** passed and
identified the `folders` payload mapping. Staging/preservation passed; the local
correction and remaining readback scope are in the
[latest diagnostic report](stage2-schema-diagnostic-report-20261010.md).
The sections below preserve the earlier 1173 stop and then-proposed diagnostic.

**INCOMPLETE. Recovery execution 1173 stopped at its first provider read. The
existing draft, original claim and receipt are preserved. Staging is restored;
production release remains blocked.** Stage 1 was not repeated.

The owner authorized one recovery Cloud execution, at most three reads and three
owner-row audit updates, using the existing draft/table/record. The screenshots
and owner statement confirm the draft visually; they remain supplementary to
exact provider-ID, sender, recipient, content and unsent-state API verification.

## Observed results

| Gate | Result |
|---|---|
| Existing CREATE and durable receipt | PASS from 1171: exactly one real draft; claim, approved hashes and provider ID remain unchanged |
| Preconditions | PASS: editor survived reload, included Hobby allowance supported by owner dashboard evidence, no paid service/credential change; 33/1000 displayed executions, ten tables and no quota warning. Numeric storage ceiling was not exposed |
| Recovery graph | PASS: 18 nodes, full native validation, exact installed graph/settings/groups/credential-reference readback; inactive/unpublished |
| First provider read | STOP in **1173**, `ZOHO_MAIL_FOLDERS_LIST_FOLDERS`, version `20260915_00`; exactly one dispatch, no retry |
| Durable failure audit | PASS: one matched update, independent exact table reread; fixed schema flags and `ZOHO_DATA_REQUIRED` retained before stopping |
| Subsequent reads | Not dispatched: exact headers and content remain unverified |
| Duplicate lock | Original claim remains execution 1171; local replay against retained provider state refuses CREATE with zero calls/writes. Native replay was not reached |
| Restoration | PASS: original nine control nodes/connections/settings/groups restored; version `046871f5-1036-4663-a133-d2c38e7634c4`, inactive/unpublished |
| Production preservation | PASS: six complete production workflow/version hashes and all nine pre-existing tables/108 rows/timestamps unchanged; includes four production tables, protected/history/provider receipt state, Stage 1 and earlier synthetic state |
| Other staging workflows | PASS: all three unchanged, inactive/unpublished |
| New CREATE, sends, deletes, research, Sheets requests, deployment | **0** during recovery |

The 3,073-byte response parsed successfully, reported Composio success without an
error, and contained a native status object with **numeric 200**. Its expected
native `data` member was absent. This establishes the failed envelope assumption;
it does not establish the actual alternative payload field or verify a folder.
Do not attribute this stop to string status codes or unsafe integer conversion.
Raw values were intentionally not retained. No undocumented payload alias has
been accepted to turn this result into a pass.

Receipt timestamp: `2026-10-10T05:43:58.716Z`. Folder-read request SHA-256:
`5fd4c324fd66e7b30a19e531a6197574dd8730e32c41d1cdfcd172949487ece0`.
Original message SHA-256 remains
`a00140cc0fc096aaa67b209d50215f79e7c3ff73c51e19ba26b61c2265805c3d`;
CREATE request SHA-256 remains
`a1cc438c04b0648440f6365593107a03df0bfbf52f7f188f8131e7bccb139673`.
Exact account selectors, provider IDs, message and table exports stay private.

## Local changes and verification

- `scripts/zoho-owner-draft-validation.js`: lossless long-integer JSON decoding
  for readback, exact numeric/canonical-string status 200, stage/request guards,
  audited PASS/STOP checkpoints and value-free schema types. Missing evidence,
  malformed JSON, oversized responses and unsafe IDs still stop verification.
- `scripts/build-owner-draft-validation.js`: manual recovery checkpoints reuse
  existing CAS and independent persistence checks. A separate, unexecuted
  eight-node schema diagnostic pins the exact stopped row, makes one folder read,
  appends one safe audit and ends without certifying the draft or continuing.
- `tests/zoho-owner-draft-validation.test.js`: four added synthetic regressions
  cover lossless IDs, exact three-stage recovery, durable failure/stop behavior
  and the single diagnostic's non-replayable, non-certifying boundary.
- Final relevant suite **50 passed**; full suite **506 passed, zero failures or
  skips**. Recovery dispatch source had 505 passing tests. Proposed diagnostic
  SDK: full native validation **PASS, eight nodes**, 271,810 characters.

An initial full-suite rerun was not executed because automatic approval review
temporarily could not complete due to account usage. After that gate recovered,
the ordinary escalation path permitted the full synthetic suite. No review was
bypassed. Final passing logs and earlier evidence are preserved privately.

No production caller imports these owner-test helpers. Frozen CREATE transport,
application logic, research/compliance/protection gates and six release candidate
artifacts are unchanged. Raw response bounds remain 1 MiB **after receipt**;
native HTTP does not provide a demonstrated streaming byte cap.

## Exact consumption

| Resource | Recovery use | Cumulative / ceiling |
|---|---:|---:|
| Cloud executions | 1 / 1, exhausted | **79 / 84** |
| Owner-row mutations | 1 / 3 | **158 / 500** |
| Counted provider reads | 1 / 3 | **9 / 11** |
| Real CREATE_DRAFT | 0 new | **1 / 1, exhausted** |
| New tables / records | 0 / 0 | Existing owner receipt table/record retained |
| Google GET slots / OAuth token POSTs | 0 / 0 new | **67 / 67; 5 / 5** |
| Additional cost | $0 expected within included allowance | No upgrade, paid service or Instant Tool; billing balance was not reread |

The earlier 1172 dispatch count remains uncertain, between one and three; all
three slots remain conservatively charged. Total Stage 2 owner-record writes are
four of the original six: seed, claim, CREATE receipt and this failure audit.
Unused read/mutation capacity does not lift the first-failure stop or authorize
a second recovery execution.

## Prepared next action, not authorized or installed

The remaining uncertainty is the Composio folder payload mapping. The public
toolkit schema does not establish the observed mapped field. The prepared
diagnostic records only types of ten fixed field names, status/type flags,
request hash, byte count and outcome. It retains no folder names, IDs, mailbox
contents or credentials and cannot accept an alternative schema as verification.

Proposed permission: lift the 1173 stop **only for one diagnostic folder read**
and extend the Stage 2 Cloud allocation from 79 to 80 within the global 84.
It consumes one of two unused read slots and one owner-row audit update:
**80/84 executions, 10/11 counted reads, 159/500 mutations**. No new table,
record, CREATE, sending, deletion, retry, source request or paid call. The same
inactive control is restored afterward. Stop after the diagnostic; header/body
reads require a reviewed compatibility correction and separate execution scope.

The exact existing row and connection are pinned privately. The old STOP receipt
and claim cannot be reset. Authentication, HTTP/schema/size failures are audited
then stop; persistence or baseline mismatch stops without another provider call.
Graph SHA-256:
`43fed4bba8101f9c546d8af48648c2d2f7e125ae698e0bbf9254f2b307417a01`.
SDK SHA-256:
`72b6e4506dc6d74aa094b51c1ee9d09b53e5d3052f28566e59aad447ca72f166`.

Private evidence in `private/operator-stage1/`: recovery ledger, before/after
preservation receipts, original control snapshot, stopped owner row, executed
recovery graph/SDK, final test logs, and unexecuted schema diagnostic plan/graph/SDK.
No snapshots or recovery records were deleted.

Exact independent unsent/content verification and native replay remain open.
The [release manifest](release-candidate-20261009.md) is preserved, but final
production deployment approval is not requested until those gates pass.
