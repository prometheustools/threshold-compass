'use client'

import { useCallback, useMemo } from 'react'

export type BodyRegion = 'head' | 'chest' | 'stomach' | 'hands' | 'legs'

interface BodyMapProps {
  value?: BodyRegion[]
  onChange?: (regions: BodyRegion[]) => void
  readOnly?: boolean
}

const regionLabels: Record<BodyRegion, string> = {
  head: 'Head',
  chest: 'Chest',
  stomach: 'Stomach',
  hands: 'Hands',
  legs: 'Legs',
}

export default function BodyMap({ value = [], onChange, readOnly = false }: BodyMapProps) {
  const selected = useMemo(() => value, [value])

  const toggleRegion = useCallback(
    (region: BodyRegion) => {
      if (readOnly) return

      const nextSelected = selected.includes(region)
        ? selected.filter((entry) => entry !== region)
        : [...selected, region]

      onChange?.(nextSelected)
    },
    [onChange, readOnly, selected]
  )

  const isSelected = (region: BodyRegion) => selected.includes(region)

  const regionStyle = (region: BodyRegion) => ({
    fill: isSelected(region) ? 'rgba(224, 122, 62, 0.35)' : 'rgba(245, 242, 233, 0.08)',
    stroke: isSelected(region) ? 'rgba(224, 122, 62, 0.9)' : 'rgba(245, 242, 233, 0.2)',
    strokeWidth: isSelected(region) ? 2 : 1,
    cursor: readOnly ? 'default' : 'pointer',
    transition: 'all 0.2s ease',
  })

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="0 0 120 180" className="h-72 w-48" role="group" aria-label="Body sensation map">
        <ellipse
          cx="60"
          cy="22"
          rx="16"
          ry="18"
          style={regionStyle('head')}
          onClick={() => toggleRegion('head')}
          role="checkbox"
          aria-checked={isSelected('head')}
          aria-label="Head"
          tabIndex={readOnly ? -1 : 0}
          onKeyDown={(event) => event.key === 'Enter' && toggleRegion('head')}
        />

        <rect
          x="55"
          y="38"
          width="10"
          height="8"
          rx="2"
          fill="rgba(245, 242, 233, 0.06)"
          stroke="rgba(245, 242, 233, 0.15)"
          strokeWidth="0.5"
        />

        <path
          d="M 35 46 Q 35 52, 40 56 L 40 80 Q 40 82, 42 82 L 78 82 Q 80 82, 80 80 L 80 56 Q 85 52, 85 46 Q 85 44, 80 44 L 40 44 Q 35 44, 35 46 Z"
          style={regionStyle('chest')}
          onClick={() => toggleRegion('chest')}
          role="checkbox"
          aria-checked={isSelected('chest')}
          aria-label="Chest"
          tabIndex={readOnly ? -1 : 0}
          onKeyDown={(event) => event.key === 'Enter' && toggleRegion('chest')}
        />

        <path
          d="M 42 84 L 42 110 Q 42 115, 50 118 L 60 120 L 70 118 Q 78 115, 78 110 L 78 84 L 42 84 Z"
          style={regionStyle('stomach')}
          onClick={() => toggleRegion('stomach')}
          role="checkbox"
          aria-checked={isSelected('stomach')}
          aria-label="Stomach"
          tabIndex={readOnly ? -1 : 0}
          onKeyDown={(event) => event.key === 'Enter' && toggleRegion('stomach')}
        />

        <path
          d="M 35 48 Q 28 50, 22 58 L 18 75 Q 17 78, 14 82 L 10 90 Q 8 93, 10 95 L 14 93 L 20 80 L 28 68 L 35 60"
          fill="rgba(245, 242, 233, 0.06)"
          stroke="rgba(245, 242, 233, 0.15)"
          strokeWidth="0.5"
        />
        <path
          d="M 85 48 Q 92 50, 98 58 L 102 75 Q 103 78, 106 82 L 110 90 Q 112 93, 110 95 L 106 93 L 100 80 L 92 68 L 85 60"
          fill="rgba(245, 242, 233, 0.06)"
          stroke="rgba(245, 242, 233, 0.15)"
          strokeWidth="0.5"
        />

        <g
          onClick={() => toggleRegion('hands')}
          role="checkbox"
          aria-checked={isSelected('hands')}
          aria-label="Hands"
          tabIndex={readOnly ? -1 : 0}
          onKeyDown={(event) => event.key === 'Enter' && toggleRegion('hands')}
          style={{ cursor: readOnly ? 'default' : 'pointer' }}
        >
          <ellipse cx="10" cy="98" rx="6" ry="8" style={regionStyle('hands')} />
          <ellipse cx="110" cy="98" rx="6" ry="8" style={regionStyle('hands')} />
        </g>

        <g
          onClick={() => toggleRegion('legs')}
          role="checkbox"
          aria-checked={isSelected('legs')}
          aria-label="Legs"
          tabIndex={readOnly ? -1 : 0}
          onKeyDown={(event) => event.key === 'Enter' && toggleRegion('legs')}
          style={{ cursor: readOnly ? 'default' : 'pointer' }}
        >
          <path
            d="M 50 120 L 48 145 Q 47 155, 45 165 L 43 175 Q 43 178, 48 178 L 53 178 Q 55 178, 55 175 L 55 145 L 56 125"
            style={regionStyle('legs')}
          />
          <path
            d="M 70 120 L 72 145 Q 73 155, 75 165 L 77 175 Q 77 178, 72 178 L 67 178 Q 65 178, 65 175 L 65 145 L 64 125"
            style={regionStyle('legs')}
          />
        </g>
      </svg>

      <div className="flex flex-wrap justify-center gap-2">
        {(Object.keys(regionLabels) as BodyRegion[]).map((region) => (
          <button
            key={region}
            type="button"
            onClick={() => toggleRegion(region)}
            disabled={readOnly}
            className={`rounded-button px-3 py-2 font-mono text-xs uppercase tracking-wide transition-settle ${
              isSelected(region)
                ? 'bg-orange text-base'
                : 'bg-elevated text-bone hover:text-ivory'
            }`}
          >
            {regionLabels[region]}
          </button>
        ))}
      </div>
    </div>
  )
}
