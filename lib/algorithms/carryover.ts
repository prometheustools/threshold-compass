/**
 * THRESHOLD COMPASS — CARRYOVER ALGORITHM
 * 
 * Calculates tolerance/carryover based on recent dose history.
 * This is one of the core differentiators of the app.
 * 
 * Key insight: Tolerance builds quickly (within 24-48 hours) and
 * takes 7-14 days to fully reset. The algorithm weights recent
 * doses more heavily and accounts for consecutive dosing.
 */

import { DoseLog, CarryoverResult, CarryoverTier, User } from '@/types';

// Configuration constants
const CONFIG = {
  // How far back to look for dose history
  LOOKBACK_DAYS: 14,
  
  // Base decay rate per day (higher = faster decay)
  DECAY_RATE: 0.7,
  
  // Consecutive day multipliers
  CONSECUTIVE_MULTIPLIERS: {
    2: 1.5,   // 2 days in a row = 1.5x impact
    3: 2.0,   // 3 days = 2x
    4: 2.5,   // 4+ days = 2.5x
  },
  
  // Tier thresholds
  TIERS: {
    CLEAR: 15,
    MILD: 35,
    MODERATE: 60,
    // Above 60 = HIGH
  },
  
  // Effective dose multipliers by tier
  EFFECTIVE_DOSE_MULTIPLIERS: {
    clear: 1.0,
    mild: 0.85,
    moderate: 0.75,
    high: 0.65,
  },
};

/**
 * Calculate the carryover score and tier for a user at a given moment
 */
