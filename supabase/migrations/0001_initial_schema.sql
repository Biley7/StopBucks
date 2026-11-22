-- STOPBUCKS: 0001_initial_schema.sql
-- Production database foundation for StopBucks behavioral finance application

-- ENUMS
CREATE TYPE trigger_tag AS ENUM (
  'need',
  'convenience',
  'stress_late_night',
  'social_fomo',
  'invest_self'
);

CREATE TYPE payment_mode AS ENUM (
  'cash',
  'cashless'
);

CREATE TYPE vault_status AS ENUM (
  'cooling',
  'rescued',
  'purchased'
);

-- 1. PROFILES
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL CHECK (currency IN ('INR', 'HKD', 'USD')),
  monthly_budget_minor BIGINT NOT NULL CHECK (monthly_budget_minor >= 0),
  self_invest_target_minor BIGINT NOT NULL CHECK (
    self_invest_target_minor >= 0 AND 
    self_invest_target_minor <= monthly_budget_minor
  ),
  hourly_rate_minor BIGINT NOT NULL CHECK (hourly_rate_minor > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. TRANSACTIONS
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  note TEXT NOT NULL DEFAULT '',
  trigger_tag trigger_tag NOT NULL,
  payment_mode payment_mode NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_transactions_user_logged_at ON transactions (user_id, logged_at DESC);
CREATE INDEX idx_transactions_user_tag ON transactions (user_id, trigger_tag);

-- 3. VAULT ITEMS
CREATE TABLE vault_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL CHECK (char_length(trim(item_name)) > 0),
  price_minor BIGINT NOT NULL CHECK (price_minor > 0),
  trigger_tag trigger_tag NOT NULL,
  unlock_at TIMESTAMPTZ NOT NULL,
  status vault_status NOT NULL DEFAULT 'cooling',
  resolved_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_vault_items_user_status ON vault_items (user_id, status);
CREATE INDEX idx_vault_items_user_created ON vault_items (user_id, created_at DESC);

-- 4. WEEKLY NUDGES
CREATE TABLE weekly_nudges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_key TEXT NOT NULL,
  bias_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  coach_response JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_weekly_nudges_user_week UNIQUE (user_id, week_key)
);

CREATE INDEX idx_weekly_nudges_user_created ON weekly_nudges (user_id, created_at DESC);

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_nudges ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Profiles are readable only by owner"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Profiles can only be inserted by owner"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Profiles can only be updated by owner"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Profiles can only be deleted by owner"
  ON profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Transactions Policies
CREATE POLICY "Transactions are readable only by owner"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Transactions can only be inserted by owner"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Transactions can only be updated by owner"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Transactions can only be deleted by owner"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Vault Items Policies
CREATE POLICY "Vault items are readable only by owner"
  ON vault_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Vault items can only be inserted by owner"
  ON vault_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Vault items can only be updated by owner"
  ON vault_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Vault items can only be deleted by owner"
  ON vault_items FOR DELETE
  USING (auth.uid() = user_id);

-- Weekly Nudges Policies
CREATE POLICY "Weekly nudges are readable only by owner"
  ON weekly_nudges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Weekly nudges can only be inserted by owner"
  ON weekly_nudges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Weekly nudges can only be updated by owner"
  ON weekly_nudges FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Weekly nudges can only be deleted by owner"
  ON weekly_nudges FOR DELETE
  USING (auth.uid() = user_id);

