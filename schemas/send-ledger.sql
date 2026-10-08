-- DESIGN ONLY. Future Postgres-compatible send boundary. V1 never connects to this.
-- Recipient + campaign + step is unique independently of lead_id or copy edits.
CREATE TABLE suppression (
  recipient TEXT PRIMARY KEY CHECK (recipient = lower(trim(recipient))),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE dispatch_ledger (
  dispatch_key CHAR(64) PRIMARY KEY,
  lead_id TEXT NOT NULL,
  recipient TEXT NOT NULL CHECK (recipient = lower(trim(recipient))),
  campaign_id TEXT NOT NULL,
  step TEXT NOT NULL,
  message_hash CHAR(64) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('CLAIMED','SENDING','SENT','UNKNOWN_DELIVERY','CANCELLED')),
  provider_idempotency_key TEXT NOT NULL UNIQUE,
  message_id TEXT,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  UNIQUE (campaign_id, recipient, step)
);
-- Future sender must claim with INSERT ... ON CONFLICT DO NOTHING RETURNING ...
-- in a transaction that also checks suppression, approval version and prior sends.
-- Provider timeout after submission => UNKNOWN_DELIVERY. Never blindly retry.
-- Without provider idempotency/reconciliation, at-most-once attempts sacrifice delivery
-- when outcomes are ambiguous. A Sheets boolean cannot give exactly-once delivery.
