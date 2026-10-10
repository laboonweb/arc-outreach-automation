# Stage 2 owner-only Zoho validation for approval, 10 October 2026

**Preflight passed in execution 1170. The owner subsequently authorized the exact
bounded test: creation/receipt passed in 1171; independent readback stopped in
1172. The approved one-execution recovery then stopped at its first read in 1173.
Staging is restored and production unchanged. See the
[current result and bounded diagnostic proposal](stage2-readonly-recovery-report-20261010.md).
No additional CREATE or Cloud execution is permitted after that stop.**

The proposal below preserves the original reviewed scope and history. Its future
tense describes the pre-approval plan; the current result is the report above.

The dated [preflight report](stage2-preflight-report-20261010.md) records the
first four reads, the fifth approved correction, and every recovery/restoration.
The real-draft allocation below remains a proposal. No additional provider read
is permitted without approval; the extended five-read ceiling is exhausted.

The owner has since supplied distinct account-primary and Mail outgoing identities.
The [local identity correction](stage2-identity-correction-20261010.md) validates
those roles independently. The approved fifth read and owner-dashboard allowance
evidence passed; staging was restored. Approved draft content did not change.

Purpose: verify the frozen Composio-to-Zoho unsent transport, a durable one-time
claim, confirmed receipt persistence, actual draft readback and replay refusal.
Stage 1 already proved the operator lifecycle, qualification, copy/review gates
and native engines with synthetic evidence. This owner-requested transport check
does not invent business research, qualify the owner as a prospect or weaken
production evidence/compliance/protection gates.

## Concrete message and account review

Exact recipient, sender and copy are retained only in the existing private
`private/operator-stage1/owner-draft-review-20261009.json`. The recipient is an
owner-controlled mailbox verified through the corrected pinned provider guard.

- Subject: `[Arc Web Works test] Owner mailbox unsent draft check`.
- Body: 338 characters, neutral system-test wording with the frozen signature
  and opt-out footer. It contains no performance promise or invented web finding.
- Exact channel/recipient/subject/body hash:
  `a00140cc0fc096aaa67b209d50215f79e7c3ff73c51e19ba26b61c2265805c3d`.
- Local signature and exact-content hash checks passed. The existing private
  connection configuration produces a valid draft-only request using the frozen
  tool/version; `mode=draft`, `askReceipt=no`. No CREATE_DRAFT execution occurred.
- The review file's connection field is a description, not executable IDs.
  `stage2-owner-envelope-prepared-20261010.json` privately pins the request and
  configured connection hashes. Execution 1170 separately proves the current
  account, enabled sender, confirmed owner recipient and mail route.

Any address, sender, connection, tool version or content change needs a fresh
review. Never substitute a live prospect or use an existing production/provider
record for the test. Credentials remain in the existing n8n credential store;
no extraction, new OAuth scope or secret in Git/chat.

## Proposed bounded scope

Approval must explicitly cover the following separate Stage 2 allocation.
Five preflight reads have now been dispatched under separate approval. All other
items are proposed future ceilings, not authorized or executed operations:

| Item | Maximum / required behavior |
|---|---|
| New workflow | 0; temporarily reuse the existing inactive staging control and restore its saved graph/settings afterward |
| New isolated receipt table | 1, private owner-test namespace; verify storage/cost before creation |
| Owner-test record | 1 in that new table; no changes to the four Stage 1 tables/eight identities |
| Manual Cloud executions | 8, separately granted; would keep cumulative executions at most 79/84 |
| Matched row mutations | 6 in the new table; would keep cumulative mutations at most 160/500 |
| Provider read-only operations | Five preflight operations completed; propose three additional readback calls (folders, bounded draft metadata, exact returned-ID content), for eight total reads |
| Real CREATE_DRAFT | 1 at most, only after preflight passes and exact owner approval is recorded |
| Sends, deletes, retries | 0 |
| Sheets/research calls | 0; Stage 1 GET/token limits are exhausted |
| Additional monetary charge | 0 permitted; unknown allowance, credit cost or charges stop before creation |

The extra table is a new permission outside completed Stage 1, not an extension
silently charged to its four-table limit. Preserve its final receipt/history;
do not delete it or the provider draft as automatic cleanup. Provider API/tool
parameters and exact read-only operations must be verified before dispatch;
unavailable schemas or unaccounted costs stop the plan.

