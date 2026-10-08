# Phase 2 grounded copy

The current boundary is [draft/send separation](phase-2-draft-eligibility.md),
released on 8 October with copy version `arc-copy-v8-draft-send-separation`.
Validated copy remains available while activity, permission or messaging blocks
approval. Dated validation notes below describe their respective earlier releases.

Phase 2 converts existing verified research into a small evidence object, requires
a meaningful business hook, then derives the customer task, supported friction,
cautious consequence, better experience and Arc mechanism before composing the
message. The user chose
the zero-API-cost composer instead of an LLM. No OpenAI, Gateway, Gemini, API key,
top-up, model or drafting service is required. This uses the existing n8n plan's
execution allowance; the research providers and their existing costs are unchanged.

`scripts/outreach-friction.js` owns the evidence-backed reasoning stage.
`scripts/outreach-human.js` owns controlled business hooks and natural sentence
mappings. `scripts/outreach-copy.js` owns clean evidence and the outbound validator.
`scripts/phase2-draft-metadata.js` packages the existing
qualification and route contract without calling the shared legacy text templates.
The shared Phase 1 module is unchanged. `scripts/phase2-copy-drafting.js` owns
bounded selection, validation and safe replacement. `scripts/build-phase2-copy.js`
generates a three-node native n8n Code worker and its Draft Queue integration.

Only reviewed, dated, identity-associated evidence supplies controlled factual
sentences. Verified categories select concrete proposals: pool service enquiries,
kitchen project explanations and briefs, vehicle service enquiries, driving lesson
requests, shooting package enquiries, location selectors or explicitly mapped
Tier A repairs. A business name supplies context, never additional service claims.
A bare social URL, published contact or unverified website alone cannot supply the
required hook. Verified platform business information with independently grounded
identity and a truthful structural opportunity can support a positive information
and enquiry proposal. Sufficient evidence with failed composition is NEEDS_COPY;
genuinely insufficient identity/evidence/opportunity remains NEEDS_RESEARCH.
Recent activity, website absence, social dominance, conversion performance,
customer confusion and consequences are not asserted without verified support.

Strong archetypes are `SOCIAL_DEPENDENCE`, `MESSAGE_FIRST`, `SERVICE_DISCOVERY`,
`MULTI_LOCATION`, `BROKEN_DESTINATION` and `THIRD_PARTY_DEPENDENCE`. Social or
third-party dominance requires an explicitly verified current-journey claim.
A call/text route does not establish a message-first requirement. A missing-page
response needs verified ownership of that same destination; a missing directory
page cannot establish a broken owned website. Negated/uncertain claims are excluded.

When stronger friction is not established, copy can describe a narrower verified
entry route: `SOCIAL_ENTRY_JOURNEY`, `PLATFORM_SERVICE_ENTRY` or
`PACKAGE_SOCIAL_ENTRY`. These do not claim social dominance or website absence.
Gawler's unverified website candidates are not treated as absent. Stable selection
varies openings, paragraph rhythm, mechanisms and CTAs without randomness or
needless regeneration. The copy avoids internal strategy terms such as owned
destination/path, entry/enquiry route, service-to-enquiry/customer/platform journey,
verified asset/friction, structural opportunity and focused website. Those terms
and close variants are rejected by the prospect-language filter.

Each message must include its specific hook outside the business name, grounded
friction/consequence, and a website proposal that itself explains the relevant
service/package/customer task. A generic website proposal cannot borrow its
specificity from the opener. Semantic hook signatures hold interchangeable
candidates even when their openings differ. Identical-hook candidates are held
within a batch; new candidates also check already-saved v5 hooks. This is a bounded
comparison, not a guarantee of uniqueness against every business anywhere.

Raw research is accessible only to the evidence mapper and leakage comparison.
The composer receives the clean object, never raw excerpts, contact details,
source URLs, JSON, directory blocks, ratings, review counts or opening hours.
It returns exactly `subject`, `draft`, `observation_used`, `opportunity_used`
and `claims_used`. It cannot introduce free-form factual assertions.

Each candidate passes deterministic claim, length and outbound checks before
becoming actionable. The validator rejects unsupported assertions or services,
statistics, absence/prototype claims, generic phrases, source URLs, contacts,
markdown, JSON, provider names, internal labels and twelve-token verbatim research
sequences. Social copy is 60-130 words with no subject or signature. Email is
80-170 words before the existing frozen signature/footer, with a specific subject.
The Zoho HTML renderer itself is unchanged.

