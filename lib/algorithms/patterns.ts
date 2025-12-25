/**
 * THRESHOLD COMPASS — PATTERN DETECTION ENGINE
 * 
 * Rule-based pattern detection for surprising, specific insights.
 * The goal is to show users patterns they didn't know existed.
 * 
 * Pattern types:
 * 1. Food state correlation
 * 2. Day of week clustering
 * 3. Sleep quality correlation
 * 4. Environment correlation
 * 5. Caffeine timing
 * 6. Menstrual cycle correlation
 * 7. Body map clusters
 * 8. Anti-patterns (difficult experiences)
 */

import { 
  DoseLog, 
  CheckIn, 
  Pattern, 
  PatternType, 
  User,
  FoodState,
  Environment 
} from '@/types';

// Minimum data requirements for each pattern type
const MIN_SAMPLES = {
  food_correlation: 8,
  day_clustering: 10,
  sleep_correlation: 10,
  environment_correlation: 8,
  caffeine_timing: 8,
  cycle_correlation: 6,
  body_cluster: 10,
  anti_pattern: 5,
};

// Confidence thresholds
const CONFIDENCE = {
  HIGH: 80,
  MEDIUM: 60,
  LOW: 40,
};

interface PatternResult {
  type: PatternType;
  title: string;
  description: string;
  confidence: number;
  evidenceDoseIds: string[];
  evidenceCheckInIds: string[];
}

/**
 * Detect all patterns for a user
 */
export function detectPatterns(
  user: User,
  doses: DoseLog[],
  checkIns: CheckIn[]
): PatternResult[] {
  const results: PatternResult[] = [];
  
  // Run all detectors
  const detectors = [
    detectFoodCorrelation,
    detectDayClustering,
    detectSleepCorrelation,
    detectEnvironmentCorrelation,
    detectCaffeineTiming,
    detectAntiPatterns,
  ];
  
  // Add cycle detection if tracking
  if (user.menstrual_tracking) {
    detectors.push(detectCycleCorrelation);
  }
  
  // Add body cluster detection if we have body map data
  if (checkIns.some(c => c.body_map && c.body_map.length > 0)) {
    detectors.push(detectBodyClusters);
  }
  
  for (const detector of detectors) {
    const pattern = detector(doses, checkIns, user);
    if (pattern && pattern.confidence >= CONFIDENCE.LOW) {
      results.push(pattern);
    }
  }
  
  // Sort by confidence and return top 5
  return results
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
}

/**
 * Detect food state correlations
 */
function detectFoodCorrelation(
  doses: DoseLog[],
  checkIns: CheckIn[],
  user: User
): PatternResult | null {
  if (doses.length < MIN_SAMPLES.food_correlation) return null;
  
  // Match doses with their check-ins
  const matched = matchDosesWithCheckIns(doses, checkIns);
  
  // Group by food state
  const byFoodState: Record<FoodState, { clarity: number; count: number }> = {
    empty: { clarity: 0, count: 0 },
    light: { clarity: 0, count: 0 },
    full: { clarity: 0, count: 0 },
  };
  
  for (const { dose, checkIn } of matched) {
    if (checkIn) {
      byFoodState[dose.food_state].clarity += checkIn.signals.clarity;
      byFoodState[dose.food_state].count++;
    }
  }
  
  // Calculate averages
  const averages: Record<FoodState, number> = {
    empty: byFoodState.empty.count > 0 ? byFoodState.empty.clarity / byFoodState.empty.count : 0,
    light: byFoodState.light.count > 0 ? byFoodState.light.clarity / byFoodState.light.count : 0,
    full: byFoodState.full.count > 0 ? byFoodState.full.clarity / byFoodState.full.count : 0,
  };
  
  // Find significant difference
  const states = Object.keys(averages) as FoodState[];
  const sorted = states.filter(s => byFoodState[s].count >= 2).sort((a, b) => averages[b] - averages[a]);
  
  if (sorted.length < 2) return null;
  
  const best = sorted[0];
  const diff = averages[best] - averages[sorted[sorted.length - 1]];
  
  if (diff < 0.8) return null; // Not significant enough
  
  const confidence = Math.min(95, Math.round(50 + (diff * 15) + (byFoodState[best].count * 3)));
  
  const stateLabels: Record<FoodState, string> = {
    empty: 'on an empty stomach',
    light: 'after a light meal',
    full: 'after a full meal',
  };
  
  return {
    type: 'food_correlation',
    title: 'Food timing matters for you',
    description: `Your highest clarity scores come ${stateLabels[best]}. Consider adjusting meal timing around doses.`,
    confidence,
    evidenceDoseIds: matched.filter(m => m.dose.food_state === best).map(m => m.dose.id),
    evidenceCheckInIds: matched.filter(m => m.dose.food_state === best && m.checkIn).map(m => m.checkIn!.id),
  };
}

