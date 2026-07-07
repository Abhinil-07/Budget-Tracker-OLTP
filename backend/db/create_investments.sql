-- create_investments.sql
-- Run this in your Supabase SQL Editor to create the investments table.

CREATE TABLE IF NOT EXISTS public.investments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  type                  TEXT NOT NULL CHECK (type IN ('fixed_deposit', 'stock', 'mutual_fund', 'ppf')),
  invested_amount_cents BIGINT NOT NULL DEFAULT 0 CHECK (invested_amount_cents >= 0),
  current_value_cents   BIGINT NOT NULL DEFAULT 0 CHECK (current_value_cents >= 0),
  interest_rate       NUMERIC(5, 2), -- Used for FD/PPF (e.g., 7.10)
  maturity_date       DATE,          -- Used for FD
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Users can manage own investments"
ON public.investments FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create index on user_id for fast queries
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON public.investments(user_id);
