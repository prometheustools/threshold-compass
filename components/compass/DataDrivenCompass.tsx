'use client'

import { useMemo } from 'react'
import { 
  Activity, 
  AlertTriangle, 
  Clock, 
  TrendingUp,
  Zap,
  Target
} from 'lucide-react'
import type { 
  DoseLog, 
  ThresholdRange, 
  CarryoverResult,
  ThresholdFeel 
} from '@/types'

interface DataDrivenCompassProps {
  doseHistory: DoseLog[]
  thresholdRange: ThresholdRange | null
  carryover: CarryoverResult
  unit: 'mg' | 'µg'
  isCalibrating: boolean
  discoveryDoseNumber: number | null
  referenceTime: number
}

// Get feel color
function getFeelColor(feel: ThresholdFeel | null): string {
  switch (feel) {
    case 'sweetspot': return '#4A9B6B'
    case 'under': return '#C9A227'
    case 'over': return '#B54A4A'
    default: return '#8A8A8A'
  }
}

// Get feel label (shortened)
function getFeelLabel(feel: ThresholdFeel | null): string {
  switch (feel) {
    case 'sweetspot': return 'Sweet Spot'
    case 'under': return 'Under'
    case 'over': return 'Over'
    case 'nothing': return 'None'
    default: return '—'
  }
}

