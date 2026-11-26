-- STOPBUCKS: 0004_dojo_progress.sql
-- Additive migration for Phase 5A: StopBucks Dojo progression persistence

-- 1. DOJO PROGRESS TABLE
CREATE TABLE dojo_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_levels JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(completed_levels) = 'array'),
  total_xp INTEGER NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
  current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
  last_completed_date TEXT NULL CHECK (
    last_completed_date IS NULL
    OR last_completed_date ~ '^\d{4}-\d{2}-\d{2}$'
  ),
  unlocked_badges JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(unlocked_badges) = 'array'),
  sound_muted BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. ROW LEVEL SECURITY (RLS)
ALTER TABLE dojo_progress ENABLE ROW LEVEL SECURITY;

-- Select policy: users can only read their own Dojo progression
CREATE POLICY "Dojo progress is readable only by owner"
  ON dojo_progress FOR SELECT
  USING (auth.uid() = user_id);

-- Insert policy: users can only insert Dojo progression for themselves
CREATE POLICY "Dojo progress can only be inserted by owner"
  ON dojo_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Update policy: users can only update their own Dojo progression
CREATE POLICY "Dojo progress can only be updated by owner"
  ON dojo_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Delete policy: users can only delete their own Dojo progression
CREATE POLICY "Dojo progress can only be deleted by owner"
  ON dojo_progress FOR DELETE
  USING (auth.uid() = user_id);
