'use client'

import Link from 'next/link'
import { Heart, Wind, Mountain, HelpCircle } from 'lucide-react'

export default function SettlePage() {
  return (
    <div className="min-h-screen bg-base p-6 flex flex-col items-center justify-center animate-[fadeIn_800ms_ease-out]">
      <h1 className="font-mono text-sm tracking-widest uppercase text-bone mb-12">
        Settle Mode
      </h1>

      <div className="w-full max-w-sm space-y-4">
        <Link href="/settle/breathe" className="block">
          <div className="flex items-center gap-4 p-6 min-h-[72px] bg-surface border border-ember/20 rounded-card hover:bg-elevated transition-settle" aria-label="Breathe">
            <Wind className="text-orange" size={28} />
            <span className="text-xl text-ivory">Breathe</span>
          </div>
        </Link>

        <Link href="/settle/ground" className="block">
          <div className="flex items-center gap-4 p-6 min-h-[72px] bg-surface border border-ember/20 rounded-card hover:bg-elevated transition-settle" aria-label="Ground">
            <Mountain className="text-orange" size={28} />
            <span className="text-xl text-ivory">Ground</span>
          </div>
        </Link>

        <Link href="/settle/guide" className="block">
          <div className="flex items-center gap-4 p-6 min-h-[72px] bg-surface border border-ember/20 rounded-card hover:bg-elevated transition-settle" aria-label="Guide">
            <HelpCircle className="text-orange" size={28} />
            <span className="text-xl text-ivory">Guide</span>
          </div>
        </Link>
      </div>

      <div className="mt-12 w-full max-w-sm p-6 bg-surface border border-status-elevated/30 rounded-card">
        <div className="flex items-center gap-2 mb-3">
          <Heart className="text-status-elevated" size={20} />
          <span className="font-mono text-xs tracking-widest uppercase text-status-elevated">
            Emergency
          </span>
        </div>
        <div className="space-y-2 text-lg text-ivory">
          <p>
            <a href="tel:6234737433" className="text-orange hover:underline">
              Fireside Project: 62-FIRESIDE
            </a>
          </p>
          <p>
            <a href="tel:988" className="text-orange hover:underline">
              988 Suicide &amp; Crisis Lifeline
            </a>
          </p>
          <p>
            <a href="tel:18006624357" className="text-orange hover:underline">
              SAMHSA: 1-800-662-4357
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
