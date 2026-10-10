# Local Zoho folder investigation, 10 October 2026

Execution 1176 returned one bounded response (3,073 bytes), native HTTP success,
Composio success, valid JSON and a `folders` array. It stopped at
`EXACT_DRAFTS_FOLDER_REQUIRED`. Retention was disabled and the durable audit did
not record its individual failed predicate. The precise mismatch cannot be
reconstructed from that receipt or the owner's visual confirmation.

The local guard now returns separate checks without changing its acceptance
criteria. Failure diagnostics contain only check names and booleans, never raw
folder lists, credentials or mailbox content. All previous STOPs remain intact.

[Zoho's official folder-list API documentation](https://www.zoho.com/mail/help/api/get-all-folder-details.html)
shows the native sample fields below. It is a sample of Zoho's direct API, not a
guarantee of the frozen Composio wrapper or every account/locale.

| Predicate | Basis and remaining uncertainty |
|---|---|
| Unique canonical Drafts folder | Exactly one object with `folderType === 'Drafts'`. The documented sample uses that spelling; live frozen response spelling and uniqueness are unverified. |
| Name | `folderName === 'Drafts'` matches the documented sample. Locale/normalization behavior is not established for this connected account. |
| Path | `path === '/Drafts'` matches the sample. Exact current serialization is unverified. |
| Identifier | Required digit-only string `folderId`; lossless IDs remain mandatory. Numeric/coerced IDs are rejected. |
| Archived state | Exact numeric `isArchived === 0` matches the sample. Missing, string or boolean values fail. |
| Account association | Exact HTTPS `URI` matches the pinned region, account ID and returned folder ID. Sample URI supports this shape; current URI serialization is unverified. The request independently pins connected-account ID, user ID and account ID. |
| Required envelope | Composio success, native status 200 and one known array are required. Native sample uses `data`; actual frozen reads observed `folders`. Simultaneous `data` and `folders`, missing members or invalid types fail. |
| Deleted/unsent state | This folder sample supplies no independent deletion or message-sent field. `isArchived` alone cannot prove either. Complete release still requires exact folder association and independent exact-ID headers/body readback; no missing field is interpreted as success. |

Local positive/negative tests cover each predicate, wrong connected account URI,
wrong region, duplicates, missing fields, wrong types and ambiguous envelopes.
These establish guard behavior, not the current provider's live values.

## Optional next diagnostic, prepared but not authorized or executed

This is unnecessary for the restricted release. If separately approved later,
lift the previous STOP only for one folder-list diagnostic using the existing
owner receipt and the same inactive staging control. No new table or record.

Exact frozen transport:
`POST https://backend.composio.dev/api/v3.1/tools/execute/ZOHO_MAIL_FOLDERS_LIST_FOLDERS`.
Use the existing HTTP Header credential reference, TLS verification, no redirect,
30-second timeout, raw response parsing, 1 MiB bound and no automatic retry.
Request body is pinned privately:

```js
{
  connected_account_id: connection.connected_account_id,
  user_id: connection.user_id,
  version: '20260915_00',
  arguments: { account_id: connection.account_id }
}
```

The semantic Zoho operation is read-only `GET /api/accounts/{accountID}/folders`.
Persist only execution/tool/version/request hash, response bytes, known schema
types, canonical candidate count, the six check booleans, missing-field names
and PASS/STOP diagnostic outcome. Never certify complete draft readback from this
single result. Append at most one audit on the same owner record using exact
payload CAS and independently verify it; preserve the claim, draft ID, approved
hash and all prior STOPs. Restore staging and check preservation afterward.

Maximum: one Cloud execution, one provider read and one audited existing-row
update; projected totals 82/84 executions, 12/13 reads, 161/500 mutations and
7/8 owner-row writes. No CREATE, send, delete, source request or automatic retry.
Expected cost is $0 only after included allowance is freshly reconfirmed.
Stop on auth, schema/size, account/identity, CAS/persistence or preservation failure.
Do not relax name/path/account checks or replace the folder ID to obtain PASS.

If a diagnostic explains the mismatch, any schema correction and subsequent
header/body verification still require review and their own exact authorized
scope. The two remaining numeric read slots do not authorize further calls.