An invalid candidate gets one local alternate composition, using the same clean
evidence. A second failure clears subject/body and sets `NEEDS_COPY` when draft
evidence is sufficient. Genuinely insufficient evidence remains `NEEDS_RESEARCH`.
An unmapped stronger gap may use independently supported Tier B evidence;
unverified facts never become permission for fallback claims.
Missing required copy cannot be projected as actionable, approved or handed off.
The Review Panel now displays Verified asset, Verified friction and Opportunity;
a read-only Final email preview; and a suggested Australian compliance basis.
The email editor contains only `draft_core`. The existing approval/transport
contract continues to hash the complete `draft_body`, including its one frozen
signature/footer. The form adapter reconstructs that exact body before existing
approval checks, and Save edit updates core and complete body together. The preview
calls the unchanged `renderDraftHtml` directly and shows saved copy. Save edit
refreshes the preview.

`suggested_compliance_basis` is assistance, not permission. It stays in metadata
until the operator chooses Use in notes, reviews/edits it and manually chooses
compliance. The button never selects `SAFE_TO_CONTACT`. Public details alone do
not establish consent. A negative marketing-restriction finding is mentioned
only when verified evidence explicitly records a completed source check;
otherwise the suggestion asks the operator to finish that check.

Automatic approval review blocked the final active Panel copy-gate synchronization.
After receiving the six concrete comparisons, the user explicitly authorized
applying and publishing the final copy gate. That patch was published as
`aa6b66ab-ba21-4c78-9a6d-efdeffbd6199`.
The 53-node connection graph, webhook authentication, signing configuration,
existing action controls and workflow settings are unchanged.

Safe backfill preserves IDs and the same operator row. It replaces only exact,
unreviewed records with missing or known unsafe/template copy. Sent, approved,
provider-claimed, replied, suppressed, parked/locked and audited records are
excluded. Pending operator edits/actions/notes also exclude replacement.
Conditional writes compare the previous payload and protection fields, verify
the persisted result and stop on conflicts. No source or protection rows are written.

The final natural-language patch regenerated five safe leads in Cloud execution
933. VERA's protected record stayed unchanged and NEEDS_RESEARCH; its preview
executed the same bundled worker Code locally against verified shooting-package
facts and passed the final gate. IMD uses its published text-or-call instruction;
Gawler uses the verified Gawler East business location. Their observations,
mechanisms and CTAs differ. The local planner rerun selected zero jobs and left
five valid drafts unchanged. All 17 identities, the other 12 queue rows and all
12 protection rows were preserved. 265 local tests passed. No records were newly
reclassified NEEDS_RESEARCH. All six before/after messages, hooks, friction and
quality results are in the ignored private/phase2/copy-human/validation-report.md.
The pre-existing manual daily cap of 25 was restored after validation; no production
draft batch was executed. Existing valid drafts need no new composition. Failed drafts stay
cached until evidence or the reviewed copy version changes. Drafting API calls and
tokens are always zero. Draft execution retention remains disabled. The Panel's
pre-existing retention settings are unchanged. After the user's explicit approval,
the final shared copy gate was published as
`aa6b66ab-ba21-4c78-9a6d-efdeffbd6199`. Native read-only GET execution 940 succeeded;
the exact final email HTML was verified and all four tables remained unchanged.

## Field validation and manual edits

The 7 October field-validation repair is published as
`c7ec09ab-1cfb-472a-a55c-2c2a058808cd`. The canonical copy version is
`arc-copy-v6-field-validation`; drafting still uses no model or API.
`scripts/outreach-content.js` scans the email subject and core body or social DM
independently. Notes, compliance basis, lead rationale and source/evidence fields
are internal. Their URLs never enter the outbound scan or get copied into a message.
The exact frozen signature/footer are checked separately and the renderer is unchanged.

Retained Alex submissions 947, 948 and 949 each contained two em dashes in the
draft. The original edit precheck threw `INVALID_DRAFT_TEXT` before the content
gate ran. Submission 947 had empty notes. The notes/domain entry was not the
cause. Exact generated-sentence matching was a second obstacle to grounded
manual wording. That wording now has bounded, evidence-dependent paraphrases;
generated copy still requires declared claims and exact reviewed mappings.
Existing valid wording is preserved when its research source is unchanged.

Content errors carry machine codes and field-specific reasons through Review,
Inbox and Panel. The existing error display lists relevant reasons, such as
raw source URL, research markdown, banned internal phrase, missing subject or
unverified domain claim. Derivative sentence/statistic errors caused by URL
digits or research fragments remain in machine failures but do not clutter the UI.

