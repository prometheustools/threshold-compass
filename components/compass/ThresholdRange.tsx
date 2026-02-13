'use client'

import type { ThresholdRange as ThresholdRangeModel } from '@/types'
import Card from '@/components/ui/Card'
import ConfidenceBadge from './ConfidenceBadge'

interface ThresholdRangeProps {
  range: ThresholdRangeModel
  unit: 'g' | 'µg'
}

function formatDose(value: number | null, unit: 'g' | 'µg'): string {
  if (value === null) {
    return '—'
  }

  if (unit === 'µg') {
    const decimals = Number.isInteger(value) ? 0 : 2
    return `${value.toFixed(decimals)} ${unit}`
  }

  return `${value.toFixed(2)} ${unit}`
}

export default function ThresholdRange({ range, unit }: ThresholdRangeProps) {
  const zones = [
    { label: 'LOW', value: range.floor_dose },
    { label: 'SWEET SPOT', value: range.sweet_spot },
    { label: 'HIGH', value: range.ceiling_dose },
  ] as const

  const values = zones
    .map((zone) => zone.value)
    .filter((value): value is number => typeof value === 'number')

  const min = values.length > 0 ? Math.min(...values) : 0
  const max = values.length > 0 ? Math.max(...values) : 1
  const rangeSpan = max - min === 0 ? 1 : max - min

  return (
    <Card padding="lg" className="transition-settle">
      <p className="font-mono text-xs tracking-widest uppercase text-bone">Threshold Range</p>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {zones.map((zone) => (
          <div key={zone.label} className="rounded-button bg-elevated p-3 text-center">
            <p className="font-mono text-xs tracking-widest uppercase text-bone">{zone.label}</p>
            <p className="mt-2 font-mono text-sm text-ivory">{formatDose(zone.value, unit)}</p>
          </div>
        ))}
      </div>

      <div className="relative mt-5 h-8">
        <div className="absolute left-0 right-0 top-1/2 grid h-3 -translate-y-1/2 grid-cols-3 overflow-hidden rounded-full border border-ember/40">
          <div className="bg-status-clear/30" />
          <div className="bg-orange/30" />
          <div className="bg-status-elevated/25" />
        </div>

        {zones.map((zone) => {
          if (zone.value === null) {
            return null
          }

          const left = ((zone.value - min) / rangeSpan) * 100
          return (
            <div
              key={`${zone.label}-marker`}
              className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border border-base bg-orange"
              style={{ left: `calc(${left}% - 10px)` }}
              aria-hidden="true"
            />
          )
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-ember/20">
        <ConfidenceBadge 
          confidence={range.confidence} 
          showQualifier={true}
          size="md"
        />
      </div>
    </Card>
  )
}
