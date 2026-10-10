# Stage 2 identity correction, 10 October 2026

**Local correction validated at `be9d754`. The owner then conditionally approved
one live read. Prerequisites passed and execution 1170 succeeded; staging was
restored. Stage 1 remains signed off; no real draft or deployment.**

The old private preflight guard required account primary identity, mailbox and
sender to be the same address. The owner supplied separate account-primary and
Mail outgoing identities. This corrects that preflight assumption; it does not
whitelist an alias or establish current API sender authorization from screenshots.

`scripts/zoho-owner-preflight.js` is a pure, read-only preflight validator, with
synthetic regression tests. No production engine imports it. Existing transport,
qualification, review, suppression, protection and sending behavior is unchanged.

| Role | Independent required evidence |
|---|---|
| Connected account | Exact pinned Composio connected-account ID, user, region and frozen version in the actual dispatched request; exact configured Zoho account ID in its response |
| Account primary identity | `primaryEmailAddress` equals the separately reviewed owner account identity |
| Mailbox identity | `mailboxAddress` equals the reviewed owner mailbox; Zoho account type, enabled/status and mailbox-state checks all pass |
| Sending identity | Exact sender has one confirmed `emailAddress` association and one enabled native mailbox `sendMailDetails` entry on that same account |
| Recipient identity | Exact recipient equals the reviewed owner mailbox and has a confirmed address association on that account |

Primary/alias classification alone authorizes nothing. The native mailbox sender
can have `validated=false` in [Zoho's documented account response](https://www.zoho.com/mail/help/api/get-all-users-accounts.html);
confirmed membership plus active native mailbox mode is required. An external
unverified sender, unconfirmed address, disabled sender, wrong account or unknown
mail route fails. Incoming/outgoing block and SMTP checks remain strict.
The recipient remains the same owner mailbox as the sender. No prospect substitution.

Exact live identities and existing non-secret account selectors are stored only
in the ignored private proposal. It records the owner's UI observation separately
from the API verification, now passed in execution 1170. Original failed receipts
and private guards are preserved. Outputs/errors contain only verification flags or static
failed-check names, never raw profile data, verification codes or credentials.

## Completed separately approved single read

Temporarily reuse only inactive staging control `ml9StJJLEqWXjgC5`, whose pinned
pre-read version was `7b529805-ecfb-4be6-985d-6f905bba599a`. Editor and capacity/cost
prerequisites passed before changing its graph. Existing Composio credential
reference stays unchanged; do not extract its value or inspect credential-bearing
connected-account metadata. Pin the exact dispatch body and credential reference.

Execute `ZOHO_MAIL_ACCOUNTS_LIST_ACCOUNTS` once at version `20260915_00`, with the
existing selected connected account/user/region. Three-node graph: manual trigger,
native read-only HTTP, strict verification. TLS stays enabled; redirects and retries
are disabled; timeout 30 seconds; normalized JSON limit 1 MiB after receipt.
This native HTTP limit is not a streaming wire cap. Execution retention stays off.
Restore the saved control graph/settings/groups and verify inactive/unpublished.

| Resource | Additional | Cumulative if dispatched |
|---|---:|---:|
| Preflight provider reads | 1 | 5/5, owner extension granted and consumed |
| Cloud executions | 1 | 76/84 |
| Matched row mutations | 0 | 154/500 |
| New workflow/table, CREATE_DRAFT, sends, Sheets/research calls | 0 | None authorized |

Stop on failed connection binding, identity/sender/recipient mismatch, missing
confirmation, invalid schema, oversize response, authentication or cost uncertainty.
No retry, account-setting change or automatic escalation of resource limits.
Execution 1170 passed every installed guard. Nodes/connections/settings/groups
were restored exactly; version `98954a32-ab03-4f0c-bed4-16de77175a73` remains
inactive/unpublished. Six production versions and nine table metadata snapshots
match; no rows, existing provider drafts or credentials changed.

## Allowance prerequisite, verified before dispatch

Before dispatch, obtain fresh owner-dashboard evidence of the current organization
plan, billing window and remaining ordinary tool-call, applicable managed-app and
direct-execution allowances. Reserve at least four included slots for this read,
one later draft and up to two proposed readback calls. The latter calls are not
authorized by this proposal. Unknown applicable quota stops before the read.

The existing project key can query project usage, but that result does not prove
organization-wide remaining billing allowance or all applicable tier limits.
[Composio documents separate project and organization usage scopes](https://docs.composio.dev/reference/api-reference/organization).
No extra usage API request, organization key, cookie extraction or new credential
is proposed. The owner dashboard supplies that evidence. Do not purchase
credits, upgrade or use the separate Instant Tools balance.

Before execution 1170, the owner dashboard showed five workspace-wide calls over the last 30 days.
Adding all four earlier counted reads conservatively yields at most nine observed
or known calls charged against every applicable tier. Published limits establish
lower bounds of 99,991 ordinary, 19,991 managed, 9,991 direct, and 991 shared slots
if sharing applies. These are conservative bounds, not separately displayed
balances. Hobby is hard-capped; this read uses no Instant Tools. No usage API call.

## Local validation and next boundary

All 34 relevant tests pass: 18 preflight regressions and 16 frozen transport tests,
zero failures/skips. The proposed three-node parameters pass native validation.
The existing full-suite Stage 1 result is preserved, not rerun. Original message hash and frozen
draft request hash are unchanged. Private candidate/expectations are retained in
`private/operator-stage1/stage2-separated-identity-candidate-20261010.json`.
No live/synthetic records, existing provider receipts or production versions changed.
Only the approved staging control was temporarily changed and restored.
No Stage 1 Cloud tests or source-integrity requests were repeated.

After API identity, sender/recipient and allowance checks pass, present the exact
existing owner-mailbox envelope and proposed isolated table/claim/readback writes
for explicit approval. One real unsent CREATE_DRAFT and production release remain
separate gates.
