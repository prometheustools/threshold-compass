'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface DoseDialProps {
  value: number
  onChange: (value: number) => void
  unit: 'mg' | 'ug'
  min?: number
  max?: number
  presets?: number[]
}

export default function DoseDial({ 
  value, 
  onChange, 
  unit, 
  min = 0, 
  max = unit === 'ug' ? 100 : 500,
  presets = unit === 'ug' ? [5, 10, 15, 20, 25, 30] : [50, 80, 100, 120, 150, 200]
}: DoseDialProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  
  const radius = 100
  const center = 120
  const strokeWidth = 8
  
  // Calculate angle from value (0-360 degrees, starting from bottom)
  const valueToAngle = useCallback((val: number) => {
    const normalized = Math.max(0, Math.min(1, (val - min) / (max - min)))
    return normalized * 270 - 135 // -135 to +135 degrees (270 degree arc)
  }, [min, max])
  
  // Calculate value from angle
  const angleToValue = useCallback((angle: number) => {
    // Normalize angle to 0-270 range
    let normalized = angle + 135
    if (normalized < 0) normalized = 0
    if (normalized > 270) normalized = 270
    const pct = normalized / 270
    const raw = min + pct * (max - min)
    // Snap to nearest 5 (mg) or 1 (ug)
    const step = unit === 'ug' ? 1 : 5
    return Math.round(raw / step) * step
  }, [min, max, unit])
  
  // Get position from angle
  const getPosition = useCallback((angle: number) => {
    const rad = (angle - 90) * Math.PI / 180
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad)
    }
  }, [])
  
  const currentAngle = valueToAngle(value)
  const thumbPos = getPosition(currentAngle)
  
  // Handle drag/click
  const handleInteraction = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left - center
    const y = clientY - rect.top - center
    
    // Calculate angle from center
    let angle = Math.atan2(y, x) * 180 / Math.PI + 90
    // Normalize to -135 to 225
    if (angle < -135) angle += 360
    if (angle > 225) angle -= 360
    
    onChange(angleToValue(angle))
  }, [onChange, angleToValue, center])
  
  // Mouse/Touch handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setShowTooltip(true)
    handleInteraction(e.clientX, e.clientY)
  }
  
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    setShowTooltip(true)
    const touch = e.touches[0]
    handleInteraction(touch.clientX, touch.clientY)
  }
  
  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return
      e.preventDefault()
      if ('touches' in e) {
        handleInteraction(e.touches[0].clientX, e.touches[0].clientY)
      } else {
        handleInteraction(e.clientX, e.clientY)
      }
    }
    
    const handleEnd = () => {
      setIsDragging(false)
      setTimeout(() => setShowTooltip(false), 1000)
    }
    
    if (isDragging) {
      window.addEventListener('mousemove', handleMove)
      window.addEventListener('mouseup', handleEnd)
      window.addEventListener('touchmove', handleMove, { passive: false })
      window.addEventListener('touchend', handleEnd)
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [isDragging, handleInteraction])
  
  // Generate arc path
  const describeArc = (startAngle: number, endAngle: number) => {
    const start = getPosition(startAngle)
    const end = getPosition(endAngle)
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
    return [
      'M', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 1, end.x, end.y
    ].join(' ')
  }
  
  return (
    <div className="flex flex-col items-center">
      {/* Dial Container */}
      <div 
        ref={containerRef}
        className="relative cursor-pointer select-none touch-none"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{ width: 240, height: 240 }}
      >
        <svg viewBox="0 0 240 240" className="w-full h-full">
          {/* Background glow */}
          <defs>
            <linearGradient id="dialGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d4a843" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#d4a843" stopOpacity="0.1" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Background arc */}
          <path
            d={describeArc(-135, 135)}
            fill="none"
            stroke="#2a3347"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          
          {/* Active arc */}
          <path
            d={describeArc(-135, currentAngle)}
            fill="none"
            stroke="#d4a843"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            filter="url(#glow)"
            className="transition-all duration-100"
          />
          
          {/* Tick marks */}
          {presets.map((preset) => {
            const angle = valueToAngle(preset)
            const pos = getPosition(angle)
            const inner = {
              x: center + (radius - 20) * Math.cos((angle - 90) * Math.PI / 180),
              y: center + (radius - 20) * Math.sin((angle - 90) * Math.PI / 180)
            }
            return (
              <g key={preset}>
                <line
                  x1={inner.x}
                  y1={inner.y}
                  x2={pos.x}
                  y2={pos.y}
                  stroke="#4a5568"
                  strokeWidth={2}
                  opacity={0.5}
                />
                <text
                  x={center + (radius + 15) * Math.cos((angle - 90) * Math.PI / 180)}
                  y={center + (radius + 15) * Math.sin((angle - 90) * Math.PI / 180)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="font-mono text-[9px] fill-bone"
                >
                  {preset}
                </text>
              </g>
            )
          })}
          
          {/* Center value display */}
          <text
            x={center}
            y={center - 8}
            textAnchor="middle"
            className="font-sans text-[32px] font-bold fill-ivory"
          >
            {value}
          </text>
          <text
            x={center}
            y={center + 16}
            textAnchor="middle"
            className="font-mono text-[12px] fill-bone"
          >
            {unit}
          </text>
          
          {/* Min/Max labels */}
          <text x={center - radius + 10} y={center + radius - 30} className="font-mono text-[10px] fill-ash">
            {min}
          </text>
          <text x={center + radius - 25} y={center + radius - 30} className="font-mono text-[10px] fill-ash">
            {max}
          </text>
          
          {/* Draggable thumb */}
          <g transform={`translate(${thumbPos.x}, ${thumbPos.y})`}>
            <circle r={14} fill="#d4a843" filter="url(#glow)" />
            <circle r={10} fill="#111827" />
            <circle r={4} fill="#d4a843" />
          </g>
        </svg>
        
        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-elevated rounded text-xs text-ivory whitespace-nowrap">
            Drag to adjust
          </div>
        )}
      </div>
      
      {/* Radial Presets */}
      <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-[280px]">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              value === preset
                ? 'bg-amber text-surface'
                : 'bg-surface border border-ember text-bone hover:border-amber'
            }`}
          >
            {preset}
          </button>
        ))}
      </div>
    </div>
  )
}
