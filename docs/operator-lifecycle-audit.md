# Read-only audit, 8 October 2026

Workspace confirmed: C:/Users/Briann/Desktop/arc-outreach-automation. There is no
Git repository. Local originals are retained in ignored private/operator-lifecycle.

The current live panel has 59 nodes, authenticated GET/POST webhooks, signed
30-minute exact-record tokens and conditional queue writes. It is active. The
Draft Queue, Review Actions, Approved Zoho Handoff, Grounded Copy Worker and Inbox
Sync were read through the connector and all five are inactive. No workflow was
executed or changed during this audit.

The Review Queue is canonical. The Inbox and private link table are projections.
Existing protection/contact indexes, exact-message approvals, one-record provider
claims and confirmed provider receipts must remain authoritative. Zoho HTTP is
CREATE_DRAFT only. The panel has no provider or send node. Arc Research reads are
GET only.

The existing panel cannot add structured human evidence, correct an evidence
classification, save unfinished copy on research-held rows or manage replies and
follow-ups. Its diagnostics separate draft eligibility from send eligibility, but
the rendered Missing / stale section can report None while activity is stale.
READY_TO_SEND is a projection of APPROVED, not an aggregate filter or a user-set
state. Provider-linked and sent text cannot be edited.

Baseline: 339 tests, 338 passed. The existing HTTP review API test could not connect
to its loopback port under the sandbox (EACCES). This is recorded separately from
logic validation.

Smallest extension: append operator observations, copy revisions, evaluation and
audit events inside the existing queue payload. Derive eligibility from a pure
effective view of original research plus validated observations; never update Arc
Research. Keep the existing queue/Inbox/link schemas, conditional writes and manual
provider workflow. Add contextual actions, not a status editor. Retain failed copy
as working text while withholding approval. Local workflow exports remain inactive.
