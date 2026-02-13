import type { CarryoverResult, CarryoverTier, SubstanceType } from '@/types'

interface DoseEntry {
  amount: number
  dosed_at: string
}

const HALF_LIVES: Record<string, number> = {
  psilocybin: 288, // 12 days in hours
  lsd: 192,        // 8 days in hours
  other: 288,
}

const TIER_THRESHOLDS: { max: number; tier: CarryoverTier; message: string }[] = [
  { max: 15, tier: 'clear', message: 'Full sensitivity expected.' },
  { max: 30, tier: 'mild', message: 'Slight tolerance, minor adjustment.' },
  { max: 50, tier: 'moderate', message: 'Consider a rest day.' },
  { max: 100, tier: 'elevated', message: 'Rest recommended.' },
]

export function calculateCarryover(
  doseHistory: DoseEntry[],
  substanceType: SubstanceType,
  currentTime: Date = new Date()
): CarryoverResult {
  const halfLife = HALF_LIVES[substanceType] || HALF_LIVES.psilocybin
  const decayRate = Math.LN2 / halfLife

  let totalCarryover = 0
  for (const dose of doseHistory) {
    const hoursSince = (currentTime.getTime() - new Date(dose.dosed_at).getTime()) / 3600000
    if (hoursSince < 0 || hoursSince > halfLife * 3) continue
    const initialTolerance = Math.min(100, dose.amount * 1000)
    totalCarryover += initialTolerance * Math.exp(-decayRate * hoursSince)
  }
  totalCarryover = Math.min(100, Math.round(totalCarryover))

  const tierInfo = TIER_THRESHOLDS.find((t) => totalCarryover <= t.max) || TIER_THRESHOLDS[3]

  let hoursToClear: number | null = null
  if (totalCarryover > 15) {
    hoursToClear = Math.round(-Math.log(15 / totalCarryover) / decayRate)
  }

  return {
    percentage: totalCarryover,
    tier: tierInfo.tier,
    effective_multiplier: Math.round((1 - totalCarryover / 100) * 100) / 100,
    hours_to_clear: hoursToClear,
    message: tierInfo.message,
  }
}
