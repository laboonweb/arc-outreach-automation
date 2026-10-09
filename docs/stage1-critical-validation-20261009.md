# Stage 1 critical validation, 9 October 2026

**Cloud critical tests passed after two narrow corrections. Stage 1 is pending
the final complete AFTER source-integrity comparison. Production release remains
blocked. No Stage 2, publication, deployment or real provider call has occurred.**

This checkpoint preserves the earlier successful browser authentication, manual
research, saved working copy, evidence rejection, blocker resolution, Save &
Re-evaluate, review/approval and mock-confirmed Zoho tests. Those scenarios were
not repeated. The remaining tests reuse the existing four staging workflows,
four tables and eight synthetic identities.

## Results and evidence

| Gate | Result | Exact evidence |
|---|---|---|
| Complete BEFORE integrity | PASS | 28 GETs; three books, 22 tabs, complete physical grids, all 208 required research fields, stable beginning/end metadata |
| Complete AFTER integrity | PENDING | 28 GETs and one final manual OAuth consent remain; no partial comparison counts as success |
| Native Draft Queue / Grounded Copy / Inbox Sync | PASS | Executions 1138-1140; synthetic S8 saved grounded copy, correct row association and DRAFT_READY projection |
| Duplicate draft decision | PASS | 1141-1142: zero selected jobs, zero writes |
| Native approval / Review Actions / Sync | PASS | 1143 records the synthetic intent; 1144-1145 persist exact-copy approval; 1146-1147 duplicate decision writes nothing |
| Stale canonical CAS | PASS | 1149 refuses stale expected content, matches zero writes, verifies unchanged readback |
| Payload transport and persistence | PASS | 1150: 180,000 ASCII characters/bytes; 1151: 180,000 characters, 503,184 UTF-8 bytes; actual Data Table write/readback hashes match |
| Canonical persistence failure | PASS | 1152 fails with EXPECTED_CANONICAL_WRITE_CONFLICT_STOP, changes zero rows and retains the previous payload |
| Projection failure and recovery | PASS | 1153 prepares one audited synthetic change; 1154 fails INBOX_WRITE_ASSOCIATION_MISMATCH; 1155 reprojects canonical truth without replaying approval or resetting history |
| Mock success without provider ID | PASS | 1156-1157 record UNKNOWN_PROVIDER_RESULT on S3, no provider ID, no sent date; 1158 replay never reaches the mock |
| NO_ROUTE placeholder correction | PASS after fix | 1159 exposed an exact-approval identity defect before any claim/write; 1160 records an audited synthetic correction; 1164 proves the shared source fix creates a valid exact-content claim envelope |
| Mock timeout with receipt-write conflict | PASS after fix | 1161 exposed a silent zero-write receipt result; 1162 verifies the new guard throws PROVIDER_RECEIPT_WRITE_CONFLICT_STOP; 1163 replay leaves the claim locked and never calls the mock |
| Corrected shared logic in Cloud | PASS | 1164 validates placeholder identity, exact approval, confirmed/ambiguous receipt guards and protected-record refusal, with zero writes/provider calls |
| Final Inbox projection | PASS | 1165 projects S8's durable claim truthfully, with no backend change or approval replay |
| Production preservation | PASS | All six production graphs, parameters, settings and versions match the fresh baseline; all four production tables match complete row hashes, including timestamps |
| Synthetic preservation | PASS | Eight identities retained; only S3/S8 changed as authorized; all other queue/Inbox/link rows and both locks match the baseline |
| Staging restoration | PASS with explicit default | Original graphs/configuration restored; all four inactive/unpublished. Batch controls in the mock handoff retains explicit Code mode runOnceForAllItems, equivalent to the original omitted default |
| Full local suite | PASS | node --test tests/*.test.js: 472 passed, zero failures/skips, 16.744 seconds |
| Rebuilt candidate validation | PASS within connector limits | Five complete engine SDKs pass native validation; panel's 11 changed/added node schemas pass; actual Code bodies compile locally and full graph/parameters pass exact local reconstruction |

Private evidence is retained outside Git in `private/operator-stage1/`:
`critical-cloud-execution-evidence.json`, `stage1-final-sync-1165.json`,
`stage1-final-preservation-readback.json`, `native-mutation-reconciliation.json`,
`external-stream-before.json`, its progress/probe/approval receipts, and
`provider-guard-canonical-full-tests.log`. No workbook bodies or OAuth tokens
are retained by the streaming verifier. Earlier stopped probes remain intact.

## Exact corrections

1. `scripts/phase2-copy-drafting.js`: a safe, unreviewed NO_ROUTE placeholder
   keeps its ledger identity and creation time but receives the newly verified
   route's draft/recipient keys. Its previous placeholder key is retained.
   Existing addressed drafts and protected records keep their existing identities.
   `tests/outreach-copy.test.js` covers drafting, exact approval, the provider
   request envelope and protected refusal. All 23 production identities were
   separately checked and already valid; no production repair is needed.
2. `scripts/phase2-cloud-review.js`: provider completion requires exactly one
   persisted row matching canonical identity, payload, state, provider receipt
   and unsent fields. Zero, duplicate, stale or mismatched rows fail closed.
   `scripts/build-phase2-cloud.js`, `scripts/build-phase2-inbox.js` and
   `scripts/build-operator-lifecycle.js` wire the shared guard and enable
   alwaysOutputData only on Persist provider result so a zero-write result
   cannot silently end execution. `tests/phase2-cloud.test.js` covers valid
   confirmed/ambiguous receipts, invalid persistence and graph wiring.
3. `scripts/verify-source-integrity-streaming.js`: compact JSON removes only
   response whitespace. Transport rejection is settled before destruction so
   truncation cannot mask the initiating validation failure. Bounded numeric
   error metrics are retained. Coverage, TLS, host, timeout and memory bounds
   are unchanged. `tests/integrity-streaming.test.js` covers dense 208-column
   grids, semantic determinism, truncation and rejection behavior.
4. `scripts/authorize-integrity-google.js`: explicit bounded BEFORE/AFTER
   authorization, conditional continuation only after a complete valid probe,
   preserved token accounting and a complete BEFORE prerequisite for AFTER.
   `tests/integrity-oauth.test.js` exercises approval/capacity/failed-probe refusal.
   Client and tokens remain outside Git; tokens are process-memory only.

## Integrity and resource accounting

The complete BEFORE receipt covers seven Australia tabs, nine Manila Legacy
tabs and six Manila Audit Queue tabs. Values, formulas, entered/effective
formatting, notes, validation, rich text, dimensions and the selected complete
Sheets API metadata model are hashed, including all 208 research columns.
Largest response: 35,046,171 bytes; peak heap: 41,047,912 bytes; peak RSS:
135,651,328 bytes. The fixed grid limit is 64 MiB, metadata limit 1 MiB,
deadline 60 seconds, heap 64 MiB and RSS 192 MiB. No oversized body enters n8n.
The manifest digest is
`71507a82177fc262a58e105e09e0023daee1345d085fdbda8a241f6b04810cf1`.

| Resource | Counted use | Approved ceiling | Remaining |
|---|---:|---:|---:|
| Staging workflows | 4 | 4 | 0 |
| Synthetic tables | 4 | 4 | 0 |
| Synthetic lead identities | 8 | 8 | 0 |
| Cloud executions, including children and failed attempts | 71 | 84 | 13 |
| Matched synthetic row mutations | 154 | 500 | 346 |
| Google GET slots, including prior failed reservations | 39 | 67 | 28 |
| OAuth token POSTs | 4 | 5 | 1 |

There were 38 dispatched Google GETs; one pre-dispatch failed reservation is
conservatively counted. A successful 28-read AFTER would finish at 67 counted
slots / 66 dispatched GETs and five token POSTs. There are no spare retry slots.
Connector preservation reads and schema/SDK validation do not execute workflows.
The critical continuation used 28 executions and 20 matched row mutations.
No production/source/provider writes, real drafts, outgoing messages, paid
research, purchases or additional monetary charges occurred.

S3 is deliberately UNKNOWN_PROVIDER_RESULT and S8 deliberately CLAIMED.
Neither has a provider ID, SENT state or follow-up date. Their locks demonstrate
safe ambiguity recovery; they must not be reset or replayed to tidy the tests.

Two diagnostic mistakes remain recorded: the stale fixture initially used
structuredClone, unavailable in the Cloud sandbox, and failed before writing
(1148); a broad local node --test invocation discovered private archived checks
(1,195 discovered, 29 failures, one skip) and regenerated an ignored offline
synthetic manifest. The supported scoped suite subsequently passed all 472.
No live adapters dispatched from that broad invocation. Use only the documented
tests/*.test.js scope. Original production recovery baselines were preserved.
Diagnostic output also exposed isolated staging signing material and execution
resume metadata; it was never committed. Do not reuse that staging key for
production. Private incident evidence remains retained.

## Remaining limits and shortest release path

1. Finish the already approved 28 AFTER GETs after fresh quota/no-billing/source
   pause confirmation and ordinary-browser owner consent. Every source hash and
   coverage receipt must match BEFORE. Stop on any failure; no automatic retry,
   additional Cloud run, cap increase or partial certification.
2. Stage 2 requires separate authorization for one unsent Zoho draft addressed
   only to the verified owner mailbox. Verify sender/account/recipient isolation,
   provider costs/capacity and exact neutral test copy first; then a durable
   one-time claim, real CREATE_DRAFT, readback, and replay refusal. No send call.
   This is a provider-readiness gate, not part of Stage 1's mocked proof.
3. Review the [exact candidate release manifest](release-candidate-20261009.md).
   Only after Stage 1, Stage 2 and final owner approval may the six audited
   workflow changes be applied and only the panel published. Keep all five
   engines inactive/manual. Git pushes do not deploy n8n.

Data Tables remain a single-operator CAS ledger, not a transactional delivery
system. Concurrent engines, arbitrary maximum HTTP payloads, real provider
idempotency and real-device rendering are not certified. The application audit
payload ceiling is measured in JavaScript characters; the tested UTF-8 size is
503,184 bytes, not a general server byte-limit claim. Human evidence and legal
consent remain operator attestations, not automated proof. The full panel SDK
is 334,876 characters and exceeds the connector's 300,000-character ceiling;
its structural native check uses a representative nonempty Code body after
compiling the actual bodies locally. No full-panel SDK validation is claimed.
Integrity covers the Sheets API model, not Drive permissions/revisions or
external embedded binary assets. No new architecture or automatic retry was added.
