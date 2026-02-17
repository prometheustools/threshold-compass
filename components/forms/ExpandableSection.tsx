'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface ExpandableSectionProps {
  title: string
  subtitle?: string
  defaultExpanded?: boolean
  children: React.ReactNode
  disabled?: boolean
}

export default function ExpandableSection({ 
  title, 
  subtitle,
  defaultExpanded = false, 
  children,
  disabled
}: ExpandableSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  
  return (
    <div className="rounded-2xl bg-surface border border-ember/30 overflow-hidden">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-elevated/50 transition-colors"
      >
        <div>
          <span className="text-sm font-medium text-ivory">{title}</span>
          {subtitle && (
            <span className="ml-2 text-xs text-bone">{subtitle}</span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-bone" />
        ) : (
          <ChevronDown className="w-5 h-5 text-bone" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-ember/20">
          <div className="pt-4">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}
