'use client'

import type { CarryoverResult, GuidanceLevel } from '@/types'
import Card from '@/components/ui/Card'

interface CarryoverBadgeProps {
  carryover: CarryoverResult
  guidanceLevel: GuidanceLevel
}

const tierStyles = {
  clear: 'border-status-clear/50 bg-status-clear/10 text-status-clear',
  mild: 'border-status-mild/50 bg-status-mild/10 text-status-mild',
  moderate: 'border-status-moderate/50 bg-status-moderate/10 text-status-moderate',
  elevated: 'border-status-elevated/50 bg-status-elevated/10 text-status-elevated',
} as const

const tierLabels = {
  clear: 'CLEAR',
  mild: 'MILD',
  moderate: 'MODERATE',
  elevated: 'ELEVATED',
} as const

function formatHoursToClear(hours: number | null): string {
  if (hours === null || hours <= 0) {
    return 'CLEAR NOW'
  }

  return `${hours}H TO CLEAR`
}

export default function CarryoverBadge({ carryover, guidanceLevel }: CarryoverBadgeProps) {
  return (
    <Card
      className={`${tierStyles[carryover.tier]} transition-settle`}
      padding="lg"
    >
      <p className="font-mono text-xs tracking-widest uppercase opacity-80">Carryover</p>
      <p className="mt-2 font-mono text-2xl tracking-widest uppercase">{tierLabels[carryover.tier]}</p>

      {guidanceLevel === 'guided' && (
        <div className="mt-3 flex flex-wrap items-center gap-3 font-mono text-sm tracking-wide uppercase">
          <span>{carryover.percentage}%</span>
          <span className="text-bone/80">|</span>
          <span>{formatHoursToClear(carryover.hours_to_clear)}</span>
        </div>
      )}
    </Card>
  )
}
