# Operator-controlled lifecycle, local implementation

8 October 2026. Implemented and tested locally. Not published or deployed.
The active panel still runs its previous version. The five Phase 2 engines stay
inactive/manual. This extension uses Node built-ins and makes no paid research call.

## Use the local preview

Run `node scripts/phase2-operator-preview.js` from this workspace, then open
http://127.0.0.1:4321/. All seven preview leads, contact routes and provider receipts
are synthetic. Preview saves survive restarting this process. They do not reach
n8n, Zoho, the source spreadsheets or Arc Research.

Select **All records**, **Needs research** or **Needs copy** to open held leads.
The existing Actionable and priority filters keep their previous meanings. They
are views, not states. The open lead and filters survive a save in this browser tab.

## Work a lead

1. Enter your reviewer name. Open **Record evidence or a verification outcome**.
   Choose the fact/check, source URL, observation time and short observation.
   Record why the source matches this particular business/branch. Check the
   verification control only after checking the actual source yourself.
2. Click **Save & Re-evaluate**. Add identity, dated activity, a defensible
   opportunity/service, website findings and the exact published contact route
   as needed. Each blocker has a control that opens the appropriate evidence type.
   Merely checking a box, selecting a status or noting an HTTP success cannot
   satisfy these gates. Nothing fetches the source on your behalf.
3. For a route or permission check, use the exact channel and email/profile.
   Record the permission decision and actual basis. It applies only to that
   recipient. Public contact details alone are insufficient. Australian records
   cannot use the Not applicable permission decision.
4. Write the email subject/core body or exact social DM. Save unfinished work
   with **Save & Re-evaluate** or **Save edit**, independently of approval.
   Email saves reconstruct the frozen signature and opt-out footer.
5. For new wording, open **Supporting facts for a manually written message**.
   Link each factual statement to a current observation. The conservative local
   validator accepts statements supported by that excerpt and separates proposals
   such as “I could build a website with an enquiry form” from business assertions.
   Its supported CTAs are displayed in the copy guidance and defined in the
   canonical copy validator. Unsupported text is retained as working copy, with
   correction reasons; it cannot be approved or handed to Zoho.
6. When the saved evaluation permits it, **Request review**, read the final
   saved email/DM and **Approve saved copy**. Unsaved copy changes cannot piggyback
   on approval. Saving an edit revokes the previous approval and handoff request.
7. For approved email, **Request Zoho draft** records a specific handoff request.
   Then open and manually run the existing Approved Zoho Handoff workflow. It
   selects this requested lead, checks eligibility and exact approval again,
   persists a conditional claim and creates at most one unsent provider draft.
   Complete or reconcile that request before requesting another lead.
8. A confirmed provider receipt establishes **ZOHO_DRAFT_CREATED**. The panel
   shows its provider ID and links to Zoho Mail. Open the existing draft and send
   it yourself. For **MANUAL_SOCIAL_READY**, open the verified profile and send the
   exact approved DM yourself. Only then check **I actually sent this message**
   and **Mark sent**. No action sends an email or DM automatically.

## Replies and follow-ups

On contacted leads, record the actual reply in Notes and select **Record reply
from notes**. Later replies append rather than replace earlier replies. A reply
stops scheduled follow-ups. You can schedule a future UTC follow-up or dismiss
follow-ups with a recorded reason. The existing two-follow-up limit remains.

Use **Save follow-up verification evidence** to refresh permission, the exact
existing contact route, messaging availability or timezone. This cannot change
the original recipient, approved text, provider receipt or initial send history.
Current source restrictions and suppression still block outreach.

When a follow-up is due, review the prior conversation and current permission.
Enter the exact message already sent manually, check the actual-send confirmation
and use **Confirm follow-up sent**. The existing gates enforce due time, contact
context, count, route, permission and duplicate-send history. This records the
human send and does not perform it.

## Derived states and protection

| View status | Meaning / contextual action |
|---|---|
| NEEDS_RESEARCH | Add the missing verified facts or route. |
| NEEDS_COPY | Save or correct working text and supported statements. |
| DRAFT_READY_SEND_BLOCKED | Copy can be reviewed; evidence or permission remains unresolved. |
| DRAFT_READY | Current evidence, copy and permission passed the last evaluation. |
| NEEDS_REVIEW | Review was explicitly requested for saved eligible copy. |
| READY_TO_SEND | Projection of exact-copy APPROVED; request the manual email handoff. |
| MANUAL_SOCIAL_READY | Exact social message approved for manual outreach. |
| ZOHO_DRAFT_CREATED | Existing provider receipt confirms an unsent draft. |
| SENT | Operator confirmed actual sending through the existing gates. |
| FOLLOW_UP_DUE | Existing contacted record has a due, permitted follow-up. |
| PROTECTED | Suppression, source/history lock, provider link or reconciliation prevents initial edits. |
| REPLIED / PARKED | Existing reply/dismissal compatibility projections. |

