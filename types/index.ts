// THRESHOLD COMPASS — TypeScript Interfaces
// Single source of truth for all data structures (PRD v2.0)

// ============================================
// ENUMS / UNION TYPES
// ============================================

export type SubstanceType = 'psilocybin' | 'lsd' | 'other';
export type GuidanceLevel = 'guided' | 'experienced' | 'minimal';
export type NorthStar = 'clarity' | 'connection' | 'creativity' | 'calm' | 'exploration';
export type CarryoverTier = 'clear' | 'mild' | 'moderate' | 'elevated';
export type ThresholdZone = 'sub' | 'low' | 'sweet_spot' | 'high' | 'over';
export type CalibrationStatus = 'uncalibrated' | 'calibrating' | 'calibrated';
export type CheckInType = 'activation' | 'signal' | 'integration' | 'reflection';
export type Phase = 'baseline' | 'context';
export type ThresholdFeel = 'nothing' | 'under' | 'sweetspot' | 'over';
export type DayClassification = 'green' | 'yellow' | 'red' | 'unclassified';
export type ContextTag = 'work' | 'creative' | 'social' | 'physical' | 'rest' | 'therapy' | 'mixed';
export type TimingTag = 'morning' | 'midday' | 'afternoon';

// Substance-specific forms
export type PsilocybinForm = 'fresh' | 'dried' | 'ground' | 'capsule' | 'chocolate' | 'edible' | 'tea' | 'other';
export type LSDForm = 'paper' | 'liquid' | 'gel' | 'capsule' | 'other';
export type OtherForm = 'whole' | 'ground' | 'capsule' | 'liquid' | 'edible' | 'other';
export type BatchForm = PsilocybinForm | LSDForm | OtherForm;

// Dose units
export type DoseUnit = 'mg' | 'ug';

export type EstimatedPotency = 'low' | 'medium' | 'high' | 'unknown';
export type Preparation = 'empty_stomach' | 'light_meal' | 'full_meal';
export type SleepQuality = 'poor' | 'fair' | 'good' | 'great';
export type EnergyLevel = 'low' | 'medium' | 'high';
export type StressLevel = 'low' | 'medium' | 'high';
export type CorrectionCategory = 'breath' | 'movement' | 'grounding' | 'environment' | 'attention';

// ============================================
// DATABASE MODELS
// ============================================

export interface User {
  id: string;
  email: string;
  substance_type: SubstanceType;
  sensitivity: number; // 1-5
  north_star: NorthStar;
  guidance_level: GuidanceLevel;
  menstrual_tracking: boolean;
  emergency_contact: EmergencyContact | null;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface Batch {
  id: string;
  user_id: string;
  name: string;
  substance_type: SubstanceType;
  form: BatchForm;
  estimated_potency: EstimatedPotency;
  dose_unit: DoseUnit;
  supplements: string | null;
  source_notes: string | null;
  date_acquired: string | null;
  is_active: boolean;
  calibration_status: CalibrationStatus;
  created_at: string;
  updated_at: string;
}

export interface DoseLog {
  id: string;
  user_id: string;
  batch_id: string;
  amount: number;
  unit: string;
  dosed_at: string;
  preparation: Preparation | null;
  sleep_quality: SleepQuality | null;
  energy_level: EnergyLevel | null;
  stress_level: StressLevel | null;
  cycle_day: number | null;
  notes: string | null;
  discovery_dose_number: number | null;
  phase: Phase | null;
  dose_number: number | null;
  pre_dose_mood: number | null;
  intention: string | null;
  post_dose_completed: boolean;
  post_dose_mood: number | null;
  signal_score: number | null;
  texture_score: number | null;
  interference_score: number | null;
  threshold_feel: ThresholdFeel | null;
  day_classification: DayClassification | null;
  context_tags: ContextTag[] | null;
  timing_tag: TimingTag | null;
  carryover_score: number | null;
  effective_dose: number | null;
  created_at: string;
  updated_at: string;
}

export interface STIScores {
  signal: number;
  texture: number;
  interference: number;
}

export interface CheckIn {
  id: string;
  user_id: string;
  dose_log_id: string | null;
  check_in_type: CheckInType;
  timing_minutes: number | null;
  // Conditions
  energy: string | null;
  mood: string | null;
  focus: string | null;
  body_state: string | null;
  social_context: string | null;
  // Signals
  visual: string | null;
  emotional: string | null;
  physical: string | null;
  cognitive: string | null;
  connection: string | null;
  // Classification
  threshold_zone: ThresholdZone | null;
  notes: string | null;
  created_at: string;
}

export interface ThresholdRange {
  id: string;
  user_id: string;
  batch_id: string;
  floor_dose: number | null;
  sweet_spot: number | null;
  ceiling_dose: number | null;
  confidence: number;
  qualifier: string;
  doses_used: number;
  calculated_at: string;
}

// ============================================
// ALGORITHM OUTPUTS
// ============================================

export interface CarryoverResult {
  percentage: number; // 0-100
  tier: CarryoverTier;
  effective_multiplier: number; // 0.0-1.0
  hours_to_clear: number | null;
  message: string;
}

export interface ThresholdRangeResult {
  floor: number | null;
  sweet_spot: number | null;
  ceiling: number | null;
  confidence: number;
  qualifier: string;
  doses_used: number;
  batch_id: string;
}

// ============================================
// CONTENT TYPES
// ============================================

export interface CourseCorrection {
  id: string;
  title: string;
  action: string;
  duration_seconds: number;
  category: CorrectionCategory;
  north_star_relevance: NorthStar[];
  contraindicated_conditions: string[];
}

export interface WhatIsHappeningCard {
  id: string;
  trigger: string;
  normalization: string;
  action: string;
  timeline: string | null;
  escalation: 'breathe' | 'ground' | 'emergency' | null;
}

export interface BreathingPattern {
  id: string;
  name: string;
  description: string;
  inhale: number;
  hold_in: number;
  exhale: number;
  hold_out: number;
  cycle_seconds: number;
}

// ============================================
// FORM INPUT TYPES
// ============================================

export interface DoseFormInput {
  batch_id: string;
  amount: number;
  preparation?: Preparation;
  sleep_quality?: SleepQuality;
  energy_level?: EnergyLevel;
  stress_level?: StressLevel;
  cycle_day?: number;
  notes?: string;
}

export interface CheckInFormInput {
  dose_log_id?: string;
  check_in_type: CheckInType;
  energy?: string;
  mood?: string;
  focus?: string;
  body_state?: string;
  social_context?: string;
  visual?: string;
  emotional?: string;
  physical?: string;
  cognitive?: string;
  connection?: string;
  threshold_zone?: ThresholdZone;
  notes?: string;
}

export interface BatchFormInput {
  name: string;
  substance_type: SubstanceType;
  form: BatchForm;
  estimated_potency: EstimatedPotency;
  dose_unit: DoseUnit;
  supplements?: string;
  source_notes?: string;
  date_acquired?: string;
}

export interface OnboardingInput {
  substance_type: SubstanceType;
  sensitivity: number;
  north_star: NorthStar;
  guidance_level: GuidanceLevel;
  first_batch: BatchFormInput;
}

// ============================================
// APP STATE
// ============================================

export interface CompassState {
  user: User | null;
  activeBatch: Batch | null;
  carryover: CarryoverResult;
  thresholdRange: ThresholdRange | null;
  discoveryProgress: {
    current_dose: number;
    total: number;
    phase: 'baseline' | 'mapping' | 'refinement';
  } | null;
}
