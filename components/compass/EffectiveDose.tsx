'use client'

import type { GuidanceLevel } from '@/types'

interface EffectiveDoseProps {
  amount: number // last dose amount
  effectiveMultiplier: number // 1 - (carryover / 100)
  guidanceLevel: GuidanceLevel
  unit: 'g' | 'µg'
}

// PRD: "If you dose Xg now, effective dose ≈ Yg"
// Only show when carryover > 15% (tier not CLEAR)
// Show at Guided level only

export default function EffectiveDose({
  amount,
  effectiveMultiplier,
  guidanceLevel,
  unit,
}: EffectiveDoseProps) {
  // Only show at Guided level
  if (guidanceLevel !== 'guided') {
    return null
  }

  // Only show when carryover > 15%
  const effectivePercent = (1 - effectiveMultiplier) * 100
  if (effectivePercent <= 15) {
    return null
  }

  const effectiveAmount = amount * effectiveMultiplier

  const formatAmount = (val: number) => {
    if (unit === 'g') {
      return val.toFixed(2)
    }
    return val.toFixed(0)
  }

  return (
    <div className="mt-3 rounded-card border border-ember/30 bg-surface/50 p-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-bone">
        Effective Dose
      </p>
      <p className="mt-1 font-mono text-sm text-ivory">
        If you dose {formatAmount(amount)}{unit} now,
      </p>
      <p className="font-mono text-lg text-orange">
        effective ≈ {formatAmount(effectiveAmount)}{unit}
      </p>
      <p className="mt-1 font-mono text-[10px] text-ash">
        ({Math.round(effectivePercent)}% reduced by carryover)
      </p>
    </div>
  )
}
