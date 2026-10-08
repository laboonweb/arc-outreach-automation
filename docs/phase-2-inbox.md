# Phase 2 Outreach Inbox

The [Outreach Review Panel](phase-2-panel.md) provides buttons, dropdowns and lead
cards over this Inbox. Its Cloud endpoint is published with Basic Auth and uses
the same authoritative review logic. Normal initial outreach needs no raw table
editing. The table instructions below remain available as the existing fallback.

[Open Arc Phase 2 Outreach Inbox](https://briann.app.n8n.cloud/projects/CPU2qIgS09cANFUG/datatables/LuAliUIL44hW2inO).

The Inbox is the daily review surface. The existing Review Queue remains the
canonical backend ledger, with its original identities, approvals, claims,
suppression, provider receipts and manual-send history. Ordinary initial outreach
no longer requires editing that backend table.

## Daily routine

1. Run Phase 1 research as usual.
2. Run [Phase 2 Draft Queue](https://briann.app.n8n.cloud/workflow/Hqm5e1qhO9yadbKz).
   It refreshes the Inbox even when there are no new drafts.
3. Open the Inbox. Search for `NEEDS_REVIEW` or `DRAFT_READY`, then press Enter,
   to focus on review work. Search for `ZOHO_DRAFT_CREATED` or
   `MANUAL_SOCIAL_READY`, then press Enter, for manual sends.
4. Read the exact subject/draft, verified opportunity and contact route. Set one
   action, then run [Review actions](https://briann.app.n8n.cloud/workflow/8A1NLpsHfLIRVyNB).
5. For approved email, run [Approved Zoho handoff](https://briann.app.n8n.cloud/workflow/7a5Sp3jrw5ftfEdn).
   The Inbox becomes `ZOHO_DRAFT_CREATED`. Open Zoho Drafts and send manually.
6. For approved social, the Inbox becomes `MANUAL_SOCIAL_READY`. Open the actual
   profile/contact route and send the approved DM manually.
7. After an actual manual send of the exact approved message, add `SENT MANUALLY`
   to notes, set action to `MARK_SENT`, and run Review actions again.

Run one workflow at a time, and wait for completion before editing rows. These
workflows remain inactive and manual. Production sample allowlists are removed:
Draft Queue uses PRODUCTION with cap 25; Review actions uses PRODUCTION with cap
ALL. Approved Zoho handoff uses PRODUCTION and still creates at most one approved
unsent email draft per manual run. Inbox sync projects all existing ledger rows.
These settings do not execute research or authorize automated sending.

The read-only `market` column appears immediately after `business_name`.
AUSTRALIA displays Australia; MANILA, MANILA_LEGACY, MANILA_AUDIT_QUEUE and other
MANILA-prefixed datasets display Manila. Market never changes compliance gates.

## Editable fields

Edit only `subject`, `draft`, `compliance`, `action` and `notes`. Business, market,
channel, contact, evidence and send status are projected from the backend.
The workflow rejects changes to those read-only values. Do not add or delete
Inbox rows; intake and sync own row creation and association.

| Action | What to do |
| --- | --- |
| `APPROVE` | Read the exact copy and route. The action records your review; internal evidence, source-change, suppression and approval checks still run. |
| `EDIT` | Change subject/draft, then choose EDIT. Approval and its hashes are cleared. Review the saved text before approving again. Keep the email signature and opt-out footer exactly as supplied. |
| `REJECT` | Reject the draft without outreach. |
| `NEEDS_RESEARCH` | Return the item for research review without outreach. |
| `DO_NOT_CONTACT` | Apply the existing lead/recipient suppression protections. |
| `MARK_SENT` | Requires `SENT MANUALLY` in notes, exact approved text and the existing valid Zoho receipt or manual-social-ready state. |
| `NONE` | No review action. Successful or blocked commands are reset to NONE after sync. |

For Australian leads, choose `SAFE_TO_CONTACT` only after your actual contact
permission review and document that basis in notes. `NEEDS_REVIEW` cannot be
approved, and changing the visible label cannot override source-level blocks.
`SAFE_TO_CONTACT` maps to the existing backend `SAFE_TO_REVIEW` approval gate;
it is an operator record, not an automatic determination of legal consent.

For social, verify the actual Message/contact option and include
`MESSAGING VERIFIED` in notes before APPROVE. A profile URL alone is insufficient.
For AU social, include the permission basis as well as this verification phrase.

Blocked commands leave an `Inbox:` explanation in notes and preserve pending
copy. Correct the issue and choose the action again. Saving an edit never silently
approves it. Provider claims, ambiguous results, sent records and suppressions
still require their existing protections and exceptional reconciliation.

## Native table limits

n8n supplies its own ID and creation/update timestamps in addition to the eleven
custom fields. String cells have no enum dropdown or custom clickable-link
renderer in this instance. Enter the action/compliance text shown above. Social
contact cells contain the exact URL; copy it into a browser to open the profile.
Double-click a draft cell to read or edit the full text. The table scrolls
horizontally to the decision/status columns.

Follow-up dates and history remain in the original ledger and the existing
five-local-business-day, 10:00 policy remains unchanged. `FOLLOW_UP_DUE` identifies
due work. This patch does not treat an initial-send confirmation as a follow-up
confirmation; advanced follow-up/reply handling remains outside the initial
outreach Inbox controls.

## Sync and maintenance

[Sync Outreach Inbox](https://briann.app.n8n.cloud/workflow/Z3k7nFGP0uJOXRLO)
reads the ledger and refreshes the same Inbox rows. Draft Queue, Review actions
and successful Zoho handoff invoke it automatically. It never changes outreach
state in the backend. Pending edits/commands are preserved.

`Arc Phase 2 Inbox Links` stores backend-only row associations, projection
snapshots and backend hashes. It creates no second outreach ledger. Interrupted
first projections can recover their exact existing row; ambiguous associations
stop for reconciliation. Review writes use the original queue key and a matching
previous payload, never insert another outreach item. A receipt in the canonical
payload prevents an interrupted completed command from applying twice.

Canonical UX logic is `scripts/phase2-inbox.js`. Run
`node scripts/build-phase2-inbox.js` to regenerate the private Inbox/updated
workflow JSON and SDK. The builder preserves the saved original provider nodes;
do not import the older Phase 2 workflow exports over this patch. Live data and
validation artifacts stay under ignored `private/phase2/inbox/`.

`scripts/phase2-inbox-validation.js` provides read-only Cloud safety validation
using copies of the four real sample records and Cluster's existing Zoho receipt.
Its positive approval/send checks
are hypothetical operator decisions in memory, not approval, consent or send
records for those businesses. No simulated decision is persisted to a live table.

Production UX validation passes 218 local tests. The earlier read-only Cloud
execution 823 passed 51 checks. Production sync execution 824 updated the same
five Inbox rows and projected the remaining ten existing backend records;
no research, outreach state, provider or send records were changed. See the
private production smoke proof for the authorized no-op Review execution.

Review execution 825 entered its no-work branch with empty feedback; its linked
Inbox refresh execution 826 succeeded with zero projection writes. All 15 queue
rows, 12 protection rows, 15 Inbox rows and 15 associations matched exactly before
and after. No outreach state, provider receipt, email or DM changed. The Review
workflow's existing retention policy discards its execution payload; the linked
child retained the parent ID and no-work input as verification evidence.

New sync/test workflows retain their default execution-retention settings.
Automatic approval review blocked changing those settings to discard execution
data; existing workflows retain their original settings. Execution data can
contain lead/draft information, so keep the same restricted project access.
