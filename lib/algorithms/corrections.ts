/**
 * THRESHOLD COMPASS — COURSE CORRECTION SELECTION
 * 
 * Selects appropriate course corrections based on user's current state.
 * The goal is to suggest small, physical, time-bounded actions that
 * help the user steer slightly — not life advice.
 */

import { 
  CourseCorrection, 
  CheckIn, 
  User, 
  NorthStarType,
  CorrectionLog 
} from '@/types';

// Import corrections from JSON (at runtime)
// In practice, this would be loaded from the JSON file
// import corrections from '../content/course-corrections.json';

interface SelectionResult {
  primary: CourseCorrection;
  alternatives: CourseCorrection[];
  reason: string;
}

interface SelectionContext {
  checkIn: CheckIn;
  user: User;
  recentCorrections: CorrectionLog[];  // Last 7 days
  phase: 'active' | 'integration' | 'rest';
}

/**
 * Select the best course correction for current state
 */
export function selectCorrection(
  corrections: CourseCorrection[],
  context: SelectionContext
): SelectionResult | null {
  const { checkIn, user, recentCorrections, phase } = context;
  
  // Score all corrections
  const scored = corrections
    .map(correction => ({
      correction,
      score: scoreCorrection(correction, context),
      reasons: getMatchReasons(correction, context),
    }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);
  
  if (scored.length === 0) {
    return null;
  }
  
  // Filter out recently used (within 48 hours)
  const recentIds = new Set(
    recentCorrections
      .filter(r => {
        const hoursSince = (Date.now() - new Date(r.created_at).getTime()) / (1000 * 60 * 60);
        return hoursSince < 48;
      })
      .map(r => r.correction_id)
  );
  
  const fresh = scored.filter(s => !recentIds.has(s.correction.id));
  
  // If all are recent, use scored anyway (better than nothing)
  const pool = fresh.length >= 3 ? fresh : scored;
  
  // Add some randomness to top selections (don't always pick #1)
  const topN = pool.slice(0, Math.min(5, pool.length));
  const selected = weightedRandomSelect(topN);
  
  return {
    primary: selected.correction,
    alternatives: pool
      .filter(s => s.correction.id !== selected.correction.id)
      .slice(0, 2)
      .map(s => s.correction),
    reason: selected.reasons[0] || 'Matched your current conditions.',
  };
}

/**
 * Score a correction based on context match
 */
function scoreCorrection(
  correction: CourseCorrection,
  context: SelectionContext
): number {
  const { checkIn, user, phase } = context;
  let score = correction.baseRelevance;
  
  // Direction match (strongest signal)
  const userDirection = user.north_star.type;
  if (correction.directions.includes(userDirection)) {
    score += 25;
  }
  
  // Phase match
  if (correction.conditions.phase === phase) {
    score += 15;
  } else if (correction.conditions.phase && correction.conditions.phase !== phase) {
    score -= 20; // Penalize phase mismatch
  }
  
  // Load match
  if (correction.conditions.loadMatch === checkIn.conditions.load) {
    score += 10;
  }
  
  // Energy range match
  if (correction.conditions.energyRange) {
    const [min, max] = correction.conditions.energyRange;
    if (checkIn.signals.energy >= min && checkIn.signals.energy <= max) {
      score += 10;
    } else {
      score -= 10;
    }
  }
  
  // Boost for low stability (user needs help)
  if (checkIn.signals.stability <= 2) {
    if (correction.category === 'grounding' || correction.category === 'breath') {
      score += 15;
    }
  }
  
  // Boost for low energy
  if (checkIn.signals.energy <= 2) {
    if (correction.category === 'movement') {
      score += 10;
    }
  }
  
  // Boost for high load
  if (checkIn.conditions.load === 'high') {
    if (correction.category === 'environment') {
      score += 10;
    }
  }
  
  // Duration preference (shorter is often better)
  if (correction.duration <= 60) {
    score += 5;
  } else if (correction.duration > 300) {
    score -= 5;
  }
  
  // Check contraindications
  if (correction.contraindications) {
    // Example: some corrections shouldn't be suggested at work
    if (checkIn.conditions.schedule === 'full' && 
        correction.contraindications.includes('busy_schedule')) {
      return 0; // Exclude entirely
    }
  }
  
  return Math.max(0, score);
}

/**
 * Get human-readable reasons for why this correction was selected
 */
function getMatchReasons(
  correction: CourseCorrection,
  context: SelectionContext
): string[] {
  const reasons: string[] = [];
  const { checkIn, user, phase } = context;
  
  // Direction match
  if (correction.directions.includes(user.north_star.type)) {
    const directionLabels: Record<NorthStarType, string> = {
      stability: 'emotional stability',
      clarity: 'mental clarity',
      creativity: 'creative flow',
      presence: 'present-moment awareness',
      recovery: 'healing and recovery',
      exploration: 'exploration and openness',
      custom: user.north_star.custom || 'your direction',
    };
    reasons.push(`Aligned with your focus on ${directionLabels[user.north_star.type]}.`);
  }
  
  // Condition matches
  if (checkIn.signals.stability <= 2) {
    reasons.push('Helps with the instability you reported.');
  }
  
  if (checkIn.conditions.load === 'high') {
    reasons.push('Good for high-load situations.');
  }
  
  if (checkIn.signals.energy <= 2) {
    reasons.push('Can help with low energy.');
  }
  
  // Phase context
  if (phase === 'active') {
    reasons.push('Suited for the active window.');
  } else if (phase === 'integration') {
    reasons.push('Good for integration.');
  }
  
  return reasons;
}

/**
 * Weighted random selection from scored options
 * Higher scores = higher probability, but not deterministic
 */
function weightedRandomSelect<T extends { score: number }>(
  options: T[]
): T {
  if (options.length === 0) {
    throw new Error('No options to select from');
  }
  
  if (options.length === 1) {
    return options[0];
  }
  
  // Normalize scores to probabilities
  const totalScore = options.reduce((sum, o) => sum + o.score, 0);
  const probabilities = options.map(o => o.score / totalScore);
  
  // Random selection based on probabilities
  const random = Math.random();
  let cumulative = 0;
  
  for (let i = 0; i < options.length; i++) {
    cumulative += probabilities[i];
    if (random <= cumulative) {
      return options[i];
    }
  }
  
  // Fallback to last option
  return options[options.length - 1];
}

/**
 * Get corrections by category for manual browsing
 */
export function getCorrectionsByCategory(
  corrections: CourseCorrection[]
): Record<string, CourseCorrection[]> {
  const byCategory: Record<string, CourseCorrection[]> = {};
  
  for (const correction of corrections) {
    if (!byCategory[correction.category]) {
      byCategory[correction.category] = [];
    }
    byCategory[correction.category].push(correction);
  }
  
  return byCategory;
}

/**
 * Get corrections suited for a specific direction
 */
export function getCorrectionsForDirection(
  corrections: CourseCorrection[],
  direction: NorthStarType
): CourseCorrection[] {
  return corrections
    .filter(c => c.directions.includes(direction))
    .sort((a, b) => b.baseRelevance - a.baseRelevance);
}

/**
 * Track correction effectiveness over time
 */
export function calculateCorrectionEffectiveness(
  logs: CorrectionLog[],
  correctionId: string
): { completionRate: number; helpfulRate: number; samples: number } {
  const relevant = logs.filter(l => l.correction_id === correctionId);
  
  if (relevant.length === 0) {
    return { completionRate: 0, helpfulRate: 0, samples: 0 };
  }
  
  const completed = relevant.filter(l => l.response === 'completed').length;
  const helpful = relevant.filter(l => l.helpful === true).length;
  const withFeedback = relevant.filter(l => l.helpful !== null).length;
  
  return {
    completionRate: completed / relevant.length,
    helpfulRate: withFeedback > 0 ? helpful / withFeedback : 0,
    samples: relevant.length,
  };
}
