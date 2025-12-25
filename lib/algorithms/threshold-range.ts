/**
 * THRESHOLD COMPASS — THRESHOLD RANGE ALGORITHM
 * 
 * Calculates the user's personal threshold range based on dose history.
 * This is the core IP of the app — finding the LOW, SWEET, and HIGH
 * threshold for each user, per batch.
 * 
 * The key insight: threshold is a RANGE that varies by context,
 * not a single number.
 */

import { DoseLog, CheckIn, ThresholdRange, SubstanceType } from '@/types';

// Minimum doses needed to calculate range
const MIN_DOSES_FOR_RANGE = 5;
const MIN_DOSES_FOR_CONFIDENCE = 10;

// Signal quality scoring
const SIGNAL_WEIGHTS = {
  clarity: 0.4,
  energy: 0.3,
  stability: 0.3,
};

interface DoseWithOutcome {
  dose: DoseLog;
  checkIn: CheckIn | null;
  outcomeScore: number;  // 0-100
  effectiveDose: number;
}

interface RangeResult {
  range: ThresholdRange | null;
  status: 'insufficient_data' | 'emerging' | 'established';
  message: string;
  dosesAnalyzed: number;
  dosesNeeded: number;
}

/**
 * Calculate threshold range for a specific batch
 */
export function calculateThresholdRange(
  doses: DoseLog[],
  checkIns: CheckIn[],
  batchId: string
): RangeResult {
  // Filter to batch and match with check-ins
  const batchDoses = doses.filter(d => d.batch_id === batchId);
  
  if (batchDoses.length < MIN_DOSES_FOR_RANGE) {
    return {
      range: null,
      status: 'insufficient_data',
      message: `Log ${MIN_DOSES_FOR_RANGE - batchDoses.length} more doses to see your threshold range.`,
      dosesAnalyzed: batchDoses.length,
      dosesNeeded: MIN_DOSES_FOR_RANGE,
    };
  }
  
  // Match doses with outcomes
  const dosesWithOutcomes = matchDosesWithOutcomes(batchDoses, checkIns);
  
  // Filter to doses with outcomes
  const scoredDoses = dosesWithOutcomes.filter(d => d.outcomeScore > 0);
  
  if (scoredDoses.length < MIN_DOSES_FOR_RANGE) {
    return {
      range: null,
      status: 'insufficient_data',
      message: `Need more check-ins to calculate your range. Complete check-ins after dosing.`,
      dosesAnalyzed: scoredDoses.length,
      dosesNeeded: MIN_DOSES_FOR_RANGE,
    };
  }
  
  // Calculate range
  const range = computeRange(scoredDoses);
  
  const status = scoredDoses.length >= MIN_DOSES_FOR_CONFIDENCE ? 'established' : 'emerging';
  
  const message = status === 'established'
    ? `Your threshold range is established based on ${scoredDoses.length} doses.`
    : `Range emerging. ${MIN_DOSES_FOR_CONFIDENCE - scoredDoses.length} more doses will increase confidence.`;
  
  return {
    range,
    status,
    message,
    dosesAnalyzed: scoredDoses.length,
    dosesNeeded: status === 'established' ? 0 : MIN_DOSES_FOR_CONFIDENCE - scoredDoses.length,
  };
}

/**
 * Match doses with their outcome check-ins and calculate scores
 */
function matchDosesWithOutcomes(
  doses: DoseLog[],
  checkIns: CheckIn[]
): DoseWithOutcome[] {
  return doses.map(dose => {
    // Find check-ins within 8 hours of dose
    const doseTime = new Date(dose.timestamp).getTime();
    const relatedCheckIns = checkIns.filter(c => {
      if (c.dose_id === dose.id) return true;
      const checkInTime = new Date(c.timestamp).getTime();
      const hoursDiff = (checkInTime - doseTime) / (1000 * 60 * 60);
      return hoursDiff >= 0 && hoursDiff <= 8;
    });
    
    if (relatedCheckIns.length === 0) {
      return {
        dose,
        checkIn: null,
        outcomeScore: 0,
        effectiveDose: dose.effective_dose,
      };
    }
    
    // Use the check-in with highest combined signals
    const bestCheckIn = relatedCheckIns.reduce((best, current) => {
      const currentScore = calculateSignalScore(current.signals);
      const bestScore = calculateSignalScore(best.signals);
      return currentScore > bestScore ? current : best;
    });
    
    return {
      dose,
      checkIn: bestCheckIn,
      outcomeScore: calculateSignalScore(bestCheckIn.signals),
      effectiveDose: dose.effective_dose,
    };
  });
}

/**
 * Calculate weighted signal score (0-100)
 */
function calculateSignalScore(signals: { energy: number; clarity: number; stability: number }): number {
  const weighted = 
    signals.clarity * SIGNAL_WEIGHTS.clarity +
    signals.energy * SIGNAL_WEIGHTS.energy +
    signals.stability * SIGNAL_WEIGHTS.stability;
  
  // Convert from 1-5 scale to 0-100
  return ((weighted - 1) / 4) * 100;
}

/**
 * Compute the threshold range from scored doses
 */
