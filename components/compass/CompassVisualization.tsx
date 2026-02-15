'use client'

import { useMemo, useEffect, useState, type CSSProperties } from 'react'
import type { CalibrationStatus, CarryoverTier, NorthStar, ThresholdRange } from '@/types'

export type CompassVisualizationState =
  | 'dormant'
  | 'calibrating'
  | 'calibrated_rest'
  | 'calibrated_active'
  | 'elevated_carryover'

interface CompassVisualizationProps {
  state: CompassVisualizationState
  northStar: NorthStar
  progress?: number // 0-10 for calibrating
  thresholdRange?: ThresholdRange | null
  activeDoseHours?: number | null // hours since last dose
  carryoverTier?: CarryoverTier
  carryoverPercentage?: number
  lastDoseAmount?: number | null
  unit: 'g' | 'µg'
  calibrationStatus?: CalibrationStatus
}

const northStarDegrees: Record<NorthStar, number> = {
  clarity: 0,
  connection: 72,
  creativity: 144,
  calm: 216,
  exploration: 288,
}

const tierLabels: Record<CarryoverTier, string> = {
  clear: 'CLEAR',
  mild: 'MILD',
  moderate: 'MODERATE',
  elevated: 'ELEVATED',
}

const northStarShortLabels: Record<NorthStar, string> = {
  clarity: 'CL',
  connection: 'CN',
  creativity: 'CR',
  calm: 'CA',
  exploration: 'EX',
}

