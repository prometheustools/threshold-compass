'use client'

import { useMemo } from 'react'

interface ContextSliderProps {
  label: string
  value: number | ''
  onChange: (value: number) => void
  minEmoji: string
  maxEmoji: string
  disabled?: boolean
}

export default function ContextSlider({ 
  label, 
  value, 
  onChange, 
  minEmoji, 
  maxEmoji,
  disabled 
}: ContextSliderProps) {
  const currentValue = typeof value === 'number' ? value : 0
  
  const dots = useMemo(() => [1, 2, 3, 4, 5], [])
  
  return (
    <div className="flex items-center gap-4">
      {/* Label */}
      <span className="text-xs text-bone uppercase tracking-wider w-16 shrink-0">
        {label}
      </span>
      
      {/* Slider track */}
      <div className="flex-1 flex items-center gap-1">
        {dots.map((dot) => {
          const isActive = currentValue >= dot
          return (
            <button
              key={dot}
              type="button"
              disabled={disabled}
              onClick={() => onChange(dot)}
              className={`flex-1 h-8 rounded-lg transition-all ${
                isActive
                  ? 'bg-amber'
                  : 'bg-elevated border border-ember hover:border-amber/50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label={`${label} level ${dot}`}
            />
          )
        })}
      </div>
      
      {/* Emoji indicator */}
      <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-lg shrink-0">
        {currentValue === 0 ? '—' : currentValue <= 2 ? minEmoji : currentValue >= 4 ? maxEmoji : '•'}
      </div>
    </div>
  )
}
