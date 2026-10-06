-- UP MIGRATION: 006_telegram_splits.sql --

-- 1. Ensure transactions table has telegram fields and status column
ALTER TABLE transactions 
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT,
  ADD COLUMN IF NOT EXISTS telegram_message_id BIGINT,
  ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN NOT NULL DEFAULT false;

-- Create indexes on transactions for telegram lookups and status filtering
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_telegram_msg ON transactions(telegram_message_id) WHERE telegram_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_pending ON transactions(user_id, status) WHERE status IN ('pending', 'awaiting_clarification', 'staged');


-- 2. People Table
CREATE TABLE IF NOT EXISTS people (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  is_me      BOOLEAN NOT NULL DEFAULT false,
  aliases    TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_people_user_id ON people(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_people_user_is_me ON people(user_id) WHERE is_me = true;

ALTER TABLE people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own people"
ON people
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- 3. Transaction Splits Table
CREATE TABLE IF NOT EXISTS transaction_splits (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  person_id      UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  amount_paise   BIGINT NOT NULL CHECK (amount_paise > 0),
  category       TEXT,
  note           TEXT,
  parsed_by      TEXT, -- format: "provider:model" or "rule:default" or "manual"
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transaction_splits_txn ON transaction_splits(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_splits_person ON transaction_splits(person_id);

ALTER TABLE transaction_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own transaction splits"
ON transaction_splits
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.id = transaction_splits.transaction_id
      AND t.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.id = transaction_splits.transaction_id
      AND t.user_id = auth.uid()
  )
);


-- 4. Settlements Table (for repayments between people)
CREATE TABLE IF NOT EXISTS settlements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_person  UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  to_person    UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_different_persons CHECK (from_person <> to_person)
);

CREATE INDEX IF NOT EXISTS idx_settlements_user_id ON settlements(user_id);
CREATE INDEX IF NOT EXISTS idx_settlements_from_person ON settlements(from_person);
CREATE INDEX IF NOT EXISTS idx_settlements_to_person ON settlements(to_person);

ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own settlements"
ON settlements
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- 5. Merchant Defaults Table
CREATE TABLE IF NOT EXISTS merchant_defaults (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_pattern         TEXT NOT NULL,
  default_split_rule       JSONB NOT NULL,
  auto_approve_after_hours INT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_merchant_defaults_user ON merchant_defaults(user_id);

ALTER TABLE merchant_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own merchant defaults"
ON merchant_defaults
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- 6. Telegram Updates Table (for webhook idempotency)
CREATE TABLE IF NOT EXISTS telegram_updates (
  update_id     BIGINT PRIMARY KEY,
  chat_id       TEXT,
  message_id    BIGINT,
  processed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_updates_processed_at ON telegram_updates(processed_at);


-- 7. DB Constraints / Trigger for Splits Sum
-- Splits must sum exactly to transactions.amount_cents for approved/confirmed transactions
CREATE OR REPLACE FUNCTION verify_splits_sum_on_split_change()
RETURNS TRIGGER AS $$
DECLARE
  v_txn_id UUID;
  v_txn_status TEXT;
  v_amount_cents BIGINT;
  v_splits_total BIGINT;
BEGIN
  v_txn_id := COALESCE(NEW.transaction_id, OLD.transaction_id);

  SELECT status, amount_cents INTO v_txn_status, v_amount_cents
  FROM transactions
  WHERE id = v_txn_id;

  -- Only enforce when transaction is in an approved/confirmed state
  IF v_txn_status IN ('approved', 'confirmed') THEN
    SELECT COALESCE(SUM(amount_paise), 0)
    INTO v_splits_total
    FROM transaction_splits
    WHERE transaction_id = v_txn_id;

    IF v_splits_total <> v_amount_cents THEN
      RAISE EXCEPTION 'Transaction splits sum (% paise) does not match transaction total (% paise) for transaction %',
        v_splits_total, v_amount_cents, v_txn_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_verify_splits_sum_split_change ON transaction_splits;
CREATE TRIGGER trg_verify_splits_sum_split_change
AFTER INSERT OR UPDATE OR DELETE ON transaction_splits
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION verify_splits_sum_on_split_change();


-- 8. View for Per-Person Balances (Who owes whom, net of settlements)
CREATE OR REPLACE VIEW v_person_balances AS
WITH my_persons AS (
  SELECT id, user_id FROM people WHERE is_me = true
),
split_totals AS (
  SELECT 
    ts.person_id,
    COALESCE(SUM(ts.amount_paise), 0) AS total_split_paise
  FROM transaction_splits ts
  JOIN transactions t ON t.id = ts.transaction_id
  WHERE t.status IN ('approved', 'confirmed')
  GROUP BY ts.person_id
),
settlements_paid AS (
  -- Friend paid Me (reduces friend's debt to Me)
  SELECT 
    s.from_person AS person_id,
    COALESCE(SUM(s.amount_paise), 0) AS total_paid
  FROM settlements s
  JOIN my_persons mp ON s.to_person = mp.id
  GROUP BY s.from_person
),
settlements_received AS (
  -- Me paid Friend (increases friend's debt to Me / friend owes me)
  SELECT 
    s.to_person AS person_id,
    COALESCE(SUM(s.amount_paise), 0) AS total_received
  FROM settlements s
  JOIN my_persons mp ON s.from_person = mp.id
  GROUP BY s.to_person
)
SELECT 
  p.id AS person_id,
  p.user_id,
  p.name,
  p.aliases,
  COALESCE(st.total_split_paise, 0) AS total_split_paise,
  COALESCE(sp.total_paid, 0) AS total_repaid_paise,
  COALESCE(sr.total_received, 0) AS total_lent_paise,
  -- Net balance: Positive means person owes Me; Negative means Me owes person
  (COALESCE(st.total_split_paise, 0) - COALESCE(sp.total_paid, 0) + COALESCE(sr.total_received, 0)) AS net_balance_paise
FROM people p
LEFT JOIN split_totals st ON st.person_id = p.id
LEFT JOIN settlements_paid sp ON sp.person_id = p.id
LEFT JOIN settlements_received sr ON sr.person_id = p.id
WHERE p.is_me = false;


-- 9. Backfill Migration: Create "Me" and assign 100% split for existing transactions
DO $$
DECLARE
  u RECORD;
  v_me_id UUID;
BEGIN
  -- Iterate distinct users in transactions or accounts
  FOR u IN 
    SELECT DISTINCT user_id FROM accounts
    UNION
    SELECT DISTINCT user_id FROM transactions
  LOOP
    -- Check if 'is_me' already exists for this user
    SELECT id INTO v_me_id FROM people WHERE user_id = u.user_id AND is_me = true LIMIT 1;

    IF v_me_id IS NULL THEN
      INSERT INTO people (user_id, name, is_me, aliases)
      VALUES (u.user_id, 'Me', true, ARRAY['me', 'myself', 'i', 'self'])
      RETURNING id INTO v_me_id;
    END IF;

    -- Backfill all confirmed/approved transactions for this user that don't have splits
    INSERT INTO transaction_splits (transaction_id, person_id, amount_paise, category, note, parsed_by)
    SELECT 
      t.id,
      v_me_id,
      t.amount_cents,
      t.category,
      'Initial migration (100% self)',
      'migration:initial'
    FROM transactions t
    WHERE t.user_id = u.user_id
      AND t.status IN ('confirmed', 'approved')
      AND NOT EXISTS (
        SELECT 1 FROM transaction_splits ts WHERE ts.transaction_id = t.id
      );
  END LOOP;
END $$;
