-- STOPBUCKS: 0003_fixed_commitments.sql
-- Additive migration for Phase 4A: Fixed Monthly Commitments (True Disposable Runway)

-- 1. FIXED COMMITMENTS TABLE
CREATE TABLE fixed_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (
    char_length(trim(title)) > 0
    AND char_length(title) <= 80
  ),
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for retrieving user commitments in creation order
CREATE INDEX idx_fixed_commitments_user_created ON fixed_commitments (user_id, created_at DESC);

-- 2. ROW LEVEL SECURITY (RLS)
ALTER TABLE fixed_commitments ENABLE ROW LEVEL SECURITY;

-- Select policy: users can only read their own fixed commitments
CREATE POLICY "Fixed commitments are readable only by owner"
  ON fixed_commitments FOR SELECT
  USING (auth.uid() = user_id);

-- Insert policy: users can only insert fixed commitments for themselves
CREATE POLICY "Fixed commitments can only be inserted by owner"
  ON fixed_commitments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Update policy: users can only update their own fixed commitments
CREATE POLICY "Fixed commitments can only be updated by owner"
  ON fixed_commitments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Delete policy: users can only delete their own fixed commitments
CREATE POLICY "Fixed commitments can only be deleted by owner"
  ON fixed_commitments FOR DELETE
  USING (auth.uid() = user_id);