export default function CompassVisualization({
  state,
  northStar,
  progress = 0,
  thresholdRange,
  activeDoseHours,
  carryoverTier = 'clear',
  carryoverPercentage = 0,
  unit,
  calibrationStatus,
}: CompassVisualizationProps) {
  const [animationPhase, setAnimationPhase] = useState<'searching' | 'found' | 'settled'>('searching')

  useEffect(() => {
    const resetTimeout = setTimeout(() => setAnimationPhase('searching'), 0)
    const searchTimeout = setTimeout(() => setAnimationPhase('found'), 800)
    const settleTimeout = setTimeout(() => setAnimationPhase('settled'), 1800)
    return () => {
      clearTimeout(resetTimeout)
      clearTimeout(searchTimeout)
      clearTimeout(settleTimeout)
    }
  }, [state, northStar, carryoverTier])

  const centerText = useMemo(() => {
    switch (state) {
      case 'dormant':
        return 'CALIBRATE'
      case 'calibrating':
        return `DOSE ${progress || 1} OF 10`
      case 'calibrated_rest':
      case 'calibrated_active':
        if (calibrationStatus === 'calibrated' && thresholdRange?.floor_dose && thresholdRange?.ceiling_dose) {
          return `RANGE: ${thresholdRange.floor_dose}-${thresholdRange.ceiling_dose}${unit}`
        }
        return tierLabels[carryoverTier]
      case 'calibrated_rest':
        return tierLabels[carryoverTier]
      case 'calibrated_active':
        if (activeDoseHours !== null && activeDoseHours !== undefined) {
          const hours = Math.floor(activeDoseHours)
          const minutes = Math.floor((activeDoseHours - hours) * 60)
          return `ACTIVE — ${hours}H ${minutes}M`
        }
        return 'ACTIVE'
      case 'elevated_carryover':
        return `REST — ${carryoverTier.toUpperCase()}`
      default:
        return ''
    }
  }, [state, progress, carryoverTier, activeDoseHours])

  const baseRotation = useMemo((): number => {
    if (state === 'dormant') return northStarDegrees[northStar]
    if (state === 'calibrating') return -90
    if (state === 'elevated_carryover') return -45
    if (thresholdRange?.sweet_spot && thresholdRange.floor_dose && thresholdRange.ceiling_dose) {
      const range = thresholdRange.ceiling_dose - thresholdRange.floor_dose
      if (range > 0 && thresholdRange.sweet_spot) {
        const normalized = (thresholdRange.sweet_spot - thresholdRange.floor_dose) / range
        return -135 + normalized * 270
      }
    }
    return 0
  }, [state, northStar, thresholdRange])

  const needleRotation = useMemo(() => {
    if (animationPhase === 'searching') {
      return -180
    }
    if (animationPhase === 'found') {
      return baseRotation + 10
    }
    return baseRotation
  }, [animationPhase, baseRotation])

  const driftAmplitudeDegrees = carryoverPercentage > 0 ? carryoverPercentage / 10 : 0
  const shouldDrift = driftAmplitudeDegrees > 0 && animationPhase === 'settled'
  const needleDriftStyle = (shouldDrift
    ? {
        transformOrigin: '100px 100px',
        animation: 'needleDrift 800ms ease-out infinite',
        ['--drift-amplitude' as string]: `${driftAmplitudeDegrees}deg`,
      }
    : {
        transformOrigin: '100px 100px',
      }) as CSSProperties

  const needleTransition = animationPhase === 'settled' ? 'transition-settle' : ''
  const glowIntensity = animationPhase === 'found' ? 1 : animationPhase === 'searching' ? 0.3 : 0.8

  const hasThresholdMarkers = state === 'calibrated_rest' || state === 'calibrated_active'
  const showSweep = animationPhase === 'searching'
  const ringClassName = animationPhase === 'searching' ? 'animate-[compassPulse_2200ms_ease-in-out_infinite]' : ''

  return (
    <div className="relative w-full max-w-sm mx-auto aspect-square">
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full"
        aria-label={`Compass visualization: ${state} (${unit}, ${calibrationStatus ?? 'unknown'})`}
      >
        <defs>
          {/* Gradient for dormant state */}
          <linearGradient id="gradient-dormant" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8A8A8A" />
            <stop offset="100%" stopColor="#8A8A8A" />
          </linearGradient>

          {/* Gradient for calibrating state - orange to violet */}
          <linearGradient id="gradient-calibrating" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E07A3E" />
            <stop offset="100%" stopColor="#6B4E8D" />
          </linearGradient>

          {/* Gradient for calibrated states - green to orange to red */}
          <linearGradient id="gradient-calibrated" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4A9B6B" />
            <stop offset="50%" stopColor="#E07A3E" />
            <stop offset="100%" stopColor="#B54A4A" />
          </linearGradient>

          {/* Glow filter for needle */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {(Object.keys(northStarDegrees) as NorthStar[]).map((key) => {
          const marker = polarToCartesian(100, 100, 95, northStarDegrees[key])
          const selected = key === northStar

          return (
            <g key={key}>
              <circle
                cx={marker.x}
                cy={marker.y}
                r={selected ? 2.5 : 1.8}
                fill={selected ? '#E07A3E' : '#8A8A8A'}
                opacity={selected ? 1 : 0.7}
              />
              <text
                x={marker.x}
                y={marker.y - 5}
                textAnchor="middle"
                className={`font-mono text-[6px] uppercase tracking-wide ${selected ? 'fill-orange' : 'fill-bone'}`}
                opacity={selected ? 1 : 0.7}
              >
                {northStarShortLabels[key]}
              </text>
            </g>
          )
        })}

        {/* Outer ring */}
        <circle
          cx="100"
          cy="100"
          r="90"
          fill="none"
          stroke={state === 'elevated_carryover' ? '#D4682A' : '#2A2A2A'}
          strokeWidth="4"
          opacity={state === 'elevated_carryover' ? 0.5 : 1}
          className={ringClassName}
        />

        {/* Active arc */}
        <path
          d={describeArc(100, 100, 80, -225, 45)}
          fill="none"
          stroke={`url(#gradient-${state === 'calibrating' ? 'calibrating' : state === 'dormant' ? 'dormant' : 'calibrated'})`}
          strokeWidth="8"
          strokeLinecap="round"
          className="transition-settle"
        />

        {showSweep && (
          <g style={{ transformOrigin: '100px 100px', animation: 'compassSweep 1400ms linear infinite' }}>
            <line x1="100" y1="100" x2="100" y2="24" stroke="#E07A3E" strokeWidth="1.5" opacity="0.65" />
            <circle cx="100" cy="24" r="2.5" fill="#E07A3E" opacity="0.8" />
          </g>
        )}

        {/* Threshold markers (when calibrated) */}
        {hasThresholdMarkers && thresholdRange && (
          <g className="opacity-80">
            {/* Floor marker */}
            {thresholdRange.floor_dose && (
              <line
                x1="100"
                y1="25"
                x2="100"
                y2="35"
                stroke="#C4C0B6"
                strokeWidth="2"
              />
            )}
            {/* Sweet spot marker */}
            {thresholdRange.sweet_spot && (
              <line
                x1="100"
                y1="15"
                x2="100"
                y2="30"
                stroke="#E07A3E"
                strokeWidth="3"
              />
            )}
            {/* Ceiling marker */}
            {thresholdRange.ceiling_dose && (
              <line
                x1="100"
                y1="25"
                x2="100"
                y2="35"
                stroke="#B54A4A"
                strokeWidth="2"
              />
            )}
          </g>
        )}

        {/* Needle */}
        <g
          transform={`rotate(${needleRotation}, 100, 100)`}
          className={needleTransition}
          style={{ transformOrigin: '100px 100px' }}
        >
          <g style={needleDriftStyle}>
            <polygon
              points="100,35 95,100 100,110 105,100"
              fill={animationPhase === 'searching' ? '#8A8A8A' : '#F5F2E9'}
              filter="url(#glow)"
              opacity={glowIntensity}
            />
            <circle
              cx="100"
              cy="100"
              r="8"
              fill={animationPhase === 'searching' ? '#8A8A8A' : animationPhase === 'found' ? '#E07A3E' : '#E07A3E'}
            />
          </g>
        </g>

        {/* Center circle */}
        <circle cx="100" cy="100" r="25" fill="#121212" stroke="#8A8A8A" strokeWidth="1" />

        {/* Center text */}
        <text
          x="100"
          y="98"
          textAnchor="middle"
          className="font-mono text-[10px] uppercase tracking-wider fill-ivory"
        >
          {centerText}
        </text>

        {calibrationStatus === 'calibrated' && thresholdRange && (
          <g>
            {thresholdRange.sweet_spot !== null && (
              <text
                x="100"
                y="112"
                textAnchor="middle"
                className="font-mono text-[8px] uppercase tracking-wider fill-orange"
              >
                SWEET SPOT: {thresholdRange.sweet_spot}{unit}
              </text>
            )}
            {thresholdRange.confidence !== null && (
              <text
                x="100"
                y="120"
                textAnchor="middle"
                className="font-mono text-[6px] uppercase tracking-wider fill-bone"
              >
                CONFIDENCE: {thresholdRange.confidence}%
              </text>
            )}
          </g>
        )}

        {/* Threshold zone labels (when calibrated) */}
        {hasThresholdMarkers && thresholdRange && (
          <g className="font-mono text-[7px] uppercase tracking-wider fill-bone">
            {thresholdRange.floor_dose && (
              <text x="35" y="95">LOW</text>
            )}
            {thresholdRange.sweet_spot && (
              <text x="85" y="55" fill="#E07A3E">SWEET</text>
            )}
            {thresholdRange.ceiling_dose && (
              <text x="155" y="95">HIGH</text>
            )}
          </g>
        )}
      </svg>

      {/* Calibration progress indicator */}
      {state === 'calibrating' && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="flex gap-1">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-3 rounded-full transition-settle ${
                  i < progress ? 'bg-orange' : 'bg-elevated'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Confidence badge */}
      {thresholdRange && hasThresholdMarkers && (
        <div className="absolute top-4 right-0">
          <div className={`px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wider ${
            thresholdRange.confidence >= 70
              ? 'bg-status-clear/20 text-status-clear'
              : thresholdRange.confidence >= 50
                ? 'bg-violet/20 text-violet'
                : thresholdRange.confidence >= 30
                  ? 'bg-status-mild/20 text-status-mild'
                  : 'bg-status-elevated/20 text-status-elevated'
          }`}>
            {thresholdRange.confidence}% CONFIDENCE
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes needleDrift {
          0%,
          100% {
            transform: rotate(calc(-1 * var(--drift-amplitude)));
          }
          50% {
            transform: rotate(var(--drift-amplitude));
          }
        }

        @keyframes compassPulse {
          0%,
          100% {
            opacity: 0.82;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes compassSweep {
          from {
            transform: rotate(-180deg);
          }
          to {
            transform: rotate(180deg);
          }
        }
      `}</style>
    </div>
  )
}

// Utility function to create arc path
function describeArc(
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(x, y, radius, endAngle)
  const end = polarToCartesian(x, y, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'

  return [
    'M',
    start.x,
    start.y,
    'A',
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(' ')
}

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  }
}