/**
 * Detect day of week clustering
 */
function detectDayClustering(
  doses: DoseLog[],
  checkIns: CheckIn[],
  user: User
): PatternResult | null {
  if (doses.length < MIN_SAMPLES.day_clustering) return null;
  
  // Count doses by day of week
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const byday: number[] = new Array(7).fill(0);
  
  for (const dose of doses) {
    const day = new Date(dose.timestamp).getDay();
    byday[day]++;
  }
  
  // Find most common day(s)
  const max = Math.max(...byday);
  const total = doses.length;
  const topDays = byday
    .map((count, day) => ({ day, count, pct: count / total }))
    .filter(d => d.count > 0)
    .sort((a, b) => b.count - a.count);
  
  // Check for significant clustering (top day has >30% of doses)
  if (topDays[0].pct < 0.3) return null;
  
  const confidence = Math.min(90, Math.round(topDays[0].pct * 100 + 20));
  
  // Check if it's a pattern of 2 days
  if (topDays.length >= 2 && topDays[1].pct > 0.2) {
    return {
      type: 'day_clustering',
      title: `Your ${dayNames[topDays[0].day]} and ${dayNames[topDays[1].day]} pattern`,
      description: `${Math.round((topDays[0].pct + topDays[1].pct) * 100)}% of your doses happen on these two days. Is this intentional?`,
      confidence,
      evidenceDoseIds: doses.filter(d => {
        const day = new Date(d.timestamp).getDay();
        return day === topDays[0].day || day === topDays[1].day;
      }).map(d => d.id),
      evidenceCheckInIds: [],
    };
  }
  
  return {
    type: 'day_clustering',
    title: `${dayNames[topDays[0].day]}s are your day`,
    description: `${Math.round(topDays[0].pct * 100)}% of your doses happen on ${dayNames[topDays[0].day]}s. Your practice has a rhythm.`,
    confidence,
    evidenceDoseIds: doses.filter(d => new Date(d.timestamp).getDay() === topDays[0].day).map(d => d.id),
    evidenceCheckInIds: [],
  };
}

/**
 * Detect sleep quality correlations
 */
function detectSleepCorrelation(
  doses: DoseLog[],
  checkIns: CheckIn[],
  user: User
): PatternResult | null {
  // Filter doses with sleep data
  const dosesWithSleep = doses.filter(d => d.sleep_quality !== null && d.sleep_quality !== undefined);
  
  if (dosesWithSleep.length < MIN_SAMPLES.sleep_correlation) return null;
  
  const matched = matchDosesWithCheckIns(dosesWithSleep, checkIns);
  
  // Correlate sleep quality with clarity
  const highSleep = matched.filter(m => (m.dose.sleep_quality || 0) >= 4);
  const lowSleep = matched.filter(m => (m.dose.sleep_quality || 0) <= 2);
  
  if (highSleep.length < 3 || lowSleep.length < 3) return null;
  
  const avgClarityHighSleep = highSleep
    .filter(m => m.checkIn)
    .reduce((sum, m) => sum + m.checkIn!.signals.clarity, 0) / highSleep.filter(m => m.checkIn).length;
  
  const avgClarityLowSleep = lowSleep
    .filter(m => m.checkIn)
    .reduce((sum, m) => sum + m.checkIn!.signals.clarity, 0) / lowSleep.filter(m => m.checkIn).length;
  
  const diff = avgClarityHighSleep - avgClarityLowSleep;
  
  if (diff < 0.5) return null;
  
  const confidence = Math.min(90, Math.round(50 + (diff * 20)));
  
  return {
    type: 'sleep_correlation',
    title: 'Sleep quality multiplies your results',
    description: `When you sleep well (4-5), your clarity scores are ${Math.round(diff * 100 / avgClarityLowSleep)}% higher. Sleep is not optional for this practice.`,
    confidence,
    evidenceDoseIds: highSleep.map(m => m.dose.id),
    evidenceCheckInIds: highSleep.filter(m => m.checkIn).map(m => m.checkIn!.id),
  };
}

