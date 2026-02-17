'use client'

import { useMemo } from 'react'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  Zap,
  Target,
  Calendar
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
  referenceTime: number // Pass Date.now() from parent client component
}

// Get color based on threshold feel
function getFeelColor(feel: ThresholdFeel | null): string {
  switch (feel) {
    case 'sweetspot': return '#4A9B6B' // status-clear (green)
    case 'under': return '#C9A227' // status-mild (amber)
    case 'over': return '#B54A4A' // status-elevated (red)
    case 'nothing': return '#8A8A8A' // ash (gray)
    default: return '#8A8A8A'
  }
}

// Get feel label
function getFeelLabel(feel: ThresholdFeel | null): string {
  switch (feel) {
    case 'sweetspot': return 'Sweet Spot'
    case 'under': return 'Under'
    case 'over': return 'Over'
    case 'nothing': return 'No Effect'
    default: return 'Unknown'
  }
}

// Calculate days since last dose (given reference time)
function getDaysSince(dosedAt: string, referenceTime: number): number {
  const hours = (referenceTime - new Date(dosedAt).getTime()) / (1000 * 60 * 60)
  return Math.floor(hours / 24)
}

// Calculate hours since last dose (given reference time)
function getHoursSince(dosedAt: string, referenceTime: number): number {
  return Math.floor((referenceTime - new Date(dosedAt).getTime()) / (1000 * 60 * 60))
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
  // Get recent doses (last 14 days)
  const recentDoses = useMemo(() => {
    const cutoff = new Date(referenceTime - 14 * 24 * 60 * 60 * 1000)
    return doseHistory
      .filter(d => new Date(d.dosed_at) >= cutoff)
      .sort((a, b) => new Date(b.dosed_at).getTime() - new Date(a.dosed_at).getTime())
  }, [doseHistory, referenceTime])

  // Get last dose
  const lastDose = recentDoses[0] || null

  // Calculate next recommended dose
  const recommendation = useMemo(() => {
    if (!thresholdRange?.sweet_spot) return null

    const baseDose = thresholdRange.sweet_spot
    const adjustedDose = baseDose * carryover.effective_multiplier

    // Round to reasonable precision
    const precision = unit === 'µg' ? 1 : 5
    const roundedDose = Math.round(adjustedDose / precision) * precision

    // Determine confidence
    let confidence: 'high' | 'medium' | 'low' = 'medium'
    if (thresholdRange.confidence >= 70 && carryover.percentage <= 15) {
      confidence = 'high'
    } else if (thresholdRange.confidence < 40 || carryover.percentage > 40) {
      confidence = 'low'
    }

    return {
      baseDose,
      adjustedDose: roundedDose,
      confidence,
      reason: carryover.percentage > 15 
        ? `Adjusted for ${carryover.percentage}% carryover`
        : 'Full sensitivity window'
    }
  }, [thresholdRange, carryover, unit])

  // Analyze pattern
  const pattern = useMemo(() => {
    if (recentDoses.length < 3) return null

    const feels = recentDoses.slice(0, 5).map(d => d.threshold_feel).filter(Boolean)
    const sweetSpots = feels.filter(f => f === 'sweetspot').length
    const overs = feels.filter(f => f === 'over').length
    const unders = feels.filter(f => f === 'under').length

    if (overs >= 2) {
      return { type: 'caution', message: 'Recent doses trending high', icon: AlertTriangle }
    }
    if (sweetSpots >= 2) {
      return { type: 'good', message: 'Consistent sweet spots', icon: CheckCircle2 }
    }
    if (unders >= 2) {
      return { type: 'info', message: 'Consider slightly higher dose', icon: TrendingUp }
    }
    return null
  }, [recentDoses])

  // Calculate timeline for visualization
  const timelineData = useMemo(() => {
    const days = 14
    const data = []
    const refDate = new Date(referenceTime)
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(refDate.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      
      const dosesOnDay = recentDoses.filter(d => 
        d.dosed_at.startsWith(dateStr)
      )
      
      data.push({
        day: i,
        date: dateStr,
        doses: dosesOnDay,
        hasDose: dosesOnDay.length > 0,
      })
    }
    
    return data
  }, [recentDoses, referenceTime])

  // Render empty state
  if (doseHistory.length === 0) {
    return (
      <div className="rounded-card border border-ember/30 bg-surface p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-elevated flex items-center justify-center mx-auto mb-4">
          <Activity className="w-8 h-8 text-ash" />
        </div>
        <h3 className="font-sans text-lg text-ivory mb-2">No Data Yet</h3>
        <p className="text-sm text-bone mb-4">
          Log your first dose to activate the compass. Your threshold range will emerge from your data.
        </p>
        <div className="flex items-center justify-center gap-2 text-xs text-ash">
          <Calendar className="w-4 h-4" />
          <span>10 doses needed for calibration</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Main Status Card */}
      <div className="rounded-card border border-ember/30 bg-surface p-5">
        {/* Header with last dose info */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="font-mono text-xs tracking-widest uppercase text-bone mb-1">
              Last Dose
            </p>
            {lastDose ? (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-ivory">
                  {lastDose.amount}
                </span>
                <span className="text-lg text-bone">{unit}</span>
              </div>
            ) : (
              <span className="text-lg text-ash">No recent doses</span>
            )}
          </div>
          
          {lastDose && (
            <div className="text-right">
              <div className="flex items-center gap-1.5 text-bone">
                <Clock className="w-4 h-4" />
                <span className="text-sm">
                  {getDaysSince(lastDose.dosed_at, referenceTime) === 0 
                    ? `${getHoursSince(lastDose.dosed_at, referenceTime)}h ago`
                    : `${getDaysSince(lastDose.dosed_at, referenceTime)}d ago`
                  }
                </span>
              </div>
              {lastDose.threshold_feel && (
                <div 
                  className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium"
                  style={{ 
                    backgroundColor: `${getFeelColor(lastDose.threshold_feel)}20`,
                    color: getFeelColor(lastDose.threshold_feel)
                  }}
                >
                  {getFeelLabel(lastDose.threshold_feel)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Carryover Status */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs tracking-widest uppercase text-bone">
              System Status
            </span>
            <span className={`text-xs font-medium ${
              carryover.tier === 'clear' ? 'text-status-clear' :
              carryover.tier === 'mild' ? 'text-status-mild' :
              carryover.tier === 'moderate' ? 'text-orange' :
              'text-status-elevated'
            }`}>
              {carryover.tier === 'clear' ? 'Clear' :
               carryover.tier === 'mild' ? 'Mild Carryover' :
               carryover.tier === 'moderate' ? 'Moderate' :
               'Elevated'} — {carryover.percentage}%
            </span>
          </div>
          
          {/* Carryover Bar */}
          <div className="h-2 bg-elevated rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${
                carryover.tier === 'clear' ? 'bg-status-clear' :
                carryover.tier === 'mild' ? 'bg-status-mild' :
                carryover.tier === 'moderate' ? 'bg-orange' :
                'bg-status-elevated'
              }`}
              style={{ width: `${Math.min(carryover.percentage, 100)}%` }}
            />
          </div>
          
          {carryover.hours_to_clear && (
            <p className="mt-2 text-xs text-ash">
              Full sensitivity in ~{Math.ceil(carryover.hours_to_clear / 24)} days
            </p>
          )}
        </div>

        {/* Timeline Visualization */}
        <div>
          <p className="font-mono text-xs tracking-widest uppercase text-bone mb-3">
            14-Day Timeline
          </p>
          <div className="flex gap-1">
            {timelineData.map((day, idx) => (
              <div 
                key={day.date}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <div 
                  className={`w-full aspect-square rounded-sm transition-all ${
                    day.hasDose 
                      ? 'bg-orange' 
                      : idx >= timelineData.length - 3 
                        ? 'bg-elevated/50' 
                        : 'bg-elevated/30'
                  }`}
                  style={{
                    opacity: day.hasDose ? 1 : 0.5,
                  }}
                  title={day.hasDose 
                    ? `${day.doses.length} dose(s) on ${day.date}`
                    : day.date
                  }
                />
                {idx % 3 === 0 && (
                  <span className="text-[8px] text-ash">
                    {new Date(day.date).getDate()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Threshold Range Visualization (when calibrated) */}
      {thresholdRange?.sweet_spot && (
        <div className="rounded-card border border-ember/30 bg-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-mono text-xs tracking-widest uppercase text-bone">
              Your Threshold Range
            </p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              thresholdRange.confidence >= 70 
                ? 'bg-status-clear/20 text-status-clear' :
              thresholdRange.confidence >= 40
                ? 'bg-status-mild/20 text-status-mild'
                : 'bg-status-elevated/20 text-status-elevated'
            }`}>
              {thresholdRange.confidence}% confidence
            </span>
          </div>

          {/* Range Bar */}
          <div className="relative h-12 bg-elevated rounded-lg mb-4 overflow-hidden">
            {/* Floor marker */}
            {thresholdRange.floor_dose && (
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-status-clear"
                style={{ left: '10%' }}
              >
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-status-clear whitespace-nowrap">
                  Floor {thresholdRange.floor_dose}{unit}
                </span>
              </div>
            )}
            
            {/* Sweet spot zone */}
            {thresholdRange.sweet_spot && (
              <div 
                className="absolute top-0 bottom-0 bg-orange/20 border-x-2 border-orange"
                style={{ 
                  left: '40%', 
                  width: '20%',
                }}
              >
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-orange font-medium whitespace-nowrap">
                  Sweet Spot {thresholdRange.sweet_spot}{unit}
                </span>
              </div>
            )}
            
            {/* Ceiling marker */}
            {thresholdRange.ceiling_dose && (
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-status-elevated"
                style={{ left: '90%' }}
              >
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-status-elevated whitespace-nowrap">
                  Ceiling {thresholdRange.ceiling_dose}{unit}
                </span>
              </div>
            )}

            {/* Recent doses plotted */}
            {recentDoses.slice(0, 5).map((dose, idx) => {
              if (!thresholdRange.floor_dose || !thresholdRange.ceiling_dose) return null
              const range = thresholdRange.ceiling_dose - thresholdRange.floor_dose
              const normalizedPos = (dose.amount - thresholdRange.floor_dose) / range
              const position = 10 + Math.max(0, Math.min(80, normalizedPos * 80))
              
              return (
                <div
                  key={dose.id}
                  className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-surface"
                  style={{ 
                    left: `${position}%`,
                    backgroundColor: getFeelColor(dose.threshold_feel),
                    zIndex: 5 - idx,
                  }}
                  title={`${dose.amount}${unit} - ${getFeelLabel(dose.threshold_feel)}`}
                />
              )
            })}
          </div>

          {/* Pattern Alert */}
          {pattern && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              pattern.type === 'caution' ? 'bg-status-elevated/10 border border-status-elevated/30' :
              pattern.type === 'good' ? 'bg-status-clear/10 border border-status-clear/30' :
              'bg-status-mild/10 border border-status-mild/30'
            }`}>
              <pattern.icon className={`w-4 h-4 ${
                pattern.type === 'caution' ? 'text-status-elevated' :
                pattern.type === 'good' ? 'text-status-clear' :
                'text-status-mild'
              }`} />
              <span className="text-sm">{pattern.message}</span>
            </div>
          )}
        </div>
      )}

      {/* Recommendation Card */}
      {recommendation && (
        <div className="rounded-card border-2 border-orange/40 bg-orange/5 p-5">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-orange/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-orange" />
            </div>
            <div className="flex-1">
              <p className="font-mono text-xs tracking-widest uppercase text-orange mb-1">
                Recommended Next Dose
              </p>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-bold text-ivory">
                  {recommendation.adjustedDose}
                </span>
                <span className="text-lg text-bone">{unit}</span>
                {recommendation.adjustedDose !== recommendation.baseDose && (
                  <span className="text-sm text-ash line-through">
                    {recommendation.baseDose}{unit}
                  </span>
                )}
              </div>
              <p className="text-sm text-bone">
                {recommendation.reason}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                  recommendation.confidence === 'high' 
                    ? 'bg-status-clear/20 text-status-clear' :
                  recommendation.confidence === 'medium'
                    ? 'bg-status-mild/20 text-status-mild'
                    : 'bg-status-elevated/20 text-status-elevated'
                }`}>
                  {recommendation.confidence === 'high' && <CheckCircle2 className="w-3 h-3" />}
                  {recommendation.confidence === 'medium' && <Activity className="w-3 h-3" />}
                  {recommendation.confidence === 'low' && <AlertTriangle className="w-3 h-3" />}
                  {recommendation.confidence} confidence
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calibrating State */}
      {isCalibrating && discoveryDoseNumber && (
        <div className="rounded-card border border-status-mild/30 bg-status-mild/5 p-5">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-status-mild/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-status-mild" />
            </div>
            <div>
              <p className="font-mono text-xs tracking-widest uppercase text-status-mild mb-1">
                Discovery Protocol
              </p>
              <p className="text-lg font-semibold text-ivory mb-1">
                Dose {discoveryDoseNumber} of 10
              </p>
              <p className="text-sm text-bone">
                Consistent logging sharpens your threshold range. Log effects 4-6 hours post-dose.
              </p>
              
              {/* Progress dots */}
              <div className="mt-3 flex gap-1">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-all ${
                      i < (discoveryDoseNumber - 1) 
                        ? 'bg-status-mild' 
                        : i === discoveryDoseNumber - 1
                          ? 'bg-status-mild animate-pulse'
                          : 'bg-elevated'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dose Count Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-card border border-ember/20 bg-surface p-3 text-center">
          <p className="font-mono text-2xl font-bold text-ivory">{doseHistory.length}</p>
          <p className="text-[10px] text-ash uppercase tracking-wider">Total Doses</p>
        </div>
        <div className="rounded-card border border-ember/20 bg-surface p-3 text-center">
          <p className="font-mono text-2xl font-bold text-ivory">{recentDoses.length}</p>
          <p className="text-[10px] text-ash uppercase tracking-wider">Last 14 Days</p>
        </div>
        <div className="rounded-card border border-ember/20 bg-surface p-3 text-center">
          <p className="font-mono text-2xl font-bold text-orange">
            {recentDoses.filter(d => d.threshold_feel === 'sweetspot').length}
          </p>
          <p className="text-[10px] text-ash uppercase tracking-wider">Sweet Spots</p>
        </div>
      </div>
    </div>
  )
}
