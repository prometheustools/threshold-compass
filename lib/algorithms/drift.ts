import type { ThresholdRange } from '@/types'

interface DriftResult {
  isDrifting: boolean
  direction: 'above' | 'below' | null
  message: string
  severity: 'info' | 'warning'
}

interface RecentDose {
  amount: number
  dosed_at: string
}

export function detectDrift(
  recentDoses: RecentDose[],
  thresholdRange: ThresholdRange | null
): DriftResult {
  const noDrift: DriftResult = { isDrifting: false, direction: null, message: '', severity: 'info' }

  if (!thresholdRange || !thresholdRange.sweet_spot || !thresholdRange.floor_dose || !thresholdRange.ceiling_dose) {
    return noDrift
  }

  if (recentDoses.length < 3) return noDrift

  // Look at last 3 doses
  const last3 = recentDoses.slice(0, 3)
  const avgAmount = last3.reduce((sum, d) => sum + d.amount, 0) / last3.length

  // Check if average is drifting above ceiling or below floor
  if (avgAmount > thresholdRange.ceiling_dose) {
    return {
      isDrifting: true,
      direction: 'above',
      message: `Recent doses averaging ${avgAmount.toFixed(1)} — above your ceiling of ${thresholdRange.ceiling_dose}`,
      severity: 'warning',
    }
  }

  if (avgAmount < thresholdRange.floor_dose) {
    return {
      isDrifting: true,
      direction: 'below',
      message: `Recent doses averaging ${avgAmount.toFixed(1)} — below your floor of ${thresholdRange.floor_dose}`,
      severity: 'info',
    }
  }

  return noDrift
}
