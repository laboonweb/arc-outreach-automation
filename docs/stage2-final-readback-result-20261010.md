# Stage 2 final readback: Drafts identity stop

**Stage 2 remains incomplete; production release is blocked.** Execution `1176`
made one frozen read-only folder request and persisted one failure audit. It
stopped on `EXACT_DRAFTS_FOLDER_REQUIRED`. No header/body request, native duplicate
selection, CREATE retry, send, deletion, source request or production change ran.

## Preconditions and dispatch

The restored MCP connection passed fresh full reconciliation: all ten workflow
objects, ten table definitions and 109 rows matched the saved pre-stop hashes.
The original execution `1171` claim, provider ID, exact message hash and prior
audits were unchanged. The signed-in editor survived reload; it displayed
34/1000 account executions and seven trial days. Account usage is distinct from
the conservative Stage validation ledger.

The owner-confirmed Hobby plan includes 100,000 ordinary monthly tool calls.
The same included frozen read tools were used; expected additional cost was $0.
Billing usage was not independently refreshed. No numeric Data Table storage
ceiling is exposed by the available UI/API; this run needed no new table/row.

The exact reviewed 18-node candidate was installed in seven bounded MCP updates,
then independently compared against the saved nodes, parameters, credentials,
connections, settings and groups. It remained inactive/unpublished, with execution
retention disabled. No acceptance rule or runtime candidate changed.

- Graph SHA-256: `164bf4501e66e2755bb2b4182c29973190fb7ebb7ccd42787fa085cc523b919d`.
- SDK SHA-256: `3687f6cf5865f7f4921d1e59b3e565a8725b46ea664d8e9f24645c0b482110ab`.
- Installed staging version: `34b55f4b-5e00-4b1b-a791-474b457eef5d`.
- Frozen provider tool version: `20260915_00`.
- Prior 508 passing local tests and 18-node native validation reused; no source
  changed and passing Stage 1 scenarios were not repeated.

## Observed result and durable persistence

`ZOHO_MAIL_FOLDERS_LIST_FOLDERS` returned 3,073 bytes. The recorded schema shows
valid JSON, Composio success, native status 200 and a `folders` array. The strict
folder identity predicate failed. It requires exactly one canonical Drafts
folder, the exact name/path, unarchived state and an exact account-associated URI
with a lossless folder ID. The combined failure does not identify which of those
fields differed. Missing fields were not treated as success.

The owner row independently reread from Cloud contains a stage-one STOP bound to
execution `1176`, request digest and existing draft-ID digest, plus one new
`OWNER_READBACK_STOP` audit at `2026-10-10T09:07:41.664Z`. Only `payload` and
`updatedAt` changed. All other columns, prior payload fields and prior audit
entries matched exactly. No readback success certificate exists.

The workflow's reread/verification boundary prevents subsequent provider reads
after this persisted STOP. Headers, body/unsent certification and native duplicate
refusal were not reached. Execution metadata retrieval returned not found, as in
earlier retention-disabled runs; the execution-bound durable row is the evidence,
not a retained execution log. Raw folder items were deliberately not retained,
so the precise failed identity field cannot be recovered from this receipt.

## Restoration and preservation

Control `ml9StJJLEqWXjgC5` was restored to the original nine-node graph at version
`1336d6eb-7145-4ee7-b035-db267b3185a3`. Nodes, credentials, connections, settings
and groups match the saved pre-dispatch configuration; inactive/unpublished.
Its new version ID is expected staging history.

Fresh complete post-stop hashes confirm all six production workflow/version
objects, the other three staging workflows and all 108 pre-existing rows unchanged
(81 production, 26 Stage 1 synthetic, one older claim). All ten table definitions
are unchanged except the owner table's expected `updatedAt` after its audited
row update. Protected records, historical outreach and stored provider receipts
are covered by the full row hashes. The original owner claim/provider ID/content
and earlier STOP/schema evidence remain exact. No credential or provider settings
were changed; the existing draft was never sent or modified by this run.

## Exact consumption

| Resource | This run | Cumulative / authorized ceiling |
|---|---:|---:|
| Cloud executions | 1 | 81/84 |
| Counted provider reads | 1 | 11/13 |
| Total row mutations | 1 | 160/500 |
| Owner-row writes | 1 | 6/8 |
| Real CREATE_DRAFT | 0 | 1/1, exhausted |
| Google GETs / OAuth POSTs | 0 / 0 | 67/67; 5/5 |
| New tables / new records / sends / deletes | 0 / 0 / 0 / 0 | None |

Remaining numerical capacity does not authorize continuation after this STOP.
Private before/after hashes, exact owner row, reservation, consumption and
restoration evidence are preserved outside Git. Only sanitized documentation is
selected for the development checkpoint; no application logic changed.

## Remaining release gate

Identify the actual failed Drafts identity field through a separately approved,
bounded read-only diagnostic before changing the adapter. That diagnostic must
record fixed field-check names/types without retaining raw account/mailbox data,
keep every identity requirement, use this existing account/draft/receipt only,
and stop without continuing or retrying. No such read was dispatched here.

Exact provider-ID/header/content/unsent verification and the native duplicate
selection still need to pass. The existing release manifest and implementation
checkpoint are preserved, but final production approval is not requested as a
passed release gate. Stage 1 remains signed off.
