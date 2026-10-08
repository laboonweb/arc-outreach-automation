# Controlled batch validation — 4 October 2026

Research-only V1 completed the authorized sample of 35 distinct leads: 10 Australian, 10 Manila Legacy and 15 Manila Manual Check Queue. Seven sequential five-lead write batches succeeded. A single selected lead was refreshed after review to remove a provisional disqualification based on older cached website content.

The data-integrity checks passed. Research results still require human review, so the remaining-lead run is stopped. No outreach, activation, publication, commit or push occurred.

| Dataset | Researched | HIGH | MEDIUM | LOW | PARK | DISQUALIFY | research_required |
|---|---:|---:|---:|---:|---:|---:|---:|
| Australia | 10 | 0 | 0 | 2 | 8 | 0 | 10 |
| Manila Legacy | 10 | 0 | 0 | 2 | 8 | 0 | 10 |
| Manila Manual Check Queue | 15 | 0 | 0 | 7 | 7 | 1 | 15 |

LOW is the existing classification for a usable contact candidate with missing qualification evidence. PARK and DISQUALIFY here are research recommendations; they do not reset protected workflow states.

| Dataset | EMAIL candidate | IG manual | FB manual | WhatsApp manual | PARK / no verified route |
|---|---:|---:|---:|---:|---:|
| Australia | 2 | 0 | 0 | 0 | 8 |
| Manila Legacy | 0 | 1 | 0 | 1 | 8 |
| Manila Manual Check Queue | 8 | 0 | 0 | 0 | 7 |

## Verified outcomes

- All 19 source tabs were compared before and after using entered values/formulas and effective/entered background colours. All hashes matched.
- Original formatted source-read hashes also matched during every write batch.
- Arc Research contains 11 Australian rows, 10 Legacy rows and 15 Audit rows. The Australian total includes one pre-existing unselected row. All IDs are unique; only sampled new IDs were appended.
- Protected output states, reviewer controls, unselected rows, source history and duplicate/contact locks were retained.
- All 10 sampled Legacy rows remain SENT, previously contacted and blocked from another initial outreach.
- Fourteen sampled Audit leads lacking both a named decision-maker and a buying trigger were not disqualified. The sole disqualification recommendation has corroborated current owned-site evidence resolving the original missing-site premise.
- Every sampled row has bounded source evidence, an observation time and explicit uncertainty notes. Draft fields remain empty. No email or DM was sent.

## Errors and unresolved review

One expanded baseline read crashed before any writes; compact all-tab reads recovered successfully. All seven write batches and the selected-lead correction succeeded with no spreadsheet write failure. Transient MCP result-read disconnects were recovered without repeating write batches.

Four selected leads retain website diagnostics: one sparse/challenge page, two HTTP 403 restrictions and one contact-link loop. These were not treated as proof of business closure or broken websites.

Human review remains necessary for building/tenant identity contamination, unrelated agency evidence links, placeholder-looking contact extractions, address/phone drift, post URLs used as social profiles, possible duplicates, temporary ordering closure and an expired pop-up residency. Recent activity, current gaps, routes and Australian consent were not guessed.

## Current operating state

The parent workflow's original graph, node parameters and dry-run configuration were restored and checked against the pre-batch backup. The default remains one lead per workbook. Parent and worker are inactive and unpublished. Manual/success execution saving is disabled again; validation diagnostics already saved in n8n were not deleted. No canonical research logic or architecture was changed.

Live lead-level records and execution-derived summaries are stored only under ignored `private/`: `controlled-batch-report.md`, `controlled-batch-validation-summary.json`, `controlled-batch-baseline.json`, `controlled-batch-final.json` and `controlled-batch-reviews.json`. These must not be added to Git. This document contains aggregate validation findings only.

Human review is required before approval to research remaining leads.
