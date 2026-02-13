-- 2026-02-12 Expand protocol schema for tracker parity
-- Safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS substance_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  substance_type TEXT NOT NULL CHECK (substance_type IN ('psilocybin', 'lsd', 'other')),
  current_phase TEXT NOT NULL DEFAULT 'baseline' CHECK (current_phase IN ('baseline', 'context')),
  baseline_doses INTEGER NOT NULL DEFAULT 0,
  context_doses INTEGER NOT NULL DEFAULT 0,
  total_doses INTEGER NOT NULL DEFAULT 0,
  discovery_complete BOOLEAN NOT NULL DEFAULT false,
  threshold_range JSONB DEFAULT NULL,
  recalibration JSONB DEFAULT '{"active": false, "doses_completed": 0, "doses_needed": 3}',
  last_dose_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, substance_type)
);

CREATE TABLE IF NOT EXISTS reflections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dose_log_id UUID REFERENCES dose_logs(id) ON DELETE SET NULL,
  timing TEXT NOT NULL CHECK (timing IN ('eod', '24h', '72h')),
  still_with_me TEXT DEFAULT NULL,
  would_change TEXT DEFAULT NULL,
  gratitude TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  confidence INTEGER DEFAULT NULL CHECK (confidence BETWEEN 0 AND 100),
  evidence_dose_ids UUID[] DEFAULT '{}',
  recommendation TEXT DEFAULT NULL,
  dismissed BOOLEAN DEFAULT false,
  acted_upon BOOLEAN DEFAULT false,
  first_shown_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS dose_logs ADD COLUMN IF NOT EXISTS phase TEXT CHECK (phase IN ('baseline', 'context'));
ALTER TABLE IF EXISTS dose_logs ADD COLUMN IF NOT EXISTS dose_number INTEGER CHECK (dose_number BETWEEN 1 AND 10);
ALTER TABLE IF EXISTS dose_logs ADD COLUMN IF NOT EXISTS pre_dose_mood INTEGER CHECK (pre_dose_mood BETWEEN 1 AND 5);
ALTER TABLE IF EXISTS dose_logs ADD COLUMN IF NOT EXISTS intention TEXT;
ALTER TABLE IF EXISTS dose_logs ADD COLUMN IF NOT EXISTS post_dose_completed BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS dose_logs ADD COLUMN IF NOT EXISTS post_dose_mood INTEGER CHECK (post_dose_mood BETWEEN 1 AND 5);
ALTER TABLE IF EXISTS dose_logs ADD COLUMN IF NOT EXISTS signal_score INTEGER CHECK (signal_score BETWEEN 0 AND 10);
ALTER TABLE IF EXISTS dose_logs ADD COLUMN IF NOT EXISTS texture_score INTEGER CHECK (texture_score BETWEEN 0 AND 10);
ALTER TABLE IF EXISTS dose_logs ADD COLUMN IF NOT EXISTS interference_score INTEGER CHECK (interference_score BETWEEN 0 AND 10);
ALTER TABLE IF EXISTS dose_logs ADD COLUMN IF NOT EXISTS threshold_feel TEXT CHECK (threshold_feel IN ('nothing', 'under', 'sweetspot', 'over'));
ALTER TABLE IF EXISTS dose_logs ADD COLUMN IF NOT EXISTS day_classification TEXT CHECK (day_classification IN ('green', 'yellow', 'red', 'unclassified'));
ALTER TABLE IF EXISTS dose_logs ADD COLUMN IF NOT EXISTS context_tags TEXT[];
ALTER TABLE IF EXISTS dose_logs ADD COLUMN IF NOT EXISTS timing_tag TEXT CHECK (timing_tag IN ('morning', 'midday', 'afternoon'));
ALTER TABLE IF EXISTS dose_logs ADD COLUMN IF NOT EXISTS carryover_score INTEGER CHECK (carryover_score BETWEEN 0 AND 100);
ALTER TABLE IF EXISTS dose_logs ADD COLUMN IF NOT EXISTS effective_dose DECIMAL(6,4);

ALTER TABLE IF EXISTS substance_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS patterns ENABLE ROW LEVEL SECURITY;

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
    WHERE schemaname = 'public' AND tablename = 'reflections' AND policyname = 'reflections_own_data'
  ) THEN
    CREATE POLICY "reflections_own_data" ON reflections FOR ALL USING ((SELECT auth.uid()) = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'patterns' AND policyname = 'patterns_own_data'
  ) THEN
    CREATE POLICY "patterns_own_data" ON patterns FOR ALL USING ((SELECT auth.uid()) = user_id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_doses_phase ON dose_logs(user_id, phase);
CREATE INDEX IF NOT EXISTS idx_doses_day_classification ON dose_logs(user_id, day_classification);
CREATE INDEX IF NOT EXISTS idx_substance_profiles_user ON substance_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_patterns_user_active ON patterns(user_id, dismissed);
CREATE INDEX IF NOT EXISTS idx_reflections_user_time ON reflections(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION ensure_default_substance_profiles()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO substance_profiles (user_id, substance_type)
  VALUES (NEW.id, 'psilocybin'), (NEW.id, 'lsd')
  ON CONFLICT (user_id, substance_type) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_default_substance_profiles ON users;
CREATE TRIGGER create_default_substance_profiles
  AFTER INSERT ON users FOR EACH ROW EXECUTE FUNCTION ensure_default_substance_profiles();