A business root host may be intentionally referenced only after structured
evidence explicitly associates it with the business. Association is not proof
of registrant ownership or consent. Social/provider/directory sources, URL paths,
queries, hashes and lookalikes remain blocked. A parked-page claim additionally
needs verified status for the same host; an email-domain claim needs a verified
email association. Notes cannot create those permissions. Evidence uses the
existing dated/conflict-free verification filters; uncertain facts fail closed.
Social-service information, customer feedback, recent work and claims of primary
social information each need their corresponding verified fact capability.

Generated messages use a plain founder introduction, varied shorter CTAs and
less repetitive body phrasing. The composer rewrites em/en dashes and repeated
stylised punctuation. Manual messages with those marks receive a specific
punctuation error; they are never silently rewritten after approval.

All eight requested cases passed their expected result in local record-copy
validation. Alex's email domain, parked GoDaddy destination and public Facebook
content were independently checked in Chrome; the bounded manual example passes
with those local structured facts. The canonical research has not been updated
with them, so that domain claim remains blocked on its unchanged stored evidence.
No live edit, approval, compliance decision, draft replacement or evidence write
was performed. 279 tests passed. Native Panel GET execution 950 succeeded and
all 17 queue, 12 protection, 17 Inbox and 17 link rows remained exactly unchanged.
All six workflows validated; only existing Code parameters changed. The Panel
remains the only active workflow. Manual controls and caps are unchanged.
Full results and six style comparisons are in
`private/phase2/copy-fields/validation-report.md` and the read-only local preview.

Daily routine after this patch:

1. Finish the existing research batch, then manually execute **Phase 2 Draft Queue**.
2. Open **Outreach Review Panel**, read the asset/friction/opportunity and draft,
   and optionally save a light edit. For email, inspect Final email preview.
3. For Australia, review the suggested basis, use/edit notes if useful, verify
   permission and manually choose compliance. Then approve or reject using the
   existing messaging checks. `NEEDS_RESEARCH` stays outside approval.
4. For approved email, manually execute **Approved Zoho handoff** to create at
   most one unsent draft. Open Zoho and send manually.
5. For approved social, open the verified profile and send manually.
6. After the actual send, use the existing confirmation and **Mark sent** control.
   Follow-ups and replies remain in their existing separate workflows.

No sending, DM automation, schedules, Phase 1 changes or renderer changes are
introduced. Only the already-active Review Panel's approved version was published;
the draft, review and handoff workflows remain manual/inactive.

## Automatic custom-email-domain mappings, unpublished completion draft

`scripts/outreach-domain-gap.js` supplies deterministic Tier A mappings for
VERIFIED_PARKED_DOMAIN, VERIFIED_PLACEHOLDER_SITE and VERIFIED_BROKEN_DESTINATION.
It consumes current canonical typed evidence with strong business association,
matching email/contact provenance and a matching gap fact. It shares Phase 1's
existing TTL policy; it does not inspect destinations, invent contacts or infer
ownership. Blocked, unknown, expired, weak and conflicting evidence fails closed.
GoDaddy attribution needs the specific observed registrar-template marker.

The composer describes the verified destination and proposes a functioning
business page with relevant services and an enquiry form. Existing category and
proof capabilities govern services and customer feedback. It cannot infer recent
work, social dominance or lost enquiries. Source URLs and raw registrar HTML
remain outside prospect text. A newly mapped gap can refresh only otherwise
eligible unreviewed copy, without a global copy-version bump or changing locks.
Under the current draft/send boundary, old activity blocks approval when required
by policy while independently grounded canonical domain-copy remains available.

The exact-row Cloud preview automatically composed valid parked-domain copy
from the pre-existing canonical positive observation, without a supplied body
or queue write. A separate uncached automatic research proof captured the public
email from the verified official profile; its native domain requests remained
ACCESS_BLOCKED and its fresh research result remained Tier B. The positive
preview must not be presented as a new positive Cloud destination observation.

Six workflow drafts received narrow Code changes with their graphs, credentials,
review gates, transport and published versions unchanged. Automatic approval
review rejected the active Panel's draft synchronization because its existing
Code embeds signing configuration and manual action controls. Its draft and
published version are unchanged pending explicit authorization. No workflow was
published, and the Draft Queue, Review, copy worker, Inbox Sync and Zoho handoff
remain inactive. Read-only proof helpers are archived after validation.