/**
 * Detect environment correlations
 */
function detectEnvironmentCorrelation(
  doses: DoseLog[],
  checkIns: CheckIn[],
  user: User
): PatternResult | null {
  const dosesWithEnv = doses.filter(d => d.environment !== null);
  
  if (dosesWithEnv.length < MIN_SAMPLES.environment_correlation) return null;
  
  const matched = matchDosesWithCheckIns(dosesWithEnv, checkIns);
  
  // Group by environment
  const byEnv: Record<string, { total: number; count: number }> = {};
  
  for (const { dose, checkIn } of matched) {
    if (checkIn && dose.environment) {
      if (!byEnv[dose.environment]) {
        byEnv[dose.environment] = { total: 0, count: 0 };
      }
      // Use average of all signals
      const avgSignal = (checkIn.signals.energy + checkIn.signals.clarity + checkIn.signals.stability) / 3;
      byEnv[dose.environment].total += avgSignal;
      byEnv[dose.environment].count++;
    }
  }
  
  // Find best environment
  const envs = Object.entries(byEnv)
    .filter(([, v]) => v.count >= 2)
    .map(([env, v]) => ({ env, avg: v.total / v.count, count: v.count }))
    .sort((a, b) => b.avg - a.avg);
  
  if (envs.length < 2) return null;
  
  const diff = envs[0].avg - envs[envs.length - 1].avg;
  if (diff < 0.5) return null;
  
  const envLabels: Record<string, string> = {
    home_alone: 'at home alone',
    home_others: 'at home with others',
    outdoor: 'outdoors',
    work: 'at work',
    social: 'in social settings',
    travel: 'while traveling',
  };
  
  const confidence = Math.min(85, Math.round(50 + (diff * 15) + (envs[0].count * 2)));
  
  return {
    type: 'environment_correlation',
    title: `${envLabels[envs[0].env] || envs[0].env} works best`,
    description: `Your highest signal scores come ${envLabels[envs[0].env] || envs[0].env}. Consider optimizing your dose days around this environment.`,
    confidence,
    evidenceDoseIds: matched.filter(m => m.dose.environment === envs[0].env).map(m => m.dose.id),
    evidenceCheckInIds: matched.filter(m => m.dose.environment === envs[0].env && m.checkIn).map(m => m.checkIn!.id),
  };
}

/**
 * Detect caffeine timing patterns
 */
function detectCaffeineTiming(
  doses: DoseLog[],
  checkIns: CheckIn[],
  user: User
): PatternResult | null {
  const dosesWithCaffeine = doses.filter(d => d.caffeine_timing !== null && d.caffeine_timing !== undefined);
  
  if (dosesWithCaffeine.length < MIN_SAMPLES.caffeine_timing) return null;
  
  const matched = matchDosesWithCheckIns(dosesWithCaffeine, checkIns);
  
  // Split into before vs after dose
  const caffeineFirst = matched.filter(m => (m.dose.caffeine_timing || 0) > 0); // Hours before
  const doseFirst = matched.filter(m => (m.dose.caffeine_timing || 0) <= 0);
  
  if (caffeineFirst.length < 3 || doseFirst.length < 3) return null;
  
  // Compare stability scores
  const avgStabilityCaffeineFirst = caffeineFirst
    .filter(m => m.checkIn)
    .reduce((sum, m) => sum + m.checkIn!.signals.stability, 0) / caffeineFirst.filter(m => m.checkIn).length;
  
  const avgStabilityDoseFirst = doseFirst
    .filter(m => m.checkIn)
    .reduce((sum, m) => sum + m.checkIn!.signals.stability, 0) / doseFirst.filter(m => m.checkIn).length;
  
  const diff = Math.abs(avgStabilityCaffeineFirst - avgStabilityDoseFirst);
  
  if (diff < 0.4) return null;
  
  const winner = avgStabilityCaffeineFirst > avgStabilityDoseFirst ? 'caffeine_first' : 'dose_first';
  const confidence = Math.min(80, Math.round(50 + (diff * 20)));
  
  const description = winner === 'caffeine_first'
    ? 'Your stability is higher when you have caffeine before dosing. The order matters for you.'
    : 'Your stability is higher when you dose before having caffeine. Consider adjusting your morning routine.';
  
  return {
    type: 'caffeine_timing',
    title: 'Caffeine timing affects your stability',
    description,
    confidence,
    evidenceDoseIds: (winner === 'caffeine_first' ? caffeineFirst : doseFirst).map(m => m.dose.id),
    evidenceCheckInIds: (winner === 'caffeine_first' ? caffeineFirst : doseFirst).filter(m => m.checkIn).map(m => m.checkIn!.id),
  };
}

