'use client'

import type { NorthStar } from '@/types'

const northStarConfig: Array<{
  value: NorthStar
  label: string
  description: string
  angle: number // degrees, 0 = top, clockwise
  color: string
}> = [
  { value: 'clarity', label: 'CLARITY', description: 'Focus & precision', angle: 0, color: '#d4a843' },
  { value: 'connection', label: 'CONNECT', description: 'Openness & empathy', angle: 72, color: '#60a5fa' },
  { value: 'creativity', label: 'CREATE', description: 'Flow & divergence', angle: 144, color: '#a78bfa' },
  { value: 'calm', label: 'CALM', description: 'Regulation & steadiness', angle: 216, color: '#34d399' },
  { value: 'exploration', label: 'EXPLORE', description: 'Discovery & play', angle: 288, color: '#f472b6' },
]

interface CompassRoseSelectorProps {
  value: NorthStar
  onChange: (value: NorthStar) => void
  disabled?: boolean
}

export default function CompassRoseSelector({ value, onChange, disabled }: CompassRoseSelectorProps) {
  const selectedConfig = northStarConfig.find((n) => n.value === value)

  return (
    <div className="relative w-64 h-64 mx-auto">
      {/* Background glow based on selection */}
      <div
        className="absolute inset-0 rounded-full blur-3xl opacity-20 transition-all duration-700"
        style={{ backgroundColor: selectedConfig?.color }}
      />

      {/* SVG Compass Rose */}
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {/* Outer ring */}
        <circle cx="100" cy="100" r="95" fill="none" stroke="#2a3347" strokeWidth="1" />
        <circle cx="100" cy="100" r="85" fill="none" stroke="#2a3347" strokeWidth="0.5" opacity="0.5" />

        {/* Direction lines */}
        {northStarConfig.map((star) => {
          const rad = ((star.angle - 90) * Math.PI) / 180
          const x2 = 100 + 75 * Math.cos(rad)
          const y2 = 100 + 75 * Math.sin(rad)
          const isSelected = value === star.value

          return (
            <g key={star.value}>
              {/* Line */}
              <line
                x1="100"
                y1="100"
                x2={x2}
                y2={y2}
                stroke={isSelected ? star.color : '#2a3347'}
                strokeWidth={isSelected ? 2 : 1}
                opacity={isSelected ? 1 : 0.5}
                className="transition-all duration-500"
              />

              {/* Label position */}
              {(() => {
                const labelRad = ((star.angle - 90) * Math.PI) / 180
                const lx = 100 + 92 * Math.cos(labelRad)
                const ly = 100 + 92 * Math.sin(labelRad)

                return (
                  <text
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={`font-mono text-[8px] transition-all duration-300 cursor-pointer ${
                      isSelected ? 'font-bold' : ''
                    }`}
                    fill={isSelected ? star.color : '#8892a4'}
                    onClick={() => !disabled && onChange(star.value)}
                    style={{ pointerEvents: disabled ? 'none' : 'auto' }}
                  >
                    {star.label}
                  </text>
                )
              })()}
            </g>
          )
        })}

        {/* Center selection indicator */}
        <circle
          cx="100"
          cy="100"
          r="35"
          fill="#111827"
          stroke={selectedConfig?.color}
          strokeWidth="2"
          className="transition-all duration-500"
        />

        {/* Center text */}
        <text x="100" y="95" textAnchor="middle" className="font-mono text-[10px] fill-bone">
          NORTH STAR
        </text>
        <text
          x="100"
          y="112"
          textAnchor="middle"
          className="font-sans text-[14px] font-bold transition-all duration-300"
          fill={selectedConfig?.color}
        >
          {selectedConfig?.label}
        </text>

        {/* Direction diamonds */}
        {northStarConfig.map((star) => {
          const rad = ((star.angle - 90) * Math.PI) / 180
          const x = 100 + 75 * Math.cos(rad)
          const y = 100 + 75 * Math.sin(rad)
          const isSelected = value === star.value

          return (
            <g
              key={`diamond-${star.value}`}
              onClick={() => !disabled && onChange(star.value)}
              style={{ cursor: disabled ? 'default' : 'pointer' }}
            >
              <polygon
                points={`${x},${y - 6} ${x + 6},${y} ${x},${y + 6} ${x - 6},${y}`}
                fill={isSelected ? star.color : '#111827'}
                stroke={star.color}
                strokeWidth="1"
                className="transition-all duration-300"
                opacity={isSelected ? 1 : 0.6}
              />
            </g>
          )
        })}
      </svg>

      {/* Description below */}
      <div className="text-center mt-4">
        <p className="text-sm text-bone">{selectedConfig?.description}</p>
      </div>
    </div>
  )
}
