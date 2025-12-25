/**
 * THRESHOLD COMPASS — GOD SCHEMA (types.ts)
 * 
 * This is the SINGLE SOURCE OF TRUTH for all data structures.
 * Paste this file into EVERY agent prompt (Claude Code, Lovable, Gemini, Cursor).
 * 
 * Contract-first development: All tools use these exact interfaces.
 * If the UI expects `user_id` and the backend sends `userId`, you will waste hours debugging.
 * 
 * Generated: December 24, 2025
 */

// ============================================
// CORE USER TYPES
// ============================================

export type GuidanceLevel = 'minimal' | 'guided' | 'deep';
export type SubstanceType = 'psilocybin' | 'lsd';
export type SharingLevel = 'local' | 'anonymous' | 'full';

export type NorthStarType = 
  | 'stability'    // Emotional regulation, grounding
  | 'clarity'      // Mental sharpness, focus
  | 'creativity'   // Divergent thinking, flow
  | 'presence'     // Awareness, mindfulness
  | 'recovery'     // Healing, processing
  | 'exploration'  // Discovery, openness
  | 'custom';      // User-defined

export interface SensitivityProfile {
  caffeine: number;           // 1-5 (1 = very sensitive)
  cannabis: number | null;    // 1-5 or null if no experience
  bodyAwareness: number;      // 1-5 (1 = low awareness)
  emotionalReactivity: number; // 1-5 (1 = very reactive)
  medications: string[];      // List of current meds
}

export interface NorthStar {
  type: NorthStarType;
  custom: string | null;      // Only if type === 'custom'
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface NotificationSettings {
  activationCheck: boolean;   // +45min for psilocybin
  signalWindow: boolean;      // +90min
  integration: boolean;       // +3-4h
  endOfDay: boolean;          // EOD reflection
  followUp24h: boolean;
  followUp72h: boolean;
  method: 'push' | 'email' | 'sms';
}

export interface User {
  id: string;                 // UUID
  email: string;
  
  // Guidance preferences
  guidance_level: GuidanceLevel;
  default_logging_tier: 1 | 2 | 3;
  
  // North Star (the direction)
  north_star: NorthStar;
  
  // Sensitivity calibration
  sensitivity: SensitivityProfile;
  
  // Substance preferences
  primary_substance: SubstanceType | 'both';
  
  // Settings
  notifications: NotificationSettings;
  sharing_level: SharingLevel;
  menstrual_tracking: boolean;
  cycle_day: number | null;
  
  // Safety
  emergency_contact: EmergencyContact | null;
  
  // Meta
  onboarding_complete: boolean;
  created_at: string;         // ISO timestamp
  updated_at: string;         // ISO timestamp
}

// ============================================
// SUBSTANCE & BATCH TYPES
// ============================================

export interface ThresholdRange {
  low: {
    dose: number;
    confidence: number;       // 0-100
    samples: number;
  };
  sweet: {
    dose: number;
    confidence: number;
    samples: number;
  };
  high: {
    dose: number;
    confidence: number;
    samples: number;
  };
}

export interface SubstanceProfile {
  id: string;
  user_id: string;
  substance_type: SubstanceType;
  
  // Threshold range (the core IP)
  threshold_range: ThresholdRange | null;
  
  // Invisible line estimate
  invisible_line_estimate: number | null;
  
  // Stats
  total_doses: number;
  discovery_complete: boolean;
  
  created_at: string;
  updated_at: string;
}

export type CalibrationStatus = 
  | 'uncalibrated'    // No doses logged
  | 'calibrating'     // 1-2 doses
  | 'calibrated';     // 3+ doses with consistent data

export interface Batch {
  id: string;
  user_id: string;
  
  // Identity
  name: string;               // "Golden Teacher #3", "1P-LSD Tab"
  substance_type: SubstanceType;
  
  // Calibration
  calibration_status: CalibrationStatus;
  potency_estimate: number | null;  // Relative to baseline (1.0 = standard)
  doses_logged: number;
  
  // User notes
  notes: string | null;
  source: string | null;      // Optional, for personal tracking
  
  // Status
  is_active: boolean;
  archived_at: string | null;
  