## Execution gates and expected writes

1. Under separate Stage 2 authorization, establish current provider allowance,
   cost and n8n capacity/storage. Read only the selected connected-account status,
   sender/account and owner mailbox proof. Five preflight reads have been consumed;
   any further proof requires a new, specifically reviewed read allocation.
   Stop if identity, region, schema, allowance or costs cannot be established.
2. Review the exact private message/recipient and current account proof. A real
   draft call remains disarmed until that explicit owner approval is present.
3. After approval, create the isolated receipt table and one approved test record
   (one insert). CAS it once to CLAIMED (one update), then verify exact persistent
   claim, account, recipient, hash, expiry and no suppression/contact lock.
   No production qualification/protection decision is changed.
4. Execute the existing frozen ZOHO_MAIL_MESSAGES_CREATE_DRAFT transport exactly
   once, with no retry, redirect, send mode or receipt request. Normalize and
   persist the result (one update) with the shared persistedReceipt guard.
   Missing ID, zero-match persistence or timeout leaves CLAIMED/UNKNOWN locked.
5. Under separate approval, perform three read-only calls in the verified account:
   `ZOHO_MAIL_FOLDERS_LIST_FOLDERS` with pinned string `account_id`; require one
   identifiable Drafts folder. Then `ZOHO_MAIL_MESSAGES_LIST_EMAILS` with that
   string `folder_id`, string `account_id`, pinned region, `start=1`, `limit=20`,
   and the exact test subject as `search_key`. Require exactly one returned
   CREATE_DRAFT message ID in Drafts and exact sender/recipient/subject, without
   attachments, CC or BCC. Finally `ZOHO_MAIL_MESSAGES_GET_MESSAGE_CONTENT` with
   those same string account/folder IDs, the returned string `message_id`, region
   and `include_block_content=false`; require complete exact approved body.
   All three public input schemas were reviewed on Composio's toolkit page at
   version `20260915_00`; this consumed no authenticated provider operation.
   The content tool returns body, not sufficient metadata/folder proof, so two
   proposed reads would be incomplete. The new three-read ceiling requires approval.
   Keep raw responses transient, 1 MiB normalized post-receipt limit per read,
   TLS, no redirects, 30-second timeout, no pagination, retries or broad search.
   Nonmatching/ambiguous IDs, missing Drafts membership, incomplete content or
   unexpected provider markup stops verification; never silently weaken matching.
   Narrow listing can transiently return other owner-draft metadata; preserve it
   unchanged and retain only the exact test receipt. Confirm
   actual draft folder/state, sender, recipient, subject/body and unsent status.
   Append the readback outcome (one audited update). Sent/follow-up dates stay empty.
6. Repeat only the local/manual selection against the durable claim/receipt.
   Verify zero second provider request and zero duplicate draft; do not resend
   the provider HTTP call to test idempotency.
7. Restore the existing staging control graph/settings, verify it remains
   inactive/unpublished, and hash-check all six production workflows, four
   production tables and original Stage 1 synthetic state unchanged.

Expected matched writes: four, with a maximum six only for an audited failure
or reconciliation outcome. No resetting an ambiguous claim. The provider may
retain one unsent draft and consume normal included execution/API allowance;
these external effects require approval. All operational receipts remain private.

The proposed three remaining Cloud executions are creation/receipt, readback,
and replay-refusal verification; no provider request on replay. This keeps the
eight-execution Stage 2 allocation and cumulative maximum 79/84 unchanged after
five preflight executions. Request reserve: one CREATE_DRAFT plus three reads;
included allowance has ample conservative headroom. Additional charge must be $0.

## Stop and recovery criteria

Stop on account mismatch, authentication failure, undocumented provider schema,
unexpected cost, conflicting claim, oversized/unexpected response, source or
protected-state change, ambiguous provider result or failed receipt persistence.
Keep the one-time claim and every receipt. Do not create again, fabricate an ID,
mark SENT or restore an old table dump. Any provider reconciliation beyond the
bounded readback requires a new reviewed read-only scope.

Pass requires verified owner isolation, one confirmed unsent real draft, exact
message readback, durable matching receipt, no second provider request, unchanged
production/protected/synthetic records and no sends/paid research. Passing Stage 2
still does not authorize production publication: the release manifest needs
separate final approval.
