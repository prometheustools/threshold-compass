'use client'

import { useMemo } from 'react'
import type { DoseLog } from '@/types'

interface CarryoverDecayChartProps {
  doses: DoseLog[]
  days?: number
  halfLifeHours?: number // 12 days for psilocybin, 8 for LSD
  referenceTime: number
}

// Calculate carryover at a specific time
function calculateCarryoverAtTime(
  doses: DoseLog[],
  targetTime: number,
  halfLifeHours: number
): number {
  const decayRate = Math.LN2 / halfLifeHours
  let totalCarryover = 0

  for (const dose of doses) {
    const doseTime = new Date(dose.dosed_at).getTime()
    const hoursSince = (targetTime - doseTime) / (1000 * 60 * 60)

    if (hoursSince < 0 || hoursSince > halfLifeHours * 3) continue

    // Normalize dose amount (treat all as relative units)
    const normalizedAmount = dose.amount / 100 // rough normalization
    const initialTolerance = Math.min(100, normalizedAmount * 100)
    totalCarryover += initialTolerance * Math.exp(-decayRate * hoursSince)
  }

  return Math.min(100, totalCarryover)
}

export default function CarryoverDecayChart({
  doses,
  days = 14,
  halfLifeHours = 288,
  referenceTime,
}: CarryoverDecayChartProps) {
  // Generate data points
  const data = useMemo(() => {
    const points = []
    const hoursPerPoint = 6 // Data point every 6 hours
    const totalHours = days * 24

    for (let h = totalHours; h >= 0; h -= hoursPerPoint) {
      const time = referenceTime - h * 60 * 60 * 1000
      const carryover = calculateCarryoverAtTime(doses, time, halfLifeHours)

      // Find doses active at this time
      const activeDoses = doses.filter((d) => {
        const doseTime = new Date(d.dosed_at).getTime()
        const hoursSince = (time - doseTime) / (1000 * 60 * 60)
        return hoursSince >= 0 && hoursSince <= 48 // Within 48h
      })

      points.push({
        time,
        carryover,
        hourOffset: h,
        activeDoses,
      })
    }

    return points.reverse()
  }, [doses, days, halfLifeHours, referenceTime])

  // Calculate dimensions
  const width = 600
  const height = 200
  const padding = { top: 20, right: 20, bottom: 40, left: 50 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Scales
  const maxCarryover = Math.max(...data.map((d) => d.carryover), 50)
  const xScale = (index: number) => (index / (data.length - 1)) * chartWidth
  const yScale = (value: number) => chartHeight - (value / maxCarryover) * chartHeight

  // Generate path
  const pathData = data
    .map((point, i) => {
      const x = xScale(i)
      const y = yScale(point.carryover)
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')

  // Area path (for gradient fill)
  const areaPath = `${pathData} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`

  // Find dose events for markers
  const doseEvents = useMemo(() => {
    return doses
      .filter((d) => {
        const doseTime = new Date(d.dosed_at).getTime()
        const hoursAgo = (referenceTime - doseTime) / (1000 * 60 * 60)
        return hoursAgo <= days * 24
      })
      .map((d) => {
        const doseTime = new Date(d.dosed_at).getTime()
        const hoursAgo = (referenceTime - doseTime) / (1000 * 60 * 60)
        const x = ((days * 24 - hoursAgo) / (days * 24)) * chartWidth
        return { ...d, x, hoursAgo }
      })
  }, [doses, days, chartWidth, referenceTime])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-bone uppercase tracking-wider">Carryover Decay</p>
        <p className="text-xs text-ash">Last {days} days</p>
      </div>

      <div className="bg-surface rounded-2xl p-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[500px]"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="carryoverGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d4a843" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#d4a843" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          <g transform={`translate(${padding.left}, ${padding.top})`}>
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map((tick) => (
              <g key={tick}>
                <line
                  x1="0"
                  y1={yScale(tick)}
                  x2={chartWidth}
                  y2={yScale(tick)}
                  stroke="#2a3347"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x="-10"
                  y={yScale(tick)}
                  dominantBaseline="middle"
                  textAnchor="end"
                  className="font-mono text-[10px] fill-ash"
                >
                  {tick}%
                </text>
              </g>
            ))}

            {/* Area fill */}
            <path d={areaPath} fill="url(#carryoverGradient)" />

            {/* Line */}
            <path
              d={pathData}
              fill="none"
              stroke="#d4a843"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Dose event markers */}
            {doseEvents.map((dose) => {
              const markerTime = referenceTime - dose.hoursAgo * 60 * 60 * 1000
              const markerCarryover = calculateCarryoverAtTime([dose], markerTime, halfLifeHours)
              const markerY = yScale(markerCarryover)
              return (
              <g key={dose.id}>
                <line
                  x1={dose.x}
                  y1={markerY}
                  x2={dose.x}
                  y2={chartHeight}
                  stroke="#d4a843"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  opacity="0.5"
                />
                <circle
                  cx={dose.x}
                  cy={markerY}
                  r="4"
                  fill="#d4a843"
                />
                <text
                  x={dose.x}
                  y={chartHeight + 15}
                  textAnchor="middle"
                  className="font-mono text-[9px] fill-bone"
                >
                  {dose.amount}
                </text>
              </g>
            )})}

            {/* X-axis labels */}
            {[0, days / 2, days].map((day) => {
              const x = (day / days) * chartWidth
              return (
                <text
                  key={day}
                  x={x}
                  y={chartHeight + 30}
                  textAnchor="middle"
                  className="font-mono text-[10px] fill-ash"
                >
                  {day === 0 ? 'Now' : `${day}d ago`}
                </text>
              )
            })}
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-[10px] text-ash">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber" />
          <span>Dose Event</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-1 bg-amber/60 rounded" />
          <span>Carryover Level</span>
        </div>
      </div>
    </div>
  )
}
