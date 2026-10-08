# Parent Cloud batching memory patch

6 October 2026. Scope: the existing parent workflow only.

## Runtime boundary

The parent reads workbook metadata, then indexes one workbook at a time. Source grids remain necessary to interpret source colours/history and calculate the unchanged source-integrity hash. Native HTTP returns these grids as text. Routine batches read Arc Research as formatted values, without its cell-format matrices. Each workbook is immediately reduced to identity, provenance, eligibility/protection fields and a prior-result hash. Full evidence/history does not enter the combined selection index.

`Select bounded batch` receives compact records. The selected pool contains at most 25, 50 or 100 IDs. Its continuation state holds IDs, completion counters, source hashes, cost limits and provider circuits. Before dispatch, the parent rereads the selected workbook and only the selected Arc Research row, verifies source and reviewer-state hashes, and richly normalizes one selected lead. Each worker input contains exactly `lead`, `config` and `cloud_batch`; the batch is included once.

The parent adapter reuses the existing status, identity, duplicate and routing functions. Explicit maintenance/import paths keep their canonical full snapshots. Worker, error handler, provider, qualification, transport and Phase 2 artifacts are unchanged. No schedule or outreach was added.

## Validation record

Local tests compare old and new selections and exact worker inputs at 25/50/100, source/history protections, two-lead continuation, concurrent reviewer changes, selected-row provenance, values-only Arc equivalence, Cloud sandbox compatibility and maintenance preservation.

Cloud execution 738 completed final preprocessing successfully in 23.629 seconds, selecting 25 of 689 records (523 eligible). No research worker ran during this check. It recorded:

| Measurement | Result |
| --- | ---: |
| Workbook metadata reads | 3.838 s |
| Source grid reads | 5.865 s |
| Arc values reads | 2.495 s |
| Source and Arc reads combined | 8.360 s |
| Index node runs plus combination | 7.030 s |
| Index construction code timers | 4.812 s |
| Select bounded batch node | 258 ms |
| Selection code timer | 1 ms |
| Source grids | 17,524,098 bytes |
| Arc formatted values | 4,421,829 bytes |
| Total initial read payload | 21,945,927 bytes |
| Compact combined index | 489,208 bytes |
| Selection output | 6,711 bytes |
| Selected IDs | 25 |
| Provider requests / source writes | 0 / 0 |

The intermediate execution 735 also succeeded in 25.025 seconds. Before the values-only Arc refinement, its initial grids measured 39,879,489 bytes, source grid node runs totalled 10.509 seconds, index node runs plus combination totalled 7.241 seconds, and Select bounded batch took 399 ms. The final reads are approximately 45% smaller. The original failed normalized output was not retained, so its exact serialized size cannot be measured. Serialized sizes are payload measurements, not peak process RAM.

Batch `arc_batch_739` then researched exactly two selected leads. Its first receipt recorded one completion and one remaining ID; its second recorded COMPLETE, selected 2, processed 2, successful 2 and remaining 0. Both are completed Tier C results, with zero provider errors. Total recorded usage was six Exa requests (US$0.032) and three Tavily requests (two credits). Qualification/provider behavior was unchanged.

Read-only Cloud execution 743 verified both durable receipts and all three unchanged source hashes. Arc Research row counts stayed AU 216, Manila Legacy 55 and Manila Manual Queue 138; both writes updated existing rows. The full output-ID scan rejected duplicates before reporting success. Both workers passed the unchanged durable-write/source/protected-cell checks, and Cloud continuation reached the second lead. No outreach occurred. No further lead was researched.

Earlier workspace restarts/503 responses delayed validation. The final preprocessing and two-lead batch completed successfully. Normal defaults were restored and the final parent published after validation. No execution remains running.

## Controls

`preprocessing_only: true` stops before lead materialization, provider calls and writes. `validation_lead_ids` must contain exactly two eligible, unique IDs and caps that batch at two. These are diagnostic input controls, not routine Batch settings defaults.

Keep source/history/reviewer protections and all existing provider limits. Manual execution retention is restored to Do not save and execution-progress retention remains disabled. The final parent is published with batch size 25 and unchanged optional 50/100 controls. No recurring schedule was introduced. Routine execution starts manually in n8n; no local script orchestrates research.

All 183 local tests pass. The 27-node parent passes n8n SDK validation without warnings. The final Cloud parent parameters match the generated artifact, and the Cloud worker nodes/connections match the pre-patch snapshot. Only the parent builder/artifacts changed among existing script/workflow files; the new parent-only adapter, index module, tests and runtime reports accompany them. No commit or push was performed.
