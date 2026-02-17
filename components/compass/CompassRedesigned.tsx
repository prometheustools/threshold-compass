'use client'

import { useMemo } from 'react'
import { 
  Activity, 
  Clock, 
  Calendar,
  TrendingUp,
  Target,
  Zap
} from 'lucide-react'
import type { 
  DoseLog, 
  ThresholdRange, 
  CarryoverResult,
  NorthStar,
  Batch
} from '@/types'

// North Star colors
const northStarColors: Record<NorthStar, string> = {
  clarity: '#d4a843',      // Gold
  connection: '#60a5fa',   // Blue  
  creativity: '#a78bfa',   // Violet
  calm: '#34d399',         // Mint
  exploration: '#f472b6',  // Pink
}

interface CompassRedesignedProps {
  doseHistory: DoseLog[]
  thresholdRange: ThresholdRange | null
  carryover: CarryoverResult
  batch: Batch | null
  unit: 'mg' | 'µg'
  isCalibrating: boolean
  discoveryDoseNumber: number | null
  northStar: NorthStar
  referenceTime: number
}

// Format time ago
function formatTimeAgo(dosedAt: string, referenceTime: number): string {
  const hours = Math.floor((referenceTime - new Date(dosedAt).getTime()) / (1000 * 60 * 60))
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return '1d'
  return `${days}d`
}

