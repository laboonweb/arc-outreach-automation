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
failed response or retry automatically.

Local regressions use synthetic client/grant data and localhost only. They cover
client and ACL refusal, PKCE and exact scope, token transport bounds, owner
denial, state/replay checks, listener expiry, credential-free browser output and
single-probe budget separation. Application candidates and Cloud graphs are
unchanged. Live authorization and probe results are reported separately.

References: [Google desktop OAuth](https://developers.google.com/identity/protocols/oauth2/native-app),
[consent configuration](https://developers.google.com/workspace/guides/configure-oauth-consent),
[client and secret management](https://support.google.com/cloud/answer/15549257).
