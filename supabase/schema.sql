-- THRESHOLD COMPASS — Database Schema
-- Run in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================
-- USERS
-- ==================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  substance_type TEXT NOT NULL DEFAULT 'psilocybin',
  sensitivity INTEGER NOT NULL DEFAULT 3 CHECK (sensitivity BETWEEN 1 AND 5),
  north_star TEXT NOT NULL DEFAULT 'clarity',
  guidance_level TEXT NOT NULL DEFAULT 'guided' CHECK (guidance_level IN ('guided', 'experienced', 'minimal')),
  menstrual_tracking BOOLEAN DEFAULT false,
  emergency_contact JSONB DEFAULT NULL,
  onboarding_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================
-- BATCHES
-- ==================
CREATE TABLE IF NOT EXISTS batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  substance_type TEXT NOT NULL,
  form TEXT DEFAULT 'ground',
  estimated_potency TEXT DEFAULT 'medium' CHECK (estimated_potency IN ('low', 'medium', 'high', 'unknown')),
  dose_unit TEXT DEFAULT 'mg' CHECK (dose_unit IN ('mg', 'ug')),
  supplements TEXT DEFAULT NULL,
  source_notes TEXT DEFAULT NULL,
  date_acquired DATE DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  calibration_status TEXT DEFAULT 'uncalibrated' CHECK (calibration_status IN ('uncalibrated', 'calibrating', 'calibrated')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================
-- DOSE LOGS
-- ==================
CREATE TABLE IF NOT EXISTS dose_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES batches(id),
  amount DECIMAL(8,4) NOT NULL CHECK (amount > 0),
  unit TEXT NOT NULL DEFAULT 'mg',
  dosed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Context (optional)
  preparation TEXT DEFAULT NULL CHECK (preparation IN ('empty_stomach', 'light_meal', 'full_meal')),
  sleep_quality TEXT DEFAULT NULL CHECK (sleep_quality IN ('poor', 'fair', 'good', 'great')),
  energy_level TEXT DEFAULT NULL CHECK (energy_level IN ('low', 'medium', 'high')),
  stress_level TEXT DEFAULT NULL CHECK (stress_level IN ('low', 'medium', 'high')),
  cycle_day INTEGER DEFAULT NULL,
  notes TEXT DEFAULT NULL,

  -- Discovery protocol tracking
  discovery_dose_number INTEGER DEFAULT NULL CHECK (discovery_dose_number BETWEEN 1 AND 10),

  -- Expanded protocol metadata
  phase TEXT DEFAULT NULL CHECK (phase IN ('baseline', 'context')),
  dose_number INTEGER DEFAULT NULL CHECK (dose_number BETWEEN 1 AND 10),
  pre_dose_mood INTEGER DEFAULT NULL CHECK (pre_dose_mood BETWEEN 1 AND 5),
  intention TEXT DEFAULT NULL,
  post_dose_completed BOOLEAN DEFAULT false,
  post_dose_mood INTEGER DEFAULT NULL CHECK (post_dose_mood BETWEEN 1 AND 5),
  signal_score INTEGER DEFAULT NULL CHECK (signal_score BETWEEN 0 AND 10),
  texture_score INTEGER DEFAULT NULL CHECK (texture_score BETWEEN 0 AND 10),
  interference_score INTEGER DEFAULT NULL CHECK (interference_score BETWEEN 0 AND 10),
  threshold_feel TEXT DEFAULT NULL CHECK (threshold_feel IN ('nothing', 'under', 'sweetspot', 'over')),
  day_classification TEXT DEFAULT NULL CHECK (day_classification IN ('green', 'yellow', 'red', 'unclassified')),
  context_tags TEXT[] DEFAULT NULL,
  timing_tag TEXT DEFAULT NULL CHECK (timing_tag IN ('morning', 'midday', 'afternoon')),
  carryover_score INTEGER DEFAULT NULL CHECK (carryover_score BETWEEN 0 AND 100),
  effective_dose DECIMAL(8,4) DEFAULT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================
-- CHECK-INS
-- ==================
CREATE TABLE IF NOT EXISTS check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dose_log_id UUID REFERENCES dose_logs(id) ON DELETE SET NULL,
  check_in_type TEXT NOT NULL CHECK (check_in_type IN ('activation', 'signal', 'integration', 'reflection')),
  timing_minutes INTEGER DEFAULT NULL,

  -- Conditions
  energy TEXT DEFAULT NULL,
  mood TEXT DEFAULT NULL,
  focus TEXT DEFAULT NULL,
  body_state TEXT DEFAULT NULL,
  social_context TEXT DEFAULT NULL,

  -- Signals
  visual TEXT DEFAULT NULL,
  emotional TEXT DEFAULT NULL,
  physical TEXT DEFAULT NULL,
  cognitive TEXT DEFAULT NULL,
  connection TEXT DEFAULT NULL,

  -- Classification
  threshold_zone TEXT DEFAULT NULL CHECK (threshold_zone IN ('sub', 'low', 'sweet_spot', 'high', 'over')),

  -- Freeform
  notes TEXT DEFAULT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================
-- THRESHOLD RANGES
-- ==================
CREATE TABLE IF NOT EXISTS threshold_ranges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES batches(id),
  floor_dose DECIMAL(6,4) DEFAULT NULL,
  sweet_spot DECIMAL(6,4) DEFAULT NULL,
  ceiling_dose DECIMAL(6,4) DEFAULT NULL,
  confidence INTEGER DEFAULT 0 CHECK (confidence BETWEEN 0 AND 100),
  qualifier TEXT DEFAULT 'Need more data.',
  doses_used INTEGER DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, batch_id)
);

