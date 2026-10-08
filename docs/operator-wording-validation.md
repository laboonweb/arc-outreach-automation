# Observation-led wording validation

8 October 2026. Local only, using synthetic business/evidence/route/permission fixtures and the actual signed lifecycle Save & Re-evaluate and approval path. No Cloud/provider calls, source writes or real approvals. The runtime validator was not changed.

Run `node scripts/validate-operator-wording.js`. Private results are in `private/operator-cloud-validation/wording-results.json`. These are characterization probes, not a claim that all policy expectations passed. The script saves each submitted message in an in-memory synthetic canonical queue and attempts approval through the same operator adapter; all twelve working messages survived saving unchanged. The original synthetic research remained unchanged.

| Case | Desired policy | Current result |
|---|---|---|
| Pool information spread across posts + proposed pool/enquiry site | Allow with matching current evidence | Copy eligible; approval passed. |
| Lesson page asks people to call/text + proposed lesson/enquiry site | Allow with matching current evidence | Copy eligible; approval passed. |
| Kitchen examples spread across posts + proposed project/contact site | Allow with matching current evidence | Copy eligible; approval passed. |
| Manually supported parked business-email domain observation, with matching synthetic email/association/gap | Allow with adequate recorded domain proof | Saved; `RAW_RESEARCH_LEAK` and `VERBATIM_RESEARCH_EXCERPT` blocked approval. Current manual association cannot supply the structured domain-verification flag, and the supported sentence exceeds the scanner's 12-word threshold. |
| Natural `I noticed ...` wording around a supported observation | Allow after exact support association | Saved as working copy; rejected by exact statement matching / unsupported assertion. |
| `I've got an idea for this. Worth showing you?` | Allow as a proposal CTA without factual assertions | Saved; `UNSUPPORTED_ASSERTION` blocked approval. |
| Recent projects asserted without matching evidence | Block | Blocked: unsupported claim. |
| Losing revenue asserted | Block | Blocked: forbidden claim. |
| Raw research/profile URL in copy | Block | Blocked: research leak. |
| `I could build a website that doubles your bookings with an enquiry form.` | Block unsupported outcome promise | **Copy eligible and approval passed. Release blocker.** |
| `I could build a website with customer feedback and a simple enquiry form.` without proof evidence | Require verified proof context, consistent with existing structured-copy gate | **Copy eligible and approval passed. Release blocker / policy mismatch.** |
| Same proposal with `reviews` and no proof evidence | Block | Blocked: unsupported service. This demonstrates inconsistent synonymous-proof handling. |

Three passing observation-led forms, with a synthetic business name substituted, are:

> Pool service information is spread across separate posts. I could build a website with pool service information and a simple enquiry form. Worth showing you?

> The lesson page asks people to call or text for availability. I could build a website with lesson information and an enquiry form. Would you like to see a concept?

> Kitchen project examples are spread across separate posts. I could build a website with kitchen project information and a contact form. Would it be alright if I put one together and send it over in the next couple of days?

These pass only in the fixture with the matching current observation, correct identity/route, synthetic permission, business-specific email subject and frozen footer. They are patterns for testing, not verified findings about any real business.

The previously tested parked-domain / Alex-shaped wording remains covered by the existing structured-copy tests, including domain ownership, parked destination, primary social information, customer proof and recent-work capabilities. The new manual-only parked-domain probe fails despite recorded synthetic website association/gap and a matching business email. The manual schema cannot supply the structured association_verified/domain/proof/journey flags, and the exact supported sentence also trips verbatim-excerpt protection. The manual statement path allows only certain fact types and 160-character statements. Carry the parked-domain case and the longer grounded variant into the approved Cloud/manual-editor test; preserve uncertain or unexpressible facts as blocked working copy rather than inventing metadata or changing source research.

Required local correction is narrow: gate outcome promises even inside `I could` proposals; require genuine proof capability for customer feedback/testimonial/review wording consistently; handle supported observation wrappers, explicitly recorded website association and nonfactual CTAs without allowing new assertions. Distinguish a clean operator-supported statement from leaked raw research without broadly exempting scraped excerpts. Keep exact-current fact association, leakage controls, signature/footer, consent, suppression, source-change checks and provider/send boundaries. Add positive and negative regression tests at the actual approval boundary, not just a regular-expression test.

The focused existing suite was rerun with `node --test tests/outreach-content.test.js tests/outreach-human.test.js tests/operator-lifecycle.test.js`: **52 passed, zero failed/skipped**. The prior full 368-test pass remains separate. The additional probes found five mismatches (two unsafe acceptances, three supported-wording rejections); they must not be described as twelve passing acceptance tests.

## Stage 0 correction, 8 October 2026

The findings above describe the original pre-correction candidate. The authorized
local Stage 0 correction is complete; see [exact changes and validation](operator-stage0-report.md).
All twelve probes now match policy: six supported cases pass eligibility/approval,
and six unsafe/unsupported cases remain blocked. The parked fixture now explicitly
records its observed PARKED status and GoDaddy provider using bounded manual fields,
alongside the existing association and matching business email. No research is
overwritten or verification flag fabricated.

Customer feedback/reviews/testimonials require current typed proof; future booking
or other performance promises are forbidden. Observation wrappers and existing
founder CTAs pass without exempting extra assertions, source links or raw research.
Only bounded matched operator statements receive the excerpt exemption. Copy
support offers current observations; prior observations remain in history.

The full final local suite passed **396 tests, zero failures/skips** (28 additions).
Fresh five-engine SDK and nine-panel-node schema validations passed. No Cloud
workflow execution/write, provider call, paid service or production-data write
occurred. Stage 1 and deployment remain separately unapproved.
