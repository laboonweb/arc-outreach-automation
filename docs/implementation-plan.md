# Implementation plan

## Phase 1: research foundations, implemented locally and saved as inactive n8n drafts

1. Establish operating rules, schema, source ownership and evidence rules.
2. Build deterministic identity and a bounded, reviewed-host website check.
3. Extract published contacts; keep activity, consent and inferred consequences separate.
4. Generate a reusable worker and three-dataset orchestrator with colour/history import.
5. Validate synthetic outcomes, source preservation and keyed reruns; audit 689 real rows offline.
6. Validate via MCP, save inactive drafts and wire the worker. **Complete.**
7. Attach Google OAuth, configure three converted URLs and validate real-sheet behavior. **Pending user inputs.**

## Phase 2: analysis and manual queues

Implement `lead-analysis` only after V1 acceptance and explicit Phase 2 approval. Consume evidence snapshots, produce
schema-checked gap/asset/trigger analysis and short drafts. Attach evidence IDs to
every factual assertion. No model can fetch extra sites or authorize sending.
Implement `social-dm-queue` as a manual work list with channel reservation.

## Phase 3: approved email dispatch

Only after sender identity, consent policy, unsubscribe route and provider are
configured: build `outreach-email`. Use timezone-aware weekdays and a local
08:30–10:30 window, approval bound to the current recipient and content hash,
transactional suppression and dispatch claims, provider idempotency and a durable
outbox/reconciliation process. Test timeout-after-acceptance before sending to any lead.

## Phase 4: conversation handoff

Implement `reply-classification`, then conservative `follow-up`. Reply events,
negative replies, bounces and unsubscribe must stop pending actions. Positive
replies go to the founder with a suggested response. One relevant follow-up first;
a second is a separate later policy decision. No automated sales conversation.

Only the three real V1 exports are generated. Future workflows are contracts in
the docs, not empty files that look operational.
