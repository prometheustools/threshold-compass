'use client'

import { useMemo } from 'react'
import type { DoseLog, ThresholdFeel, ThresholdRangeResult } from '@/types'

interface ThresholdTerrainMapProps {
  range: ThresholdRangeResult | null
  doses: DoseLog[]
  className?: string
}

interface DosePoint {
  x: number
  y: number
  feel: ThresholdFeel
}

const feelColors: Record<ThresholdFeel, string> = {
  nothing: '#9ca3af',
  under: '#6b5ca5',
  sweetspot: '#22c55e',
  over: '#ef4444',
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[mid]
  return (sorted[mid - 1] + sorted[mid]) / 2
}

function confidenceMeta(score: number) {
  if (score >= 80) return { label: 'high', className: 'bg-status-clear/20 text-status-clear' }
  if (score >= 60) return { label: 'medium', className: 'bg-status-mild/20 text-status-mild' }
  return { label: 'low', className: 'bg-status-elevated/20 text-status-elevated' }
}

export default function ThresholdTerrainMap({ range, doses, className = '' }: ThresholdTerrainMapProps) {
  const width = 320
  const height = 180
  const padding = { top: 16, right: 16, bottom: 30, left: 32 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const terrain = useMemo(() => {
    if (!range) return null

    const sweet = doses.filter((dose) => dose.threshold_feel === 'sweetspot').map((dose) => dose.amount)
    const under = doses.filter((dose) => dose.threshold_feel === 'under').map((dose) => dose.amount)
    const over = doses.filter((dose) => dose.threshold_feel === 'over').map((dose) => dose.amount)

    const sweetMedian = median(sweet)
    const floor = range.floor ?? (under.length > 0 ? Math.max(...under) : 0)
    const optimal = range.sweet_spot ?? sweetMedian ?? 0
    const lowEnd = sweet.length > 0 ? Math.min(...sweet) : Math.max(0, optimal * 0.9)
    const highEnd = sweet.length > 0 ? Math.max(...sweet) : optimal * 1.1
    const ceiling = range.ceiling ?? (over.length > 0 ? Math.min(...over) : Math.max(highEnd * 1.2, highEnd + 0.01))

    const maxDose = Math.max(
      0.35,
      ...doses.map((dose) => dose.amount),
      ceiling * 1.15,
      highEnd * 1.2
    )

    const xScale = (dose: number) => padding.left + (dose / maxDose) * chartWidth
    const yScale = (elevation: number) => padding.top + chartHeight - elevation * chartHeight

    const points: Array<{ x: number; y: number }> = []
    const resolution = 60

    for (let index = 0; index <= resolution; index += 1) {
      const dose = (index / resolution) * maxDose
      let elevation = 0.08

      if (dose < floor) {
        elevation = 0.08
      } else if (dose < lowEnd) {
        const t = (dose - floor) / Math.max(0.001, lowEnd - floor)
        elevation = 0.08 + t * 0.25
      } else if (dose < optimal) {
        const t = (dose - lowEnd) / Math.max(0.001, optimal - lowEnd)
        elevation = 0.33 + t * 0.57
      } else if (dose < highEnd) {
        const t = (dose - optimal) / Math.max(0.001, highEnd - optimal)
        elevation = 0.9 - t * 0.1
      } else if (dose < ceiling) {
        const t = (dose - highEnd) / Math.max(0.001, ceiling - highEnd)
        elevation = 0.8 - t * 0.5
      } else {
        elevation = 0.22
      }

      points.push({ x: xScale(dose), y: yScale(elevation) })
    }

    const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
    const area = `${path} L ${xScale(maxDose)} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`

    const dosePoints: DosePoint[] = doses
      .filter((dose) => dose.post_dose_completed && !!dose.threshold_feel)
      .map((dose) => {
        const feel = dose.threshold_feel as ThresholdFeel
        const yByFeel = feel === 'nothing' ? 0.12 : feel === 'under' ? 0.38 : feel === 'sweetspot' ? 0.88 : 0.26
        return { x: xScale(dose.amount), y: yScale(yByFeel), feel }
      })

    return {
      floor,
      lowEnd,
      optimal,
      highEnd,
      ceiling,
      maxDose,
      path,
      area,
      dosePoints,
      xScale,
    }
  }, [range, doses, chartWidth, chartHeight, padding.left, padding.top])

  if (!range || !terrain) {
    return (
      <div className={`rounded-button border border-ember/20 bg-elevated p-5 ${className}`}>
        <div className="text-center">
          <div className="text-3xl">🗻</div>
          <p className="mt-2 font-mono text-xs uppercase tracking-widest text-bone">Threshold Terrain</p>
          <p className="mt-1 text-sm text-ash">Log more completed doses to map your range.</p>
        </div>
      </div>
    )
  }

  const confidence = confidenceMeta(range.confidence)

  return (
    <div className={`rounded-button border border-ember/20 bg-elevated p-4 ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-widest text-bone">Threshold Terrain</p>
        <span className={`rounded-button px-2 py-1 font-mono text-[10px] uppercase ${confidence.className}`}>
          {confidence.label}
        </span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
        <defs>
          <linearGradient id="terrainFill" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(156, 163, 175, 0.25)" />
            <stop offset="35%" stopColor="rgba(107, 92, 165, 0.25)" />
            <stop offset="60%" stopColor="rgba(34, 197, 94, 0.3)" />
            <stop offset="100%" stopColor="rgba(239, 68, 68, 0.25)" />
          </linearGradient>
        </defs>

        <path d={terrain.area} fill="url(#terrainFill)" />
        <path d={terrain.path} fill="none" stroke="#f5f2e9" strokeWidth="2" />

        <line
          x1={terrain.xScale(terrain.optimal)}
          y1={padding.top}
          x2={terrain.xScale(terrain.optimal)}
          y2={padding.top + chartHeight}
          stroke="#22c55e"
          strokeDasharray="4 4"
          opacity="0.9"
        />

        {terrain.dosePoints.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="4.5"
            fill={feelColors[point.feel]}
            stroke="#1f1f1f"
            strokeWidth="1.5"
          />
        ))}
      </svg>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-bone">Sweet Spot</span>
        <span className="font-mono text-orange">{terrain.optimal.toFixed(0)}mg</span>
      </div>
      <div className="mt-1 text-xs text-ash">
        Range {terrain.lowEnd.toFixed(0)}mg to {terrain.highEnd.toFixed(0)}mg
      </div>

      <div className="mt-3 flex justify-center gap-3 text-[11px] text-bone">
        {(['nothing', 'under', 'sweetspot', 'over'] as const).map((feel) => (
          <span key={feel} className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: feelColors[feel] }} />
            {feel === 'sweetspot' ? 'sweet spot' : feel}
          </span>
        ))}
      </div>
    </div>
  )
}
