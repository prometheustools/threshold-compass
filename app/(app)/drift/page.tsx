'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type BreathingPhase = 'inhale' | 'hold' | 'exhale' | 'rest'

const phaseDurations: Record<BreathingPhase, number> = {
  inhale: 4,
  hold: 7,
  exhale: 8,
  rest: 1,
}

const phaseLabels: Record<BreathingPhase, string> = {
  inhale: 'Breathe in',
  hold: 'Hold',
  exhale: 'Breathe out',
  rest: 'Rest',
}

const groundingPrompts = [
  { sense: '5 things you can SEE', examples: 'Walls, light, hands, floor, ceiling' },
  { sense: '4 things you can TOUCH', examples: 'Phone, clothes, floor, skin' },
  { sense: '3 things you can HEAR', examples: 'Breathing, ambient sounds, heartbeat' },
  { sense: '2 things you can SMELL', examples: 'Air, room, yourself' },
  { sense: '1 thing you can TASTE', examples: 'Mouth, water, air' },
]

function getNextPhase(current: BreathingPhase): BreathingPhase {
  if (current === 'inhale') return 'hold'
  if (current === 'hold') return 'exhale'
  if (current === 'exhale') return 'rest'
  return 'inhale'
}

export default function DriftPage() {
  const [phase, setPhase] = useState<BreathingPhase>('inhale')
  const [count, setCount] = useState(phaseDurations.inhale)
  const [isBreathing, setIsBreathing] = useState(false)
  const [groundingStep, setGroundingStep] = useState(0)

  useEffect(() => {
    if (!isBreathing) return

    const timer = setInterval(() => {
      setCount((previous) => {
        if (previous <= 1) {
          setPhase((current) => {
            const next = getNextPhase(current)
            return next
          })
          const nextPhase = getNextPhase(phase)
          return phaseDurations[nextPhase]
        }

        return previous - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isBreathing, phase])

  return (
    <main className="min-h-screen bg-base px-6 py-6 text-ivory">
      <header className="mx-auto flex w-full max-w-xl items-center justify-between">
        <Link
          href="/compass"
          className="inline-flex min-h-[44px] items-center rounded-button border border-ember/30 bg-elevated px-4 py-2 text-bone transition-settle hover:border-ember/60 hover:text-ivory"
        >
          ← Compass
        </Link>
        <span className="font-mono text-xs uppercase tracking-widest text-status-mild">Drift Mode</span>
      </header>

      <div className="mx-auto mt-8 w-full max-w-xl space-y-8">
        <section className="rounded-card border border-ember/20 bg-surface p-6 text-center">
          <h1 className="text-3xl font-semibold">You&apos;re okay.</h1>
          <p className="mt-2 text-bone text-lg">This will pass.</p>
        </section>

        <section className="rounded-card border border-ember/20 bg-surface p-6">
          <h2 className="font-mono text-xs uppercase tracking-widest text-bone">4-7-8 Breathing</h2>

          {!isBreathing ? (
            <button
              type="button"
              onClick={() => {
                setIsBreathing(true)
                setPhase('inhale')
                setCount(phaseDurations.inhale)
              }}
              className="mt-4 w-full rounded-button border border-status-mild/40 bg-status-mild/15 px-4 py-5 font-mono text-sm uppercase tracking-widest text-status-mild transition-settle hover:bg-status-mild/20"
            >
              Start Breathing
            </button>
          ) : (
            <div className="mt-4 rounded-button border border-ember/20 bg-elevated p-6 text-center">
              <div className="font-mono text-6xl text-ivory">{count}</div>
              <p className="mt-2 text-xl text-bone">{phaseLabels[phase]}</p>
              <button
                type="button"
                onClick={() => setIsBreathing(false)}
                className="mt-5 text-sm text-ash transition-settle hover:text-bone"
              >
                Stop
              </button>
            </div>
          )}
        </section>

        <section className="rounded-card border border-ember/20 bg-surface p-6">
          <h2 className="font-mono text-xs uppercase tracking-widest text-bone">5-4-3-2-1 Grounding</h2>

          <div className="mt-4 rounded-button border border-ember/20 bg-elevated p-4">
            <p className="text-lg text-ivory">{groundingPrompts[groundingStep].sense}</p>
            <p className="mt-1 text-sm text-bone">{groundingPrompts[groundingStep].examples}</p>

            <div className="mt-4 flex gap-2">
              {groundingStep > 0 && (
                <button
                  type="button"
                  onClick={() => setGroundingStep((step) => step - 1)}
                  className="flex-1 rounded-button border border-ember/30 px-3 py-2 text-sm text-bone transition-settle hover:border-ember/60 hover:text-ivory"
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={() => setGroundingStep((step) => Math.min(step + 1, groundingPrompts.length - 1))}
                className="flex-1 rounded-button bg-orange px-3 py-2 font-mono text-sm uppercase tracking-widest text-base transition-settle hover:brightness-105 disabled:opacity-50"
                disabled={groundingStep >= groundingPrompts.length - 1}
              >
                {groundingStep >= groundingPrompts.length - 1 ? 'Complete' : 'Next'}
              </button>
            </div>

            <div className="mt-4 flex justify-center gap-1">
              {groundingPrompts.map((_, index) => (
                <span
                  key={index}
                  className={`h-2 w-2 rounded-full ${index <= groundingStep ? 'bg-orange' : 'bg-ember/40'}`}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-card border border-status-elevated/40 bg-status-elevated/10 p-6">
          <h2 className="font-mono text-xs uppercase tracking-widest text-status-elevated">Crisis Resources</h2>
          <div className="mt-4 space-y-2">
            <a
              href="tel:988"
              className="block rounded-button border border-status-elevated/50 bg-status-elevated/15 px-4 py-3 text-center text-status-elevated transition-settle hover:bg-status-elevated/20"
            >
              <span className="font-mono">988</span>
              <span className="ml-2 text-sm text-status-elevated/80">Suicide &amp; Crisis Lifeline</span>
            </a>
            <a
              href="tel:18006624357"
              className="block rounded-button border border-ember/30 bg-surface px-4 py-3 text-center text-bone transition-settle hover:text-ivory"
            >
              <span className="font-mono">SAMHSA</span>
              <span className="ml-2 text-sm text-ash">1-800-662-4357</span>
            </a>
            <a
              href="https://firesideproject.org"
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-button border border-ember/30 bg-surface px-4 py-3 text-center text-bone transition-settle hover:text-ivory"
            >
              <span className="font-mono">Fireside Project</span>
              <span className="ml-2 text-sm text-ash">Psychedelic peer support</span>
            </a>
          </div>
        </section>
      </div>
    </main>
  )
}
