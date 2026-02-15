'use client'

import { useMemo, useEffect, useId, useState, type CSSProperties } from 'react'
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
  mild: 'MINIMAL',
  moderate: 'MODERATE',
  elevated: 'EXCESS',
}

const northStarShortLabels: Record<NorthStar, string> = {
  clarity: 'CLARITY',
  connection: 'CONNECT',
  creativity: 'CREATE',
  calm: 'CALM',
  exploration: 'EXPLORE',
}

const SETTLE_DURATION_MS = 800

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
  const titleId = useId()
  const descId = useId()
  const [animationPhase, setAnimationPhase] = useState<'searching' | 'found' | 'settled'>('searching')

  useEffect(() => {
    const resetTimeout = setTimeout(() => setAnimationPhase('searching'), 0)
    const searchTimeout = setTimeout(() => setAnimationPhase('found'), SETTLE_DURATION_MS)
    const settleTimeout = setTimeout(() => setAnimationPhase('settled'), SETTLE_DURATION_MS * 2)
    return () => {
      clearTimeout(resetTimeout)
      clearTimeout(searchTimeout)
      clearTimeout(settleTimeout)
    }
  }, [state, northStar, carryoverTier])

  const centerText = useMemo(() => {
    const normalizedProgress = Math.min(10, Math.max(progress || 1, 1))

    switch (state) {
      case 'dormant':
        return 'READY'
      case 'calibrating':
        return `DOSE ${normalizedProgress}/10`
      case 'calibrated_rest':
        return tierLabels[carryoverTier]
      case 'calibrated_active':
        if (activeDoseHours !== null && activeDoseHours !== undefined) {
          const hours = Math.floor(activeDoseHours)
          return `ACTIVE ${hours}H`
        }
        return 'ACTIVE'
      case 'elevated_carryover':
        return `REST ${tierLabels[carryoverTier]}`
      default:
        return ''
    }
  }, [state, progress, carryoverTier, activeDoseHours])

  const stateHint = useMemo(() => {
    if (state === 'dormant' && calibrationStatus === undefined) {
      return {
        title: 'No Batch Active',
        description: 'Select a batch to wake the compass and start discovering your threshold.',
      }
    }

    if (state === 'dormant') {
      return {
        title: 'Awaiting First Signal',
        description: 'Log your first dose to begin calibration and unlock your personalized range.',
      }
    }

    if (state === 'calibrating') {
      const normalizedProgress = Math.min(10, Math.max(progress || 1, 1))
      return {
        title: 'Calibration In Motion',
        description: `Dose ${normalizedProgress} of 10 is next. Keep timing and conditions steady for clean signal.`,
      }
    }

    return null
  }, [state, calibrationStatus, progress])

  const baseRotation = useMemo((): number => {
    if (state === 'dormant') return northStarDegrees[northStar]
    if (state === 'calibrating') return -90
    if (state === 'elevated_carryover') return -45
    if (
      thresholdRange?.sweet_spot !== null &&
      thresholdRange?.sweet_spot !== undefined &&
      thresholdRange.floor_dose !== null &&
      thresholdRange.floor_dose !== undefined &&
      thresholdRange.ceiling_dose !== null &&
      thresholdRange.ceiling_dose !== undefined
    ) {
      const range = thresholdRange.ceiling_dose - thresholdRange.floor_dose
      if (range > 0) {
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
        animation: `needleDrift ${SETTLE_DURATION_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1.0) infinite alternate`,
        ['--drift-amplitude' as string]: `${driftAmplitudeDegrees}deg`,
      }
    : {
        transformOrigin: '100px 100px',
      }) as CSSProperties

  const glowIntensity = animationPhase === 'found' ? 1 : animationPhase === 'searching' ? 0.3 : 0.8

  const hasThresholdMarkers = state === 'calibrated_rest' || state === 'calibrated_active'
  const showSweep = animationPhase === 'searching'
  const ringStyle = animationPhase === 'searching'
    ? ({ animation: `compassPulse ${SETTLE_DURATION_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1.0) 1` } as CSSProperties)
    : undefined

  return (
    <div className="relative mx-auto flex w-full max-w-sm flex-col gap-4">
      <svg
        viewBox="0 0 200 200"
        className="aspect-square h-full w-full"
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
      >
        <title id={titleId}>Threshold Compass</title>
        <desc id={descId}>{`Compass state ${state}, carryover tier ${carryoverTier}, calibration ${calibrationStatus ?? 'not started'}.`}</desc>

        <defs>
          {/* Gradient for dormant state */}
          <linearGradient id="gradient-dormant" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8A8A8A" />
            <stop offset="100%" stopColor="#8A8A8A" />
          </linearGradient>

          {/* Gradient for calibrating state - orange to ember */}
          <linearGradient id="gradient-calibrating" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E07A3E" />
            <stop offset="100%" stopColor="#8B4D2C" />
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
          const labelMarker = polarToCartesian(100, 100, 104, northStarDegrees[key])
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
                x={labelMarker.x}
                y={labelMarker.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className={`font-mono text-[5px] uppercase tracking-wide ${selected ? 'fill-orange' : 'fill-bone'}`}
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
          className="transition-settle"
          style={ringStyle}
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
          <g
            style={{
              transformOrigin: '100px 100px',
              animation: `compassSweep ${SETTLE_DURATION_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1.0) 1 forwards`,
            }}
          >
            <line x1="100" y1="100" x2="100" y2="24" stroke="#E07A3E" strokeWidth="1.5" opacity="0.65" />
            <circle cx="100" cy="24" r="2.5" fill="#E07A3E" opacity="0.8" />
          </g>
        )}

        {/* Threshold markers (when calibrated) */}
        {hasThresholdMarkers && thresholdRange && (
          <g className="opacity-80">
            {/* Floor marker */}
            {thresholdRange.floor_dose !== null && (
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
            {thresholdRange.sweet_spot !== null && (
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
            {thresholdRange.ceiling_dose !== null && (
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
          className="transition-settle"
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
                SWEET SPOT: {formatDoseValue(thresholdRange.sweet_spot, unit)}{unit}
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
            {thresholdRange.floor_dose !== null && (
              <text x="35" y="95">FLOOR</text>
            )}
            {thresholdRange.sweet_spot !== null && (
              <text x="85" y="55" fill="#E07A3E">SWEET SPOT</text>
            )}
            {thresholdRange.ceiling_dose !== null && (
              <text x="155" y="95">CEILING</text>
            )}
          </g>
        )}
      </svg>

      {stateHint && (
        <div className="rounded-button border border-ember/30 bg-elevated/60 px-4 py-3 transition-settle">
          <p className="font-mono text-[11px] uppercase tracking-widest text-orange">{stateHint.title}</p>
          <p className="mt-1 text-sm text-bone">{stateHint.description}</p>
        </div>
      )}

      {hasThresholdMarkers && thresholdRange && (
        <div className="flex justify-center gap-4 mt-2 px-4">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-status-clear" />
            <span className="font-mono text-[10px] text-bone uppercase tracking-wider">Floor</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-orange" />
            <span className="font-mono text-[10px] text-bone uppercase tracking-wider">Sweet Spot</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-status-elevated" />
            <span className="font-mono text-[10px] text-bone uppercase tracking-wider">Ceiling</span>
          </div>
        </div>
      )}

      {/* Calibration progress indicator */}
      {state === 'calibrating' && (
        <div className="mx-auto">
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
        <div className="absolute right-0 top-4">
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
          0% {
            transform: rotate(calc(-1 * var(--drift-amplitude)));
          }
          100% {
            transform: rotate(var(--drift-amplitude));
          }
        }

        @keyframes compassPulse {
          0% {
            opacity: 0.75;
          }
          100% {
            opacity: 1;
          }
        }

        @keyframes compassSweep {
          from {
            transform: rotate(-180deg);
            opacity: 0.25;
          }
          to {
            transform: rotate(0deg);
            opacity: 0.85;
          }
        }
      `}</style>
    </div>
  )
}

function formatDoseValue(value: number, unit: 'g' | 'µg'): string {
  if (unit === 'µg') {
    return Number.isInteger(value) ? `${value}` : value.toFixed(2)
  }

  return value.toFixed(2)
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