  created_at: string;
  updated_at: string;
}

// ============================================
// DOSE LOGGING TYPES
// ============================================

export type FoodState = 'empty' | 'light' | 'full';
export type CarryoverTier = 'clear' | 'mild' | 'moderate' | 'high';
export type Environment = 
  | 'home_alone' 
  | 'home_others' 
  | 'outdoor' 
  | 'work' 
  | 'social' 
  | 'travel';

export interface CarryoverResult {
  score: number;              // 0-100
  tier: CarryoverTier;
  effective_dose_multiplier: number;  // 0.65-1.0
  contributing_doses: {
    date: string;
    amount: number;
    weight: number;           // Contribution to carryover
  }[];
  recommendation: string;     // Human-readable
}

export interface DoseLog {
  id: string;
  user_id: string;
  batch_id: string;
  
  // Core dose info
  amount: number;             // In substance unit (grams or µg)
  timestamp: string;          // ISO timestamp
  
  // Carryover (calculated at log time)
  carryover: CarryoverResult;
  effective_dose: number;     // amount * carryover.effective_dose_multiplier
  
  // Context (Tier 1 - required)
  food_state: FoodState;
  intention: string;
  
  // Context (Tier 2 - optional)
  sleep_hours: number | null;
  sleep_quality: number | null;  // 1-5
  stress_level: number | null;   // 1-5
  caffeine_mg: number | null;
  caffeine_timing: number | null; // Hours before dose
  environment: Environment | null;
  cannabis: 'none' | 'light' | 'moderate' | 'heavy' | null;
  
  // Context (Tier 3 - optional)
  cycle_day: number | null;
  exercise: boolean | null;
  notes: string | null;
  
  // Tags for pattern detection
  tags: string[];
  
  created_at: string;
  updated_at: string;
}

// ============================================
// CHECK-IN TYPES
// ============================================

export type LoadLevel = 'low' | 'med' | 'high';
export type Phase = 'active' | 'integration' | 'rest';

export interface Conditions {
  load: LoadLevel;            // External demands
  noise: LoadLevel;           // Environmental stimulation
  schedule: 'open' | 'mixed' | 'full';
}

export interface Signals {
  energy: number;             // 1-5
  clarity: number;            // 1-5
  stability: number;          // 1-5
}

export interface BodyMapPoint {
  region: string;             // 'head', 'chest', 'gut', 'hands', etc.
  intensity: number;          // 1-5
  quality: 'tension' | 'warmth' | 'tingling' | 'heaviness' | 'other';
}

export interface CheckIn {
  id: string;
  user_id: string;
  dose_id: string | null;     // Null for rest day check-ins
  
  // When
  timestamp: string;
  phase: Phase;
  
  // External
  conditions: Conditions;
  
  // Internal
  signals: Signals;
  
  // Body awareness (optional)
  body_map: BodyMapPoint[];
  
  // Quick notes
  notes: string | null;
  
  created_at: string;
}

export interface Reflection {
  id: string;
  user_id: string;
  dose_id: string;
  
  // Timing
  timing: 'eod' | '24h' | '72h';  // End of day, +24h, +72h
  timestamp: string;
  
  // Content
  still_with_me: string | null;     // What's still present?
  would_change: string | null;      // What would you do differently?
  gratitude: string | null;         // Optional
  
  created_at: string;
}

// ============================================
// COURSE CORRECTION TYPES
// ============================================

export type CorrectionCategory = 
  | 'breath' 
  | 'movement' 
  | 'grounding' 
  | 'environment' 
  | 'attention'
  | 'social';

export interface CourseCorrection {
  id: string;
  title: string;              // 5 words max
  instruction: string;        // Imperative, specific, time-bounded
  duration: number;           // Seconds (60-600)
  category: CorrectionCategory;
  
  // Matching criteria
  directions: NorthStarType[];  // Which North Stars this suits
  conditions: {
    loadMatch?: LoadLevel;
    energyRange?: [number, number];
    phase?: Phase;
  };
  
  // Don't suggest when
  contraindications?: string[];
  
  // Weighting
  baseRelevance: number;      // 0-100
}

export interface CorrectionLog {
  id: string;
  user_id: string;
  correction_id: string;
  check_in_id: string;
  
  // Response
  response: 'completed' | 'postponed' | 'skipped';
  completed_at: string | null;
  
  // Feedback
  helpful: boolean | null;
  
  created_at: string;
}

// ============================================
// PATTERN TYPES
// ============================================

export type PatternType = 
  | 'food_correlation'
  | 'day_clustering'
  | 'sleep_correlation'
  | 'environment_correlation'
  | 'caffeine_timing'
  | 'cycle_correlation'
  | 'body_cluster'
  | 'anti_pattern';           // Difficult experiences

export interface Pattern {
  id: string;
  user_id: string;
  
  type: PatternType;
  title: string;              // "Your Tuesdays share something"
  description: string;        // The insight
  confidence: number;         // 0-100
  
