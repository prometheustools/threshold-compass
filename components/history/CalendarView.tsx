'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { DoseLog } from '@/types'

interface CalendarViewProps {
  doses: DoseLog[]
  onSelectDate?: (date: string, doses: DoseLog[]) => void
  selectedDate?: string | null
}

export default function CalendarView({ doses, onSelectDate, selectedDate }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  // Group doses by date
  const dosesByDate = useMemo(() => {
    const map: Record<string, DoseLog[]> = {}
    for (const dose of doses) {
      const dateKey = dose.dosed_at.split('T')[0]
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(dose)
    }
    return map
  }, [doses])
  
  // Get calendar data
  const { days, monthLabel } = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const daysArray = []
    const current = new Date(startDate)
    
    // Generate 6 weeks (42 days)
    for (let i = 0; i < 42; i++) {
      const dateStr = current.toISOString().split('T')[0]
      const isCurrentMonth = current.getMonth() === month
      const dayDoses = dosesByDate[dateStr] || []
      
      daysArray.push({
        date: dateStr,
        dayOfMonth: current.getDate(),
        isCurrentMonth,
        doses: dayDoses,
        totalAmount: dayDoses.reduce((sum, d) => sum + d.amount, 0),
      })
      
      current.setDate(current.getDate() + 1)
    }
    
    const label = currentMonth.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })
    
    return { days: daysArray, monthLabel: label }
  }, [currentMonth, dosesByDate])
  
  const goToPreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }
  
  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }
  
  const goToToday = () => {
    setCurrentMonth(new Date())
  }
  
  // Get intensity color based on total dose amount
  const getIntensityClass = (totalAmount: number) => {
    if (totalAmount === 0) return ''
    if (totalAmount < 100) return 'bg-amber/20'
    if (totalAmount < 200) return 'bg-amber/40'
    return 'bg-amber/60'
  }
  
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goToPreviousMonth}
          className="p-2 rounded-lg hover:bg-surface transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5 text-bone" />
        </button>
        
        <div className="text-center">
          <h3 className="text-lg font-semibold text-ivory">{monthLabel}</h3>
          <button
            type="button"
            onClick={goToToday}
            className="text-xs text-bone hover:text-amber transition-colors"
          >
            Today
          </button>
        </div>
        
        <button
          type="button"
          onClick={goToNextMonth}
          className="p-2 rounded-lg hover:bg-surface transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5 text-bone" />
        </button>
      </div>
      
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs text-bone font-medium py-2">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          const isSelected = selectedDate === day.date
          const hasDoses = day.doses.length > 0
          
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectDate?.(day.date, day.doses)}
              className={`
                aspect-square rounded-xl p-1 flex flex-col items-center justify-start
                transition-all duration-200
                ${day.isCurrentMonth ? 'text-ivory' : 'text-ash/50'}
                ${isSelected ? 'ring-2 ring-amber bg-amber/10' : 'hover:bg-surface'}
                ${hasDoses && !isSelected ? getIntensityClass(day.totalAmount) : ''}
              `}
            >
              <span className={`text-sm font-medium ${isSelected ? 'text-amber' : ''}`}>
                {day.dayOfMonth}
              </span>
              
              {hasDoses && (
                <div className="mt-1 flex flex-col items-center gap-0.5">
                  <span className="text-[10px] text-bone">
                    {day.doses.length} dose{day.doses.length > 1 ? 's' : ''}
                  </span>
                  <div className="flex gap-0.5">
                    {day.doses.slice(0, 3).map((dose, i) => (
                      <div
                        key={i}
                        className="w-1 h-1 rounded-full bg-amber"
                      />
                    ))}
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-bone">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber/20" />
          <span>Light</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber/40" />
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber/60" />
          <span>Heavy</span>
        </div>
      </div>
    </div>
  )
}
