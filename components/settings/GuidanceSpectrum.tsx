'use client'

import type { GuidanceLevel } from '@/types'

interface GuidanceSpectrumProps {
  value: GuidanceLevel
  onChange: (value: GuidanceLevel) => void
  disabled?: boolean
}

const levels: Array<{ value: GuidanceLevel; label: string; description: string }> = [
  { value: 'minimal', label: 'MINIMAL', description: 'Low-touch UI, fewer prompts' },
  { value: 'guided', label: 'GUIDED', description: 'Balanced support & reminders' },
  { value: 'experienced', label: 'EXPERIENCED', description: 'Lean defaults, established practice' },
]

export default function GuidanceSpectrum({ value, onChange, disabled }: GuidanceSpectrumProps) {
  const currentIndex = levels.findIndex((l) => l.value === value)

  return (
    <div className="space-y-4">
      {/* Spectrum bar */}
      <div className="relative">
        {/* Track */}
        <div className="h-2 bg-elevated rounded-full overflow-hidden">
          {/* Fill */}
          <div
            className="h-full bg-gradient-to-r from-bone via-amber to-bone rounded-full transition-all duration-500"
            style={{
              width: `${((currentIndex + 1) / levels.length) * 100}%`,
            }}
          />
        </div>

        {/* Stops */}
        <div className="relative flex justify-between mt-3">
          {levels.map((level, index) => {
            const isSelected = value === level.value
            const isPast = index <= currentIndex

            return (
              <button
                key={level.value}
                type="button"
                disabled={disabled}
                onClick={() => onChange(level.value)}
                className={`flex flex-col items-center gap-2 transition-all duration-300 ${
                  disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                }`}
              >
                {/* Dot */}
                <div
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                    isSelected
                      ? 'bg-amber border-amber scale-125'
                      : isPast
                        ? 'bg-amber/50 border-amber/50'
                        : 'bg-surface border-ember'
                  }`}
                />

                {/* Label */}
                <span
                  className={`text-[10px] font-mono tracking-wider transition-colors duration-300 ${
                    isSelected ? 'text-amber font-bold' : 'text-bone'
                  }`}
                >
                  {level.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected description */}
      <div className="text-center p-4 rounded-xl bg-surface border border-ember/30">
        <p className="text-sm text-ivory font-medium">
          {levels.find((l) => l.value === value)?.description}
        </p>
      </div>
    </div>
  )
}
