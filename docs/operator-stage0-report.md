# Stage 0: local wording corrections

8 October 2026. **Ready for local Stage 0 sign-off. Stage 1 has not started.**
Nothing was created, updated, executed, published or deployed in Cloud. Read-only
n8n SDK/schema validation was used; it did not execute workflows. No paid service,
provider draft, email, DM, source-sheet or production-data write occurred.

## Corrected outcomes

All twelve original wording probes now meet their expected policy: six supported
messages pass eligibility and approval; six unsupported messages stay blocked.
Every message, including rejected copy, still saves independently as working copy.

| Issue | Correction and required evidence |
|---|---|
| Booking/performance promise accepted inside `I could` | Extended the shared forbidden-claim guard to detect doubling/tripling, growth, increases, traffic, revenue and similar performance outcomes. Proposal wording and a linked observation cannot authorize a future result promise. Past results do not establish a guaranteed future result. |
| Customer-feedback proposal accepted without proof | Feedback, reviews and testimonials consistently require current, verified `proof` or `review` evidence. Added a bounded operator `proof` observation using the existing source/date/business-association/reviewer controls. Notes, service keywords, missing proof, placeholders, stale proof and superseded proof do not qualify. |
| `I noticed ...` rejected despite matching support | Match the complete observation sentence after normalizing case/whitespace and the bounded `I noticed` / `I saw` wrapper. Extra assertions remain unconsumed and blocked. An excerpt cannot lose a preceding negation to support an affirmative statement. |
| Manually supported parked-domain wording rejected | A recorded website association derives its verification flag after the existing checks. The operator can explicitly record a `PARKED` finding and optional observed GoDaddy provider on a gap/website observation. The statement requires separate current association, exact host/status, matching verified business email/contact and provider support when named. Callers cannot supply arbitrary verification flags. |
| Natural founder CTA rejected | Reuse the existing four founder CTAs alongside the operator CTAs, matching the longest complete CTA first. Completed-prototype language and added factual assertions remain blocked. |
| Clean long operator statement treated as a scraped excerpt | Exempt only the matched, current, human-recorded statement of at most 160 characters from the verbatim-excerpt check. All body bytes still undergo link, contact, metadata, provider, punctuation and forbidden-claim checks. Original automated excerpts and unmatched/repeated text retain the verbatim guard. |
| Refreshed evidence still offered by copy picker | Offer only current supporting observations, including with the renderer's numeric clock. Earlier observations remain selectable for audited corrections and visible in history. Saved stale references are rejected rather than rewritten automatically. |

The parked-domain probe now explicitly records its synthetic parked/provider
finding through the new bounded fields. Its business, excerpt, matching email,
association and intended message are unchanged. No positive research or provider
verification is invented to make it pass.

## Exact changed files

| File | Stage 0 change |
|---|---|
| `scripts/outreach-copy.js` | Shared performance-claim guard; supply the saved recipient to the operator draft gate so it can require the matching recorded contact/domain. |
| `scripts/outreach-content.js` | Operator parking-provider recognition requires the explicitly recorded provider; useful evidence-validation feedback for the four new errors. Existing research/domain scanning remains in place. |
| `scripts/phase2-operator-copy.js` | Whole-sentence observation matching, supported domain/proof checks, existing founder CTAs, bounded operator-only excerpt exemption and negation protection. |
| `scripts/phase2-operator-evidence.js` | Bounded customer-proof type, reviewed website association and parked/provider fields. Existing provenance/date/permission/correction validation remains. |
| `scripts/phase2-operator-view.js` | Proof and parked/provider controls; current-only copy picker, with original observations retained for history/correction. |
| `review/panel.js` | Serialize structured parked/provider findings only for applicable gap/website evidence. No arbitrary verification flag is sent. |
| `scripts/validate-operator-wording.js` | Parked fixture records explicit status/provider; export local synthetic helpers for outcome regressions. |
| `tests/operator-wording.test.js` (new) | 27 outcome tests: twelve original probes plus positive/negative evidence, copy, approval, protection, leakage and actual browser-handler serialization cases. |
| `tests/operator-build.test.js` | One additional test executes the bundled candidate validator locally across the twelve policy cases. |
| `docs/operator-wording-validation.md` | Preserve the original findings and append corrected results. |
| `docs/operator-cloud-validation-plan.md` | Mark local Stage 0 complete and update residual risks; Cloud scope/approval limits remain unchanged. |
| `docs/operator-lifecycle.md` | Instructions for current evidence, customer proof and parked-domain observations. |
| `docs/operator-lifecycle-report.md` | Link this local Stage 0 result. |
| `docs/operator-stage0-report.md` (new) | This report. |