export default function CompassRedesigned({
  doseHistory,
  thresholdRange,
  carryover,
  batch,
  unit,
  isCalibrating,
  discoveryDoseNumber,
  northStar,
  referenceTime,
}: CompassRedesignedProps) {
  const nsColor = northStarColors[northStar]
  
  const recentDoses = useMemo(() => {
    const cutoff = new Date(referenceTime - 14 * 24 * 60 * 60 * 1000)
    return doseHistory
      .filter(d => new Date(d.dosed_at) >= cutoff)
      .sort((a, b) => new Date(b.dosed_at).getTime() - new Date(a.dosed_at).getTime())
  }, [doseHistory, referenceTime])

  const lastDose = recentDoses[0] || null
  const sweetSpotCount = recentDoses.filter(d => d.threshold_feel === 'sweetspot').length

  // Recommendation
  const recommendation = useMemo(() => {
    if (!thresholdRange?.sweet_spot) return null
    const baseDose = thresholdRange.sweet_spot
    const adjustedDose = baseDose * carryover.effective_multiplier
    const precision = unit === 'µg' ? 1 : 5
    const roundedDose = Math.round(adjustedDose / precision) * precision
    
    return {
      dose: roundedDose,
      original: baseDose,
      adjusted: roundedDose !== baseDose,
      confidence: thresholdRange.confidence >= 70 ? 'high' : thresholdRange.confidence >= 40 ? 'medium' : 'low'
    }
  }, [thresholdRange, carryover, unit])

  // Calculate active dose window for compass
  const activeWindow = useMemo(() => {
    if (!lastDose) return null
    const hoursSince = (referenceTime - new Date(lastDose.dosed_at).getTime()) / (1000 * 60 * 60)
    
    // Rough estimate: 6-8 hour window for active effects
    if (hoursSince < 8) {
      const progress = hoursSince / 8
      return {
        state: hoursSince < 2 ? 'PEAK' : hoursSince < 6 ? 'ACTIVE' : 'FADING',
        progress,
        hoursRemaining: Math.max(0, 8 - hoursSince)
      }
    }
    return null
  }, [lastDose, referenceTime])

  // Empty state
  if (!lastDose) {
    return (
      <div className="text-center py-16">
        <div className="relative w-32 h-32 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full bg-amber/5 animate-pulse-glow" />
          <div className="absolute inset-4 rounded-full bg-surface flex items-center justify-center">
            <Activity className="w-10 h-10 text-ash" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-ivory mb-2">Initialize Instrument</h3>
        <p className="text-bone mb-6 max-w-xs mx-auto">
          Log your first dose to activate the threshold compass
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber/10 text-amber text-sm">
          <Target className="w-4 h-4" />
          <span>10 doses for calibration</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Terminal Status Bar */}
      <div className="flex items-center gap-3 text-xs font-mono text-bone">
        <span className="w-2 h-2 rounded-full bg-status-clear animate-pulse" />
        <span className="text-ivory">{batch?.name || 'No Batch'}</span>
        <span className="text-ash">·</span>
        <span>{isCalibrating ? `Protocol Day ${discoveryDoseNumber || 1}` : 'Calibrated'}</span>
        <span className="text-ash">·</span>
        <span className={carryover.tier === 'clear' ? 'text-status-clear' : carryover.tier === 'mild' ? 'text-status-mild' : 'text-status-elevated'}>
          {carryover.tier.toUpperCase()}
        </span>
      </div>

      {/* The Compass Instrument */}
      <div className="relative">
        {/* Background Glow */}
        <div 
          className="absolute inset-0 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: nsColor }}
        />
        
        <svg viewBox="0 0 280 280" className="w-full max-w-[280px] mx-auto">
          <defs>
            {/* Gradients */}
            <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={nsColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={nsColor} stopOpacity="0.05" />
            </linearGradient>
            
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Outer Ring - Tick Marks */}
          {Array.from({ length: 60 }).map((_, i) => {
            const angle = (i * 6) - 90
            const isMajor = i % 5 === 0
            const r1 = 130
            const r2 = isMajor ? 122 : 126
            const x1 = 140 + r1 * Math.cos(angle * Math.PI / 180)
            const y1 = 140 + r1 * Math.sin(angle * Math.PI / 180)
            const x2 = 140 + r2 * Math.cos(angle * Math.PI / 180)
            const y2 = 140 + r2 * Math.sin(angle * Math.PI / 180)
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isMajor ? nsColor : '#2a3347'}
                strokeWidth={isMajor ? 1.5 : 0.5}
                opacity={isMajor ? 0.6 : 0.3}
              />
            )
          })}
          
          {/* Outer Ring Circle */}
          <circle cx="140" cy="140" r="130" fill="none" stroke="#2a3347" strokeWidth="1" />
          
          {/* Active Window Arc (shows carryover decay) */}
          {activeWindow && (
            <path
              d={describeArc(140, 140, 115, -90, -90 + (activeWindow.progress * 270))}
              fill="none"
              stroke={nsColor}
              strokeWidth="8"
              strokeLinecap="round"
              opacity="0.4"
              filter="url(#glow)"
            />
          )}
          
          {/* Middle Ring */}
          <circle cx="140" cy="140" r="100" fill="none" stroke="url(#ringGradient)" strokeWidth="1" />
          
          {/* Cardinal Labels with Icons */}
          {[
            { label: 'CLARITY', angle: 0, icon: '✦' },
            { label: 'CONNECTION', angle: 90, icon: '◉' },
            { label: 'CALM', angle: 180, icon: '◈' },
            { label: 'CREATE', angle: 270, icon: '◆' },
          ].map((cardinal) => {
            const rad = (cardinal.angle - 90) * Math.PI / 180
            const x = 140 + 118 * Math.cos(rad)
            const y = 140 + 118 * Math.sin(rad)
            const isActive = northStar === cardinal.label.toLowerCase().replace('create', 'creativity').replace('connection', 'connection')
            
            return (
              <g key={cardinal.label}>
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="font-mono text-[7px]"
                  fill={isActive ? nsColor : '#4a5568'}
                  fontWeight={isActive ? '600' : '400'}
                >
                  {cardinal.label}
                </text>
              </g>
            )
          })}
          
          {/* Inner Circle - Status Display */}
          <circle cx="140" cy="140" r="70" fill="#111827" stroke="#2a3347" strokeWidth="1" />
          
          {/* Three-ring Status Display */}
          {/* Outer: Last Dose Amount */}
          <text x="140" y="125" textAnchor="middle" className="font-mono text-[9px]" fill="#8892a4">
            LAST DOSE
          </text>
          <text x="140" y="145" textAnchor="middle" className="font-sans text-[24px] font-bold" fill="#e8eaf0">
            {lastDose.amount}{unit}
          </text>
          
          {/* Middle: Time */}
          <text x="140" y="162" textAnchor="middle" className="font-mono text-[8px]" fill="#4a5568">
            {formatTimeAgo(lastDose.dosed_at, referenceTime)} AGO
          </text>
          
          {/* Inner: State */}
          <text x="140" y="180" textAnchor="middle" className="font-mono text-[8px]" fill={activeWindow ? nsColor : '#34d399'}>
            {activeWindow ? activeWindow.state : 'CLEAR'}
          </text>
          
          {/* Precision Needle */}
          <g transform={`rotate(${activeWindow ? activeWindow.progress * 270 - 135 : -45}, 140, 140)`}>
            <line
              x1="140"
              y1="140"
              x2="140"
              y2="60"
              stroke={nsColor}
              strokeWidth="1.5"
              filter="url(#glow)"
            />
            <polygon
              points="140,55 137,65 143,65"
              fill={nsColor}
            />
          </g>
          
          {/* Center Jewel */}
          <circle cx="140" cy="140" r="6" fill={nsColor} />
          <circle cx="140" cy="140" r="3" fill="#111827" />
        </svg>
      </div>

      {/* 2x2 Data Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Carryover */}
        <div className="rounded-2xl bg-surface p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${
              carryover.tier === 'clear' ? 'bg-status-clear' :
              carryover.tier === 'mild' ? 'bg-status-mild' :
              carryover.tier === 'moderate' ? 'bg-amber' :
              'bg-status-elevated'
            }`} />
            <span className="text-[10px] text-bone uppercase tracking-wider">Carryover</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-ivory">{carryover.percentage}</span>
            <span className="text-sm text-bone">%</span>
          </div>
          {carryover.hours_to_clear && (
            <p className="mt-1 text-[10px] text-ash">
              Clear in {Math.ceil(carryover.hours_to_clear / 24)}d
            </p>
          )}
        </div>

        {/* Last Dose */}
        <div className="rounded-2xl bg-surface p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-3 h-3 text-bone" />
            <span className="text-[10px] text-bone uppercase tracking-wider">Previous</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-ivory">{lastDose.amount}</span>
            <span className="text-sm text-bone">{unit}</span>
          </div>
          <p className="mt-1 text-[10px] text-ash">
            {formatTimeAgo(lastDose.dosed_at, referenceTime)} ago
          </p>
        </div>

        {/* Next Window */}
        <div className="rounded-2xl bg-surface p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-3 h-3 text-bone" />
            <span className="text-[10px] text-bone uppercase tracking-wider">Next Window</span>
          </div>
          {recommendation ? (
            <>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-amber">{recommendation.dose}</span>
                <span className="text-sm text-bone">{unit}</span>
              </div>
              <p className="mt-1 text-[10px] text-ash">
                {recommendation.confidence} confidence
              </p>
            </>
          ) : (
            <p className="text-sm text-ash">Start logging</p>
          )}
        </div>

        {/* Sweet Spots */}
        <div className="rounded-2xl bg-surface p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-3 h-3 text-status-clear" />
            <span className="text-[10px] text-bone uppercase tracking-wider">Sweet Spots</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-status-clear">{sweetSpotCount}</span>
            <span className="text-sm text-bone">/ {recentDoses.length}</span>
          </div>
          <p className="mt-1 text-[10px] text-ash">
            Last 14 days
          </p>
        </div>
      </div>

      {/* Protocol Progress (if calibrating) */}
      {isCalibrating && discoveryDoseNumber && (
        <div className="rounded-2xl bg-surface p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber" />
              <span className="text-sm font-medium text-ivory">Discovery Protocol</span>
            </div>
            <span className="text-xs text-bone">{discoveryDoseNumber} / 10</span>
          </div>
          <div className="h-1.5 bg-elevated rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber rounded-full transition-all duration-500"
              style={{ width: `${(discoveryDoseNumber / 10) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Arc path helper
function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(x, y, radius, endAngle)
  const end = polarToCartesian(x, y, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(' ')
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  }
}
