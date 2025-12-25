-- ============================================
-- THRESHOLD COMPASS — SUPABASE SCHEMA
-- ============================================
-- Run this in your Supabase SQL Editor
-- Creates all tables, RLS policies, indexes, and functions
-- 
-- Generated: December 24, 2025
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  
  -- Guidance preferences
  guidance_level TEXT DEFAULT 'guided' CHECK (guidance_level IN ('minimal', 'guided', 'deep')),
  default_logging_tier INTEGER DEFAULT 2 CHECK (default_logging_tier BETWEEN 1 AND 3),
  
  -- North Star (the direction)
  north_star JSONB NOT NULL DEFAULT '{"type": "stability", "custom": null}',
  
  -- Sensitivity calibration
  sensitivity JSONB NOT NULL DEFAULT '{"caffeine": 3, "cannabis": null, "bodyAwareness": 3, "emotionalReactivity": 3, "medications": []}',
  
  -- Substance preferences
  primary_substance TEXT CHECK (primary_substance IN ('psilocybin', 'lsd', 'both')),
  
  -- Settings
  notifications JSONB DEFAULT '{"activationCheck": true, "signalWindow": true, "integration": true, "endOfDay": true, "followUp24h": false, "followUp72h": false, "method": "push"}',
  sharing_level TEXT DEFAULT 'local' CHECK (sharing_level IN ('local', 'anonymous', 'full')),
  menstrual_tracking BOOLEAN DEFAULT false,
  cycle_day INTEGER,
  
  -- Safety
  emergency_contact JSONB,
  
  -- Timestamps
  onboarding_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- SUBSTANCE PROFILES (per user, per substance)
-- ============================================
CREATE TABLE substance_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  substance_type TEXT NOT NULL CHECK (substance_type IN ('psilocybin', 'lsd')),
  
  -- Threshold range (the core IP)
  threshold_range JSONB DEFAULT NULL,
  -- Structure: { low: { dose, confidence, samples }, sweet: {...}, high: {...} }
  
  -- Invisible line estimate
  invisible_line_estimate DECIMAL(6,4),
  
  -- Stats
  total_doses INTEGER DEFAULT 0,
  discovery_complete BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, substance_type)
);

-- RLS
ALTER TABLE substance_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own substance profiles" ON substance_profiles
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- BATCHES
-- ============================================
CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Identity
  name TEXT NOT NULL,
  substance_type TEXT NOT NULL CHECK (substance_type IN ('psilocybin', 'lsd')),
  
  -- Calibration
  calibration_status TEXT DEFAULT 'uncalibrated' CHECK (calibration_status IN ('uncalibrated', 'calibrating', 'calibrated')),
  potency_estimate DECIMAL(4,2),  -- Relative to baseline (1.0 = standard)
  doses_logged INTEGER DEFAULT 0,
  
  -- User notes
  notes TEXT,
  source TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  archived_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_batches_user_active ON batches(user_id, is_active);

-- RLS
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own batches" ON batches
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- DOSE LOGS
-- ============================================
CREATE TABLE dose_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
  
  -- Core dose info
  amount DECIMAL(6,4) NOT NULL,  -- In substance unit (grams or µg)
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Carryover (calculated at log time)
  carryover JSONB NOT NULL,
  effective_dose DECIMAL(6,4) NOT NULL,
  
  -- Context (Tier 1 - required)
  food_state TEXT NOT NULL CHECK (food_state IN ('empty', 'light', 'full')),
  intention TEXT NOT NULL,
  
  -- Context (Tier 2 - optional)
  sleep_hours DECIMAL(3,1),
  sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 5),
  stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 5),
  caffeine_mg INTEGER,
  caffeine_timing INTEGER,  -- Hours before dose
  environment TEXT CHECK (environment IN ('home_alone', 'home_others', 'outdoor', 'work', 'social', 'travel')),
  cannabis TEXT CHECK (cannabis IN ('none', 'light', 'moderate', 'heavy')),
  
  -- Context (Tier 3 - optional)
  cycle_day INTEGER,
  exercise BOOLEAN,
  notes TEXT,
  
  -- Tags for pattern detection
  tags TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dose_logs_user_timestamp ON dose_logs(user_id, timestamp DESC);
CREATE INDEX idx_dose_logs_batch ON dose_logs(batch_id);
CREATE INDEX idx_dose_logs_user_recent ON dose_logs(user_id, timestamp DESC) WHERE timestamp > NOW() - INTERVAL '14 days';

-- RLS
ALTER TABLE dose_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own dose logs" ON dose_logs
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- CHECK-INS
-- ============================================
CREATE TABLE check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dose_id UUID REFERENCES dose_logs(id) ON DELETE SET NULL,
  
  -- When
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  phase TEXT NOT NULL CHECK (phase IN ('active', 'integration', 'rest')),
  
  -- External conditions
  conditions JSONB NOT NULL,
  -- Structure: { load: 'low'|'med'|'high', noise: same, schedule: 'open'|'mixed'|'full' }
  
  -- Internal signals
  signals JSONB NOT NULL,
  -- Structure: { energy: 1-5, clarity: 1-5, stability: 1-5 }
  
  -- Body awareness (optional)
  body_map JSONB DEFAULT '[]',
  -- Structure: [{ region, intensity, quality }]
  
  -- Quick notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_check_ins_user_timestamp ON check_ins(user_id, timestamp DESC);
