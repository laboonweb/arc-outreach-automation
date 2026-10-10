# Stage 2 final readback: pre-dispatch transport stop

**Not executed; Stage 2 remains incomplete.** The owner approved the bounded
existing-draft readback: one execution, at most three provider reads and three
audited updates. Provider-read ceiling is now 13; owner-row write allocation is
eight. No CREATE, send, delete, retry, source request or deployment is authorized.

## Verified preconditions

- Develop checkpoint `78ce01744c2ca85e9769c312d118df42b433c0c8`, clean checkout;
  508 passing tests and the saved 18-node native validation reused.
- Exact graph/SDK hashes match the [reviewed scope](stage2-schema-diagnostic-report-20261010.md).
- Authenticated editor survives reload: seven trial days, 33/1000 displayed
  executions. Ten tables; numeric storage ceiling is not exposed.
- All six production workflow/version objects, other three staging workflows,
  nine existing tables/108 rows and the single owner receipt match saved baselines.
- Existing included Hobby allowance retained; no billing change, paid service,
  new credential, table or record required. Expected additional charge $0.

## Actual stop and reconciliation

At `2026-10-10 08:27:46 UTC` authorization/preflight were pinned privately.
The staging `update_workflow` request subsequently returned a transport send
error. One read-only `get_workflow_details` reconciliation failed with the same
transport error. Neither result was retried. `execute_workflow` was never called.

The editor remains authenticated. After reload, a read-only JSON export shows
the original nine-node control, inactive, version
`18c3a6f5-6ec0-40b8-9ffd-5e14f4e06db3`; original Code node bodies and connections
match. The 18-node readback graph is absent. No restoration write was necessary.
Editor export serialization omits defaults, changes group representation and
adjusts layout, so it is not claimed byte-equal to the complete MCP object.
Full post-stop workflow/table API reconciliation remains unavailable.

Private before hashes, authorization ledger, STOP, export and comparison evidence
are preserved. Nothing private was selected for Git. No new tests were needed:
this attempt changed no application source, fixture or candidate artifact.

| Resource | This attempt | Current cumulative / authorized ceiling |
|---|---:|---:|
| Cloud executions | 0 | 80/84 |
| Provider reads | 0 | 10/13 |
| Total row mutations | 0 | 159/500 |
| Owner-row writes | 0 | 5/8 |
| Real CREATE_DRAFT | 0 | 1/1, exhausted |
| Google GETs / token POSTs | 0 / 0 | 67/67; 5/5 |

No table/provider operation was dispatched by this attempt. Production data was
not targeted. Separate post-stop API preservation proof is still required before
resuming; preflight proof does not replace that requirement.

## Shortest remaining path

Recover the existing n8n MCP connection without changing production credentials.
Then re-establish read-only preservation, exact owner receipt and staging-version
preconditions before installing the already approved graph. No automatic retry,
new budget extension or alternative provider path was taken after this stop.
The exact draft header/content/unsent-state readback and native duplicate refusal
remain open. Production release stays blocked until they pass and the owner
separately approves deployment.
