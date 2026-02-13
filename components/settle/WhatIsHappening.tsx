'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import type { WhatIsHappeningCard } from '@/types'

interface WhatIsHappeningProps {
  cards: WhatIsHappeningCard[]
}

export default function WhatIsHappening({ cards }: WhatIsHappeningProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggle = (id: string) => setExpandedId(expandedId === id ? null : id)

  return (
    <div>
      <h2 className="font-mono text-sm tracking-widest uppercase text-bone mb-6 text-center">
        What is happening?
      </h2>
      <div className="space-y-3">
        {cards.map((card) => (
          <div key={card.id}>
            <button
              onClick={() => toggle(card.id)}
              className="w-full p-5 min-h-[60px] bg-surface border border-ember/20 rounded-card text-left hover:bg-elevated transition-settle"
              aria-label={card.trigger}
              aria-expanded={expandedId === card.id}
            >
              <span className="text-lg text-ivory">{card.trigger}</span>
            </button>

            {expandedId === card.id && (
              <div className="mt-1 p-5 bg-elevated border border-ember/20 rounded-card space-y-3 transition-settle">
                <p className="text-ivory">{card.normalization}</p>
                <div className="border-t border-ember/20 pt-3">
                  <p className="text-bone text-xs font-mono uppercase tracking-widest mb-1">Action</p>
                  <p className="text-ivory">{card.action}</p>
                </div>
                {card.timeline && (
                  <div className="border-t border-ember/20 pt-3">
                    <p className="text-bone text-xs font-mono uppercase tracking-widest mb-1">Timeline</p>
                    <p className="text-ivory">{card.timeline}</p>
                  </div>
                )}
                {card.escalation === 'breathe' && (
                  <Link href="/settle/breathe" className="block text-orange hover:underline mt-2">
                    Start a breathing exercise
                  </Link>
                )}
                {card.escalation === 'ground' && (
                  <Link href="/settle/ground" className="block text-orange hover:underline mt-2">
                    Start a grounding exercise
                  </Link>
                )}
                {card.escalation === 'emergency' && (
                  <div className="mt-3 p-4 bg-surface border border-status-elevated/30 rounded-card">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="text-status-elevated" size={16} />
                      <span className="font-mono text-xs text-status-elevated uppercase">Emergency</span>
                    </div>
                    <p><a href="tel:6234737433" className="text-orange hover:underline">Fireside Project: 62-FIRESIDE</a></p>
                    <p><a href="tel:988" className="text-orange hover:underline">988 Suicide &amp; Crisis Lifeline</a></p>
                    <p><a href="tel:18006624357" className="text-orange hover:underline">SAMHSA: 1-800-662-4357</a></p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
