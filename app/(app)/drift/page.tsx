'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type BreathingPhase = 'inhale' | 'hold' | 'exhale' | 'rest';

export default function DriftPage() {
  const [phase, setPhase] = useState<BreathingPhase>('inhale');
  const [count, setCount] = useState(4);
  const [isBreathing, setIsBreathing] = useState(false);
  const [groundingStep, setGroundingStep] = useState(0);

  // 4-7-8 breathing pattern
  const phaseDurations: Record<BreathingPhase, number> = {
    inhale: 4,
    hold: 7,
    exhale: 8,
    rest: 1,
  };

  const phaseLabels: Record<BreathingPhase, string> = {
    inhale: 'Breathe in',
    hold: 'Hold',
    exhale: 'Breathe out',
    rest: 'Rest',
  };

  useEffect(() => {
    if (!isBreathing) return;

    const timer = setInterval(() => {
      setCount((prev) => {
        if (prev <= 1) {
          // Move to next phase
          setPhase((currentPhase) => {
            const phases: BreathingPhase[] = ['inhale', 'hold', 'exhale', 'rest'];
            const idx = phases.indexOf(currentPhase);
            const nextPhase = phases[(idx + 1) % phases.length];
            return nextPhase;
          });
          return phaseDurations[phase === 'rest' ? 'inhale' :
                 phase === 'inhale' ? 'hold' :
                 phase === 'hold' ? 'exhale' : 'rest'];
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isBreathing, phase]);

  const groundingPrompts = [
    { sense: '5 things you can SEE', examples: 'Walls, light, hands, floor, ceiling' },
    { sense: '4 things you can TOUCH', examples: 'Phone, clothes, floor, skin' },
    { sense: '3 things you can HEAR', examples: 'Breathing, ambient sounds, heartbeat' },
    { sense: '2 things you can SMELL', examples: 'Air, room, yourself' },
    { sense: '1 thing you can TASTE', examples: 'Mouth, water, air' },
  ];

  return (
    <main className="min-h-screen bg-black text-ivory p-6 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <Link
          href="/compass"
          className="text-ivory/60 hover:text-ivory transition-colors"
        >
          ← Back
        </Link>
        <span className="font-mono text-xs text-violet uppercase tracking-wide">
          Drift Mode
        </span>
      </div>

      {/* Core message */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-mono mb-4">You&apos;re okay.</h1>
        <p className="text-ivory/70 text-lg">This will pass.</p>
      </div>

      {/* Breathing exercise */}
      <section className="mb-12">
        <h2 className="font-mono text-sm uppercase tracking-wide text-ivory/60 mb-4">
          4-7-8 Breathing
        </h2>

        {!isBreathing ? (
          <button
            onClick={() => {
              setIsBreathing(true);
              setPhase('inhale');
              setCount(4);
            }}
            className="w-full bg-violet/20 border border-violet/50 rounded-sm py-6 text-violet hover:bg-violet/30 transition-colors"
          >
            <span className="font-mono uppercase tracking-wide">Start Breathing</span>
          </button>
        ) : (
          <div className="text-center py-8 bg-charcoal rounded-sm border border-ivory/10">
            <div className="text-5xl font-mono mb-4">{count}</div>
            <div className="text-xl text-ivory/80">{phaseLabels[phase]}</div>
            <button
              onClick={() => setIsBreathing(false)}
              className="mt-6 text-ivory/40 text-sm hover:text-ivory/60"
            >
              Stop
            </button>
          </div>
        )}
      </section>

      {/* 5-4-3-2-1 Grounding */}
      <section className="mb-12">
        <h2 className="font-mono text-sm uppercase tracking-wide text-ivory/60 mb-4">
          5-4-3-2-1 Grounding
        </h2>

        <div className="bg-charcoal rounded-sm border border-ivory/10 p-4">
          <div className="text-lg mb-2">
            {groundingPrompts[groundingStep].sense}
          </div>
          <div className="text-ivory/50 text-sm mb-4">
            {groundingPrompts[groundingStep].examples}
          </div>
          <div className="flex gap-2">
            {groundingStep > 0 && (
              <button
                onClick={() => setGroundingStep((s) => s - 1)}
                className="flex-1 py-2 border border-ivory/20 rounded-sm text-ivory/60 hover:bg-ivory/5"
              >
                Back
              </button>
            )}
            <button
              onClick={() => setGroundingStep((s) => Math.min(s + 1, 4))}
              className="flex-1 py-2 bg-orange text-black font-mono uppercase tracking-wide rounded-sm"
              disabled={groundingStep >= 4}
            >
              {groundingStep >= 4 ? 'Complete' : 'Next'}
            </button>
          </div>
          <div className="flex gap-1 mt-4 justify-center">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i <= groundingStep ? 'bg-orange' : 'bg-ivory/20'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Emergency resources */}
      <section className="mt-auto">
        <h2 className="font-mono text-sm uppercase tracking-wide text-ivory/60 mb-4">
          Crisis Resources
        </h2>
        <div className="space-y-2">
          <a
            href="tel:988"
            className="block w-full bg-red-900/20 border border-red-500/50 rounded-sm py-3 text-center text-red-400 hover:bg-red-900/30"
          >
            <span className="font-mono">988</span>
            <span className="text-red-400/70 text-sm ml-2">Suicide & Crisis Lifeline</span>
          </a>
          <a
            href="tel:1-800-662-4357"
            className="block w-full bg-charcoal border border-ivory/20 rounded-sm py-3 text-center text-ivory/80 hover:bg-charcoal/80"
          >
            <span className="font-mono">SAMHSA</span>
            <span className="text-ivory/50 text-sm ml-2">1-800-662-4357</span>
          </a>
          <a
            href="https://firesideproject.org"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-charcoal border border-ivory/20 rounded-sm py-3 text-center text-ivory/80 hover:bg-charcoal/80"
          >
            <span className="font-mono">Fireside Project</span>
            <span className="text-ivory/50 text-sm ml-2">Psychedelic peer support</span>
          </a>
        </div>
      </section>
    </main>
  );
}
