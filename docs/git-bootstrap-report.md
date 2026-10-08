# Private Git bootstrap verification

8 October 2026. Private repository: `laboonweb/arc-outreach-automation`.
The exact initial commit is the root commit containing this report; resolve it
with `git log --reverse --format=%H`. Final push receipts are retained privately.

This checkpoint contains the signed-off local Stage 0 implementation and the
subsequent bounded Stage 1 fixes already in the working tree. **Cloud validation
is incomplete. The initial main revision is not production validated.** No
application logic, review asset or n8n resource changed during Git setup.

## Tests and preservation

- Existing workspace: **406 passed, zero failures, zero skips**.
- Clean staged checkout with both synthetic configuration examples, freshly
  generated offline exports and no production snapshots: **405 passed, zero
  failures, one skip**. The skipped test requires six private workflow baselines.
- Every one of the **1,398 pre-existing files** still exists. All original
  application, review asset, generated workflow and private recovery files retain
  their original SHA-256. Only `.gitignore`, README and three test files changed.
- Test changes are privacy metadata and synthetic-unit isolation, not application
  behavior changes. Exact original test bytes are preserved privately.

## Security review

Every selected Git blob was scanned, rather than trusting `.gitignore` alone.
No secret, real contact, live workbook ID or sensitive lead match remained in
the reviewed tree. The audit used credential/key/token/authorization patterns,
high-entropy review and exact private comparisons: three signing values, 687
business names, 148 contact emails and three workbook IDs.

Seven benign findings are allowed only for their exact reviewed line hashes:
two local filenames, two fixed local-test signing fixtures, two negative
`user:pass` example URL fixtures and one natural-language authentication phrase.
A short business-name collision with public suffix data is allowed only in the
exact reviewed public suffix file hash. Real signing values, contact emails and
workbook IDs have no waiver. The audit and manual review found no secrets to
commit; unknown secret formats and privileged bypass remain outside its guarantee.

Private configuration, all snapshots, synthetic runtime state, provider receipts,
databases, workbook/lead exports, generated workflow JSON/SDKs and historical
reports/utilities containing live lead information remain excluded and preserved.
`.env.example` contains empty optional values only. Templates use synthetic IDs.

## Branches and Cloud boundary

`main` is the reviewed local checkpoint; `develop` starts at the same commit
and is the working branch for future changes. The repository supplies a local
pre-commit audit hook, PR template, release/tag procedure and dated Git/n8n map.
The review policy is advisory; no server-side branch rule, paid GitHub feature,
GitHub Actions or automatic deployment is configured. No production release tag
is created for this incomplete candidate.

No Cloud test, workflow/table write, provider draft, send, paid service or
production-data change is part of Git setup. The prior Cloud stop and cumulative
ledger remain authoritative: editor HTTP 401; 41/84 executions; 134/500 synthetic
mutations; 2/7 integrity GETs. Resume only after authentication and capacity/cost
checks pass. The full three-workbook integrity gate needs a revised read ceiling.
Stage 2 and production deployment require separate explicit approval.

See [the operating procedure](version-control.md) and [version map](n8n-version-map.md).
Detailed hashes, audits, original test copies and test outputs remain in ignored
`private/git-version-control/`. No original snapshot or recovery evidence was deleted.
