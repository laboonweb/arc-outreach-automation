# Australia 500 production integration: preflight stopped

DEPLOYMENT FAILED TO START. No production change was applied.

Authorization: owner attachment dated 2026-10-11, checkpoint
`4de7f6ec117d7effbea1a29e5b5ccc9a995cf0b6`. The attachment's deployment-manifest
filename refers to the reviewed implementation manifest presented with that
checkpoint. All actual candidate/operation hashes matched that manifest.

## Passed gates

- n8n MCP authenticated and stable across the fresh read-only calls.
- n8n editor and Cloud administration were authenticated.
- Trial: 37/1,000 displayed executions used; 963 remaining; seven days left.
- All six affected workflows, unchanged Grounded Copy/Zoho and staging control
  matched their saved objects and version IDs exactly. Publication states match.
- All ten tables and original 109 rows matched their saved records exactly.
  Protection history, owner-draft claim/receipt and synthetic state are unchanged.
- Zoho's unchanged graph retains its three backend barriers and absent provider
  HTTP transport. All five Phase 2 engines remain inactive/manual.
- Fresh recovery copies were retained privately after exact-equality readback.

## Blocking gate

The authenticated Data Table list displays approximately 0.83 MB total storage
across ten tables. Neither that view nor Cloud administration exposes the current
account's numeric Data Table quota/free capacity. Usage alone cannot establish
the required 256 KiB pilot reserve. The older quota observation and a documented
platform default are not treated as fresh proof of the configured account limit.

The owner's approval explicitly requires stopping before writes if headroom cannot
be established. That requirement caused this stop, with no attempted deployment.

Resume needs an authoritative current Data Table limit and used/free amount for
this instance, sufficient for the pilot reserve and database overhead. The actual
existing Google credential project's read/write quotas and new-workbook Editor
access also remain preflight gates; no Google request was made to infer them.
Native source metadata/schema/size checks remain unexecuted.

## Consumption and preservation

| Resource | Used this integration | Approved ceiling |
|---|---:|---:|
| Cloud executions | 0 | 4 |
| Google GETs | 0 | 39 |
| Google batch updates | 0 | 21 |
| New Data Table rows | 0 | 15 |
| Existing-row updates/provider operations/sends | 0 | 0 |

There was no live-panel navigation, workflow mutation/publication, source write,
credential change, delete, research execution, main promotion or release tag.
No paid service or upgrade was used. Existing research output status was not
refetched; 500-lead registration and five-lead intake have not begun.

Private evidence: `private/au500-deployment-20261011/preflight-receipt.json` and
the freshly reconciled workflow/table recovery copies. The reviewed local develop
checkpoint remains unchanged. No application code was edited during preflight.
