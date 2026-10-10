# Stage 2 preflight, 10 October 2026

**STOPPED. Owner mailbox/sender proof is incomplete. No real draft, receipt
table, provider write, deployment or sending is authorized or performed.**

Stage 1 remains signed off. No passing scenario or source-integrity request was
repeated. Application implementation remains `91b9539cf5057563839757c91abf76ecac231067`;
this checkpoint changes documentation only.

| Authorized operation | Execution | Result |
|---|---|---|
| Frozen CREATE_DRAFT tool metadata GET | 1166 | Stopped at a combined body-format/size guard; original raw response unavailable |
| Owner-approved metadata recovery, native JSON | 1167 | PASS: pinned slug/version, required draft parameters and supported enum values passed the strict validator |
| Connected Zoho account read | 1168 | STOP: `OWNER_MAILBOX_IDENTITY_OR_STATE_STOP` |
| Separately approved account diagnostic | 1169 | STOP: `OWNER_ACCOUNT_CHECKS_FAILED:PRIMARY_ADDRESS`; all other initial identity/state checks passed |

The account read passed Composio success, Zoho status 200, bounded JSON schema
and exactly one configured account ID. At least one of the exact primary address,
mailbox address, Zoho account type, enabled flag, status flag or mailbox state
did not meet the reviewed expectation. The original error did not identify the
field. The approved diagnostic isolated only the exact primary-address mismatch;
mailbox address, account type, enabled/status and mailbox state passed. This does
not establish whether the discrepancy is an alias, capitalization or another
address, and does not prove that the owner mailbox is wrong or disabled.
Downstream confirmed-address and sender checks remain unverified. Raw account data was deliberately
not retained. Successful metadata proof comes from the pinned validator plus
execution success, rather than an archived raw provider response.

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
Actual remaining organization allowances were not retrieved; no upgrade, add-on,
purchase or credential change occurred. Only one Zoho read tool was executed;
the two metadata GETs were conservatively counted toward the three-read ceiling.

The unchanged private envelope passed signature/footer, HTML rendering,
connection/request pinning and exact message-hash checks locally. Message hash:
`a00140cc0fc096aaa67b209d50215f79e7c3ff73c51e19ba26b61c2265805c3d`.
Frozen CREATE_DRAFT version is `20260915_00`, with `mode=draft`,
`mailFormat=html`, `encoding=UTF-8`, `askReceipt=no`, one owner recipient and
no attachments. This is preparation, not authorization to invoke CREATE_DRAFT.
The isolated table/claim plan remains unexecuted; current account proof must
pass before the owner can approve that exact provider envelope.

## Preservation and accounting

All six production workflow versions were rechecked unchanged after execution 1168;
the five engines remain inactive/manual. No production or Stage 1 table-writing
node ran. Full table contents were not rehashed during this preflight; the signed-off
Stage 1 table/source proofs remain preserved. All production/provider/synthetic
records and private recovery snapshots were left untouched by these operations.

Staging control `ml9StJJLEqWXjgC5` was restored to nine nodes. Nodes, connections,
settings and groups match the saved original; inactive/unpublished restoration
version after the diagnostic is `7b529805-ecfb-4be6-985d-6f905bba599a`.
Other staging graphs were not changed.

| Resource | This preflight | Cumulative use / ceiling |
|---|---:|---:|
| Read-only provider operations | 4 | 4/4 owner-extended preflight; exhausted |
| Manual Cloud executions | 4 | 75/84 |
| Matched row mutations | 0 | 154/500 |
| Google GET slots / token POSTs | 0 / 0 | 67/67 and 5/5 |
| Receipt tables / real drafts / sends | 0 / 0 / 0 | Not authorized |

Eight metadata guard checks and fourteen account guard checks passed locally.
Native node configuration validation passed before both corrected executions.
The previously passing 472-test application suite was preserved, not rerun.
The Cloud account failure is reported as a failure, not converted into a pass.

Private evidence remains in `private/operator-stage1/`: preflight ledger,
reviewed graphs, local envelope proof, control baseline/restoration proof and
six production version receipts. No raw account response or execution export
was saved. Safe documentation only is selected for Git.

## Approved diagnostic and remaining gate

The owner separately approved one additional read exposing only static failed-check
names, preserving every acceptance criterion. Execution 1169 consumed that one
read and Cloud execution, with zero mutations or provider writes. It identified
only PRIMARY_ADDRESS. Fifteen local checks and native Code-node validation passed
before dispatch. The original staging graph/settings/groups were then restored;
the owner-required stop after the result is in effect. No retry or credential change.

The next step is owner reconciliation of the reviewed mailbox with Zoho's primary
address or verified alias/sender settings. No further provider read is authorized;
the four-read ceiling is exhausted. Exact remaining Composio allowances also remain
unverified. Only after
current ownership, sender, recipient and remaining applicable allowances are
established should the exact unsent-draft/table/write/readback scope be submitted
for separate owner approval. Production release remains blocked.
