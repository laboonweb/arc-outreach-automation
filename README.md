# Arc Outreach Automation

**Current development checkpoint, 9 October 2026: signed-off local Stage 0
implementation with bounded Stage 1 corrections. Cloud validation is incomplete;
this revision is not production validated.** Editor authentication remains stable.
The owner approved the corrected 256-column integrity recovery. Its first Google
GET succeeded, but the actual Cloud validator rejected a response exceeding the
approved 8 MiB body limit. It returned the redacted failure
`INTEGRITY_NATIVE_BODY_LIMIT`; no usable BEFORE receipt was produced. Cloud
testing stopped without retry. The isolated control was restored exactly, and
fresh production and synthetic preservation checks passed. The unchanged local
candidate retains its recorded 420-test and SDK validation results.
Totals are 43/84 Cloud executions, 134/500 synthetic mutations and 6/14 integrity
GETs. Complete paired source integrity remains blocked. A smaller complete-coverage
read plan and any request-budget revision require review before another Cloud run.
Stage 2 and production publication remain on hold.

See the [current readiness report and proposed integrity replacement](docs/readiness-20261009.md).

See [version control and release procedure](docs/version-control.md) and
[Git to n8n mapping](docs/n8n-version-map.md). Git pushes do not deploy n8n.
Private runtime state, credentials, snapshots, workflow exports and historical
reports containing live prospect details are excluded. Some older links below
refer to those local-only reports.

For a **new clone only**, prepare offline synthetic configuration and exports:

```powershell
Copy-Item config/datasets.example.json config/datasets.json
Copy-Item config/n8n-workflows.example.json config/n8n-workflows.json
New-Item -ItemType Directory -Force workflows
node scripts/build-workflows.js
node --test tests/*.test.js
```

Do not overwrite existing local configuration. No dependencies or network calls
are needed for these commands. The export reconstruction test skips without
private production workflow baselines; local success does not prove Cloud behavior.

The remaining text records earlier system milestones. Dated validation reports
and historical counts are not the present candidate's release disposition.

Research-only V1 for three separate Arc Web Works lead workbooks. It reads existing
source tabs and legacy colours/history, flags possible duplicates, checks reviewed
website candidates and upserts only Arc Research in each workbook.

Phase 2 now operates through the Cloud
[Arc Phase 2 Outreach Inbox](https://briann.app.n8n.cloud/projects/CPU2qIgS09cANFUG/datatables/LuAliUIL44hW2inO).
Use its [daily routine and editable controls](docs/phase-2-inbox.md). The existing
Review Queue remains the canonical ledger. The original local MVP is preserved.
Email sending and social sending remain manual.

For the preserved local MVP only, [open its local review queue](http://127.0.0.1:4318)
after running `node scripts/review-server.js`. See [Phase 2 MVP](docs/phase-2-mvp.md).

Updated inactive drafts are saved in n8n:

- [Three dataset research](https://briann.app.n8n.cloud/workflow/RuH5G0KYDeiTxsVP)
- [Research one lead](https://briann.app.n8n.cloud/workflow/p7OGMUTPCP87lNTp)
- [Error-summary draft](https://briann.app.n8n.cloud/workflow/OooTRWNkIw4h6vMU), unlinked
- [Phase 2 ten-lead draft validation](https://briann.app.n8n.cloud/workflow/aXyAXKE8v6Ew6qLg), read-only and inactive

The parent references the worker, all three verified sheet IDs are configured, and
Google Sheets OAuth is connected and permits sheets.googleapis.com. Live reads,
one output row per workbook and a repeat upsert have succeeded. Only Arc Research
was written; source values and fills read by the workflow have unchanged hashes.
Default is a dry run, one lead per dataset; the Cloud instance has a 180-second
execution limit. All 55 Manila Legacy leads carry an owner-confirmed prior-contact lock.

## Start here

[Setup](docs/setup.md) lists the exact three URLs and OAuth nodes.
[Validation](docs/validation.md) records local, Cloud and real-sheet checks and their limits.
[Data schema](docs/data-schema.md) lists every source tab and ownership/status policy.
[Architecture](docs/architecture.md) explains evidence and runtime boundaries.
[Workflow specification](docs/workflow-spec.md) describes node behavior.

```powershell
node scripts/build-workflows.js
node --test tests/*.test.js
node scripts/demo.js
```

No dependencies required. Tests/demo are synthetic and make no network requests.
The optional offline audit reads ignored private workbook snapshots:
`node scripts/audit-snapshots.js`. Do not commit those snapshots or execution data.

Current evidence: 93 local tests pass; 689 real source rows normalize offline; 25
n8n node configurations and three SDK workflows validate; saved parameters/connections
match local exports. Real OAuth, formatted grid reads, worker calls and bounded
upserts have passed. This does not mean all 689 businesses have been researched.

Qualification 2.1 separates commercial quality, contactability, research confidence,
readiness and compliance. A verified commercial case uses activity, legitimacy,
unresolved gap and business case, independently of contact or consent. MEDIUM can
also describe explicitly provisional potential with the gap still unverified.
People and triggers are optional. Activity uses weighted 6/12-month evidence,
requiring corroboration for older signals. Australian consent stays separate.
READY_FOR_REVIEW and SAFE_TO_REVIEW never authorize sending.
[Recalibration validation](docs/qualification-recalibration.md) records the same-35
before/after comparison and remaining evidence bottleneck.

Source tabs/colours stay intact. Arc Research contains machine columns plus separate
reviewer controls that survive upserts. Protected states, historical contacts and
duplicate locks prevent automatic revival or another initial touch. Future sending
still needs provider-specific delivery reconciliation and explicit authorization.
The Phase 2 SQLite ledger protects draft identity, approvals, suppression and
manual-send history; it does not claim exactly-once email delivery.

The first Phase 2 validation covers ten existing records: one real email draft,
six manual-research records and three blocked records. There are not ten
evidence-backed real drafts available. Social drafts and follow-up transitions
passed synthetic checks; no real record was approved or sent. Composio Zoho
CREATE DRAFT has an inactive, disarmed transport using the existing n8n credential.
Real provider validation still requires the supplied non-secret account IDs and
explicit approval of the one selected message. The manual email fallback remains.

Earlier milestones preceded Git initialization. This repository versions source
and safe documentation only; publication requires separate explicit approval.
