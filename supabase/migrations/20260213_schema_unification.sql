-- Schema Unification Migration - February 13, 2026
-- Adds substance_profiles table, STI fields, settle_mode_logs table, and phase field
-- Safe migration: uses IF NOT EXISTS everywhere, never drops columns

-- =============================================================================
-- SUBSTANCE PROFILES (per-substance protocol tracking)
-- =============================================================================
CREATE TABLE IF NOT EXISTS substance_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  substance TEXT NOT NULL CHECK (substance IN ('psilocybin', 'lsd', 'other')),
  current_phase TEXT NOT NULL DEFAULT 'baseline' CHECK (current_phase IN ('baseline', 'context')),
  baseline_doses INTEGER NOT NULL DEFAULT 0,
  context_doses INTEGER NOT NULL DEFAULT 0,
  total_doses INTEGER NOT NULL DEFAULT 0,
  discovery_complete BOOLEAN NOT NULL DEFAULT FALSE,
  threshold_range JSONB DEFAULT NULL,
  recalibration JSONB DEFAULT '{"active": false, "doses_completed": 0, "doses_needed": 3}',
  last_dose_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, substance)
);

-- =============================================================================
-- STI FIELDS (Signal, Texture, Interference - numeric scores for dose logs)
-- =============================================================================
ALTER TABLE dose_logs 
  ADD COLUMN IF NOT EXISTS signal NUMERIC CHECK (signal >= 0 AND signal <= 10);

ALTER TABLE dose_logs 
  ADD COLUMN IF NOT EXISTS texture NUMERIC CHECK (texture >= 0 AND texture <= 10);

ALTER TABLE dose_logs 
  ADD COLUMN IF NOT EXISTS interference NUMERIC CHECK (interference >= 0 AND interference <= 10);

-- =============================================================================
-- SETTLE MODE LOGS (for tracking settle phase after doses)
-- =============================================================================
CREATE TABLE IF NOT EXISTS settle_mode_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dose_log_id UUID REFERENCES dose_logs(id) ON DELETE SET NULL,
  settle_start_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settle_end_at TIMESTAMPTZ DEFAULT NULL,
  duration_minutes INTEGER DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  conditions JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- PHASE FIELD (baseline/context tracking for dose logs)
-- =============================================================================
ALTER TABLE dose_logs 
  ADD COLUMN IF NOT EXISTS phase TEXT CHECK (phase IN ('baseline', 'context'));

-- =============================================================================
-- INDEXES FOR NEW TABLES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_substance_profiles_user ON substance_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_substance_profiles_user_substance ON substance_profiles(user_id, substance);
CREATE INDEX IF NOT EXISTS idx_settle_mode_logs_user ON settle_mode_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_settle_mode_logs_dose ON settle_mode_logs(dose_log_id);
CREATE INDEX IF NOT EXISTS idx_settle_mode_logs_start ON settle_mode_logs(settle_start_at DESC);
CREATE INDEX IF NOT EXISTS idx_dose_logs_phase ON dose_logs(user_id, phase);
CREATE INDEX IF NOT EXISTS idx_dose_logs_sti_signal ON dose_logs(user_id, signal);
CREATE INDEX IF NOT EXISTS idx_dose_logs_sti_texture ON dose_logs(user_id, texture);
CREATE INDEX IF NOT EXISTS idx_dose_logs_sti_interference ON dose_logs(user_id, interference);

-- =============================================================================
-- ROW LEVEL SECURITY FOR NEW TABLES
-- =============================================================================
ALTER TABLE IF EXISTS substance_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS settle_mode_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'substance_profiles' AND policyname = 'substance_profiles_own_data'
  ) THEN
    CREATE POLICY "substance_profiles_own_data" ON substance_profiles FOR ALL USING ((SELECT auth.uid()) = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'settle_mode_logs' AND policyname = 'settle_mode_logs_own_data'
  ) THEN
    CREATE POLICY "settle_mode_logs_own_data" ON settle_mode_logs FOR ALL USING ((SELECT auth.uid()) = user_id);
  END IF;
END
$$;

-- =============================================================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_substance_profiles_updated_at ON substance_profiles;
CREATE TRIGGER update_substance_profiles_updated_at
  BEFORE UPDATE ON substance_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_settle_mode_logs_updated_at ON settle_mode_logs;
CREATE TRIGGER update_settle_mode_logs_updated_at
  BEFORE UPDATE ON settle_mode_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- FUNCTION: Auto-create substance profiles on user signup (if not exists)
-- =============================================================================
CREATE OR REPLACE FUNCTION create_default_substance_profiles()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO substance_profiles (user_id, substance)
  VALUES (NEW.id, 'psilocybin'), (NEW.id, 'lsd')
  ON CONFLICT (user_id, substance) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_profiles_on_signup ON users;
CREATE TRIGGER create_profiles_on_signup
  AFTER INSERT ON users FOR EACH ROW EXECUTE FUNCTION create_default_substance_profiles();