// Format time ago
function formatTimeAgo(dosedAt: string, referenceTime: number): string {
  const hours = Math.floor((referenceTime - new Date(dosedAt).getTime()) / (1000 * 60 * 60))
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

export default function DataDrivenCompass({
  doseHistory,
  thresholdRange,
  carryover,
  unit,
  isCalibrating,
  discoveryDoseNumber,
  referenceTime,
}: DataDrivenCompassProps) {
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

  // Pattern detection
  const pattern = useMemo(() => {
    if (recentDoses.length < 2) return null
    const recent = recentDoses.slice(0, 4).map(d => d.threshold_feel)
    const overs = recent.filter(f => f === 'over').length
    const unders = recent.filter(f => f === 'under').length
    
    if (overs >= 2) return { type: 'caution', text: 'Recent doses trending high' }
    if (unders >= 2) return { type: 'tip', text: 'Consider slightly higher dose' }
    return null
  }, [recentDoses])

  // Empty state
  if (!lastDose) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 rounded-full bg-elevated/50 flex items-center justify-center mx-auto mb-6">
          <Activity className="w-10 h-10 text-ash" />
        </div>
        <h3 className="text-xl font-semibold text-ivory mb-2">Start Your Journey</h3>
        <p className="text-bone mb-6 max-w-xs mx-auto">
          Log your first dose to activate your personal compass
        </p>
        <div className="flex items-center justify-center gap-2 text-xs text-ash">
          <span className="w-2 h-2 rounded-full bg-orange" />
          <span>10 doses to calibrate your threshold</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Main Status - Hero Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface to-elevated p-6">
        {/* Background accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        
        <div className="relative">
          {/* Top row: Last dose */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-xs text-ash uppercase tracking-wider mb-1">Last Dose</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-ivory tracking-tight">
                  {lastDose.amount}
                </span>
                <span className="text-xl text-bone">{unit}</span>
              </div>
            </div>
            
            <div className="text-right">
              <div className="flex items-center gap-1.5 text-bone mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm">
                  {formatTimeAgo(lastDose.dosed_at, referenceTime)}
                </span>
              </div>
              {lastDose.threshold_feel && (
                <span 
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ 
                    backgroundColor: `${getFeelColor(lastDose.threshold_feel)}15`,
                    color: getFeelColor(lastDose.threshold_feel)
                  }}
                >
                  {getFeelLabel(lastDose.threshold_feel)}
                </span>
              )}
            </div>
          </div>

          {/* Carryover Status */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-ash uppercase tracking-wider">System Clearance</span>
              <span className={`text-sm font-medium ${
                carryover.tier === 'clear' ? 'text-status-clear' :
                carryover.tier === 'mild' ? 'text-status-mild' :
                carryover.tier === 'moderate' ? 'text-orange' :
                'text-status-elevated'
              }`}>
                {carryover.percentage}%
              </span>
            </div>
            <div className="h-1.5 bg-base rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-700 ${
                  carryover.tier === 'clear' ? 'bg-status-clear' :
                  carryover.tier === 'mild' ? 'bg-status-mild' :
                  carryover.tier === 'moderate' ? 'bg-orange' :
                  'bg-status-elevated'
                }`}
                style={{ width: `${Math.min(carryover.percentage, 100)}%` }}
              />
            </div>
            {carryover.hours_to_clear ? (
              <p className="mt-2 text-xs text-ash">
                Full sensitivity in {Math.ceil(carryover.hours_to_clear / 24)} days
              </p>
            ) : (
              <p className="mt-2 text-xs text-status-clear">
                System clear — optimal dosing window
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-ivory">{doseHistory.length}</p>
          <p className="text-xs text-ash uppercase tracking-wider mt-0.5">Total</p>
        </div>
        <div className="text-center border-x border-ember/10">
          <p className="text-2xl font-bold text-ivory">{recentDoses.length}</p>
          <p className="text-xs text-ash uppercase tracking-wider mt-0.5">14 Days</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-orange">{sweetSpotCount}</p>
          <p className="text-xs text-ash uppercase tracking-wider mt-0.5">Sweet Spots</p>
        </div>
      </div>

      {/* Recommendation - Primary Action */}
      {recommendation && (
        <div className="rounded-2xl bg-orange/10 border border-orange/20 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-orange/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-orange" />
            </div>
            <div>
              <p className="text-xs text-orange uppercase tracking-wider">Recommended</p>
              <p className="text-xs text-ash">Next dose based on your data</p>
            </div>
          </div>
          
          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-5xl font-bold text-ivory tracking-tight">
              {recommendation.dose}
            </span>
            <span className="text-xl text-bone">{unit}</span>
            {recommendation.adjusted && (
              <span className="text-sm text-ash line-through">
                {recommendation.original}{unit}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className={`text-xs px-2 py-1 rounded-full ${
              recommendation.confidence === 'high' 
                ? 'bg-status-clear/20 text-status-clear' :
              recommendation.confidence === 'medium'
                ? 'bg-status-mild/20 text-status-mild'
                : 'bg-ash/20 text-ash'
            }`}>
              {recommendation.confidence} confidence
            </span>
            
            {pattern && (
              <span className={`text-xs flex items-center gap-1 ${
                pattern.type === 'caution' ? 'text-status-elevated' : 'text-status-mild'
              }`}>
                {pattern.type === 'caution' ? <AlertTriangle className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                {pattern.text}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Threshold Range - Visual */}
      {thresholdRange?.sweet_spot && (
        <div className="rounded-2xl bg-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-ash uppercase tracking-wider">Your Range</p>
            <span className={`text-xs ${
              thresholdRange.confidence >= 70 ? 'text-status-clear' :
              thresholdRange.confidence >= 40 ? 'text-status-mild' :
              'text-ash'
            }`}>
              {thresholdRange.confidence}% confidence
            </span>
          </div>

          {/* Visual Range Bar */}
          <div className="relative h-16 bg-elevated rounded-xl mb-4">
            {/* Zone markers */}
            {thresholdRange.floor_dose && (
              <div className="absolute left-[10%] top-0 bottom-0 flex flex-col justify-end pb-2">
                <span className="text-[10px] text-ash">{thresholdRange.floor_dose}</span>
                <span className="text-[8px] text-ash/60 uppercase">Floor</span>
              </div>
            )}
            
            {/* Sweet spot zone */}
            {thresholdRange.sweet_spot && (
              <div 
                className="absolute top-2 bottom-2 bg-orange/20 rounded-lg border border-orange/30"
                style={{ left: '35%', width: '30%' }}
              >
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-center">
                  <span className="text-xs font-medium text-orange">{thresholdRange.sweet_spot}{unit}</span>
                </div>
              </div>
            )}
            
            {thresholdRange.ceiling_dose && (
              <div className="absolute right-[10%] top-0 bottom-0 flex flex-col justify-end pb-2 text-right">
                <span className="text-[10px] text-ash">{thresholdRange.ceiling_dose}</span>
                <span className="text-[8px] text-ash/60 uppercase">Ceiling</span>
              </div>
            )}

            {/* Recent doses as dots */}
            {recentDoses.slice(0, 4).map((dose, idx) => {
              if (!thresholdRange.floor_dose || !thresholdRange.ceiling_dose) return null
              const range = thresholdRange.ceiling_dose - thresholdRange.floor_dose
              const normalizedPos = (dose.amount - thresholdRange.floor_dose) / range
              const position = 10 + Math.max(0, Math.min(80, normalizedPos * 80))
              
              return (
                <div
                  key={dose.id}
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-surface shadow-lg"
                  style={{ 
                    left: `${position}%`,
                    backgroundColor: getFeelColor(dose.threshold_feel),
                    zIndex: 10 - idx,
                  }}
                  title={`${dose.amount}${unit}`}
                />
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 text-[10px] text-ash">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-status-clear" />
              <span>Sweet Spot</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-status-mild" />
              <span>Under</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-status-elevated" />
              <span>Over</span>
            </div>
          </div>
        </div>
      )}

      {/* Discovery Progress */}
      {isCalibrating && discoveryDoseNumber && (
        <div className="rounded-2xl bg-elevated/50 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-status-mild/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-status-mild" />
            </div>
            <div>
              <p className="text-xs text-ash uppercase tracking-wider">Discovery Protocol</p>
              <p className="text-lg font-semibold text-ivory">Dose {discoveryDoseNumber} of 10</p>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="h-2 bg-base rounded-full overflow-hidden">
            <div 
              className="h-full bg-status-mild rounded-full transition-all duration-500"
              style={{ width: `${(discoveryDoseNumber / 10) * 100}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-ash">
            Log effects 4-6 hours post-dose for accurate calibration
          </p>
        </div>
      )}

      {/* Recent Activity Preview */}
      {recentDoses.length > 1 && (
        <div>
          <p className="text-xs text-ash uppercase tracking-wider mb-3">Recent Activity</p>
          <div className="space-y-2">
            {recentDoses.slice(1, 4).map((dose) => (
              <div 
                key={dose.id} 
                className="flex items-center justify-between py-2 border-b border-ember/10 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getFeelColor(dose.threshold_feel) }}
                  />
                  <span className="text-sm text-ivory">{dose.amount}{unit}</span>
                </div>
                <span className="text-xs text-ash">
                  {formatTimeAgo(dose.dosed_at, referenceTime)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
