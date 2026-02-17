'use client'

import { Preparation } from '@/types'

interface FoodStateSelectorProps {
  value: Preparation | ''
  onChange: (value: Preparation) => void
  disabled?: boolean
}

const states: Array<{ value: Preparation; label: string; Icon: React.FC<{ filled: boolean }> }> = [
  { 
    value: 'empty_stomach', 
    label: 'Empty',
    Icon: ({ filled }) => (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5">
        {/* Bowl outline */}
        <path 
          d="M4 10c0 4.4 3.6 8 8 8s8-3.6 8-8" 
          strokeLinecap="round"
        />
        {/* Bowl rim */}
        <ellipse cx="12" cy="10" rx="8" ry="2" />
        {/* Empty indicator - minimal fill */}
        {filled && (
          <path 
            d="M6 10c0 3.3 2.7 6 6 6s6-2.7 6-6" 
            fill="currentColor"
            fillOpacity="0.1"
          />
        )}
      </svg>
    )
  },
  { 
    value: 'light_meal', 
    label: 'Light',
    Icon: ({ filled }) => (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5">
        {/* Bowl outline */}
        <path 
          d="M4 10c0 4.4 3.6 8 8 8s8-3.6 8-8" 
          strokeLinecap="round"
        />
        {/* Bowl rim */}
        <ellipse cx="12" cy="10" rx="8" ry="2" />
        {/* Light fill - bottom third */}
        {filled && (
          <path 
            d="M5.5 11c0.5 2.5 3 6 6.5 6s6-3.5 6.5-6" 
            fill="currentColor"
            fillOpacity="0.3"
          />
        )}
      </svg>
    )
  },
  { 
    value: 'full_meal', 
    label: 'Full',
    Icon: ({ filled }) => (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5">
        {/* Bowl outline */}
        <path 
          d="M4 10c0 4.4 3.6 8 8 8s8-3.6 8-8" 
          strokeLinecap="round"
        />
        {/* Bowl rim */}
        <ellipse cx="12" cy="10" rx="8" ry="2" />
        {/* Full fill - two thirds */}
        {filled && (
          <path 
            d="M5 10c0 3.9 3.1 7 7 7s7-3.1 7-7" 
            fill="currentColor"
            fillOpacity="0.5"
          />
        )}
      </svg>
    )
  },
]

export default function FoodStateSelector({ value, onChange, disabled }: FoodStateSelectorProps) {
  return (
    <div className="flex gap-3">
      {states.map((state) => {
        const isSelected = value === state.value
        return (
          <button
            key={state.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(state.value)}
            className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${
              isSelected
                ? 'bg-amber text-surface'
                : 'bg-surface border border-ember text-bone hover:border-amber/50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <state.Icon filled={isSelected} />
            <span className="text-xs font-medium">{state.label}</span>
          </button>
        )
      })}
    </div>
  )
}