There is no state editor. Status filters do not write lifecycle states.
Existing SENT, do-not-contact, suppressed, provider-linked, ambiguous-provider and
prior-contact records cannot receive another initial message through this editor.
An explicit classification correction is allowed only on an unprotected record
and needs a real previous observation reference plus replacement evidence. Both
observations remain in history. It cannot clear suppression or erase a contact.

## Persistence and audit

Stage 0 adds **Published customer feedback** evidence. Record actual published
reviews/testimonials with source, observation date and business association.
Missing, unverified or placeholder proof and notes alone cannot support a feedback
proposal. In gap/website observations, **Observed parked page** and the optional
observed GoDaddy provider record a structured finding. A parked business-email
domain statement also requires separate current website association and an exact
matching verified contact. Leave an unestablished provider blank.

The copy-support picker offers only current evidence. Earlier observations remain
available for explicit corrections and in history. `I noticed` / `I saw` wrappers
and the existing founder CTAs are supported when their complete factual statement
is grounded. Future performance promises remain forbidden. See the
[Stage 0 report](operator-stage0-report.md) for the precise bounds.

The Review Queue remains canonical. `operator_workspace` is an additive object
inside its existing JSON payload, containing separate operator observations,
copy support, evaluations, source snapshots and an append-only hash-linked audit.
The existing queue columns, Inbox fields and private link schema are unchanged.
The signed 30-minute record token, payload comparison and exact-row conditional
write remain in use. Inbox actions and refreshed projections reuse the existing
workflow graph. Failed authenticated verification is audited without applying
the rejected copy, route or compliance edits.

Every successful command records reviewer, UTC time, old/new state, evidence
references, verification result and relevant old/new text or notes. Original
research snapshots retain the earlier observation arrays and classification.
The history disclosure shows original research, operator evidence, conversation,
manual send confirmations and prior copy/notes revisions. Original Exa/Tavily or
first-party research is retained; operator evidence is labelled OPERATOR_RECORDED.
Later intake/copy worker runs preserve existing operator work, even without a
finished message.

Bounds are explicit: 500-character observations, 25 copy support statements,
20 source snapshots, 1,000 operator audit events and 180,000 characters for the
operator workspace. Capacity failures require archival and do not silently drop
older operator history. No archival/delete feature is added here.

The preview stores synthetic queue payloads in ignored
`private/operator-lifecycle/local-fixture-state.json`, with atomic file replacement
after flushing bytes. Browser session storage contains only filter/open-lead
preferences. It does not hold unsaved copy or evidence. Live persistence and
Data Table size/performance still require an approved Cloud smoke test.

## Validation, deployment boundary and limitations

See [implementation report](operator-lifecycle-report.md) for exact files and
results. `node scripts/build-operator-lifecycle.js` rebuilds six ignored local
workflow JSON/SDK artifacts from the read-only current baselines. It changes
canonical Code content plus the explicitly reviewed provider-persistence
alwaysOutputData guard, preserves other graph/non-Code configuration and makes
every local export inactive. It never calls a publish/update/execute endpoint.

Remaining limits:

- Human observations and consent decisions are attestations. The software
  validates their structure, provenance, freshness and route association; it
  cannot prove that an operator actually observed a fact or that a legal consent
  basis is correct. Existing authentication identifies access; the reviewer field
  is operator-entered, not a separately authenticated identity.
- Manual copy checks deliberately constrain factual wording and proposal/CTA
  forms. Some legitimate paraphrases need a matching evidence excerpt or revised
  supported statement. Notes alone cannot authorize an unsupported claim.
- The panel retains the existing bounded maximum of 100 diagnostic target records
  and 20 exact rows per Sheets read. No pagination expansion is included.
- The Zoho receipt supplies an ID, not a verified per-draft browser URL. The panel
  links to Zoho Mail rather than inventing a deep link.
- A CLAIMED or ambiguous provider result stays locked for existing reconciliation.
  No retry/reset/receipt-forging control is added. Single execution at a time
  remains required; the Cloud Data Table pattern is not a transactional send ledger.
- Subsequent Stage 1 exercised synthetic Cloud execution and actual Data Table
  persistence/failure recovery; see the [current report](stage1-critical-validation-20261009.md).
  Real provider idempotency and real-device behavior remain unverified.
- The full panel SDK export exceeds the connector's 300,000-character validation
  limit. Its nine changed node configurations pass native schema validation; its
  full existing graph and every runtime parameter pass local exact round-trip
  checks. The five engine SDKs pass native full-workflow validation. Neither is
  a substitute for an approved Cloud execution.

Publishing or deploying requires the owner's explicit approval. After approval,
re-read the live version IDs, apply only the audited Code-node changes, keep all
five engines inactive, and perform a separately agreed bounded smoke test.
No automatic sending, paid research or source/Arc Research writes are introduced.
