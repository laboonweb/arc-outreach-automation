# Phase 1.5 discovery and enrichment

4 October 2026. The approved fixed 25-lead discovery test is complete. After
qualification results are local; no Arc Research writes occurred. Stop for review.

## Integrity gate and scope

Batch 4 offset 300 passed the existing read-only source/output digest checks.
There are 401 Arc Research rows and 401 unique IDs. All 19 source tabs retain
their expected values, formulas and colours. Research, outreach history and
reviewer-control digests match the expected post-write state. No batch 4 writes
were repeated. Bulk processing is stopped; the remaining 254 leads are excluded.

The ignored test manifest contains 25 previously processed LOW/research_required
records: Australia 8, Manila Legacy 8, Manila Manual Queue 9. Five have supplied
website candidates. The selection includes different sectors, absent emails,
social/post URLs, missing websites and unresolved/stale evidence. Legacy contact
locks remain in force. A read-only live Arc Research baseline confirmed all 25
are still LOW/research_required. No research worker or sheet-write node ran.

| Metric | Live before | After discovery |
|---|---|---|
| HIGH / MEDIUM / LOW / DISQUALIFY | 0 / 0 / 25 / 0 | 0 / 2 / 23 / 0 |
| research_required | 25 | 25 |
| STRONG / USABLE / WEAK / NONE contactability | 2 / 0 / 15 / 8 | 2 / 0 / 15 / 8 |
| PARK / BLOCKED / NEEDS_RESEARCH readiness | 14 / 9 / 2 | 14 / 9 / 2 |
| Published verified emails | 2 | 2 |
| Verified gaps | 0 | 0 |
| Duplicate warnings among selected cases | 0 | 0 |

Australia 8: MEDIUM 1 / LOW 7. Legacy 8: LOW 8. Manual Queue 9:
MEDIUM 1 / LOW 8. No case was disqualified. Routes: EMAIL_CANDIDATE 2,
PARK 23; no verified usable social/messaging/platform routes. Candidate URLs
remain separate from owned domains and available contact routes. Email totals
hide one newly verified publication and one conservative re-verification failure;
the existing live email was preserved. See the private report for the cases.

All eight selected Manila Legacy leads remain SENT and locked. One selected
Australian lead is also already SENT and locked. Other protected states are
excluded by the existing skip rule. No initial outreach may be created.

## Implemented path

Lead row → public discovery → identity/provenance verification → existing website
verifier → commercial qualification → contactability → outreach readiness.

The worker keeps the existing eight nodes and adds seven nodes ahead of them.
Two bounded searches seek official domains, social profiles and current business
evidence. At most four approved public pages are read, six requests total per
lead, sequentially. The local transport uses Node built-ins; n8n uses its native
HTTP Request node. No account, new credential, paid API, dependency installation,
outreach node or activation is introduced.

Search sends only the business name, business locality and country. Page reads
send public candidate URLs. History, reviewer notes, existing emails, source
workbook IDs and OAuth credentials are excluded from provider requests. Exa is
an external recipient of those identifiers and URLs. Both `enabled` and
`provider_approved` default to false. Exact `allowed_hosts` control fetching;
`official_hosts` / `official_urls` record the separate publisher/identity review.
Search alone cannot populate those review lists.

