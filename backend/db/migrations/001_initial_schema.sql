-- UP MIGRATION --

-- 1. Table Definitions

-- Accounts Table
CREATE TABLE accounts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id),
  name           TEXT NOT NULL,
  type           TEXT NOT NULL CHECK (type IN ('savings', 'current', 'credit_card')),
  balance_cents  BIGINT NOT NULL DEFAULT 0,
  currency       TEXT NOT NULL DEFAULT 'INR',
  account_number TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, account_number)
);

-- Transactions Table
CREATE TABLE transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  account_id    UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  type          TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount_cents  BIGINT NOT NULL CHECK (amount_cents > 0),
  category      TEXT NOT NULL,
  description   TEXT,
  txn_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Budgets Table
CREATE TABLE budgets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  month           DATE NOT NULL,             -- always the 1st of the month
  total_cents     BIGINT NOT NULL,
  category_limits JSONB,                     -- optional: { "food": 500000, "transport": 200000 }
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, month)
);

-- Sync Logs Table
CREATE TABLE sync_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  triggered_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  trigger_type    TEXT NOT NULL CHECK (trigger_type IN ('scheduled', 'manual')),
  status          TEXT NOT NULL CHECK (status IN ('success', 'failed', 'in_progress')),
  rows_exported   INT,
  error_message   TEXT,
  databricks_run_id BIGINT,                  -- run_id returned by Databricks Jobs API
  completed_at    TIMESTAMPTZ
);


-- 2. Indexes

CREATE INDEX idx_accounts_user_id ON accounts(user_id);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_txn_date ON transactions(txn_date DESC);
CREATE INDEX idx_transactions_sync ON transactions(user_id, txn_date DESC);

CREATE INDEX idx_sync_logs_user_id ON sync_logs(user_id, triggered_at DESC);


-- 3. Row Level Security Policies

-- Accounts RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own accounts"
ON accounts
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Transactions RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own transactions"
ON transactions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Budgets RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own budgets"
ON budgets
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Sync Logs RLS
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own sync_logs"
ON sync_logs
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- 4. Stored Functions

CREATE OR REPLACE FUNCTION increment_balance(account_id UUID, delta BIGINT)
RETURNS void AS $$
  UPDATE accounts
  SET balance_cents = balance_cents + delta,
      updated_at = now()
  WHERE id = account_id;
$$ LANGUAGE sql;


/*
-- DOWN MIGRATION --

-- 1. Drop Stored Functions
DROP FUNCTION IF EXISTS increment_balance(UUID, BIGINT);

-- 2. Drop RLS Policies (automatically dropped with tables, but listed for completeness)
DROP POLICY IF EXISTS "users can manage own sync_logs" ON sync_logs;
DROP POLICY IF EXISTS "users can manage own budgets" ON budgets;
DROP POLICY IF EXISTS "users can manage own transactions" ON transactions;
DROP POLICY IF EXISTS "users can manage own accounts" ON accounts;

-- 3. Drop Indexes (automatically dropped with tables, but listed for completeness)
DROP INDEX IF EXISTS idx_sync_logs_user_id;
DROP INDEX IF EXISTS idx_transactions_sync;
DROP INDEX IF EXISTS idx_transactions_txn_date;
DROP INDEX IF EXISTS idx_transactions_account_id;
DROP INDEX IF EXISTS idx_transactions_user_id;
DROP INDEX IF EXISTS idx_accounts_user_id;

-- 4. Drop Tables
DROP TABLE IF EXISTS sync_logs;
DROP TABLE IF EXISTS budgets;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS accounts;
*/