/**
 * Detect menstrual cycle correlations
 */
function detectCycleCorrelation(
  doses: DoseLog[],
  checkIns: CheckIn[],
  user: User
): PatternResult | null {
  const dosesWithCycle = doses.filter(d => d.cycle_day !== null && d.cycle_day !== undefined);
  
  if (dosesWithCycle.length < MIN_SAMPLES.cycle_correlation) return null;
  
  const matched = matchDosesWithCheckIns(dosesWithCycle, checkIns);
  
  // Group by cycle phase
  const phases = {
    follicular: matched.filter(m => (m.dose.cycle_day || 0) >= 1 && (m.dose.cycle_day || 0) <= 13),
    ovulation: matched.filter(m => (m.dose.cycle_day || 0) >= 14 && (m.dose.cycle_day || 0) <= 16),
    luteal: matched.filter(m => (m.dose.cycle_day || 0) >= 17 && (m.dose.cycle_day || 0) <= 28),
  };
  
  // Calculate average signals per phase
  const phaseAvgs: Record<string, number> = {};
  
  for (const [phase, group] of Object.entries(phases)) {
    if (group.length >= 2) {
      const withCheckIns = group.filter(m => m.checkIn);
      if (withCheckIns.length > 0) {
        phaseAvgs[phase] = withCheckIns.reduce((sum, m) => 
          sum + (m.checkIn!.signals.energy + m.checkIn!.signals.clarity + m.checkIn!.signals.stability) / 3
        , 0) / withCheckIns.length;
      }
    }
  }
  
  const phasesRanked = Object.entries(phaseAvgs)
    .sort((a, b) => b[1] - a[1]);
  
  if (phasesRanked.length < 2) return null;
  
  const diff = phasesRanked[0][1] - phasesRanked[phasesRanked.length - 1][1];
  if (diff < 0.4) return null;
  
  const confidence = Math.min(80, Math.round(50 + (diff * 15)));
  
  const phaseLabels: Record<string, string> = {
    follicular: 'follicular phase (days 1-13)',
    ovulation: 'ovulation (days 14-16)',
    luteal: 'luteal phase (days 17-28)',
  };
  
  return {
    type: 'cycle_correlation',
    title: 'Your cycle affects your response',
    description: `Your best experiences happen during your ${phaseLabels[phasesRanked[0][0]]}. Consider timing around this.`,
    confidence,
    evidenceDoseIds: phases[phasesRanked[0][0] as keyof typeof phases].map(m => m.dose.id),
    evidenceCheckInIds: phases[phasesRanked[0][0] as keyof typeof phases].filter(m => m.checkIn).map(m => m.checkIn!.id),
  };
}

/**
 * Detect body map clusters
 */