  // Evidence
  evidence_dose_ids: string[];
  evidence_check_in_ids: string[];
  
  // Display
  first_shown_at: string | null;
  times_shown: number;
  dismissed: boolean;
  
  created_at: string;
  updated_at: string;
}

// ============================================
// WORKSHOP TYPES
// ============================================

export type WorkshopCardType = 'drill' | 'model' | 'happening' | 'protocol';

export interface WorkshopCard {
  id: string;
  title: string;
  type: WorkshopCardType;
  
  // What you see first
  headline: string;           // The experiment in one line
  tryThis: string;            // What to do (imperative, specific)
  duration: number;           // Seconds
  
  // Collapsible
  whyItWorks?: string;
  variations?: string[];
  relatedPatterns?: string[];
  
  // Metadata
  bestFor?: Phase[];
  category?: string;
}

export interface Drill extends WorkshopCard {
  type: 'drill';
  steps?: string[];           // For guided exercises
  audioUrl?: string;          // Optional audio guide
}

export interface Model extends WorkshopCard {
  type: 'model';
  visualUrl?: string;         // Illustration
}

export interface WhatIsHappening extends WorkshopCard {
  type: 'happening';
  symptoms: string[];         // What user might be experiencing
  normalcy: string;           // "This is normal because..."
}

export interface Protocol {
  id: string;
  name: string;               // "Fadiman", "Stamets", "Custom"
  schedule: {
    frequency: 'daily' | 'every_other' | 'twice_weekly' | 'custom';
    pattern?: number[];       // Days of week (0-6) for custom
  };
  duration_weeks: number;
  description: string;
}

// ============================================
// SAFETY TYPES
// ============================================

export type ContraindicationType = 'absolute' | 'relative';

export interface Contraindication {
  id: string;
  name: string;
  type: ContraindicationType;
  description: string;
  action: 'block' | 'warn' | 'inform';
  source: string;             // Citation
}

export interface AdminFlag {
  id: string;
  user_id: string;
  
  flag_type: 'high_frequency' | 'escalating_dose' | 'drift_multiple' | 'contraindication';
  severity: 'low' | 'medium' | 'high';
  
  // Context
  details: string;
  related_dose_ids?: string[];
  
  // Resolution
  reviewed: boolean;
  reviewed_at: string | null;
  reviewed_by: string | null;
  action_taken: string | null;
  
  created_at: string;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface CompassState {
  user: User;
  trajectory: number;         // 0-360 degrees
  declination: number;        // Gap from North Star
  carryover: CarryoverResult;
  phase: Phase;
  lastDose: DoseLog | null;
  lastCheckIn: CheckIn | null;
  suggestedCorrection: CourseCorrection | null;
  daysInPractice: number;
}

export interface ThresholdDiscoveryProgress {
  substance: SubstanceType;
  totalDoses: number;
  dosesNeeded: number;        // For discovery (usually 10)
  range: ThresholdRange | null;
  status: 'collecting' | 'emerging' | 'established';
  message: string;
}

export interface WeeklySnapshot {
  weekOf: string;             // ISO date
  trajectory: number;
  alignedWithNorthStar: boolean;
  patternOfTheWeek: Pattern | null;
  stats: {
    doses: number;
    checkIns: number;
    sweetSpotRate: number;    // % of doses in sweet spot
    daysTracked: number;
  };
}

// ============================================
// FORM INPUT TYPES (for UI)
// ============================================

export interface DoseFormInput {
  batch_id: string;
  amount: number;
  food_state: FoodState;
  intention: string;
  
  // Tier 2 (optional)
  sleep_hours?: number;
  sleep_quality?: number;
  stress_level?: number;
  caffeine_mg?: number;
  caffeine_timing?: number;
  environment?: Environment;
  cannabis?: 'none' | 'light' | 'moderate' | 'heavy';
  
  // Tier 3 (optional)
  cycle_day?: number;
  exercise?: boolean;
  notes?: string;
}

export interface CheckInFormInput {
  dose_id?: string;           // Null for rest day
  phase: Phase;
  
  conditions: Conditions;
  signals: Signals;
  
  body_map?: BodyMapPoint[];
  notes?: string;
}

export interface OnboardingInput {
  guidance_level: GuidanceLevel;
  sensitivity: SensitivityProfile;
  primary_substance: SubstanceType | 'both';
  north_star: NorthStar;
  
  // First batch
  first_batch: {
    name: string;
    substance_type: SubstanceType;
    notes?: string;
  };
}
