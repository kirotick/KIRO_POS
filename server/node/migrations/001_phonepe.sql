-- KIRO: PhonePe dynamic QR + webhook reconciliation. PostgreSQL 13+.

CREATE TABLE IF NOT EXISTS merchant_payment_gateways (
  id                  BIGSERIAL PRIMARY KEY,
  business_id         INT NOT NULL UNIQUE,
  phonepe_mid         VARCHAR(50) NOT NULL UNIQUE,   -- webhook looks the tenant up by MID, so it must be unique
  phonepe_salt_key    TEXT NOT NULL,                 -- AES-256-GCM ciphertext ("v1:..."), NEVER plaintext (see src/crypto.js)
  phonepe_salt_index  VARCHAR(5) NOT NULL DEFAULT '1',
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Minimal bills table so the flow works end to end. If you already have one, add the
-- columns marked (*) to it and adjust src/store.js.
CREATE TABLE IF NOT EXISTS bills (
  id               BIGSERIAL PRIMARY KEY,
  business_id      INT NOT NULL,
  invoice_no       VARCHAR(40) NOT NULL,
  amount_paise     BIGINT NOT NULL CHECK (amount_paise > 0),
  status           VARCHAR(10) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Paid','Review')),  -- (*)
  phonepe_txn_id   VARCHAR(35) UNIQUE,   -- (*) merchantTransactionId sent to PhonePe
  qr_string        TEXT,                 -- (*)
  qr_expires_at    TIMESTAMPTZ,          -- (*)
  paid_at          TIMESTAMPTZ,          -- (*)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, invoice_no)
);
CREATE INDEX IF NOT EXISTS bills_business_created_idx ON bills (business_id, created_at DESC);

-- Audit trail of every callback that passed signature verification (and what we did with it).
CREATE TABLE IF NOT EXISTS phonepe_webhook_events (
  id              BIGSERIAL PRIMARY KEY,
  business_id     INT NOT NULL,
  phonepe_txn_id  VARCHAR(64) NOT NULL,
  code            VARCHAR(64) NOT NULL,
  outcome         VARCHAR(24) NOT NULL,   -- paid | already_processed | amount_mismatch | unknown_bill | ignored
  payload         JSONB NOT NULL,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS phonepe_events_txn_idx ON phonepe_webhook_events (phonepe_txn_id);