The six ignored JSON/SDK candidates and build manifest were regenerated under
`private/operator-lifecycle/`. Baseline snapshots were preserved. All six exports
have `active:false`; workflow connections, credentials, non-Code node parameters
and existing settings are retained. Relative to the production baselines, only
the same 18 Code nodes differ: panel 9, Draft Queue 1, Review 1, Zoho 3, Sync 2,
Copy 2. No new workflow node or source write is introduced. The five existing
Cloud engines were not modified or activated. This workspace has no Git repository.

## Validation

`node --test tests/*.test.js`: **396 passed, zero failures, zero skips**. This is
the prior 368 tests plus 28 new tests. The first restricted-sandbox run encountered
loopback `EACCES` failures in two HTTP tests; the complete final run with permitted
local socket access passed. Tests use synthetic fixtures and local/in-memory
provider envelopes, never a real provider request.

The regressions exercise Save & Re-evaluate, draft validation, review/approval
and local claim gates, including missing permission, suppression, SENT/provider
locks, signature/footer, source changes, cross-lead/unverified proof, expired and
superseded evidence, fake provider flags, links, contacts, metadata and raw excerpts.
The full existing persistence, transition, compliance and idempotency suite passes.

Candidate checks:

| Candidate | Native SDK/schema result |
|---|---|
| Draft Queue | Valid, 23 nodes. |
| Review Actions | Valid, 18 nodes. |
| Zoho Handoff | Valid, 16 nodes. |
| Inbox Sync | Valid, 15 nodes. |
| Grounded Copy | Valid, 3 nodes. |
| Panel | All nine changed Code-node configurations valid. Full 59-node graph and every SDK parameter reconstruct exactly in local tests. |

The whole panel SDK is **331,838 characters**, exceeding the connector's
300,000-character input cap. Whole-panel native SDK validation was not performed.
The schema calls above are validation only, not Cloud execution proof.

The actual localhost native form persisted a new proof observation, a structured
parked/GoDaddy finding and a grounded parked-domain/feedback message with the
natural founder CTA. It returned `DRAFT_READY`, enabled review/approval and left
Zoho handoff disabled before approval. Restarting the local preview recovered
the recorded facts and saved working copy. Submitting the booking promise then
returned `NEEDS_COPY`, retained the working text, displayed the forbidden-outcome
reason and disabled approval/handoff. The grounded copy was restored for the final
synthetic result. The refreshed gap picker contained exactly one current option.

At an emulated 375 × 660 touch viewport, document width was 375 pixels and the
new controls were within the viewport. This is browser emulation, not real-device
testing. Screenshot capture was unavailable, so no screenshot or visual/device
sign-off is claimed. The temporary Stage 0 preview processes were stopped; the
earlier preview process was left alone.

Private evidence: `private/operator-stage0/full-tests.txt`, `wording-results.json`,
`final-validation.json`, `browser-fixture.json`, local before-file snapshots and
the candidate `build-manifest.json`. These contain synthetic test state or private
workflow artifacts and remain ignored.

The saved six production workflow baselines and four table baseline files still
match their planning-stage SHA-256 manifest. This verifies the local recovery
artifacts; it is not a fresh read of production state.

## Persistence and remaining limitations

There is no table, column or source schema migration. The operator workspace can
now contain `proof` observations and derived association/parked/provider fields;
its existing append-only evidence/audit, freshness, capacity and exact-write
rules remain. Earlier research, protection decisions and contact/provider history
are retained. Only ignored synthetic local state and candidate files were written.

Manual wording remains conservative: it accepts bounded supported statements and
controlled proposal/CTA forms, not unrestricted semantic paraphrases. Verification
and consent remain human attestations. Future result promises remain disallowed.
The added manual fields cover the discovered proof and parked-domain cases; they
do not expose arbitrary recent-work, primary-social-journey or performance flags.
Previously recorded generic association/gap observations may need a fresh bounded
verification through the editor to support the structured domain wording; they
are not silently backfilled or relabelled.

Real Cloud Data Table persistence/capacity/CAS behavior, browser authentication,
whole-panel execution, multi-table failure recovery, actual Zoho handoff and real
devices remain untested. The existing provider ambiguity/idempotency and rollback
risks in the Cloud plan remain open. Stage 0 sign-off authorizes no Cloud write;
Stage 1 requires the owner's separate explicit approval of the bounded plan.
