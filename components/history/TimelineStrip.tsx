'use client'

import { useMemo } from 'react'
import type { DoseLog } from '@/types'

interface TimelineStripProps {
  doses: DoseLog[]
  days?: number
}

// Get color based on threshold feel or amount
function getDoseColor(dose: DoseLog): string {
  // If we have a threshold feel, use that
  switch (dose.threshold_feel) {
    case 'sweetspot':
      return '#34d399' // Green
    case 'over':
      return '#ef4444' // Red
    case 'under':
      return '#d4a843' // Amber
    case 'nothing':
      return '#4a5568' // Grey
    default:
      // Fall back to amount-based coloring
      if (dose.amount < 100) return '#60a5fa' // Light blue
      if (dose.amount < 150) return '#d4a843' // Amber
      return '#f59e0b' // Orange
  }
}

export default function TimelineStrip({ doses, days = 30 }: TimelineStripProps) {
  // Generate last N days
  const timelineData = useMemo(() => {
    const data = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      // Find doses for this date
      const dayDoses = doses.filter(d => {
        const doseDate = new Date(d.dosed_at)
        doseDate.setHours(0, 0, 0, 0)
        return doseDate.getTime() === date.getTime()
      })
      
      data.push({
        date: dateStr,
        dayOfMonth: date.getDate(),
        isToday: i === 0,
        doses: dayDoses,
        totalAmount: dayDoses.reduce((sum, d) => sum + d.amount, 0),
      })
    }
    
    return data
  }, [doses, days])
  
  // Calculate max height for normalization
  const maxDoseCount = useMemo(() => {
    return Math.max(...timelineData.map(d => d.doses.length), 1)
  }, [timelineData])
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-bone uppercase tracking-wider">{days}-Day Timeline</p>
        <p className="text-xs text-ash">
          {doses.filter(d => {
            const doseDate = new Date(d.dosed_at)
            const cutoff = new Date()
            cutoff.setDate(cutoff.getDate() - days)
            return doseDate >= cutoff
          }).length} doses
        </p>
      </div>
      
      {/* Timeline strip */}
      <div className="relative h-32 bg-surface rounded-2xl p-4 overflow-x-auto overflow-y-hidden">
        <div className="flex items-end gap-1 min-w-max px-2">
          {timelineData.map((day, idx) => {
            const heightPercent = day.doses.length > 0 
              ? Math.min(100, (day.doses.length / maxDoseCount) * 80 + 20)
              : 5
            
            return (
              <div
                key={day.date}
                className="flex flex-col items-center gap-1 group"
                style={{ width: '20px' }}
              >
                {/* Bar */}
                <div
                  className={`
                    w-4 rounded-t-lg transition-all duration-300
                    ${day.doses.length > 0 ? 'opacity-100' : 'opacity-30'}
                    ${day.isToday ? 'ring-2 ring-amber ring-offset-2 ring-offset-surface' : ''}
                  `}
                  style={{
                    height: `${heightPercent}%`,
                    backgroundColor: day.doses.length > 0 
                      ? getDoseColor(day.doses[0])
                      : '#2a3347',
                    minHeight: day.doses.length > 0 ? '20px' : '4px',
                  }}
                  title={day.doses.length > 0 
                    ? `${day.doses.length} dose(s) on ${day.date}`
                    : day.date
                  }
                />
                
                {/* Day label */}
                <span className={`
                  text-[8px] font-mono
                  ${day.isToday ? 'text-amber font-bold' : 'text-ash'}
                  ${idx % 5 === 0 || day.isToday ? 'opacity-100' : 'opacity-0'}
                `}>
                  {day.dayOfMonth}
                </span>
                
                {/* Tooltip on hover */}
                {day.doses.length > 0 && (
                  <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="bg-elevated border border-ember/30 rounded-lg px-2 py-1 text-xs whitespace-nowrap">
                      <span className="text-ivory">{day.doses.length} dose{day.doses.length > 1 ? 's' : ''}</span>
                      <span className="text-bone ml-1">({day.totalAmount}{day.doses[0]?.unit})</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-[10px] text-ash">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-[#34d399]" />
          <span>Sweet Spot</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-[#d4a843]" />
          <span>Under</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-[#ef4444]" />
          <span>Over</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-[#60a5fa]" />
          <span>No Feel</span>
        </div>
      </div>
    </div>
  )
}
