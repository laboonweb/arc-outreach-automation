# Workflow specification

## Parent: lead-research.json

Manual trigger -> Configure -> metadata -> formatted source grids -> normalize all
three datasets and compare duplicates -> bounded batch -> sequential worker calls
-> plan Arc Research writes -> dry-run preview OR Google batchUpdate -> summary.
Run complete reports aggregate intake/status counts, planned rows, existing output
IDs/states and hashes of read source values/fills. It reports the output snapshot
before that run's writes; a subsequent read verifies the resulting rows.

Defaults: dry_run=true, limit_per_dataset=1, offset_per_dataset=0. All primary rows
are compared before selecting each dataset's slice. A wholly empty slice fails.
The configurable cap is 25, but the instance's 180-second execution limit requires
small batches. Slow sites can still time out. Inspect failures before rerunning.

Read workbook metadata, Read source grids, and Write Arc Research share Google
Sheets OAuth2 on native HTTP nodes. HTTP is needed for effective formatting and
strict cell-level output writes. Responses match spreadsheetId, not arrival order.
Metadata validates required tabs and prevents output sheet-ID collisions.

All write plans validate before mutations begin. Existing Arc Research rows match
lead_id. New output tabs get machine and reviewer headers. Reruns update only the
machine prefix. Source cells and formatting are never changed. Wrong result identity,
ambiguous output IDs and changed machine headers stop writes. No automatic retry.
Google batchUpdate is atomic per workbook, not across three workbooks. One run at a
time; no concurrent sheet edits. An ambiguous write must be inspected before retry.

## Worker: research-one-lead.json

One {lead, config:{allowed_hosts:[]}} input produces one flat research result.
Initialize -> next request -> request gate -> wait -> GET -> observation -> loop.
The false gate finalizes facts, score, routes and protected status. DISQUALIFIED,
PARKED and DO_NOT_CONTACT skip network research. SENT may refresh without resetting.

Maximum six GETs, 15-second timeout, one-second pacing, three redirects per route,
two discovered same-host contact/about links within the total cap. Exact reviewed
host allowlist, HTTP redirects disabled, no TLS bypass. Public GETs use no credentials.
HTTP errors become observations; unknown error shapes stay uncertain. Code uses only
pure JavaScript and crypto; native HTTP nodes handle network access. Modules are
recursively bundled by build-workflows.js. No paid API, search/model or sender.

## Error draft: research-errors.json

Error Trigger -> safe failure summary. Logs only execution ID, workflow and failed
node. No notification delivery. Saved inactive and unlinked: the MCP requires
publication before linking a shared error workflow, outside this task. Inspect
manual failures directly in n8n.

## Later phases

lead-analysis, outreach-email, social-dm-queue, follow-up and reply-classification
remain separate future contracts. Phase 2 requires explicit approval after real-sheet
acceptance. Future sends need a transactional campaign/recipient/step ledger plus
suppression/reply reconciliation; Sheets upsert is not an exactly-once send ledger.
