'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import BreathingGuide from '@/components/settle/BreathingGuide'
import breathingPatterns from '@/content/breathing-patterns.json'
import type { BreathingPattern } from '@/types'

export default function BreathePage() {
  const [selected, setSelected] = useState<BreathingPattern | null>(null)

  if (selected) {
    return (
      <div className="min-h-screen bg-base flex flex-col items-center justify-center animate-[fadeIn_800ms_ease-out]">
        <BreathingGuide pattern={selected} />
        <button
          onClick={() => setSelected(null)}
          className="mt-8 text-bone hover:text-ivory min-h-[44px] px-4 transition-settle"
          aria-label="Choose different pattern"
        >
          Choose different pattern
        </button>
        <Link href="/settle" className="mt-4 text-ash hover:text-bone min-h-[44px] px-4 flex items-center gap-2 transition-settle">
          <ArrowLeft size={16} /> Back to Settle
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base p-6 flex flex-col items-center justify-center animate-[fadeIn_800ms_ease-out]">
      <h1 className="font-mono text-sm tracking-widest uppercase text-bone mb-8">
        Select a pattern
      </h1>
      <div className="w-full max-w-sm space-y-3">
        {(breathingPatterns as BreathingPattern[]).map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p)}
            className="w-full p-5 min-h-[72px] bg-surface border border-ember/20 rounded-card text-left hover:bg-elevated transition-settle"
            aria-label={p.name}
          >
            <span className="text-xl text-ivory block">{p.name}</span>
            <span className="text-sm text-bone">{p.description}</span>
          </button>
        ))}
      </div>
      <Link href="/settle" className="mt-8 text-ash hover:text-bone min-h-[44px] px-4 flex items-center gap-2 transition-settle">
        <ArrowLeft size={16} /> Back to Settle
      </Link>
    </div>
  )
}