function computeRange(doses: DoseWithOutcome[]): ThresholdRange {
  // Sort by effective dose
  const sorted = [...doses].sort((a, b) => a.effectiveDose - b.effectiveDose);
  
  // Find the "sweet spot" - doses with best outcomes
  const avgScore = doses.reduce((sum, d) => sum + d.outcomeScore, 0) / doses.length;
  const sweetSpotDoses = doses.filter(d => d.outcomeScore >= avgScore);
  
  // Calculate sweet spot range
  const sweetDoses = sweetSpotDoses.map(d => d.effectiveDose);
  const sweetMean = sweetDoses.reduce((a, b) => a + b, 0) / sweetDoses.length;
  
  // Find low threshold (where effects become noticeable but subtle)
  // This is typically the lowest dose that still produced positive outcomes
  const lowDoses = sorted.filter(d => d.outcomeScore > 40); // Above baseline
  const lowThreshold = lowDoses.length > 0 
    ? Math.min(...lowDoses.map(d => d.effectiveDose))
    : sorted[0].effectiveDose;
  
  // Find high threshold (where effects approach perceptual)
  // This is the highest dose that still produced good outcomes without issues
  const highDoses = sorted.filter(d => d.outcomeScore > 60); // Good outcomes
  const highThreshold = highDoses.length > 0
    ? Math.max(...highDoses.map(d => d.effectiveDose))
    : sorted[sorted.length - 1].effectiveDose;
  
  // Calculate confidence based on sample size and consistency
  const confidenceLow = calculateConfidence(lowDoses.length, doses.length);
  const confidenceSweet = calculateConfidence(sweetSpotDoses.length, doses.length);
  const confidenceHigh = calculateConfidence(highDoses.length, doses.length);
  
  return {
    low: {
      dose: roundDose(lowThreshold),
      confidence: confidenceLow,
      samples: lowDoses.length,
    },
    sweet: {
      dose: roundDose(sweetMean),
      confidence: confidenceSweet,
      samples: sweetSpotDoses.length,
    },
    high: {
      dose: roundDose(highThreshold),
      confidence: confidenceHigh,
      samples: highDoses.length,
    },
  };
}

/**
 * Calculate confidence score based on sample size
 */
function calculateConfidence(samples: number, total: number): number {
  // Base confidence from sample size
  const sampleConfidence = Math.min(80, samples * 10);
  
  // Boost for proportion of total
  const proportionBoost = (samples / total) * 20;
  
  return Math.min(95, Math.round(sampleConfidence + proportionBoost));
}

/**
 * Round dose to sensible precision
 */
function roundDose(dose: number): number {
  if (dose >= 1) {
    return Math.round(dose * 100) / 100; // 0.01 precision for grams
  }
  return Math.round(dose * 1000) / 1000; // 0.001 precision for small doses
}

/**
 * Compare threshold ranges between batches
 * Returns insights about potency differences
 */
export function compareBatchRanges(
  rangeA: ThresholdRange,
  rangeB: ThresholdRange,
  batchNameA: string,
  batchNameB: string
): string {
  const sweetRatio = rangeA.sweet.dose / rangeB.sweet.dose;
  
  if (sweetRatio > 1.3) {
    return `${batchNameB} appears ${Math.round((sweetRatio - 1) * 100)}% more potent than ${batchNameA}. Your sweet spot is lower.`;
  } else if (sweetRatio < 0.7) {
    return `${batchNameA} appears ${Math.round((1 - sweetRatio) * 100)}% more potent than ${batchNameB}. Your sweet spot is lower.`;
  } else {
    return `${batchNameA} and ${batchNameB} have similar potency. Your threshold range is consistent.`;
  }
}

/**
 * Suggest a dose based on current context and range
 */
export function suggestDose(
  range: ThresholdRange,
  carryoverMultiplier: number,
  intention: 'subtle' | 'standard' | 'strong'
): { dose: number; rationale: string } {
  let baseDose: number;
  let rationale: string;
  
  switch (intention) {
    case 'subtle':
      baseDose = range.low.dose;
      rationale = 'Low end of your range for subtle support.';
      break;
    case 'strong':
      baseDose = range.high.dose;
      rationale = 'Upper end of your range for stronger effects.';
      break;
    default:
      baseDose = range.sweet.dose;
      rationale = 'Your sweet spot for balanced effects.';
  }
  
  // Adjust for carryover
  const adjustedDose = baseDose / carryoverMultiplier;
  
  if (carryoverMultiplier < 1) {
    rationale += ` Adjusted up slightly to account for ${Math.round((1 - carryoverMultiplier) * 100)}% carryover.`;
  }
  
  return {
    dose: roundDose(adjustedDose),
    rationale,
  };
}

/**
 * Detect if a dose was likely above threshold (perceptual)
 */
export function detectAboveThreshold(
  dose: DoseLog,
  checkIn: CheckIn | null,
  range: ThresholdRange | null
): { likely: boolean; confidence: number; reason: string } {
  if (!checkIn) {
    return { likely: false, confidence: 0, reason: 'No check-in data' };
  }
  
  // If we have a range, compare
  if (range) {
    if (dose.effective_dose > range.high.dose * 1.2) {
      return {
        likely: true,
        confidence: 80,
        reason: 'Dose significantly above your established high threshold.',
      };
    }
  }
  
  // Check signals for perceptual indicators
  // Very high clarity + energy often indicates above-threshold
  const signals = checkIn.signals;
  if (signals.clarity >= 5 && signals.energy >= 4) {
    return {
      likely: true,
      confidence: 60,
      reason: 'Signal pattern suggests perceptual effects.',
    };
  }
  
  // Check for instability (often indicates too high)
  if (signals.stability <= 2 && signals.energy >= 4) {
    return {
      likely: true,
      confidence: 70,
      reason: 'High energy with low stability often indicates above threshold.',
    };
  }
  
  return {
    likely: false,
    confidence: 50,
    reason: 'Signals within normal threshold range.',
  };
}
