'use client'

import { useMemo } from 'react'

interface ConfidenceBadgeProps {
  confidence: number // 0-100
  showQualifier?: boolean
  size?: 'sm' | 'md' | 'lg'
}

interface ConfidenceInfo {
  qualifier: string
  color: string
  bgColor: string
  borderColor: string
}

// PRD verbal qualifiers from Section 5.1
const getConfidenceInfo = (confidence: number): ConfidenceInfo => {
  if (confidence < 30) {
    return {
      qualifier: 'Need more data.',
      color: 'text-status-elevated',
      bgColor: 'bg-status-elevated/10',
      borderColor: 'border-status-elevated/30',
    }
  }
  if (confidence < 50) {
    return {
      qualifier: `Preliminary range. Keep logging.`,
      color: 'text-status-mild',
      bgColor: 'bg-status-mild/10',
      borderColor: 'border-status-mild/30',
    }
  }
  if (confidence < 70) {
    return {
      qualifier: 'Working range. Refine with more doses.',
      color: 'text-violet',
      bgColor: 'bg-violet/10',
      borderColor: 'border-violet/30',
    }
  }
  return {
    qualifier: 'Calibrated range.',
    color: 'text-status-clear',
    bgColor: 'bg-status-clear/10',
    borderColor: 'border-status-clear/30',
  }
}

const sizeClasses = {
  sm: {
    container: 'px-2 py-1',
    percentage: 'text-xs',
    qualifier: 'text-[10px]',
  },
  md: {
    container: 'px-3 py-1.5',
    percentage: 'text-sm',
    qualifier: 'text-xs',
  },
  lg: {
    container: 'px-4 py-2',
    percentage: 'text-base',
    qualifier: 'text-sm',
  },
}

export default function ConfidenceBadge({
  confidence,
  showQualifier = true,
  size = 'md',
}: ConfidenceBadgeProps) {
  const info = useMemo(() => getConfidenceInfo(confidence), [confidence])
  const sizes = sizeClasses[size]

  return (
    <div
      className={`inline-flex flex-col rounded-card border ${info.bgColor} ${info.borderColor} ${sizes.container}`}
    >
      <div className="flex items-center gap-2">
        <span className={`font-mono font-semibold tracking-wider ${info.color} ${sizes.percentage}`}>
          {confidence}%
        </span>
        <span className={`font-mono uppercase tracking-wider text-ash ${sizes.qualifier}`}>
          Confidence
        </span>
      </div>
      {showQualifier && (
        <p className={`mt-1 ${info.color} ${sizes.qualifier}`}>
          {info.qualifier}
        </p>
      )}
    </div>
  )
}

// Simple badge without qualifier (for compact displays)
export function ConfidenceIndicator({ confidence }: { confidence: number }) {
  const info = useMemo(() => getConfidenceInfo(confidence), [confidence])

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-xs ${info.bgColor} ${info.color}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {confidence}%
    </span>
  )
}

// Bar visualization
export function ConfidenceBar({ confidence }: { confidence: number }) {
  const info = useMemo(() => getConfidenceInfo(confidence), [confidence])

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs tracking-widest uppercase text-bone">
          Confidence
        </span>
        <span className={`font-mono text-sm ${info.color}`}>{confidence}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-elevated">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            confidence >= 70
              ? 'bg-status-clear'
              : confidence >= 50
                ? 'bg-violet'
                : confidence >= 30
                  ? 'bg-status-mild'
                  : 'bg-status-elevated'
          }`}
          style={{ width: `${confidence}%` }}
        />
      </div>
      <p className={`text-xs ${info.color}`}>{info.qualifier}</p>
    </div>
  )
}
