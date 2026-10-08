# Version control and release procedure

8 October 2026. Repository: `laboonweb/arc-outreach-automation`, private.

The initial commit preserves the signed-off local Stage 0 implementation and
subsequent bounded Stage 1 corrections already present in this workspace. It is
a reviewed local checkpoint, not a production-validated release. Stage 0 had 396
passing tests; the current pre-Git candidate had 406. No application or Cloud
workflow logic changes are part of Git setup.

## Branches and review

- `main`: reviewed, locally tested checkpoints. Cloud readiness must be stated
  separately for every checkpoint. The initial bootstrap is explicitly approved
  by the owner; future changes go through a pull request.
- `develop`: integration and continuing bounded validation work. Start future
  changes here, preferably in a short `fix/...`, `feature/...` or `test/...` branch.
- Open a PR from the feature branch to `develop`; record scope, tests, privacy
  audit and remaining Cloud gates. Promote `develop` to `main` with a reviewed
  release-checkpoint PR after its declared gates pass. Do not force-push shared
  branches. Branch review is an operating policy, not server-enforced protection.

Use the supplied PR template. No GitHub Actions, paid protection feature,
deployment integration, webhook or n8n automation is configured.

```powershell
git switch develop
git switch -c fix/short-description
node --test tests/*.test.js
git add <reviewed-files>
node scripts/audit-git-index.js
git diff --cached --check
git commit -m "fix: describe the result"
git push -u origin fix/short-description
gh pr create --base develop
```

Install the local offline pre-commit guard in each clone:
`git config core.hooksPath .githooks`. The current workspace has it installed.
The hook is a convenience, not access control: it can be bypassed, and private
deny lists stay on the owner's machine. Review the scanner and its exceptions in
PRs. No custom filter changes committed file contents; `.gitattributes` preserves
existing bytes and line endings.

## Sensitive artifacts and reproducibility

`.gitignore` denies new files by default, then permits reviewed source extensions,
known synthetic fixtures and safe documentation. It excludes the complete
`private/`, `outputs/` and `workflows/` trees; real `config/datasets.json` and
`config/n8n-workflows.json`; environment/credential/key files; SQLite databases;
workbook/execution exports; generated SDKs; and named historical reports/utilities
containing live prospect information. Ignoring is not a backup: preserve and
secure those original files and recovery evidence separately. Never `git clean -x`.

All application source, review assets and original private artifacts remain on
the owner machine. Safe builders are tracked; generated workflows are rebuilt
locally only against explicitly supplied private configuration/baselines. Some
historical live-validation utilities are deliberately local-only. Their commands
are not supported on a fresh checkout without authorized private files.

Only test metadata changed for privacy: deterministic variation uses four
synthetic business labels; a private-regression title removes prospect names;
the research-batch synthetic unit tests load the unchanged source with fail-closed
adapters for three historical private-data helpers. Those tests never execute the
adapters. Original test files are preserved privately.

For a fresh checkout, follow README's synthetic configuration/build steps. Do not
overwrite an existing real registry. Local tests make no paid or Cloud requests.
The six-production-export reconstruction test explicitly skips without the
private baselines. Another historical regression returns early if its private
snapshot is absent; its passing test label is not live-data coverage. Run that
regression on the original workspace before a release.

The offline guard audits every staged blob, and `node scripts/audit-git-index.js
HEAD` audits the committed tree. It checks credential/key/token patterns, literal
authorization and URL credentials, high-entropy literals, populated environment
examples, and forbidden artifacts. On this machine it also compares exact private
signing values, 687 business names, 148 contact emails and three workbook IDs.
Seven narrowly reviewed false positives are pinned to their exact line hashes:
public local filenames, fixed test signing strings, example credential URLs and
ordinary authentication wording. Exact private-value matches cannot be waived.
The public suffix data has a documented short-name collision exception; private
emails, secrets and workbook IDs are still checked there. This is an audit result,
not a guarantee against every possible secret format or privileged bypass.

## Release tags and n8n versions

For a local-only milestone use an annotated tag such as `stage0-local-v0.1.0`,
whose annotation says Cloud validation is incomplete. Reserve `vX.Y.Z` for a
separately approved production release after Cloud gates, read-back and rollback
evidence are complete. No production release tag is created during bootstrap.
Tags never publish a workflow. Commit the sanitized release record first, then
tag that immutable commit; keep secrets and detailed exports private.

The [version map](n8n-version-map.md) records the last verified production IDs
and versions. For every later approved Cloud change, record:

- Git commit SHA and clean working-tree verification;
- workflow ID and previous expected `versionId`;
- canonical source hashes and privately stored candidate/export SHA-256;
- new read-back `versionId`, active/published state and validation outcome;
- separate owner approval, private baseline location and rollback result.

An expected-version mismatch stops the update. Refresh the baseline through
read-only checks; never overwrite another operator's edits. Production baselines
are recovery evidence, not tracked configuration. Reverting a Git commit does
not roll back Data Tables, provider records or operator history.

## Cloud continuation boundary

The last saved ledger is 41/84 executions, 134/500 synthetic mutations, four
inactive unpublished workflows, four tables, eight lead identities and 2/7
integrity GETs. No new Cloud mutation occurred during Git setup. Editor HTTP 401
must be resolved before continuation, followed by current allowance/storage/cost
checks. Do not use connector authentication to bypass the editor stop.

The five remaining integrity GETs cannot cover a fresh before/after pair for all
three workbooks, which requires six successful reads. A reviewed direct route
and a revised request ceiling are required for that gate; do not follow the
previous HTTP 307 redirect or retry it silently. All other approved staging work
must reuse the same four resources, eight identities and cumulative ledger.
Production publication, Stage 2, sending, paid calls and prospect provider drafts
remain excluded. Any real provider test additionally requires its existing
separate approval and account, recipient, isolation and cost checks.
