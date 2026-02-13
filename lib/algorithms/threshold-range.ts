import type { ThresholdRangeResult, ThresholdZone } from '@/types'

interface DoseWithZone {
  amount: number
  threshold_zone: ThresholdZone
}

export function calculateThresholdRange(
  doses: DoseWithZone[],
  batchId: string
): ThresholdRangeResult {
  const grouped: Record<ThresholdZone, number[]> = {
    sub: [], low: [], sweet_spot: [], high: [], over: [],
  }

  for (const d of doses) {
    if (d.threshold_zone && grouped[d.threshold_zone]) {
      grouped[d.threshold_zone].push(d.amount)
    }
  }

  const maxOf = (arr: number[]) => arr.length ? Math.max(...arr) : null
  const minOf = (arr: number[]) => arr.length ? Math.min(...arr) : null
  const median = (arr: number[]) => {
    if (!arr.length) return null
    const sorted = [...arr].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  }

  // Floor: max of sub OR min of low (whichever higher)
  const subMax = maxOf(grouped.sub)
  const lowMin = minOf(grouped.low)
  let floor: number | null = null
  if (subMax !== null && lowMin !== null) floor = Math.max(subMax, lowMin)
  else floor = subMax ?? lowMin

  // Sweet spot: median of sweet_spot, or midpoint of low/high
  let sweetSpot = median(grouped.sweet_spot)
  if (sweetSpot === null) {
    const lowMax = maxOf(grouped.low)
    const highMin = minOf(grouped.high)
    if (lowMax !== null && highMin !== null) sweetSpot = (lowMax + highMin) / 2
  }

  // Ceiling: min of over OR max of high (whichever lower)
  const overMin = minOf(grouped.over)
  const highMax = maxOf(grouped.high)
  let ceiling: number | null = null
  if (overMin !== null && highMax !== null) ceiling = Math.min(overMin, highMax)
  else ceiling = overMin ?? highMax

  // Confidence
  const dosesWithCheckin = doses.filter(d => d.threshold_zone).length
  const baseConfidence = Math.round((dosesWithCheckin / 10) * 100)
  const zoneCoverage = Object.values(grouped).filter(arr => arr.length > 0).length * 10
  const stddev = grouped.sweet_spot.length > 1
    ? Math.sqrt(grouped.sweet_spot.reduce((sum, v) => {
        const mean = grouped.sweet_spot.reduce((a, b) => a + b, 0) / grouped.sweet_spot.length
        return sum + (v - mean) ** 2
      }, 0) / grouped.sweet_spot.length)
    : Infinity
  const consistencyBonus = stddev < 0.02 ? 10 : 0
  const confidence = Math.min(100, baseConfidence + zoneCoverage + consistencyBonus)

  let qualifier: string
  if (confidence < 30) qualifier = 'Need more data.'
  else if (confidence < 50) qualifier = 'Preliminary range. Keep logging.'
  else if (confidence < 70) qualifier = 'Working range. Refine with more doses.'
  else qualifier = 'Calibrated range.'

  return {
    floor, sweet_spot: sweetSpot, ceiling, confidence, qualifier,
    doses_used: doses.length, batch_id: batchId,
  }
}
