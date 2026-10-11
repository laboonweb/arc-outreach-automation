# Australia 500 amended capacity preflight

The owner's 2026-10-11 amendment replaces only the exact account-specific Data
Table quota proof with a bounded-risk capacity decision. That capacity gate now
passes. Deployment has not started; other mandatory gates remain in force.

## Capacity decision

- The authenticated n8n table list shows ten tables totaling approximately
  0.83 MB. No storage-limit or approaching-limit warning is visible.
- The account-specific storage ceiling and free space remain unknown.
- [Official n8n documentation](https://docs.n8n.io/build/work-with-data/data-tables/)
  describes a 200 MiB default and warnings at 80% and full capacity. This is
  supporting platform context, not a measurement of this Cloud instance.
- Exactly 15 small inserts are planned: five Queue, five Inbox and five Links.
  The 500 research records belong in the new workbook, not Data Tables.
- Saved pilot payloads total 53,347 bytes. A conservative planning estimate of
  three times that payload plus 4 KiB per inserted record is 221,481 bytes.
  The existing 262,144-byte (256 KiB) reserve is retained. This estimate allows
  for overhead; it does not guarantee a database allocation ceiling or future
  operator-history capacity.
- The owner explicitly accepts residual instance-quota uncertainty for this
  pilot. Any warning, full-storage condition or insertion-capacity error stops
  the run immediately, without retry or deletion.

## Fresh verified preservation and included capacity

All nine relevant workflows match their preserved objects and versions exactly:
six affected workflows, unchanged Grounded Copy/Zoho and staging control.
All ten tables and original 109 records match exactly, including protections,
history, synthetic records and the existing owner draft claim/receipt.
Private recovery copies and a timestamped receipt were retained separately.

The six candidate JSON hashes, their SDK hashes, bootstrap hash and granular
operation-file hash match the reviewed implementation at
`4de7f6ec117d7effbea1a29e5b5ccc9a995cf0b6`. All four saved source XLSX hashes
match; the original three registry objects remain unchanged. These are local
source-export checks, not new live Google reads.

The editor is authenticated and displays Trial, seven days remaining and
37/1,000 executions used (963 remaining). No upgrade or add-on was requested.
All five Phase 2 engines remain inactive/manual. Zoho retains the three exact
fail-closed backend nodes; CREATE_DRAFT is a throwing Code node, with no
provider HTTP transport. The unchanged panel keeps Zoho handoff disabled.

## Remaining prerequisite evidence

The existing credential is connected through n8n's Managed OAuth2 mode. Its
allowed HTTP domain is exactly `sheets.googleapis.com`. No credential was
changed, disconnected or exposed.

Neither the credential UI nor MCP metadata exposes its connected Google account
identity, that account's workbook Editor permission, or its managed OAuth
project's actual read/write quotas. The separate Arc Integrity Desktop project's
quotas cannot establish these values. The owner subsequently confirmed Editor
access for the existing connected account. This resolves the owner-access
confirmation gate; native API access is still checked by the approved bootstrap.
Actual managed-project quotas remain unknown. The owner explicitly approved
the documented bounded quota-risk exception on 2026-10-11. That prerequisite
is now satisfied under the exception, without claiming measured quota limits.

[Google's published limits](https://developers.google.com/workspace/sheets/api/limits)
give 300 project/60 user requests per minute for each read/write class and describe
standard API use as having no additional cost within quota. Published defaults
are not recorded as measured managed-project quotas.

If those managed-project quotas cannot be obtained, a separate, explicit owner
exception is required. The prepared bounded alternative retains the exact
reviewed candidate and all original ceilings: at most 39 reads and 21 writes
across the entire integration, each below Google's published 60-per-user-minute
default for its respective class. This is supporting risk context, not proof of
the managed project's quota or current shared usage. Keep source-writing runs
and operator writes paused; stop on any quota/authentication/cost error without
retry, and reconcile partial writes using the existing recovery plan. No quota
increase, billing change, credential change or extra request is proposed. This
alternative was separately authorized by the owner's subsequent approval.

Live native schema, absence of Arc Research and response-size checks remain
within the first approved bootstrap execution. No request has been made to
substitute for the missing pre-dispatch access/quota evidence.

## Consumption

Zero Cloud executions, Google Sheets GETs, batchUpdate calls, Data Table writes,
provider calls or sends occurred during this amended preflight. Workflow graphs
and publication states are unchanged; no live panel load, credential change,
main promotion or release tag occurred. Existing local tests were reused.

The authorized ceilings remain four executions, 39 GETs, 21 new-output-only
batchUpdate calls and 15 inserts, with zero existing-row updates. No budget
extension or broader capacity exception has been inferred.

## Subsequent pre-write browser-access stop

After quota-risk approval, a fresh MCP reconciliation again matched all nine
workflow objects/versions, all ten tables and all original 109 records exactly.
The exact reviewed deployment operations and runtime artifacts were loaded;
no mutation tool or execution tool was invoked.

The attempt to open only the n8n Data Tables administration page was rejected
by browser security policy, which reported user-denied domain access. This is
a browser-access restriction, not a demonstrated n8n application or OAuth
failure. No alternate browser, indirect request or bypass was attempted.

Deployment stopped before writes because the required UI access and final
single authenticated panel visit cannot be completed under that restriction.
Restore browser access to `https://briann.app.n8n.cloud` before continuing.
All resource budgets remain unused. The original integration approval and the
two bounded-risk exceptions remain recorded; no new scope is proposed.

The owner subsequently reported access restored. A single new administration-tab
attempt was still denied, now explicitly because of a saved user permission
setting for the n8n domain. Workspace full filesystem/network access does not
remove this separate browser rule. No alternate interface was used to bypass
the denial, and no production mutation or execution occurred. Clear that saved
browser site block to resume the unchanged authorized deployment.

The owner's next screenshot shows the n8n site's Browsing setting as "Always
allow". One administration-page attempt after that change was nevertheless
rejected with the same saved-site-block error. The permission UI and the
enforced browser policy therefore disagree; the cause has not been established.
Available permission tools manage plugin permissions, not browser-origin rules,
so they cannot reconcile this discrepancy. No further browser retry or alternate
access path was attempted. A full Codex restart is the next owner-side recovery
step to allow a fresh policy check; it is not claimed to be a proven fix.

The approved checkpoint remains unchanged. Deployment consumption is still
0/4 executions, 0/39 Google GETs, 0/21 batchUpdate calls and 0/15 inserts.

After the owner restarted Codex and replied "resumed", one new attempt to open
the Data Tables administration page was rejected by the same saved-site-block
policy. Restart did not resolve the discrepancy. No alternate browser, direct
HTTP request, cookie access or policy-file change was attempted. The current
session's browser inventory was empty, so no live panel was loaded incidentally.
All deployment budgets remain unused; no application code or Git checkpoint
changed. This is a persistent browser-policy blocker, not evidence that the
n8n credential, workbook permission or application is broken.

A separate, read-only n8n MCP metadata lookup succeeded after restart. The
inactive staging control still has version
`1336d6eb-7145-4ee7-b035-db267b3185a3`, and the connection reports execution
permission. This verifies connector access without opening the blocked website
or executing any workflow. It does not establish fresh subscription usage or
browser authentication.

## Prepared alternative requiring owner approval

Use the existing scoped n8n connector for the exact reviewed deployment and
preservation checks. Reuse the last verified 37/1,000 execution allowance and
0.83 MB storage observation, explicitly recording their age rather than claiming
fresh UI verification. Retain both already approved quota-risk exceptions and
all native schema, size, permission, write and preservation guards. Defer the
final single authenticated panel visit to the owner; do not claim its AU500
rendering check passed until that visit is completed.

The first three approved executions require at most 31 Google GETs, 21 new-tab
batchUpdates and 15 inserts. The original four-execution/39-GET ceilings remain
unchanged, including the reserved final owner visit. No browser-policy change,
new credentials, code changes, provider access or additional resource budget
is proposed. This alternative is prepared only, not authorized or dispatched.

The owner subsequently approved the connector-only alternative. Fresh
reconciliation and artifact verification passed, but the first atomic staging
update returned a tool error and did not apply. No execution or data write
followed. Complete final preservation reconciliation passed; details and the
specific response-reporting mistake are recorded in
[the connector deployment stop report](au500-connector-deployment-stop-20261011.md).
