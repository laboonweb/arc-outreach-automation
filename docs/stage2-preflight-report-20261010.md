# Stage 2 preflight, 10 October 2026

**PASS for account identity, sender, owner recipient and bounded allowance/capacity
prerequisites. Execution 1170 completed the fifth separately approved read.
No real draft, receipt table, provider write, deployment or send.**

Stage 1 remains signed off. No passing scenario or source-integrity request was
repeated. Application implementation remains `91b9539cf5057563839757c91abf76ecac231067`;
The preflight guard correction is committed at `be9d754`; no production engine
imports it. This checkpoint records its actual Cloud result.

| Authorized operation | Execution | Result |
|---|---|---|
| Frozen CREATE_DRAFT tool metadata GET | 1166 | Stopped at a combined body-format/size guard; original raw response unavailable |
| Owner-approved metadata recovery, native JSON | 1167 | PASS: pinned slug/version, required draft parameters and supported enum values passed the strict validator |
| Connected Zoho account read | 1168 | STOP: `OWNER_MAILBOX_IDENTITY_OR_STATE_STOP` |
| Separately approved account diagnostic | 1169 | STOP: `OWNER_ACCOUNT_CHECKS_FAILED:PRIMARY_ADDRESS`; all other initial identity/state checks passed |
| Separately approved corrected identity read | 1170 | PASS: exact account/request, separate primary identity, mailbox, confirmed sender/recipient and enabled mail route |

The account read passed Composio success, Zoho status 200, bounded JSON schema
and exactly one configured account ID. At least one of the exact primary address,
mailbox address, Zoho account type, enabled flag, status flag or mailbox state
did not meet the reviewed expectation. The original error did not identify the
field. The approved diagnostic isolated only the exact primary-address mismatch;
mailbox address, account type, enabled/status and mailbox state passed. This does
not establish whether the discrepancy is an alias, capitalization or another
address, and does not prove that the owner mailbox is wrong or disabled.
These historical failures remain preserved. The owner subsequently supplied
distinct account-primary and mailbox identities. The tested correction requires
each independently, without treating an alias label or screenshot as provider
authorization. Execution 1170 also passed the downstream confirmed-address,
enabled native-mailbox sender, SMTP and incoming/outgoing-block checks.
Raw account data was deliberately not retained. Provider proof comes from the
exact installed validator plus execution success, rather than archived raw data.

The native HTTP boundary used TLS, no redirects/retries, 30-second timeout and
a 1 MiB normalized JSON check after receipt. It does not provide a streaming
wire-byte cap. No credential value was extracted or changed. A browser inventory
briefly displayed a temporary n8n management sign-in redirect; it was not copied
into project artifacts or Git. No permanent credential disclosure is asserted.

## Capacity, costs and envelope

The n8n management UI showed Trial, eight days remaining and 33/1,000 production
executions at preflight. All nine Data Tables displayed approximately 0.82 MB
combined storage, with no quota warning. The documented platform default is
200 MiB; a numeric instance-specific limit was not exposed in the UI.

The owner's billing screenshot confirms Composio Hobby at $0/month and
100,000 included monthly tool calls. Its separate $2 Instant Tools credit is
excluded from this test. Current [Composio pricing](https://composio.dev/pricing)
states that Hobby stops at included limits without unexpected overage charges.
The selected existing connected-account transport uses ordinary tool execution.
Before execution 1170, the owner Usage screenshot showed five total workspace calls in the last
30 days. Conservatively add all four previously counted preflight reads, even
where already observed or not billable, and charge all nine to every applicable
bucket. Published ordinary/managed/direct limits are 100K/20K/10K; the optional
shared-connection limit is 1K. This establishes ample lower-bound headroom,
not exact undisplayed category balances. Hobby pauses at caps.
No usage API request, upgrade, add-on, purchase or credential change occurred.
Three account-tool reads and two metadata GETs have now been counted against
the exhausted, owner-extended five-read preflight allocation.

The unchanged private envelope passed signature/footer, HTML rendering,
connection/request pinning and exact message-hash checks locally. Message hash:
`a00140cc0fc096aaa67b209d50215f79e7c3ff73c51e19ba26b61c2265805c3d`.
Frozen CREATE_DRAFT version is `20260915_00`, with `mode=draft`,
`mailFormat=html`, `encoding=UTF-8`, `askReceipt=no`, one owner recipient and
no attachments. This is preparation, not authorization to invoke CREATE_DRAFT.
The isolated table/claim plan remains unexecuted. Current account proof passed;
the same envelope/request hashes were revalidated afterward without a call.

## Preservation and accounting

All six production workflow versions were rechecked unchanged after execution 1170;
the five engines remain inactive/manual. All nine table definitions/timestamps
match before/after metadata. No production or Stage 1 table-writing node ran.
Full table contents were not rehashed during this preflight; the signed-off
Stage 1 table/source proofs remain preserved. All production/provider/synthetic
records and private recovery snapshots were left untouched by these operations.

Staging control `ml9StJJLEqWXjgC5` was restored to nine nodes. Nodes, connections,
settings and groups match the saved original; inactive/unpublished restoration
version after the fifth read is `98954a32-ab03-4f0c-bed4-16de77175a73`.
Other staging graphs were not changed.

| Resource | This preflight | Cumulative use / ceiling |
|---|---:|---:|
| Read-only provider operations | 5 | 5/5 owner-extended preflight; exhausted |
| Manual Cloud executions | 5 | 76/84 |
| Matched row mutations | 0 | 154/500 |
| Google GET slots / token POSTs | 0 / 0 | 67/67 and 5/5 |
| Receipt tables / real drafts / sends | 0 / 0 / 0 | Not authorized |

Eight metadata guard checks and fourteen account guard checks passed locally.
Native node configuration validation passed before both corrected executions.
The previously passing 472-test application suite was preserved, not rerun.
The correction's 34 relevant tests and three-node native validation passed.
Earlier failures remain failures; the corrected fifth read is a separate pass.
Editor authentication survived two reloads. The fresh UI still showed 33/1,000
production executions and approximately 0.82 MB storage, without a quota warning.

Private evidence remains in `private/operator-stage1/`: preflight ledger,
reviewed graphs, local envelope proof, control baseline/restoration proof and
six production version receipts. No raw account response or execution export
was saved. Only safe documentation is selected for this checkpoint. New private
result, prerequisite and pre-read ledger/baseline receipts preserve the exact
guard/request hashes and restoration checks.

## Approved diagnostic and remaining gate

The owner separately approved one additional read exposing only static failed-check
names, preserving every acceptance criterion. Execution 1169 consumed that one
read and Cloud execution, with zero mutations or provider writes. It identified
only PRIMARY_ADDRESS. Fifteen local checks and native Code-node validation passed
before dispatch. The original staging graph/settings/groups were then restored;
the owner-required stop after the result was lifted solely for approved execution
1170 after all prerequisites passed. No retry or credential change.

The owner-approved fifth read resolved this preflight gate using separate primary
and sending identities. All historical stop receipts remain intact. No further
provider operation is authorized by its approval. The next boundary is the exact
single unsent owner draft plus isolated receipt/claim and three bounded readback
operations described in the owner plan. Production release remains blocked.
