-- Nightly owner report: where to send it, whether it is on, and the last local date it was sent (so it never sends twice).
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS owner_wa       VARCHAR(15);          -- digits with country code, e.g. 919876543210
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS nightly_report BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS nightly_last   DATE;
