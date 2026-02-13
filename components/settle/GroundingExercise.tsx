'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'

const exercises = [
  {
    id: 'quick-anchor',
    name: 'Quick Anchor',
    duration: '30 sec',
    instructions: [
      'Feel your feet. Press them into the floor.',
      'Name what you\'re sitting on.',
      'You\'re here. You\'re grounded. Take a moment.',
    ],
  },
  {
    id: 'full-senses',
    name: 'Full Senses',
    duration: '2-3 min',
    instructions: [
      'Name 5 things you can see.',
      'Name 4 things you can hear.',
      'Name 3 things you can feel.',
      'Name 2 things you can smell.',
      'Name 1 thing you can taste.',
      'You\'re here. You\'re grounded. Take a moment.',
    ],
  },
  {
    id: 'body-check',
    name: 'Body Check',
    duration: '1-2 min',
    instructions: [
      'Focus on your feet. Wiggle your toes.',
      'Move up to your legs. Feel them against the surface.',
      'Notice your torso. Feel your breath moving.',
      'Bring awareness to your hands. Clench and release.',
      'Your head and face. Relax your jaw.',
      'You\'re here. You\'re grounded. Take a moment.',
    ],
  },
]

export default function GroundingExercise() {
  const [selected, setSelected] = useState<typeof exercises[0] | null>(null)
  const [step, setStep] = useState(0)

  if (selected) {
    const isLast = step >= selected.instructions.length - 1

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <p className="text-bone text-xs font-mono tracking-widest uppercase mb-4">
          {selected.name}
        </p>
        <p className="text-2xl text-ivory max-w-xs leading-relaxed transition-settle">
          {selected.instructions[step]}
        </p>
        <div className="mt-12">
          {isLast ? (
            <Button variant="secondary" onClick={() => { setSelected(null); setStep(0) }}>
              Done
            </Button>
          ) : (
            <Button onClick={() => setStep(step + 1)}>
              Next
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      <h2 className="font-mono text-sm tracking-widest uppercase text-bone mb-6">
        Choose an exercise
      </h2>
      <div className="w-full max-w-sm space-y-3">
        {exercises.map((ex) => (
          <button
            key={ex.id}
            onClick={() => { setSelected(ex); setStep(0) }}
            className="w-full p-5 min-h-[72px] bg-surface border border-ember/20 rounded-card text-left hover:bg-elevated transition-settle"
            aria-label={ex.name}
          >
            <span className="text-xl text-ivory block">{ex.name}</span>
            <span className="text-sm text-bone">{ex.duration}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
