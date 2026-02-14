'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Brain, Clock, Hand, Lightbulb, Wind, Zap } from 'lucide-react'

interface Drill {
  id: string
  title: string
  headline: string
  tryThis: string
  duration: number
  whyItWorks: string
  bestFor: string[]
  category: string
  steps: string[]
}

interface Model {
  id: string
  title: string
  headline: string
  tryThis: string
  whyItWorks: string
  visualDescription: string
  keyInsight: string
  relatedPatterns: string[]
}

interface WorkshopClientProps {
  drills: Drill[]
  models: Model[]
}

const categoryIcons: Record<string, typeof Brain> = {
  breath: Wind,
  grounding: Hand,
  attention: Brain,
  movement: Zap,
}

export default function WorkshopClient({ drills, models }: WorkshopClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'drills' | 'models'>('drills')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return 'Reference'
    if (seconds < 60) return `${seconds}s`
    return `${Math.floor(seconds / 60)}m`
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <div className="min-h-screen bg-base text-ivory animate-[fadeIn_800ms_ease-out]">
      <header className="sticky top-0 z-20 border-b border-ember/20 bg-base/95 px-4 py-4 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-xl items-center gap-3">
          <button
            onClick={() => router.push('/compass')}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-button border border-ember/30 bg-elevated text-bone transition-settle hover:border-ember/60 hover:text-ivory"
            aria-label="Back to compass"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="font-mono text-[10px] tracking-widest uppercase text-bone">Workshop</p>
            <h1 className="text-lg font-semibold text-ivory">Drills & Models</h1>
          </div>
        </div>

        <div className="mx-auto mt-4 flex w-full max-w-xl gap-2">
          <button
            onClick={() => {
              setActiveTab('drills')
              setExpandedId(null)
            }}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
              activeTab === 'drills'
                ? 'bg-violet text-ivory'
                : 'bg-elevated text-bone hover:text-ivory'
            }`}
          >
            <Zap className="mr-1.5 inline h-4 w-4" />
            Drills ({drills.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('models')
              setExpandedId(null)
            }}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
              activeTab === 'models'
                ? 'bg-status-clear text-ivory'
                : 'bg-elevated text-bone hover:text-ivory'
            }`}
          >
            <Lightbulb className="mr-1.5 inline h-4 w-4" />
            Models ({models.length})
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl p-4 pb-24">
        {activeTab === 'drills' ? (
          <div className="space-y-3">
            <p className="mb-4 text-sm text-bone">
              Quick exercises to practice during or between doses
            </p>
            {drills.map((drill) => {
              const isExpanded = expandedId === drill.id
              const Icon = categoryIcons[drill.category] || Brain

              return (
                <div
                  key={drill.id}
                  className={`overflow-hidden rounded-card border border-ember/20 bg-surface transition-all ${
                    isExpanded ? 'ring-1 ring-violet/40' : ''
                  }`}
                >
                  <button
                    onClick={() => toggleExpand(drill.id)}
                    className="w-full p-4 text-left transition-settle hover:bg-elevated/60"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-button bg-violet/20 p-2">
                        <Icon className="h-5 w-5 text-violet" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <h3 className="font-medium text-ivory">{drill.title}</h3>
                          <span className="rounded-full bg-elevated px-2 py-0.5 text-xs text-bone">
                            <Clock className="mr-1 inline h-3 w-3" />
                            {formatDuration(drill.duration)}
                          </span>
                        </div>
                        <p className="text-sm text-bone">{drill.headline}</p>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-2 space-y-4 border-t border-ember/20 px-4 pb-4 pt-0">
                      <div className="pt-4">
                        <h4 className="mb-2 font-mono text-xs uppercase tracking-wider text-violet">Try This</h4>
                        <p className="text-sm text-ivory/90">{drill.tryThis}</p>
                      </div>

                      {drill.steps?.length > 0 && (
                        <div>
                          <h4 className="mb-2 font-mono text-xs uppercase tracking-wider text-violet">Steps</h4>
                          <ol className="space-y-1.5 text-sm text-bone">
                            {drill.steps.map((step, i) => (
                              <li key={i} className="flex gap-2">
                                <span className="text-violet/70">{i + 1}.</span>
                                {step}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      <div className="rounded-card border border-status-clear/30 bg-status-clear/10 p-3">
                        <h4 className="mb-1 font-mono text-xs uppercase tracking-wider text-status-clear">Why It Works</h4>
                        <p className="text-sm text-ivory/80">{drill.whyItWorks}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {drill.bestFor.map((use) => (
                          <span
                            key={use}
                            className="rounded-full bg-elevated px-2 py-1 text-xs uppercase tracking-wide text-bone"
                          >
                            {use}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="mb-4 text-sm text-bone">
              Mental frameworks for understanding your practice
            </p>
            {models.map((model) => {
              const isExpanded = expandedId === model.id

              return (
                <div
                  key={model.id}
                  className={`overflow-hidden rounded-card border border-ember/20 bg-surface transition-all ${
                    isExpanded ? 'ring-1 ring-status-clear/40' : ''
                  }`}
                >
                  <button
                    onClick={() => toggleExpand(model.id)}
                    className="w-full p-4 text-left transition-settle hover:bg-elevated/60"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-button bg-status-clear/20 p-2">
                        <Lightbulb className="h-5 w-5 text-status-clear" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="mb-1 font-medium text-ivory">{model.title}</h3>
                        <p className="text-sm text-bone">{model.headline}</p>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-2 space-y-4 border-t border-ember/20 px-4 pb-4 pt-0">
                      <div className="pt-4">
                        <h4 className="mb-2 font-mono text-xs uppercase tracking-wider text-status-clear">Try This</h4>
                        <p className="text-sm text-ivory/90">{model.tryThis}</p>
                      </div>

                      <div className="rounded-card bg-elevated p-3">
                        <h4 className="mb-1 font-mono text-xs uppercase tracking-wider text-status-clear">The Visual</h4>
                        <p className="text-sm italic text-bone">{model.visualDescription}</p>
                      </div>

                      <div className="rounded-card border border-status-clear/30 bg-status-clear/10 p-3">
                        <h4 className="mb-1 font-mono text-xs uppercase tracking-wider text-status-clear">Key Insight</h4>
                        <p className="text-sm font-medium text-ivory">{model.keyInsight}</p>
                      </div>

                      <div>
                        <h4 className="mb-1 font-mono text-xs uppercase tracking-wider text-ash">Why It Works</h4>
                        <p className="text-sm text-bone">{model.whyItWorks}</p>
                      </div>

                      {model.relatedPatterns.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {model.relatedPatterns.map((pattern) => (
                            <span key={pattern} className="rounded-full bg-elevated px-2 py-1 text-xs text-bone">
                              {pattern.replaceAll('_', ' ')}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="rounded-card border border-violet/20 bg-violet/10 p-3">
                        <h4 className="mb-1 font-mono text-xs uppercase tracking-wider text-violet">Practice Cue</h4>
                        <p className="text-sm text-ivory/80">{model.tryThis}</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