function detectBodyClusters(
  doses: DoseLog[],
  checkIns: CheckIn[],
  user: User
): PatternResult | null {
  const checkInsWithBody = checkIns.filter(c => c.body_map && c.body_map.length > 0);
  
  if (checkInsWithBody.length < MIN_SAMPLES.body_cluster) return null;
  
  // Count occurrences by region
  const regionCounts: Record<string, number> = {};
  
  for (const checkIn of checkInsWithBody) {
    for (const point of checkIn.body_map) {
      regionCounts[point.region] = (regionCounts[point.region] || 0) + 1;
    }
  }
  
  // Find most common region
  const total = checkInsWithBody.length;
  const ranked = Object.entries(regionCounts)
    .map(([region, count]) => ({ region, count, pct: count / total }))
    .sort((a, b) => b.count - a.count);
  
  if (ranked.length === 0 || ranked[0].pct < 0.4) return null;
  
  const confidence = Math.min(85, Math.round(ranked[0].pct * 100 + 20));
  
  const regionLabels: Record<string, string> = {
    head: 'your head',
    chest: 'your chest',
    gut: 'your gut',
    hands: 'your hands',
    legs: 'your legs',
  };
  
  return {
    type: 'body_cluster',
    title: `You feel it in ${regionLabels[ranked[0].region] || ranked[0].region}`,
    description: `${Math.round(ranked[0].pct * 100)}% of your check-ins note sensation in ${regionLabels[ranked[0].region] || ranked[0].region}. This is your body's signature response.`,
    confidence,
    evidenceDoseIds: [],
    evidenceCheckInIds: checkInsWithBody.filter(c => 
      c.body_map.some(p => p.region === ranked[0].region)
    ).map(c => c.id),
  };
}

/**
 * Detect anti-patterns (difficult experiences)
 */
function detectAntiPatterns(
  doses: DoseLog[],
  checkIns: CheckIn[],
  user: User
): PatternResult | null {
  const matched = matchDosesWithCheckIns(doses, checkIns);
  
  // Find difficult experiences (low stability + low clarity)
  const difficult = matched.filter(m => 
    m.checkIn && 
    m.checkIn.signals.stability <= 2 && 
    m.checkIn.signals.clarity <= 2
  );
  
  if (difficult.length < MIN_SAMPLES.anti_pattern) return null;
  
  // Look for common factors
  const factors: Record<string, number> = {
    high_load: 0,
    low_sleep: 0,
    evening: 0,
    full_stomach: 0,
    high_caffeine: 0,
  };
  
  for (const { dose, checkIn } of difficult) {
    if (checkIn?.conditions.load === 'high') factors.high_load++;
    if (dose.sleep_quality !== null && dose.sleep_quality <= 2) factors.low_sleep++;
    if (new Date(dose.timestamp).getHours() >= 18) factors.evening++;
    if (dose.food_state === 'full') factors.full_stomach++;
    if (dose.caffeine_mg !== null && dose.caffeine_mg > 200) factors.high_caffeine++;
  }
  
  // Find most common factor
  const ranked = Object.entries(factors)
    .map(([factor, count]) => ({ factor, count, pct: count / difficult.length }))
    .filter(f => f.count >= 2)
    .sort((a, b) => b.count - a.count);
  
  if (ranked.length === 0 || ranked[0].pct < 0.5) return null;
  
  const confidence = Math.min(80, Math.round(ranked[0].pct * 80 + 20));
  
  const factorLabels: Record<string, string> = {
    high_load: 'high external load',
    low_sleep: 'poor sleep the night before',
    evening: 'evening timing',
    full_stomach: 'dosing on a full stomach',
    high_caffeine: 'high caffeine intake',
  };
  
  return {
    type: 'anti_pattern',
    title: 'Difficult experiences share this',
    description: `${Math.round(ranked[0].pct * 100)}% of your difficult experiences involved ${factorLabels[ranked[0].factor]}. This might be worth avoiding.`,
    confidence,
    evidenceDoseIds: difficult.map(m => m.dose.id),
    evidenceCheckInIds: difficult.filter(m => m.checkIn).map(m => m.checkIn!.id),
  };
}

/**
 * Helper: Match doses with their check-ins
 */
function matchDosesWithCheckIns(
  doses: DoseLog[],
  checkIns: CheckIn[]
): { dose: DoseLog; checkIn: CheckIn | null }[] {
  return doses.map(dose => {
    // Find check-in for this dose (within 8 hours)
    const checkIn = checkIns.find(c => 
      c.dose_id === dose.id ||
      (Math.abs(new Date(c.timestamp).getTime() - new Date(dose.timestamp).getTime()) < 8 * 60 * 60 * 1000)
    ) || null;
    
    return { dose, checkIn };
  });
}
