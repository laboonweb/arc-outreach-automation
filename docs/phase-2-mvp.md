# Phase 2 MVP: draft review and manual outreach

Phase 1 remains unchanged. Phase 1.5 remains an optional capability, disabled by
default and excluded from Phase 2. No Exa work on the remaining 254 leads is authorized.

## Runtime

Existing Arc Research → evidence/history routing → channel-specific draft →
separate local review queue → human approval → manual email/social task.

`outreach-mvp.js` is pure shared logic. `build-outreach-workflow.js` bundles it
into a separate inactive n8n workflow. Its first validation reads only ten named
Arc Research rows plus the three headers, using the existing Google credential.
Exact lead ID checks stop execution if a selected row has moved. There is no
research, discovery, sheet-write, email-send or social-send node.

`draft-store.js` uses Node's built-in SQLite, separate from all workbooks.
Transactions and unique constraints protect lead/campaign/step and
channel/recipient/campaign/step. A prior contact creates a durable lead/recipient
lock across campaigns. Editing a message does not create another initial step.
Only an unreviewed NO_ROUTE placeholder can be replaced with a verified route;
approved/contacted identities cannot silently switch channel. Source updates
invalidate approval; reruns preserve reviewer and message history.

Run with Node 24+ (installed runtime is Node 26). No package installation needed:

```powershell
node scripts/validate-outreach-mvp.js
node scripts/review-server.js
```

Open http://127.0.0.1:4318. The local server binds only to loopback and uses host,
origin and CSRF checks for mutations. Drafts and evidence are rendered as text,
with no external asset requests. Local queue data lives in ignored private/phase2.
Stop the server with Ctrl+C. This is a local, single-operator MVP, not a deployed
shared CRM or an automated sender.

## Routing and drafting

- READY_FOR_DRAFT: verified asset/identity, factual unresolved gap, business case,
  current qualification, useful verified contact and a valid business timezone.
- NEEDS_MANUAL_RESEARCH: missing facts, identity/operational uncertainty or a dead route.
- PARK: no verified usable route, or an existing PARKED decision.
- BLOCKED: existing contact, duplicate review, disqualification, protected state
  or a no-email restriction. Legacy never receives another initial draft.
- DO_NOT_CONTACT: permanent suppression, applied across lead and recipient identities.

Emails use verified published business addresses, with recipient relevance checked
at approval. Explicit reviewed IG/FB preference can override email. Social profile
links alone are insufficient. WhatsApp/Viber require an explicitly published
messaging route; phones are never converted into guessed routes. LinkedIn and
other public business platforms stay manual. No cold-call automation exists.

Copy follows asset, factual friction, plausible consequence, proposed outcome,
specific Arc mechanism and a simple CTA. Each draft includes a written concept
plan; the wording does not claim an interactive prototype. No praise, urgency,
measured revenue loss or free full build is invented. Serialized evidence metadata
is excluded from visible copy. Missing owners/triggers do not block qualification.

The email signature is exactly:

```text
Best,
Briann Arcala
Founder, Arc Web Works
+63 995 530 6231
briann@arcwebworks.com
arcwebworks.com
```

The no-further-contact instruction follows the signature. Approval records reviewer,
truthfulness, recipient relevance, consent and suppression checks, compliance basis
and the exact message hash. AU QUESTIONABLE never becomes permission to send;
its compliance remains separate from draft quality. Neither an approval button nor
SAFE_TO_REVIEW sends anything.

## Review/output surface

The queue stores all requested fields: lead_id, business, country, channel,
recipient, subject, draft_body, evidence_summary, commercial_quality,
research_confidence, compliance_status, draft_status, review_status,
scheduled_local_time, timezone, sent_at, followup_due_at, followup_count and
reply_status. Extra identity/hash/state fields are private safety controls.

Draft states: DRAFT_READY, APPROVED, ZOHO_DRAFT_CREATED, REJECTED, NEEDS_RESEARCH, SENT, REPLIED,
DO_NOT_CONTACT. Copying a message is a manual action, not approval. Recording SENT
requires explicit confirmation that the exact approved message was already sent
manually. It records history only. There is no autonomous negotiation or reply.

## Follow-ups

After a confirmed manual send, first follow-up is due five local business days
later at 10:00. Initial recommendations use the next weekday 10:00 in the stored
IANA timezone; these are heuristics, not guaranteed optimal send times. Weekend/DST
handling is tested; regional public holidays are not included. Unknown send dates
remain blank. A scheduling preview never becomes invented historical state.

The FOLLOW_UP_DUE view is computed on every refresh, so it works daily without an
activated scheduler. Manual follow-up confirmations require renewed review and
move the next due date five business days ahead, with a two-follow-up cap. REPLIED
cancels future follow-ups; DO_NOT_CONTACT permanently suppresses; bounced/dead routes
return to manual research while retaining the historical initial-contact lock.
Known Legacy due dates can surface as HISTORY_CONTEXT_REQUIRED tasks; no new initial
copy or invented prior-message context is generated.

## Email transport