export function calculateCarryover(
  doses: DoseLog[],
  user: User,
  asOfDate: Date = new Date()
): CarryoverResult {
  // Filter to doses within lookback period
  const cutoffDate = new Date(asOfDate);
  cutoffDate.setDate(cutoffDate.getDate() - CONFIG.LOOKBACK_DAYS);
  
  const recentDoses = doses
    .filter(d => new Date(d.timestamp) >= cutoffDate && new Date(d.timestamp) < asOfDate)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  if (recentDoses.length === 0) {
    return {
      score: 0,
      tier: 'clear',
      effective_dose_multiplier: 1.0,
      contributing_doses: [],
      recommendation: 'Full sensitivity expected. Clear to proceed.',
    };
  }
  
  // Calculate base score with decay
  let score = 0;
  const contributingDoses: CarryoverResult['contributing_doses'] = [];
  
  for (const dose of recentDoses) {
    const doseDate = new Date(dose.timestamp);
    const daysAgo = Math.max(0.5, (asOfDate.getTime() - doseDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Base contribution: inverse of days ago, scaled
    const baseContribution = 25 / daysAgo;
    
    // Apply decay
    const decayedContribution = baseContribution * Math.pow(CONFIG.DECAY_RATE, daysAgo - 1);
    
    // Apply dose size scaling (larger doses = more impact)
    const doseScale = Math.min(2, dose.amount / 0.1); // Normalize around 0.1g
    const weightedContribution = decayedContribution * doseScale;
    
    score += weightedContribution;
    
    contributingDoses.push({
      date: dose.timestamp,
      amount: dose.amount,
      weight: weightedContribution,
    });
  }
  
  // Apply consecutive day multiplier
  const consecutiveDays = countConsecutiveDays(recentDoses, asOfDate);
  if (consecutiveDays >= 2) {
    const multiplier = CONFIG.CONSECUTIVE_MULTIPLIERS[Math.min(consecutiveDays, 4) as keyof typeof CONFIG.CONSECUTIVE_MULTIPLIERS];
    score *= multiplier;
  }
  
  // Apply user sensitivity modifier
  const sensitivityModifier = calculateSensitivityModifier(user);
  score *= sensitivityModifier;
  
  // Clamp score to 0-100
  score = Math.min(100, Math.max(0, score));
  
  // Determine tier
  const tier = getTier(score);
  
  // Get effective dose multiplier
  const effective_dose_multiplier = CONFIG.EFFECTIVE_DOSE_MULTIPLIERS[tier];
  
  // Generate recommendation
  const recommendation = getRecommendation(tier, consecutiveDays, score);
  
  return {
    score: Math.round(score),
    tier,
    effective_dose_multiplier,
    contributing_doses: contributingDoses.slice(0, 5), // Top 5 contributors
    recommendation,
  };
}

/**
 * Calculate the effective dose after carryover adjustment
 */
export function calculateEffectiveDose(
  actualDose: number,
  carryover: CarryoverResult
): number {
  return actualDose * carryover.effective_dose_multiplier;
}

/**
 * Count consecutive dosing days leading up to now
 */
function countConsecutiveDays(doses: DoseLog[], asOfDate: Date): number {
  if (doses.length === 0) return 0;
  
  // Get unique dose dates (as YYYY-MM-DD strings)
  const doseDates = [...new Set(
    doses.map(d => new Date(d.timestamp).toISOString().split('T')[0])
  )].sort().reverse();
  
  if (doseDates.length === 0) return 0;
  
  // Check if most recent dose was today or yesterday
  const today = asOfDate.toISOString().split('T')[0];
  const yesterday = new Date(asOfDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  if (doseDates[0] !== today && doseDates[0] !== yesterdayStr) {
    return 0; // No recent consecutive streak
  }
  
  // Count consecutive days
  let count = 1;
  for (let i = 1; i < doseDates.length; i++) {
    const currentDate = new Date(doseDates[i - 1]);
    const prevDate = new Date(doseDates[i]);
    
    const diffDays = Math.round((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      count++;
    } else {
      break;
    }
  }
  
  return count;
}

/**
 * Calculate sensitivity modifier based on user profile
 */
function calculateSensitivityModifier(user: User): number {
  const sensitivity = user.sensitivity;
  
  // Lower sensitivity values = more sensitive = higher carryover impact
  // Average of caffeine and cannabis sensitivity (if available)
  let avg = sensitivity.caffeine || 3;
  if (sensitivity.cannabis !== null) {
    avg = (avg + sensitivity.cannabis) / 2;
  }
  
  // Map 1-5 to 1.3-0.7 (inverse relationship)
  // 1 (very sensitive) → 1.3x carryover
  // 5 (not sensitive) → 0.7x carryover
  return 1.45 - (avg * 0.15);
}

/**
 * Determine carryover tier from score
 */
function getTier(score: number): CarryoverTier {
  if (score <= CONFIG.TIERS.CLEAR) return 'clear';
  if (score <= CONFIG.TIERS.MILD) return 'mild';
  if (score <= CONFIG.TIERS.MODERATE) return 'moderate';
  return 'high';
}

/**
 * Generate human-readable recommendation
 */
function getRecommendation(tier: CarryoverTier, consecutiveDays: number, score: number): string {
  const recommendations: Record<CarryoverTier, string[]> = {
    clear: [
      'Full sensitivity expected. Clear to proceed.',
      'Your system is reset. Proceed as intended.',
    ],
    mild: [
      'Slight tolerance detected. Consider reducing dose by 10-15%.',
      'Mild carryover present. Effects may be slightly diminished.',
    ],
    moderate: [
      'Moderate tolerance. Consider resting or reducing dose by 20-25%.',
      'Your sensitivity is reduced. A rest day might serve you better.',
    ],
    high: [
      'High tolerance. Strongly recommend a rest day.',
      'Your system needs reset time. Dosing today is likely ineffective.',
    ],
  };
  
  let base = recommendations[tier][Math.floor(Math.random() * recommendations[tier].length)];
  
  // Add consecutive day warning if applicable
  if (consecutiveDays >= 3) {
    base += ` You've dosed ${consecutiveDays} days in a row. Extended breaks improve sensitivity.`;
  }
  
  return base;
}

/**
 * Predict carryover for a future date (for planning)
 */
export function predictCarryover(
  doses: DoseLog[],
  user: User,
  futureDate: Date
): CarryoverResult {
  return calculateCarryover(doses, user, futureDate);
}

/**
 * Calculate the optimal next dose date (when carryover returns to 'clear')
 */
export function suggestNextDoseDate(
  doses: DoseLog[],
  user: User
): Date {
  const today = new Date();
  let checkDate = new Date(today);
  
  for (let i = 0; i < 14; i++) {
    checkDate.setDate(checkDate.getDate() + 1);
    const carryover = calculateCarryover(doses, user, checkDate);
    
    if (carryover.tier === 'clear') {
      return checkDate;
    }
  }
  
  // Fallback: 14 days from now
  const fallback = new Date(today);
  fallback.setDate(fallback.getDate() + 14);
  return fallback;
}
