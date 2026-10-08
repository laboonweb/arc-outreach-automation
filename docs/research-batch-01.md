# Evidence-aware fallback and first research batch

5 October 2026. The user accepted the authenticated thirty-lead validation,
authorized one public-identifier fallback optimization, and authorized sequential
processing of the remaining unresolved pool, stopping after the first reporting
batch of at most 100 or immediately on provider, cost or integrity failure.

`research-fallback-query.js` projects only public business fields. Alternate Exa
and Tavily searches use exact phone, street address/locality, supplied business
domain and supplied Facebook/Instagram profile when available. An email requires
recorded publication evidence, exact email text and a public source URL. Unverified
spreadsheet emails and reviewer-only contact values cannot enter provider queries.
History, reviewer notes, workbook identifiers and serialized source rows are not
query inputs. The primary query and identity/qualification thresholds are unchanged.

Per lead: Exa searches at most two, Tavily search at most one, explicit fetches
at most two combined, Tavily fetch at most one, total requests at most five.
Search-embedded content still avoids unnecessary fetches. The authorized batch
adds fail-stop on any provider error, requires reported cost metadata and carries
provider circuits between leads. Batch ceilings were US$3 reported Exa cost and
150 Tavily credits. No provider retry occurs after a batch failure.

The existing read-only integrity workflow confirmed all 689 IDs and the three
complete workbook grid hashes against the saved snapshot. The remaining pool was
539 after excluding all thirty accepted validation cases and protected records.
The persisted first batch selected 50 Australia and 50 Manila Audit Queue leads
in source order, interleaved between datasets. Every selected lead had a public
identifier available for its fallback. Manila Legacy and existing contact,
suppression, duplicate and reviewer locks were excluded.

`research-batch.js` checkpoints receipts by stable lead ID and imports qualified
entries immediately through the unchanged Phase 2 DraftStore. Email candidates
retain the existing READY_FOR_DRAFT approval contract and carry their batch tier
separately. Official social profiles awaiting messaging confirmation are manual
review tasks without message copy or approval claiming DM availability. Existing
protected drafts and provider history are preserved; the suppression, contact
lock, provider claim, audit and manual-send tables remain unchanged. Shared
recipients are blocked before import. The four qualified accepted-validation
entries were also imported without researching those thirty leads again.

The run stopped at the fourteenth attempted lead: Tavily extraction returned
HTTP 400 after rejecting an Exa directory URL as invalid. Thirteen leads completed:
Tier A 0, Tier B 1, Tier C 12. One provider-retry case is excluded from commercial
tier counts. The newly qualified Tier B manual task was already in the live local
review queue before the stop. No email/domain was verified in the completed batch.
Reported usage: Exa 42 requests and US$0.2240; Tavily 27 requests and 16 credits;
69 requests total, one provider error and nine ambiguous identity cases. Usage
reflects provider-reported metadata, not reconciled billing.

No retry or later lead execution followed the failure. The other 86 selected
leads remain unstarted; 525 remaining-pool leads have not been attempted.
The post-run read confirmed the same 689 IDs and complete grid hashes. Frozen
file hashes and protected ledger tables passed. No source or Arc Research writes,
Zoho/Composio calls, automated sends, or browser-agent lead research occurred.
All seven Arc workflows remain inactive. Successful/manual execution retention
was restored, and the integrity workflow's HTTP nodes were disarmed again.

Private checkpoint/report: `private/research-batch-01/report.md`, `report.json`,
`progress.json`, `selection.json`, `results/`, `provider-stop.json` and before/after
source-integrity receipts. The batch remains STOPPED pending user review; the
first 100-lead batch was not completed. Local tests and n8n validation are separate
from the recorded live executions and read-only source checks.
