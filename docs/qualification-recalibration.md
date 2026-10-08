# Qualification recalibration validation

4 October 2026. Same 35 leads only. Qualification 2.1.0 separates commercial merit, contactability, research confidence, readiness and compliance. No outreach or new lead research.

| Dataset | Phase | HIGH | MEDIUM | LOW | DISQUALIFY | PARK quality | research_required |
|---|---|---:|---:|---:|---:|---:|---:|
| Australia | before | 0 | 0 | 2 | 0 | 8 | 10 |
| Australia | after | 0 | 2 | 8 | 0 | 0 | 10 |
| Manila Legacy | before | 0 | 0 | 2 | 0 | 8 | 10 |
| Manila Legacy | after | 0 | 7 | 3 | 0 | 0 | 10 |
| Manila Manual Check Queue | before | 0 | 0 | 7 | 1 | 7 | 15 |
| Manila Manual Check Queue | after | 1 | 1 | 12 | 1 | 0 | 13 |

After commercial quality has no PARK; 14 cases retain PARK readiness. Contactability/readiness were not separately classified before.

| Dataset | Contactability | Outreach readiness | Research confidence | Compliance |
|---|---|---|---|---|
| Australia | WEAK 8; USABLE 1; STRONG 1 | PARK 8; NEEDS_RESEARCH 2 | LOW 7; MEDIUM 3 | QUESTIONABLE 10 |
| Manila Legacy | NONE 6; USABLE 2; WEAK 2 | BLOCKED 10 | MEDIUM 7; LOW 3 | NOT_APPLICABLE 10 |
| Manila Manual Check Queue | STRONG 4; WEAK 7; USABLE 4 | NEEDS_RESEARCH 5; PARK 6; READY_FOR_REVIEW 1; BLOCKED 3 | MEDIUM 2; LOW 11; HIGH 2 | NOT_APPLICABLE 15 |

Ten MEDIUM cases represent provisional potential with explicitly unverified gaps, not verified commercial fit. Thirty-three leads still require research because their current unresolved gap is unverified, often alongside activity/legitimacy or identity uncertainty. Consent, optional person/trigger, delivery testing and historical state do not create that flag.

Forty-one local tests pass. Cloud preview 83, write 119 and read-only verification 155 succeeded. All nineteen source tabs retained values/formulas/background colours. Existing reviewer controls, evidence timestamps, workflow states and history remained unchanged. Thirty-six output IDs remain unique; the same thirty-five selected IDs were updated. Each output migrated once, and verification plans no further column insertion. Workflows remain inactive/unpublished with one-lead dry defaults and normal limited retention restored.

No workflow or sheet-write errors occurred in recalibration. An optional large execution-data read returned MCP HTTP 502; no write was repeated. Old technical diagnostics remain evidence rather than disqualification. Private per-lead comparisons, source links and execution-derived summaries are excluded from Git.

No architecture redesign or paid APIs/dependencies. Remaining 654 leads await owner approval.

Automatic approval review rejected a redundant follow-up configuration that would
re-enable full success/manual retention of real lead evidence. It was not applied;
future retention remains disabled. The final prior-lock preservation fix is covered
by the forty-first local outcome test and verified canonical Cloud bundles. It leaves
all saved qualification dimensions/research flags unchanged. A disqualified record
now also prioritizes its existing duplicate lock in the readiness explanation; both
reasons keep BLOCKED. This final preservation path was not re-executed on live data.
