'use client'

import type { Batch } from '@/types'

interface BatchSelectorProps {
  batches: Batch[]
  value: string
  onChange: (batchId: string) => void
  disabled?: boolean
}

export default function BatchSelector({ batches, value, onChange, disabled }: BatchSelectorProps) {
  const selectedBatch = batches.find(b => b.id === value)
  
  if (batches.length === 0) {
    return (
      <div className="text-sm text-bone">
        No batches available
      </div>
    )
  }
  
  if (batches.length === 1 && selectedBatch) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="w-2 h-2 rounded-full bg-status-clear" />
        <span className="text-ivory font-medium">{selectedBatch.name}</span>
        <span className="text-bone text-xs">(Active)</span>
      </div>
    )
  }
  
  return (
    <div className="flex flex-wrap gap-2">
      {batches.map((batch) => {
        const isSelected = batch.id === value
        return (
          <button
            key={batch.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(batch.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              isSelected
                ? 'bg-amber text-surface'
                : 'bg-surface border border-ember text-bone hover:border-amber'
            } ${!batch.is_active ? 'opacity-60' : ''}`}
          >
            {batch.name}
            {!batch.is_active && (
              <span className="ml-1 text-[10px] opacity-70">(inactive)</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
