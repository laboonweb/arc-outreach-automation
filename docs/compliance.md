# Australian contact review

V1 researches and queues evidence. It sends no marketing message. Its labels are
operational review states, not a legal assessment or guarantee of compliance.

ACMA requires consent, accurate sender identification/contact details and a usable
unsubscribe mechanism. A published address alone does not establish a blanket
permission to send marketing. A reviewer must establish the specific basis and
retain evidence. See [ACMA: avoid sending spam](https://www.acma.gov.au/avoid-sending-spam).

ACMA also discusses marketing relevant to a person's role where details are made
public, subject to conditions and any refusal of unsolicited messages. Keep the
publication URL, date, context and relevance assessment; do not infer permission
from a syntactically valid address. See [ACMA: dealing with spam](https://www.acma.gov.au/dealing-with-spam).

Automatic collection of addresses raises separate address-harvesting restrictions.
Review the proposed collection/use before running Australian prospect extraction
at scale; a review label is not an exemption. See [ACMA: common issues and mistakes](https://www.acma.gov.au/telemarketing-and-e-marketing-common-issues-and-mistakes).

## V1 behavior

- QUESTIONABLE is the default, including public official-site contacts.
- SAFE_TO_REVIEW requires a dated consent-evidence record tied to the exact
  recipient, role-relevance verification and a no-solicitation review. It never sends.
- DO_NOT_EMAIL overrides these when suppression, a stop status or a detected
  no-solicitation notice exists. The route becomes PARK to prevent channel hopping.
- Website notice detection is a limited text heuristic, not an exhaustive legal scan.
- Missing country is a preflight error; non-Australian rows are not assumed exempt
  from their own consent/privacy rules.

## Required before any sender is implemented

Real founder/sender name and business identity; real sender contact details;
reviewed consent policy by jurisdiction; simple unsubscribe instructions; permanent
suppression handling; documented source and relevance; bounce/complaint handling;
content-bound approval; recipient deduplication; and a transactional send ledger.

Stop outreach immediately on opt-out operationally. ACMA's published guidance
requires unsubscribe requests to be actioned within five business days. Do not
contact opted-out recipients through another channel to evade the request.