CREATE INDEX idx_check_ins_dose ON check_ins(dose_id);

-- RLS
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own check-ins" ON check_ins
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- REFLECTIONS
-- ============================================
CREATE TABLE reflections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dose_id UUID NOT NULL REFERENCES dose_logs(id) ON DELETE CASCADE,
  
  -- Timing
  timing TEXT NOT NULL CHECK (timing IN ('eod', '24h', '72h')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Content
  still_with_me TEXT,
  would_change TEXT,
  gratitude TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(dose_id, timing)
);

CREATE INDEX idx_reflections_dose ON reflections(dose_id);

-- RLS
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own reflections" ON reflections
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- CORRECTION LOGS
-- ============================================
CREATE TABLE correction_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  correction_id TEXT NOT NULL,  -- References static content
  check_in_id UUID NOT NULL REFERENCES check_ins(id) ON DELETE CASCADE,
  
  -- Response
  response TEXT NOT NULL CHECK (response IN ('completed', 'postponed', 'skipped')),
  completed_at TIMESTAMPTZ,
  
  -- Feedback
  helpful BOOLEAN,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_correction_logs_user ON correction_logs(user_id);

-- RLS
ALTER TABLE correction_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own correction logs" ON correction_logs
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- PATTERNS
-- ============================================
CREATE TABLE patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL CHECK (type IN (
    'food_correlation', 'day_clustering', 'sleep_correlation',
    'environment_correlation', 'caffeine_timing', 'cycle_correlation',
    'body_cluster', 'anti_pattern'
  )),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  confidence INTEGER NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  
  -- Evidence
  evidence_dose_ids UUID[] DEFAULT '{}',
  evidence_check_in_ids UUID[] DEFAULT '{}',
  
  -- Display
  first_shown_at TIMESTAMPTZ,
  times_shown INTEGER DEFAULT 0,
  dismissed BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_patterns_user_active ON patterns(user_id) WHERE dismissed = false;

-- RLS
ALTER TABLE patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own patterns" ON patterns
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- ADMIN FLAGS (Safety monitoring)
-- ============================================
CREATE TABLE admin_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  flag_type TEXT NOT NULL CHECK (flag_type IN (
    'high_frequency', 'escalating_dose', 'drift_multiple', 'contraindication'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  
  -- Context
  details TEXT NOT NULL,
  related_dose_ids UUID[],
  
  -- Resolution
  reviewed BOOLEAN DEFAULT false,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  action_taken TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_flags_unreviewed ON admin_flags(severity, created_at) WHERE reviewed = false;

-- RLS (admin only for read, system for write)
ALTER TABLE admin_flags ENABLE ROW LEVEL SECURITY;

-- Note: You'll need to add admin role checking here based on your setup

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_substance_profiles_updated_at
  BEFORE UPDATE ON substance_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batches_updated_at
  BEFORE UPDATE ON batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dose_logs_updated_at
  BEFORE UPDATE ON dose_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patterns_updated_at
  BEFORE UPDATE ON patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Increment batch dose count
CREATE OR REPLACE FUNCTION increment_batch_dose_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE batches 
  SET 
    doses_logged = doses_logged + 1,
    calibration_status = CASE 
      WHEN doses_logged >= 2 THEN 'calibrated'
      WHEN doses_logged >= 0 THEN 'calibrating'
      ELSE 'uncalibrated'
    END
  WHERE id = NEW.batch_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_dose_insert_update_batch
  AFTER INSERT ON dose_logs
  FOR EACH ROW EXECUTE FUNCTION increment_batch_dose_count();

-- Increment substance profile dose count
CREATE OR REPLACE FUNCTION increment_substance_dose_count()
RETURNS TRIGGER AS $$
DECLARE
  v_substance_type TEXT;
BEGIN
  SELECT substance_type INTO v_substance_type FROM batches WHERE id = NEW.batch_id;
  
  UPDATE substance_profiles
  SET 
    total_doses = total_doses + 1,
    discovery_complete = CASE WHEN total_doses >= 9 THEN true ELSE discovery_complete END
  WHERE user_id = NEW.user_id AND substance_type = v_substance_type;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_dose_insert_update_substance
  AFTER INSERT ON dose_logs
  FOR EACH ROW EXECUTE FUNCTION increment_substance_dose_count();

-- ============================================
-- INITIAL DATA (Optional - run if needed)
-- ============================================

-- Create substance profiles for new users (run via trigger or manually)
-- This ensures each user has profiles for both substances

CREATE OR REPLACE FUNCTION create_substance_profiles_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO substance_profiles (user_id, substance_type)
  VALUES 
    (NEW.id, 'psilocybin'),
    (NEW.id, 'lsd')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_user_create_profiles
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_substance_profiles_for_user();