Preferred provider: Composio Zoho Mail, CREATE DRAFT only. The official toolkit
lists `ZOHO_MAIL_MESSAGES_CREATE_DRAFT` separately from send/reply tools:
[Composio Zoho Mail](https://docs.composio.dev/toolkits/zoho_mail).
The transport uses the existing n8n Header Auth credential named `Composio API`.
Its `x-api-key` value stays in n8n's credential store. Zoho OAuth stays in Composio;
no local key, second credential, new login or Google credential change is needed.

`email-transport.js` accepts only a CREATE_DRAFT_ONLY adapter for that exact tool.
It passes only recipient, subject, body, sender and deterministic key. Approval,
suppression and contact locks are checked before a transactional provider claim.
Success records a provider draft ID and ZOHO_DRAFT_CREATED, with sent_at and
followup_due_at explicitly null and reply_status unchanged. Only an explicit
record of an already completed manual send changes SENT and starts follow-ups.
A timeout/ambiguous result becomes
UNKNOWN_PROVIDER_RESULT; another attempt is blocked pending reconciliation.
The idempotency key is our ledger key, not a claim of provider-native idempotency.

`composio-zoho.js` maps exact approved recipient, subject and body into accountId,
fromAddress, toAddress, subject and content, with mode=draft and mailFormat=html.
The renderer HTML-escapes the reviewed plain-text body, preserves paragraph gaps,
and uses Verdana, Arial, Helvetica, sans-serif at 10px. The fixed signature appears
once, with arcwebworks.com linked to https://arcwebworks.com, followed by the opt-out
text. Stored reviewed content, approval hashes and duplicate keys remain unchanged.
This rendering change is locally previewed only; the existing Cluster provider draft
is not recreated or edited. The current Composio 20260915_00 tool schema confirms
mailFormat accepts html and content supplies the corresponding body.
Zoho account IDs are strings. Optional region must be one of the published values.
The tool version is pinned to 20260915_00. The verified signature appears once,
followed by the existing no-further-contact footer; the adapter never rewrites copy.
Only connected_account_id, version and the tool arguments go to Composio. Our key
stays in the ledger, since provider-native idempotency is not documented.
The endpoint follows the [Composio execute-tool contract](https://docs.composio.dev/reference/api-reference/tools/postToolsExecuteByToolSlug).

`build-zoho-draft-workflow.js` creates a separate inactive six-node transport stage,
without connecting it to the ten-lead preview or any research flow. The HTTP node
is disabled and the claim input throws until the controlled validation is approved.
Retries and redirects are off, TLS validation is on, and execution data retention
is disabled. A successful Composio flag alone is insufficient: a nonempty string
Zoho messageId and no error are required. Unexpected formats remain ambiguous.

The local SQLite claim is the mandatory entry point. The Cloud workflow cannot
read the local ledger; it validates a short-lived, exact-content one-record claim
issued only after approval, suppression, compliance, history and duplicate checks.
The native Remove Duplicates node also records the provider key before HTTP and
filters keys seen in previous executions. This is additional Cloud rerun protection;
never clear its history to resolve an uncertain request. The local ledger remains
the authoritative claim store. Only one controlled execution may run at a time.
This is a controlled manual handoff, not a published service or automatic dispatcher.
Directly editing or executing the HTTP node bypasses this protocol and is unsupported.

For the first real validation, show the selected draft and obtain explicit approval.
Store only the provided non-secret IDs in ignored private/phase2/composio/connection.json
using the [configuration example](../examples/composio-connection.example.json).
Record the exact review and then reserve the existing draft key:

```powershell
node scripts/composio-draft-control.js prepare <draft-key> private/phase2/composio/connection.json
```

The control writes a private one-record node payload and claims the key atomically.
Use n8n MCP to load that payload, enable only the draft HTTP node, and execute the
inactive workflow manually once. Immediately disarm the payload and disable the
HTTP node afterward, including on timeout; never repeat a questionable execution.
Capture only the normalized receipt from the final node, not an execution export:

```powershell
node scripts/composio-draft-control.js record <draft-key> private/phase2/composio/receipt.json
```

Verify the exact draft in Zoho Drafts before reporting the validation complete.
If a request times out or the receipt is unavailable, record `unknown` through the
same control and reconcile both the durable local claim and Zoho Drafts before any
further action. Claims are never released or retried automatically. A confirmed
provider ID can reconcile the existing claim without making another CREATE_DRAFT
request. Provider success, duplicate blocking and visible Zoho validation remain
unverified until the approved one-record run; local fixtures are separate evidence.

IG, FB, WhatsApp, Viber, LinkedIn and other routes remain manual. No sending adapter
exists. The remaining 254 leads are outside this transport validation.

## Validation boundary

Ten existing records were selected. One contains enough verified friction for a
real email draft; nine lack draftable facts or have protected/history/duplicate
locks. The report explicitly records this shortfall instead of inventing nine
messages. Social drafting and send/follow-up transitions are tested using synthetic
fixtures, kept separate from real queue data. Source tabs/colours/controls/history
were not written. No real draft was approved, sent, exported to Zoho or scheduled
as a completed contact. Stop for review; remaining254 stay excluded.

Private report: private/phase2/validation-report.md. Local tests are separate from
the native ten-row Cloud validation and from the unconnected provider contract.
