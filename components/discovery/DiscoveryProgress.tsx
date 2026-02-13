'use client'

import { useMemo } from 'react'
import type { ThresholdRange } from '@/types'
import Card from '@/components/ui/Card'

export type DiscoveryPhase = 'baseline' | 'mapping' | 'refinement'

interface DiscoveryProgressProps {
  currentDose: number // 1-10
  dosesCompleted: number
  preliminaryRange?: ThresholdRange | null
}

const phaseConfig: Record<DiscoveryPhase, { name: string; color: string; bgColor: string; doses: number[] }> = {
  baseline: {
    name: 'Baseline',
    color: '#C4C0B6', // bone
    bgColor: 'bg-bone/20',
    doses: [1, 2, 3, 4],
  },
  mapping: {
    name: 'Mapping',
    color: '#C9A227', // amber/status-mild
    bgColor: 'bg-status-mild/20',
    doses: [5, 6, 7],
  },
  refinement: {
    name: 'Refinement',
    color: '#6B4E8D', // violet
    bgColor: 'bg-violet/20',
    doses: [8, 9, 10],
  },
}

function getPhaseForDose(dose: number): DiscoveryPhase {
  if (dose <= 4) return 'baseline'
  if (dose <= 7) return 'mapping'
  return 'refinement'
}

export default function DiscoveryProgress({
  currentDose,
  dosesCompleted,
  preliminaryRange,
}: DiscoveryProgressProps) {
  const currentPhase = getPhaseForDose(currentDose)
  const phaseInfo = phaseConfig[currentPhase]

  const progressSegments = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => {
      const doseNum = i + 1
      const isCompleted = doseNum <= dosesCompleted
      const isCurrent = doseNum === currentDose
      const phase = getPhaseForDose(doseNum)

      return {
        doseNum,
        isCompleted,
        isCurrent,
        phase,
      }
    })
  }, [currentDose, dosesCompleted])

  return (
    <Card padding="lg" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs tracking-widest uppercase text-bone">
            Discovery Protocol
          </p>
          <p className="mt-2 font-mono text-3xl tracking-wide text-ivory">
            <span className="text-orange">{currentDose}</span>
            <span className="text-bone mx-2">/</span>
            <span className="text-bone">10</span>
          </p>
        </div>
        <div
          className={`px-4 py-2 rounded-card ${phaseInfo.bgColor} border`}
          style={{ borderColor: `${phaseInfo.color}40` }}
        >
          <p
            className="font-mono text-sm tracking-widest uppercase"
            style={{ color: phaseInfo.color }}
          >
            {phaseInfo.name} Phase
          </p>
        </div>
      </div>

      {/* Progress Bar with Segments */}
      <div className="space-y-3">
        <div className="flex gap-1">
          {progressSegments.map(({ doseNum, isCompleted, isCurrent, phase }) => {
            const phaseColors = {
              baseline: '#C4C0B6',
              mapping: '#C9A227',
              refinement: '#6B4E8D',
            }

            return (
              <div
                key={doseNum}
                className={`h-3 flex-1 rounded-full transition-all duration-500 ${
                  isCompleted
                    ? ''
                    : isCurrent
                      ? 'ring-2 ring-orange ring-offset-2 ring-offset-base'
                      : 'bg-elevated'
                }`}
                style={{
                  backgroundColor: isCompleted || isCurrent ? phaseColors[phase] : undefined,
                  opacity: isCompleted ? 1 : isCurrent ? 1 : 0.3,
                }}
                title={`Dose ${doseNum}${isCompleted ? ' (completed)' : isCurrent ? ' (current)' : ''}`}
              />
            )
          })}
        </div>

        {/* Phase Labels */}
        <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider text-ash">
          <span style={{ color: phaseConfig.baseline.color }}>Baseline</span>
          <span style={{ color: phaseConfig.mapping.color }}>Mapping</span>
          <span style={{ color: phaseConfig.refinement.color }}>Refinement</span>
        </div>
      </div>

      {/* Doses Completed Counter */}
      <div className="flex items-center justify-between rounded-button bg-elevated/50 px-4 py-3">
        <span className="font-mono text-xs tracking-widest uppercase text-bone">
          Doses Completed
        </span>
        <span className="font-mono text-lg text-ivory">
          {dosesCompleted} <span className="text-ash">/ 10</span>
        </span>
      </div>

      {/* Preliminary Range (shown after dose 5) */}
      {dosesCompleted >= 5 && preliminaryRange && (
        <div
          className="rounded-card border p-4 space-y-3"
          style={{ borderColor: `${phaseInfo.color}40`, backgroundColor: `${phaseInfo.color}10` }}
        >
          <p
            className="font-mono text-xs tracking-widest uppercase"
            style={{ color: phaseInfo.color }}
          >
            {dosesCompleted >= 10 ? 'Calibrated Range' : 'Preliminary Range'}
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-button bg-elevated/50 p-3 text-center">
              <p className="font-mono text-[10px] tracking-widest uppercase text-bone">Floor</p>
              <p className="mt-1 font-mono text-lg text-ivory">
                {preliminaryRange.floor_dose?.toFixed(2) ?? '—'}
              </p>
            </div>
            <div className="rounded-button bg-elevated/50 p-3 text-center border-2 border-orange/30">
              <p className="font-mono text-[10px] tracking-widest uppercase text-orange">Sweet</p>
              <p className="mt-1 font-mono text-lg text-ivory">
                {preliminaryRange.sweet_spot?.toFixed(2) ?? '—'}
              </p>
            </div>
            <div className="rounded-button bg-elevated/50 p-3 text-center">
              <p className="font-mono text-[10px] tracking-widest uppercase text-bone">Ceiling</p>
              <p className="mt-1 font-mono text-lg text-ivory">
                {preliminaryRange.ceiling_dose?.toFixed(2) ?? '—'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="font-mono text-xs text-bone">
              Confidence: <span className="text-ivory">{preliminaryRange.confidence}%</span>
            </p>
            {dosesCompleted < 10 && (
              <p className="text-xs text-ash">
                Continue to dose 10 for full calibration
              </p>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
