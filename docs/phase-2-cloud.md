# Phase 2 Cloud Draft Queue

The operator UX patch supersedes the backend-table routine below. Use
[Arc Phase 2 Outreach Inbox](https://briann.app.n8n.cloud/projects/CPU2qIgS09cANFUG/datatables/LuAliUIL44hW2inO)
for ordinary initial review and manual-send confirmation. See the current
[Inbox routine and controls](phase-2-inbox.md). The Review Queue remains the
canonical backend ledger; its fields below document the underlying contracts.

Routine operation runs inside n8n Cloud. No local server, SQLite script, Codex,
LLM subscription or research provider is required to draft and review leads.
The existing Phase 1 workflows and source workbooks are unchanged.

## Open these in n8n

- [Arc | Phase 2 | Draft Queue](https://briann.app.n8n.cloud/workflow/Hqm5e1qhO9yadbKz)
- [Arc Phase 2 Review Queue](https://briann.app.n8n.cloud/projects/CPU2qIgS09cANFUG/datatables/YIdEUIQrlv6fvfrs)
- [Arc | Phase 2 | Review actions and follow-ups](https://briann.app.n8n.cloud/workflow/8A1NLpsHfLIRVyNB)
- [Arc | Phase 2 | Approved Zoho handoff](https://briann.app.n8n.cloud/workflow/7a5Sp3jrw5ftfEdn)

All three workflows use Manual Trigger. Leave them unpublished/inactive. There
is no schedule or sending node. Run one Phase 2 workflow at a time and wait for
it to finish before editing queue cells or running another workflow.

## Production batch controls

All three production workflows use `mode: PRODUCTION` without sample lead IDs.
Draft Queue has cap 25; Review actions has cap ALL. Approved Zoho handoff retains
its existing selector and exact one-persisted-claim check, so at most one approved
unsent email draft is created per manual run. Its existing internal cap ALL is
unchanged and does not expand that provider limit. Campaign `arc-mvp-v1`, queue
and protection table IDs, and all backend protections remain unchanged.
Changing controls does not execute or activate a workflow. The separate historical
read-only safety workflow keeps its validation sample.

## Daily routine

1. Run the existing **Arc | Three dataset research | V1**.
2. Run **Arc | Phase 2 | Draft Queue**. Read the output of
   **Plan truthful drafts and exclusions** for counts and exclusions. A run with
   zero new work stops before the upsert node.
3. Open **Arc Phase 2 Review Queue** and review `draft_body`, `recipient`,
   `subject`, `evidence_basis`, `source_urls` and `compliance_status`.
4. Apply a decision using the editable review fields below, then run
   **Arc | Phase 2 | Review actions and follow-ups**. Inspect
   **Validate review actions** for errors, applied decisions and due follow-ups.
5. For an approved email, run **Arc | Phase 2 | Approved Zoho handoff**. Verify
   its `ZOHO_DRAFT_CREATED` record and open Zoho Drafts. The email remains unsent.
6. For approved social, verify the actual Message/contact option, set
   `dm_verified` to true and run Review actions. `MANUAL_SOCIAL_READY` displays
   the platform, profile URL and exact approved body. Send manually if appropriate.
7. Only after an actual manual send, use `MARK_SENT` as described below and run
   Review actions. Follow-ups use the existing five-local-business-day, 10:00
   policy and maximum two follow-ups.

## Review fields

| Decision | Queue edit before running Review actions |
| --- | --- |
| Approve | Set `review_status` to `APPROVED`; fill `reviewer` and `compliance_basis`; set `truthful`, `recipient_relevant`, `consent_reviewed`, `suppression_checked` to true. |
| Edit | Edit `subject`/`draft_body` and set `review_status` to `NEEDS_EDIT`. Run Review actions to save the edit and clear approval. Read the resulting text before approving again. |
| Reject | Set `review_status` to `REJECTED`. |
| Research needed | Set `review_status` to `NEEDS_RESEARCH`. |
| Suppress | Set `action` to `DO_NOT_CONTACT`. Suppression follows the lead and recipient. |
| Park | Set `action` to `PARK`, with an optional `review_note`. |
| Reply received | Set `action` to `REPLIED`, with an optional `review_note`. This stops future follow-ups. |
| Reschedule | Set `action` to `RESCHEDULE` and `due_at` to a reviewed future ISO timestamp. |

For Australia, commercial tier is independent of compliance. `QUESTIONABLE`
cannot be approved. After an actual compliance review, record the documented
basis, set `consent_reviewed` to true and the queue's `compliance_status` to
`SAFE_TO_REVIEW`. This is an operator review record, never a claim that a public
email establishes consent, and does not modify Arc Research. A source-level
`DO_NOT_EMAIL`/`DO_NOT_CONTACT` still blocks the handoff.

Edits require the frozen email signature and opt-out footer. The Zoho renderer
continues to use Verdana 10px, paragraph spacing, one signature and the clickable
https://arcwebworks.com link. The original renderer and MVP transport are reused
without editing their code.

Do not edit machine fields such as `state`, `sent`, identity keys, hashes,
provider fields, `payload`, `sent_at` or `followup_due_at`. Inconsistent machine
state stops the workflow. The normal controls above own these transitions.

## Record a completed manual send

For the initial message, set `action` to `MARK_SENT`, `action_step` to `initial`,
`manual_send_confirmation` to true, `reviewer` to your name and `sent_message`
to the exact approved text you actually sent. Then run Review actions.

Email requires a confirmed matching Zoho draft ID. Social requires
`MANUAL_SOCIAL_READY`. Repeating the same confirmation preserves the original
date and creates no second send record. Approval, profile opening and draft
creation never set SENT or start a follow-up clock.

An existing approved provider receipt keeps the original MARK_SENT gates even
if a later research snapshot has a different tier. This records a confirmed
manual send; new approvals and provider drafts still require current evidence.

For a due follow-up, use the returned `followup_1` or `followup_2` as
`action_step`, record the text actually sent in `followup_message`, and provide
renewed reviewer/consent/compliance checks and manual confirmation. Review actions
reuses the existing follow-up implementation. Unknown historical contact dates
stay unknown. Regional public holidays are not part of the existing timing policy.

## Persistence and migration

The Cloud queue contains the existing 15 local records and four contact locks.
The local SQLite ledger is preserved. The existing verified Zoho draft ID and
`ZOHO_DRAFT_CREATED` state are retained. Existing messages, approvals, provider
claims and protected history cannot be replaced by an intake rerun.

An unlocked, unreviewed placeholder with no message can be filled in the same
queue row. A known route must remain the same verified route. This is an update
to the existing item, not another initial-touch item. Existing actual drafts are
excluded. Queue identity uses the existing lead/campaign/step key; recipient
collisions and cross-campaign provider/contact locks are also checked.

The provider handoff reserves one row before HTTP using conditional matching on
its exact payload, approved state, recipient, subject, body and reviewer checks.
No matching reservation means no provider request. Timeout or ambiguous results
retain a durable `CLAIMED` or `UNKNOWN_PROVIDER_RESULT` lock. Reconcile the existing
Zoho draft before any retry; do not clear claims or create another queue record.

Data Table upserts are not a transactional send ledger and do not promise
exactly-once delivery. Single-operator sequential execution remains mandatory.
Sending is manual. The Cloud copy becomes the routine queue after migration;
do not independently operate the old local reviewer in parallel.

Successful, failed and manual execution payload retention is disabled. The queue
retains bounded evidence and review state. Restrict n8n project and table access.

## Maintenance

Canonical backend logic remains in `scripts/phase2-cloud-queue.js` and
`scripts/phase2-cloud-review.js`. Use `node scripts/build-phase2-inbox.js` for the
current production Inbox and connected Phase 2 workflow exports; its private
controls preserve the frozen original provider nodes and per-workflow caps.
The older Cloud builder remains a historical base, not the current operator UX
export to import. Maintenance is not needed for daily operation. Live records and
validation exports stay under ignored `private/phase2/`.