Official provider reference: [Exa MCP server](https://github.com/exa-labs/exa-mcp-server).
The installed API schema exposes web_search_exa and web_fetch_exa. A native
transport probe successfully fetched only the public Node.js About page; it did
not send a lead query. Anonymous service limits/errors remain possible.

## Evidence rules and limits

- Exact business name plus published address or phone must match. Namesakes,
  unmatched branches and provider URL substitutions stay unresolved.
- Official website/contact promotion requires both identity matching and the
  separate reviewed official publisher. A supplied domain is still a candidate.
- Published business emails need a business-facing contact label, or a literal
  own-domain email on an identity-matched reviewed official website. Free-mail
  addresses require explicit business contact publication on that official page.
  No guessed patterns or deliverability/consent claims are made.
- Facebook/Instagram profile links are distinct from usable enquiry routes.
  Explicit messaging instructions are needed; access restrictions stay unresolved.
- WhatsApp/Viber routes are extracted only from explicitly published HTTP links;
  phone numbers are never converted into messaging links. Non-HTTP Viber deep
  links are currently unresolved.
- Published online booking/contact forms can supply a manual business route.
  Forms are never submitted, and technical completion/booking availability is
  not claimed. Other linked platforms remain candidates until checked.
- Identity-matched official service/booking content supports LIKELY_ACTIVE;
  HTTP success, a directory registration or a profile URL alone does not.
  Dated listing/review excerpts remain candidates for review; provider retrieval
  time is distinct from a post/review publication date.
- Owners are optional. The parser accepts explicitly labelled named owners or
  directors; unresolved names do not reduce the commercial score.
- Discovery does not manufacture a web gap. Published DM-ordering dependency is
  a gap candidate; missing search results do not prove website absence. Complex
  conversion defects and resolved strong-site decisions still need browser/source
  review through the existing controls. Thus successful discovery can move LOW to
  provisional MEDIUM while retaining research_required for an unverified gap.
- Existing explicit reviewer decisions, protected source states, contact locks
  and follow-up history take priority. Derived facts are stored in the existing
  evidence_json column, never written into reviewer-owned inputs.
- Australian compliance remains separate. A useful lead/contact never becomes
  consent to send. No email/DM is sent and no workflow is activated.

## Validation status

Local validation: 56 tests pass, including 15 discovery tests. Coverage
includes identity mismatches, no-site discovery, unreviewed domains, source-row
association, suppressed/protected states, explicit false reviewer decisions,
social-only contact, public contact platforms, malformed/rate-limited responses,
JSON/SSE parsing and execution of the generated discovery loop with mock native
HTTP responses. Existing dataset upsert/schema/control tests also pass.

n8n validation: the generated 15-node worker passes SDK and individual node
validation. Saved discovery code matches canonical code. Both workflows remain
inactive and unpublished; no running/waiting executions remain. Original parent
parameters were restored, with Research one lead and Write Arc Research held
disabled. Default configuration keeps discovery off and dry-run enabled.

After the user's destination-specific approval, Exa processed only this fixed
set: 50 searches and 74 approved page-read attempts, 124 requests total,
sequentially, maximum six per lead. There were 16 page errors across 15 cases,
no search errors and no retries. Ten cases gained identity evidence; two gained
LIKELY_ACTIVE service content. All 25 still require research and no gap is verified.

Canonical verification/qualification ran locally using cached evidence and
refreshed live controls. No extra origin HTTP reads or form submissions were made;
interactive paths and origin status remain unverified. The native cloud 25-case
end-to-end run was not performed. Automatic approval review rejected embedding
input rows in cloud node code because that would persist phone/address/workbook
metadata beyond the approved Exa payload. It also rejected re-enabling the
research/write nodes during restoration; both remain disabled. No input embedding,
sheet writes, workflow activation or outreach occurred.

Fresh read-only checks after discovery matched all 19 source tabs and all 401
unique Arc Research rows, including machine, history and reviewer fields, against
the verified baseline. All nine selected SENT states and initial contact locks
were retained. Strict matching leaves the eight Legacy cases unresolved because
source phone/address fields are absent; address formatting also produced a likely
false negative. These are review issues, not confirmed commercial rejection.

## Before/after report gate

The ignored private/phase-1.5-discovery-report.md contains before/after counts,
all 25 case reviews, source URLs, candidate/verified distinctions, conflicts,
provider errors and integrity evidence. Machine excerpts, observation timestamps,
confidence and verification status are in private/discovery-qualified-results.json.
No private lead/contact data belongs in Git. Stop for review: no remaining bulk
processing, additional discovery requests, live writes or outreach are authorized.
