'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { resolveCurrentUserId } from '@/lib/auth/anonymous'
import { BodyMap, STISliders, type BodyRegion } from '@/components/dose'
import type { ContextTag, DayClassification, STIScores, ThresholdFeel, TimingTag } from '@/types'

interface DoseToComplete {
  id: string
  amount: number
  unit: string
  dosed_at: string
  phase: 'baseline' | 'context' | null
  dose_number: number | null
  intention: string | null
  post_dose_mood: number | null
  signal_score: number | null
  texture_score: number | null
  interference_score: number | null
  threshold_feel: ThresholdFeel | null
  context_tags: ContextTag[] | null
  timing_tag: TimingTag | null
}

const milestoneMessages: Record<number, { title: string; message: string }> = {
  1: { title: 'Started', message: 'First complete dose logged. Nice start.' },
  4: { title: 'Baseline Complete', message: 'You reached the phase transition point.' },
  7: { title: 'Context Deepening', message: 'Patterns should start becoming clearer now.' },
  10: { title: 'Protocol Complete', message: 'You completed the 10-dose cycle.' },
}

const thresholdOptions: Array<{ value: ThresholdFeel; label: string; icon: string }> = [
  { value: 'nothing', label: 'Nothing', icon: '○' },
  { value: 'under', label: 'Under', icon: '↓' },
  { value: 'sweetspot', label: 'Sweet Spot', icon: '◉' },
  { value: 'over', label: 'Over', icon: '↑' },
]

const contextTagOptions: Array<{ value: ContextTag; label: string }> = [
  { value: 'work', label: 'Work' },
  { value: 'creative', label: 'Creative' },
  { value: 'social', label: 'Social' },
  { value: 'physical', label: 'Physical' },
  { value: 'rest', label: 'Rest' },
  { value: 'therapy', label: 'Therapy' },
  { value: 'mixed', label: 'Mixed' },
]

const timingOptions: Array<{ value: TimingTag; label: string }> = [
  { value: 'morning', label: 'Morning' },
  { value: 'midday', label: 'Midday' },
  { value: 'afternoon', label: 'Afternoon' },
]

function classifyDayFromScores(sti: STIScores): DayClassification {
  if (sti.signal >= 6 && sti.interference <= 2) return 'green'
  if (sti.interference >= 5) return 'red'
  if (sti.interference >= 3 || sti.texture >= 6) return 'yellow'
  return 'unclassified'
}

function getThresholdZone(feel: ThresholdFeel): 'sub' | 'low' | 'sweet_spot' | 'high' | 'over' {
  if (feel === 'nothing') return 'sub'
  if (feel === 'under') return 'low'
  if (feel === 'sweetspot') return 'sweet_spot'
  return 'over'
}

function isMilestone(doseNumber: number | null): boolean {
  if (!doseNumber) return false
  return doseNumber in milestoneMessages
}

