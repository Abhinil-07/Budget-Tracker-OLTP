-- UP MIGRATION: 007_add_is_included_toggle.sql --
-- Add is_included boolean toggle to transactions table (defaults to true)

ALTER TABLE transactions 
  ADD COLUMN IF NOT EXISTS is_included BOOLEAN NOT NULL DEFAULT true;

-- Index to optimize querying/filtering included transactions for aggregates
CREATE INDEX IF NOT EXISTS idx_transactions_is_included ON transactions(user_id, is_included);
