'use client'

import type { DayClassification, STIScores } from '@/types'

interface STISlidersProps {
  value: STIScores
  onChange: (scores: STIScores) => void
  compact?: boolean
  className?: string
}

const sliderConfig = [
  {
    key: 'signal' as const,
    label: 'Signal',
    emoji: '📡',
    description: 'Benefit toward your intention',
    lowLabel: 'No benefit',
    highLabel: 'Strong benefit',
    colorClass: 'text-status-clear',
    bgClass: 'bg-status-clear',
    trackClass: 'accent-status-clear',
  },
  {
    key: 'texture' as const,
    label: 'Texture',
    emoji: '🌊',
    description: 'Perceptual and somatic presence',
    lowLabel: 'Undetectable',
    highLabel: 'Very present',
    colorClass: 'text-status-mild',
    bgClass: 'bg-status-mild',
    trackClass: 'accent-status-mild',
  },
  {
    key: 'interference' as const,
    label: 'Interference',
    emoji: '⚡',
    description: 'Disruption to normal function',
    lowLabel: 'None',
    highLabel: 'Significant',
    colorClass: 'text-status-elevated',
    bgClass: 'bg-status-elevated',
    trackClass: 'accent-status-elevated',
  },
]

function classifyDay(sti: STIScores): DayClassification {
  if (sti.signal >= 6 && sti.interference <= 2) return 'green'
  if (sti.interference >= 5) return 'red'
  if (sti.interference >= 3 || sti.texture >= 6) return 'yellow'
  return 'unclassified'
}

export default function STISliders({ value, onChange, compact = false, className = '' }: STISlidersProps) {
  const classification = classifyDay(value)

  return (
    <div className={`space-y-5 ${className}`}>
      {!compact && (
        <div className="text-center">
          <h3 className="font-mono text-xs uppercase tracking-widest text-bone">STI Scoring</h3>
          <p className="mt-1 text-xs text-ash">Classify the day from signal, texture, and interference.</p>
        </div>
      )}

      {sliderConfig.map((config) => (
        <div key={config.key} className="space-y-2">
          <div className="flex items-center justify-between">
            <label className={`font-mono text-sm ${config.colorClass}`}>
              {config.emoji} {config.label}
            </label>
            <span className={`font-mono text-lg font-semibold ${config.colorClass}`}>{value[config.key]}</span>
          </div>

          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={value[config.key]}
            onChange={(event) => onChange({ ...value, [config.key]: Number(event.target.value) })}
            className={`w-full ${config.trackClass}`}
            aria-label={`${config.label}: ${value[config.key]}`}
          />

          <div className="flex justify-between text-xs text-ash">
            <span>{config.lowLabel}</span>
            <span>{config.highLabel}</span>
          </div>

          {!compact && <p className="text-xs text-bone">{config.description}</p>}
        </div>
      ))}

      <DayClassificationPreview classification={classification} scores={value} />
    </div>
  )
}

interface DayClassificationPreviewProps {
  classification: DayClassification
  scores: STIScores
}

function DayClassificationPreview({ classification, scores }: DayClassificationPreviewProps) {
  const config = {
    green: {
      wrapper: 'border-status-clear/40 bg-status-clear/10',
      pill: 'bg-status-clear text-base',
      title: 'text-status-clear',
      label: 'GREEN DAY',
      description: 'Helpful without meaningful interference.',
    },
    yellow: {
      wrapper: 'border-status-mild/40 bg-status-mild/10',
      pill: 'bg-status-mild text-base',
      title: 'text-status-mild',
      label: 'YELLOW DAY',
      description: 'Noticeable texture or moderate interference.',
    },
    red: {
      wrapper: 'border-status-elevated/40 bg-status-elevated/10',
      pill: 'bg-status-elevated text-base',
      title: 'text-status-elevated',
      label: 'RED DAY',
      description: 'Significant interference. Pull back next dose.',
    },
    unclassified: {
      wrapper: 'border-ember/20 bg-elevated',
      pill: 'bg-ash text-base',
      title: 'text-bone',
      label: 'UNCLASSIFIED',
      description: 'Adjust sliders to classify.',
    },
  }[classification]

  return (
    <div className={`rounded-button border p-4 ${config.wrapper}`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-full font-mono text-xs ${config.pill}`}>
          {classification === 'green' ? '✓' : classification === 'yellow' ? '◐' : classification === 'red' ? '!' : '?'}
        </div>
        <div>
          <p className={`font-mono text-xs uppercase tracking-widest ${config.title}`}>{config.label}</p>
          <p className="text-xs text-bone">{config.description}</p>
        </div>
      </div>

      <div className="mt-3 flex justify-center gap-4 border-t border-ember/20 pt-3 font-mono text-xs text-ash">
        <span>S:{scores.signal}</span>
        <span>T:{scores.texture}</span>
        <span>I:{scores.interference}</span>
      </div>
    </div>
  )
}