function formatTimeAgo(timestamp: string): string {
  const elapsedMs = Date.now() - new Date(timestamp).getTime()
  const hours = elapsedMs / (1000 * 60 * 60)

  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m ago`
  if (hours < 24) return `${Math.round(hours)}h ago`
  return `${Math.round(hours / 24)}d ago`
}

function PostDosePageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const doseId = searchParams.get('dose')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dose, setDose] = useState<DoseToComplete | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [showMilestone, setShowMilestone] = useState<number | null>(null)

  const [stiScores, setStiScores] = useState<STIScores>({ signal: 5, texture: 3, interference: 1 })
  const [thresholdFeel, setThresholdFeel] = useState<ThresholdFeel | null>(null)
  const [postDoseMood, setPostDoseMood] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [contextTags, setContextTags] = useState<ContextTag[]>([])
  const [timingTag, setTimingTag] = useState<TimingTag | null>(null)
  const [reflection, setReflection] = useState('')
  const [bodyRegions, setBodyRegions] = useState<BodyRegion[]>([])

  useEffect(() => {
    let active = true

    const loadDose = async () => {
      setLoading(true)
      setError(null)

      const supabase = createClient()
      const anonUserId = await resolveCurrentUserId(supabase)
      if (!anonUserId) {
        if (active) {
          setError('Session missing. Please return to login.')
          setLoading(false)
        }
        return
      }

      setUserId(anonUserId)

      let query = supabase
        .from('dose_logs')
        .select(
          'id,amount,unit,dosed_at,phase,dose_number,intention,post_dose_mood,signal_score,texture_score,interference_score,threshold_feel,context_tags,timing_tag'
        )
        .eq('user_id', anonUserId)

      if (doseId) {
        query = query.eq('id', doseId)
      } else {
        query = query.eq('post_dose_completed', false).order('dosed_at', { ascending: false }).limit(1)
      }

      const { data, error: fetchError } = await query

      if (!active) return

      if (fetchError) {
        setError(fetchError.message)
        setLoading(false)
        return
      }

      const picked = Array.isArray(data) ? data[0] : data
      if (!picked) {
        setError('No pending doses to complete.')
        setLoading(false)
        return
      }

      const row = picked as DoseToComplete
      setDose(row)
      setPostDoseMood((row.post_dose_mood as 1 | 2 | 3 | 4 | 5 | null) ?? 3)
      setStiScores({
        signal: row.signal_score ?? 5,
        texture: row.texture_score ?? 3,
        interference: row.interference_score ?? 1,
      })
      setThresholdFeel(row.threshold_feel ?? null)
      setContextTags(row.context_tags ?? [])
      setTimingTag(row.timing_tag ?? null)
      setLoading(false)
    }

    void loadDose()

    return () => {
      active = false
    }
  }, [doseId])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!dose || !userId) return

    if (!thresholdFeel) {
      setError('Please select how the dose felt.')
      return
    }

    setSaving(true)
    setError(null)

    const supabase = createClient()
    const dayClassification = classifyDayFromScores(stiScores)

    const { error: updateError } = await supabase
      .from('dose_logs')
      .update({
        post_dose_completed: true,
        post_dose_mood: postDoseMood,
        signal_score: stiScores.signal,
        texture_score: stiScores.texture,
        interference_score: stiScores.interference,
        threshold_feel: thresholdFeel,
        day_classification: dayClassification,
        context_tags: contextTags.length > 0 ? contextTags : null,
        timing_tag: timingTag,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dose.id)
      .eq('user_id', userId)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    const trimmedReflection = reflection.trim()
    if (trimmedReflection || bodyRegions.length > 0) {
      const bodyState = bodyRegions.length > 0 ? bodyRegions.join(', ') : null

      const { data: existingCheckIns } = await supabase
        .from('check_ins')
        .select('id')
        .eq('user_id', userId)
        .eq('dose_log_id', dose.id)
        .order('created_at', { ascending: false })
        .limit(1)

      const latestId = existingCheckIns?.[0]?.id as string | undefined

      if (latestId) {
        await supabase
          .from('check_ins')
          .update({
            check_in_type: 'integration',
            body_state: bodyState,
            notes: trimmedReflection || null,
            threshold_zone: getThresholdZone(thresholdFeel),
          })
          .eq('id', latestId)
          .eq('user_id', userId)
      } else {
        await supabase.from('check_ins').insert({
          user_id: userId,
          dose_log_id: dose.id,
          check_in_type: 'integration',
          body_state: bodyState,
          notes: trimmedReflection || null,
          threshold_zone: getThresholdZone(thresholdFeel),
        })
      }
    }

    if (isMilestone(dose.dose_number)) {
      setShowMilestone(dose.dose_number)
      setSaving(false)
      return
    }

    router.push('/compass')
    router.refresh()
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-base px-4 py-8 text-ivory">
        <div className="mx-auto w-full max-w-xl rounded-card border border-ember/20 bg-surface p-8 text-center">
          Loading dose...
        </div>
      </main>
    )
  }

  if (!dose) {
    return (
      <main className="min-h-screen bg-base px-4 py-8 text-ivory">
        <div className="mx-auto w-full max-w-xl rounded-card border border-ember/20 bg-surface p-8 text-center">
          <p className="text-lg">No pending dose.</p>
          {error && <p className="mt-2 text-sm text-status-elevated">{error}</p>}
          <Link href="/log" className="mt-4 inline-block rounded-button bg-orange px-4 py-2 font-mono text-xs uppercase tracking-widest text-base">
            Back to Log
          </Link>
        </div>
      </main>
    )
  }

  if (showMilestone && milestoneMessages[showMilestone]) {
    const milestone = milestoneMessages[showMilestone]
    return (
      <main className="min-h-screen bg-base px-4 py-8 text-ivory">
        <div className="mx-auto flex w-full max-w-xl justify-center">
          <div className="w-full rounded-card border border-orange/30 bg-orange/10 p-8 text-center">
            <p className="text-5xl">🔥</p>
            <h2 className="mt-4 text-2xl font-semibold text-orange">{milestone.title}</h2>
            <p className="mt-2 text-bone">{milestone.message}</p>
            <p className="mt-4 font-mono text-xs uppercase tracking-widest text-ash">Dose #{showMilestone} complete</p>
            <button
              type="button"
              onClick={() => {
                router.push('/compass')
                router.refresh()
              }}
              className="mt-6 rounded-button bg-orange px-4 py-3 font-mono text-xs uppercase tracking-widest text-base"
            >
              Continue
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-base px-4 py-6 text-ivory">
      <div className="mx-auto w-full max-w-xl space-y-4">
        <header className="flex items-center justify-between">
          <Link href="/log" className="text-bone transition-settle hover:text-ivory">
            ← Back
          </Link>
          <h1 className="font-mono text-sm uppercase tracking-widest text-bone">Complete Dose</h1>
          <div className="w-10" />
        </header>

        <section className="rounded-card border border-ember/20 bg-surface p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-2xl text-orange">
                {dose.amount}
                <span className="ml-1 text-sm text-bone">{dose.unit}</span>
              </p>
              <p className="text-xs text-ash">Dose #{dose.dose_number ?? '—'}</p>
            </div>
            <p className="text-sm text-bone">{formatTimeAgo(dose.dosed_at)}</p>
          </div>
          {dose.intention && <p className="mt-3 border-t border-ember/20 pt-3 text-sm italic text-bone">&ldquo;{dose.intention}&rdquo;</p>}
        </section>

        <form onSubmit={handleSubmit} className="space-y-4">
          <section className="rounded-card border border-ember/20 bg-surface p-4">
            <STISliders value={stiScores} onChange={setStiScores} />
          </section>

          <section className="rounded-card border border-ember/20 bg-surface p-4">
            <p className="font-mono text-xs uppercase tracking-widest text-bone">How did this dose feel?</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {thresholdOptions.map((option) => {
                const active = thresholdFeel === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setThresholdFeel(option.value)}
                    className={`rounded-button border px-3 py-3 text-center transition-settle ${
                      active ? 'border-orange bg-orange/20 text-ivory' : 'border-ember/30 bg-elevated text-bone hover:text-ivory'
                    }`}
                  >
                    <p className="font-mono text-base">{option.icon}</p>
                    <p className="mt-1 text-xs uppercase">{option.label}</p>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="rounded-card border border-ember/20 bg-surface p-4">
            <p className="font-mono text-xs uppercase tracking-widest text-bone">Overall mood now</p>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {([1, 2, 3, 4, 5] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPostDoseMood(value)}
                  className={`rounded-button px-2 py-3 font-mono text-lg transition-settle ${
                    postDoseMood === value ? 'bg-orange text-base' : 'bg-elevated text-bone'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-card border border-ember/20 bg-surface p-4">
            <p className="font-mono text-xs uppercase tracking-widest text-bone">Body map</p>
            <p className="mt-1 text-xs text-ash">Mark where you felt the dose somatically.</p>
            <div className="mt-3">
              <BodyMap value={bodyRegions} onChange={setBodyRegions} />
            </div>
          </section>

          {dose.phase === 'context' && (
            <section className="rounded-card border border-ember/20 bg-surface p-4">
              <p className="font-mono text-xs uppercase tracking-widest text-bone">Context tags</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {contextTagOptions.map((option) => {
                  const active = contextTags.includes(option.value)
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setContextTags((previous) =>
                          previous.includes(option.value)
                            ? previous.filter((tag) => tag !== option.value)
                            : [...previous, option.value]
                        )
                      }}
                      className={`rounded-button border px-2 py-2 text-xs uppercase transition-settle ${
                        active ? 'border-orange bg-orange/20 text-ivory' : 'border-ember/30 bg-elevated text-bone'
                      }`}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          <section className="rounded-card border border-ember/20 bg-surface p-4">
            <p className="font-mono text-xs uppercase tracking-widest text-bone">Timing</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {timingOptions.map((option) => {
                const active = timingTag === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTimingTag(timingTag === option.value ? null : option.value)}
                    className={`rounded-button border px-2 py-2 text-xs uppercase transition-settle ${
                      active ? 'border-orange bg-orange/20 text-ivory' : 'border-ember/30 bg-elevated text-bone'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </section>

          <section className="rounded-card border border-ember/20 bg-surface p-4">
            <label htmlFor="reflection" className="font-mono text-xs uppercase tracking-widest text-bone">
              Quick reflection (optional)
            </label>
            <textarea
              id="reflection"
              value={reflection}
              onChange={(event) => setReflection(event.target.value)}
              rows={3}
              placeholder="Anything notable from this experience?"
              className="mt-2 w-full rounded-button border border-ember/30 bg-elevated px-3 py-2 text-sm text-ivory focus:border-orange focus:outline-none"
            />
          </section>

          {error && <p className="text-sm text-status-elevated">{error}</p>}

          <button
            type="submit"
            disabled={saving || !thresholdFeel}
            className="w-full rounded-button bg-orange px-4 py-4 font-mono text-sm uppercase tracking-widest text-base transition-settle hover:brightness-105 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Complete Dose'}
          </button>
        </form>
      </div>
    </main>
  )
}

function LoadingFallback() {
  return (
    <main className="min-h-screen bg-base px-4 py-8 text-ivory">
      <div className="mx-auto w-full max-w-xl rounded-card border border-ember/20 bg-surface p-8 text-center">
        Loading...
      </div>
    </main>
  )
}

export default function PostDosePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PostDosePageContent />
    </Suspense>
  )
}
