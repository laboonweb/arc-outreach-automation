# Manual autonomous research in n8n Cloud

Final operational patch, 5 October 2026. Research and qualification remain the accepted authenticated Exa/Tavily implementation.

## Run a batch

1. Open [Arc | Three dataset research | V1](https://briann.app.n8n.cloud/workflow/RuH5G0KYDeiTxsVP).
2. Open **Batch settings**. Leave `batch_size` at **25**, or set **50** or **100**. Other sizes are rejected. The existing ceilings are Exa **US$3** and Tavily **150 credits** per batch.
3. Click **Execute workflow**. The parent, one-lead worker and error handler must remain published for internal Cloud continuation. No recurring schedule or local lead orchestration is needed.
4. Let this batch finish before starting another. The parent returns `DISPATCHED_IN_CLOUD`; the work continues in native n8n executions. Follow the latest `research_batch_id` and `batch_summary_json` in **Arc Research**. The final receipt reports `COMPLETE` or `STOPPED`. A failed Sheets/configuration execution can stop before it writes a new receipt; inspect the failed n8n execution in that case.

The instance limits each execution to 180 seconds. Each segment reads the current eligible pool, researches one selected lead, writes and verifies its result, then dispatches the next segment. Provider research is sequential within the batch. The continuation trigger is internal to this manually initiated batch; it is not a recurring schedule.

## Durable state and review handoff

All research completion records live in the existing **Arc Research** tabs. The workflow upserts by `lead_id`; it updates an existing research row rather than appending a duplicate. Completed Tier C results are completion records too and are skipped on normal reruns. Retry results remain eligible, subject to current source, duplicate and review protections.

The output includes `research_status`, `tier`, `research_required`, `provider_status`, `verified_domain`, `verified_email`, `verified_social_routes`, `contactability`, `activity_confidence`, `identity_confidence`, `evidence_json`, `observed_at` and `last_researched_at`. Runtime columns are appended after existing controls. Existing history and reviewer cells are not rewritten. Source tabs are never write targets.

Qualified email results expose `queue_route=READY_FOR_DRAFT`; qualified verified social results expose `MANUAL_SOCIAL_CANDIDATE`. These research receipts are available immediately to the existing Phase 2 intake/review path. Phase 2 still owns approvals, its local review ledger and provider draft creation. Research does not create provider drafts, send email/DM, or change that UI/transport.

Each receipt carries a bounded batch summary: Tier A/B/C, verified emails/domains, manual social candidates, Exa requests/dollars, Tavily requests/credits, provider errors, ambiguous identities, completion/retry counts and remaining leads. It is stored in `batch_summary_json`, not solely in a local file or SQLite database. Provider attempts/errors are also recorded in bounded research evidence.

## Error policy

Exa library/directory URLs, including `exa.ai/library/...`, are never content-fetch targets for Exa or Tavily. Returned text/highlights can still be used as evidence.

One HTTP 400, malformed candidate, unsupported URL or unavailable content records a per-lead error, discards the failed fetch candidate and leaves remaining evidence usable. The existing bounded fallback can continue. Unresolved results stay Tier C or `PROVIDER_RETRY_REQUIRED`, and processing advances.

Auth/credit failure, sustained rate limiting/open provider circuit, missing required cost accounting, a configured cost ceiling, source/output integrity failure, Sheets read/write failure or unrecoverable workflow configuration stops the batch. A first 429/5xx cools that provider for the lead; consecutive failures carry into the next lead and can open its circuit.

Provider limits remain two Exa searches, one Tavily search, two content reads total, one Tavily read and five authenticated requests maximum per lead. Existing public-origin verification and qualification behavior remain unchanged.

## Validation and stopping point

- 176 local tests passed, including HTTP 400 continuation, Exa directory exclusion, sustained 429, idempotent upserts and source/history/reviewer/formula protection.
- The saved 20-node parent and 33-node worker passed n8n SDK validation without warnings.
- Forty-three accepted prior receipts were persisted without new provider calls. Their original research timestamps were preserved.
- Two selected real leads completed research. The previously failing lead used no Exa directory fetch and recorded no provider errors.
- The first post-write check found only Google Sheets empty-cell padding differences (`undefined` versus `{}`). The comparison now treats those as equivalent while preserving every actual value, formula and format property. The completed lead was not researched again.
- A live deterministic re-upsert passed with unchanged row count, source hash and protected output cells. Final read-only Cloud validation, execution **725**, confirmed both validation leads complete, the two-lead batch complete, all 43 earlier timestamps unchanged and source-tab hashes unchanged across all three workbooks.
- The local frozen-component and protected-ledger check passed. The source integrity workflow was unchanged. The research workflows have subsequently been published for Cloud continuation; full manual/success execution retention remains off.

Normal defaults were restored after validation. No remaining pool was researched. Subsequent batches are started by Briann in n8n.

The 6 October parent memory patch now indexes one workbook at a time, selects compact IDs/references, and materializes one selected lead before dispatch. Final 25-record preprocessing and an exactly-two-lead Cloud continuation passed. See [parent batching memory validation](parent-batch-memory.md) for measurements and the preserved boundaries.