-- ==================
-- SUBSTANCE PROFILES
-- ==================
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

-- ==================
-- REFLECTIONS
-- ==================
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

-- ==================
-- PATTERNS
-- ==================
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

-- ==================
-- BACKFILL / SAFE EVOLUTION
-- ==================
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

-- ==================
-- ROW LEVEL SECURITY
-- ==================
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dose_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS threshold_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS substance_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS patterns ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_own_data'
  ) THEN
    CREATE POLICY "users_own_data" ON users FOR ALL USING ((SELECT auth.uid()) = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'batches' AND policyname = 'batches_own_data'
  ) THEN
    CREATE POLICY "batches_own_data" ON batches FOR ALL USING ((SELECT auth.uid()) = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'dose_logs' AND policyname = 'doses_own_data'
  ) THEN
    CREATE POLICY "doses_own_data" ON dose_logs FOR ALL USING ((SELECT auth.uid()) = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'check_ins' AND policyname = 'checkins_own_data'
  ) THEN
    CREATE POLICY "checkins_own_data" ON check_ins FOR ALL USING ((SELECT auth.uid()) = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'threshold_ranges' AND policyname = 'ranges_own_data'
  ) THEN
    CREATE POLICY "ranges_own_data" ON threshold_ranges FOR ALL USING ((SELECT auth.uid()) = user_id);
  END IF;

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

-- ==================
-- INDEXES
-- ==================
CREATE INDEX IF NOT EXISTS idx_doses_user_time ON dose_logs(user_id, dosed_at DESC);
CREATE INDEX IF NOT EXISTS idx_doses_batch ON dose_logs(batch_id);
CREATE INDEX IF NOT EXISTS idx_checkins_dose ON check_ins(dose_log_id);
CREATE INDEX IF NOT EXISTS idx_batches_user_active ON batches(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ranges_user_batch ON threshold_ranges(user_id, batch_id);
CREATE INDEX IF NOT EXISTS idx_doses_phase ON dose_logs(user_id, phase);
CREATE INDEX IF NOT EXISTS idx_doses_day_classification ON dose_logs(user_id, day_classification);
CREATE INDEX IF NOT EXISTS idx_substance_profiles_user ON substance_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_patterns_user_active ON patterns(user_id, dismissed);
CREATE INDEX IF NOT EXISTS idx_reflections_user_time ON reflections(user_id, created_at DESC);

-- ==================
-- FUNCTIONS
-- ==================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_batches_updated_at ON batches;
CREATE TRIGGER update_batches_updated_at
  BEFORE UPDATE ON batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dose_logs_updated_at ON dose_logs;
CREATE TRIGGER update_dose_logs_updated_at
  BEFORE UPDATE ON dose_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_substance_profiles_updated_at ON substance_profiles;
CREATE TRIGGER update_substance_profiles_updated_at
  BEFORE UPDATE ON substance_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
