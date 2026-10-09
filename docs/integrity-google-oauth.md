# Owner-operated Google authorization

Use the owner's ordinary Chrome, without a browser connector or automated sign-in.
The existing `arc-integrity-stage-1` project has the Sheets API enabled. Keep
Google Auth Platform External/Testing, with only the owner as a test user and
only `https://www.googleapis.com/auth/spreadsheets.readonly` in Data Access.
Create a Desktop client named Arc Integrity Read Only. Leave the AI-agent option
unchecked: this is an owner-operated direct API integrity check.

Download the client JSON into
`private/operator-stage1/google-oauth/credentials-google-desktop.json`.
The folder and file must allow only the current Windows owner, SYSTEM and
Administrators. Same-volume moves can preserve an unsafe Downloads ACL, so check
both file and folder. The helper refuses a broader ACL, wrong project, non-Desktop
client, malformed JSON or unexpected Google endpoint. Client values never enter
Git, chat or command-line arguments. If a creation screenshot exposes a secret,
add a replacement, save its JSON privately and disable the exposed entry. Keep
earlier recovery evidence; do not delete provider or production records.

`node scripts/authorize-integrity-google.js --check` is an offline, redacted
project/type/ACL/digest check. The default command is also offline. The live
`--authorize-probe` command requires a private pinned approval file, fresh owner
confirmation of current quota/cost/source-editing pause, the selected client
digest, and `singleProbeOnly: true`. Non-OAuth gates use
`VERIFIED_EXCEPT_OAUTH`; the granted scope is verified only after exchange.
The existing 14-GET ceiling can cover this one probe; a full BEFORE still needs
the separately conditionally approved paired capacity. No cap is raised by the
helper.

The helper prints a random local `http://127.0.0.1` page. Manually paste that local
address into ordinary Chrome, click Continue to Google, select the configured
owner account and inspect the app and permission. Approve only viewing Sheets.
Do not approve editing, Drive, Gmail or identity permissions. Stop on an
unexpected app, extra scope, sign-in rejection or other failure. Do not paste
authorization codes, callback URLs, JSON or tokens into chat. The local callback
verifies a fresh state and S256 PKCE challenge, permits one callback, binds only
IPv4 loopback and expires after ten minutes. No browser is opened automatically.

Exactly one bounded OAuth token POST is permitted in this attempt: strict TLS,
pinned OAuth endpoint, 64 KiB response cap, 60-second deadline, no redirects or
retries. The actual response must grant exactly Sheets read-only with a Bearer
token and valid expiry. Access tokens and codes remain in local process memory;
any refresh token is discarded. No tokens are written to an environment file,
process command, disk receipt, console or chat. Native app client secrets are
not a substitute for PKCE or owner consent. The grant itself covers Sheets
accessible to the account; the integrity runner pins the three approved book IDs.

After a valid grant, the helper invokes only `runProbe`, once, directly in the
same process. It never invokes BEFORE, AFTER, n8n or a provider. The first book's
complete allocated Arc Research grid and all 208 headers must pass the existing
64 MiB streaming, 60-second, 64 MiB heap and 192 MiB RSS bounds. No research cell
contents are exported. A valid probe produces AWAITING_REVIEW and exits; it is
not a complete workbook or BEFORE integrity certification. All remaining 55
GETs and Cloud executions require the next gate.

Private receipts record only client/manifest digests, exact scope, expiry,
attempt counts, redacted statuses and the existing compact grid integrity
receipt. An initial authorization receipt is created exclusively; a prior
attempt or integrity probe prevents silent replay. Failed replacement files are
preserved. Any uncertain persistence or transport failure stops. Inspect the
durable ledger to establish attempted GET consumption; never infer zero from a
failed response or retry a Google operation automatically.

## Locally proven receipt recovery

The original local writer reproduced EPERM on its third synthetic replacement
in the actual workspace. The shared replacement writer flushes a unique file,
verifies its hash, and permits at most eight rename attempts spaced 50 ms apart
only for EPERM/EACCES/EBUSY. Every retry requires unchanged original bytes and
an intact replacement. Unknown errors, conflicts, flush/read-back failures or
exhausted attempts stop and preserve recovery files. This is local file recovery,
not a network retry. Eighty native synthetic replacements in the regular and
owner-restricted folders passed, with five transient refusals recovered. The
specific process causing the sharing refusals was not identified or disabled.
The persistence module is pinned in the integrity manifest.

An explicitly approved new probe attempt uses a 32-character hex attempt ID and
separate approval, probe and authorization receipts. Original failed receipts
and budget history remain untouched. Reusing that attempt is refused. The
helper counts all preserved OAuth token POST receipts and enforces the approval's
budget, with a maximum of four. Default remains two; no budget is increased by
source code alone. The flow still invokes only one Google probe and stops.

The corrected persistence attempt ran once after renewed ordinary-Chrome
consent. Its one token POST and one Sheets GET fit existing budgets. Exact scope
and durable receipt writes passed, but the probe stopped at the strict
research-header order check. Two total token exchanges are now consumed; the
default token budget is exhausted. GET accounting is 8/14, including the old
pre-dispatch reservation. No remaining request ran.

Saved header receipts prove the verifier rejected existing reviewer layouts
that contain all 208 fields. The local correction preserves the 113-field
machine prefix, requires every field exactly once and hashes extra columns.
Three saved layouts pass synthetic replay; another live certification is still
needed. A new probe requires one additional token exchange. A fresh complete
pair would total 64 counted GET slots; separate probe/BEFORE/AFTER consents would
mean five total token POSTs. Those changed budgets require owner approval; the
helper currently refuses a token ceiling above four. Do not run another probe,
raise that guard, or begin phase authorization without the next approved scope.

Local regressions use synthetic client/grant data and localhost only. They cover
client and ACL refusal, PKCE and exact scope, token transport bounds, owner
denial, state/replay checks, listener expiry, credential-free browser output and
single-probe budget separation. Application candidates and Cloud graphs are
unchanged. Live authorization and probe results are reported separately.

References: [Google desktop OAuth](https://developers.google.com/identity/protocols/oauth2/native-app),
[consent configuration](https://developers.google.com/workspace/guides/configure-oauth-consent),
[client and secret management](https://support.google.com/cloud/answer/15549257).
