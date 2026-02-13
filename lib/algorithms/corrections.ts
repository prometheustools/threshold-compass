import type { CourseCorrection, NorthStar, CarryoverTier } from '@/types'
import corrections from '@/content/course-corrections.json'

interface SelectionInput {
  northStar: NorthStar
  currentConditions: string[]
  carryoverTier: CarryoverTier
  thresholdZone?: string
  recentlyShown: string[]
}

export function selectCorrection(input: SelectionInput): CourseCorrection | null {
  const { northStar, currentConditions, carryoverTier, thresholdZone, recentlyShown } = input
  const allCorrections = corrections as CourseCorrection[]

  let pool = allCorrections.filter((c) => c.north_star_relevance.includes(northStar))

  // Filter out contraindicated
  pool = pool.filter((c) =>
    !c.contraindicated_conditions.some((ci) => currentConditions.includes(ci))
  )

  // If elevated carryover, only rest-oriented (grounding, breath)
  if (carryoverTier === 'elevated') {
    pool = pool.filter((c) => c.category === 'grounding' || c.category === 'breath')
  }

  // If over threshold, prioritize grounding
  if (thresholdZone === 'over') {
    const grounding = pool.filter((c) => c.category === 'grounding')
    if (grounding.length > 0) pool = grounding
  }

  // Avoid recently shown
  pool = pool.filter((c) => !recentlyShown.includes(c.id))

  // If pool empty after filtering, use all minus recently shown
  if (pool.length === 0) {
    pool = allCorrections.filter((c) => !recentlyShown.includes(c.id))
  }

  if (pool.length === 0) return null

  return pool[Math.floor(Math.random() * pool.length)]
}
