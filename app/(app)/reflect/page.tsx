'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { resolveCurrentUserId } from '@/lib/auth/anonymous'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import LoadingState from '@/components/ui/LoadingState'

type DoseOption = {
  id: string
  dosed_at: string
  amount: number
  unit: string
}

type ReflectionTiming = 'eod' | '24h' | '72h'

const timingOptions: Array<{ value: ReflectionTiming; label: string }> = [
  { value: 'eod', label: 'End of Day' },
  { value: '24h', label: '24 Hours' },
  { value: '72h', label: '72 Hours' },
]

export default function ReflectPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [doses, setDoses] = useState<DoseOption[]>([])
  const [doseId, setDoseId] = useState<string>('')
  const [timing, setTiming] = useState<ReflectionTiming>('eod')
  const [stillWithMe, setStillWithMe] = useState('')
  const [wouldChange, setWouldChange] = useState('')
  const [gratitude, setGratitude] = useState('')

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const supabase = createClient()
        const userId = await resolveCurrentUserId(supabase)
        if (!userId) {
          setDoses([])
          return
        }

        const { data, error: doseError } = await supabase
          .from('dose_logs')
          .select('id,dosed_at,amount,unit')
          .eq('user_id', userId)
          .order('dosed_at', { ascending: false })
          .limit(20)

        if (doseError) {
          throw doseError
        }

        if (!active) return
        const mapped = (data ?? []) as DoseOption[]
        setDoses(mapped)
        setDoseId(mapped[0]?.id ?? '')
      } catch (loadError) {
        if (!active) return
        const message =
          typeof loadError === 'object' && loadError && 'message' in loadError
            ? String((loadError as { message?: unknown }).message)
            : 'Unable to load recent doses.'
        setError(message)
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setSaved(false)
    setError(null)

    try {
      const response = await fetch('/api/reflections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dose_log_id: doseId || null,
          timing,
          still_with_me: stillWithMe.trim() || null,
          would_change: wouldChange.trim() || null,
          gratitude: gratitude.trim() || null,
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error ?? 'Unable to save reflection.')
      }

      setSaved(true)
      setStillWithMe('')
      setWouldChange('')
      setGratitude('')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save reflection.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-base px-4 py-8 text-ivory">
        <div className="mx-auto w-full max-w-xl">
          <Card padding="lg">
            <LoadingState message="loading" size="md" />
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base px-4 py-8 text-ivory">
      <div className="mx-auto w-full max-w-xl space-y-4">
        <Link href="/compass" className="text-sm text-bone hover:text-ivory">
          ← Compass
        </Link>
        <div>
          <p className="font-mono text-xs tracking-widest uppercase text-bone">Reflect</p>
          <h1 className="mt-2 text-2xl font-sans">Post-Dose Reflection</h1>
        </div>

        <Card padding="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="font-mono text-xs uppercase tracking-widest text-bone">Timing</span>
              <select
                value={timing}
                onChange={(event) => setTiming(event.target.value as ReflectionTiming)}
                className="mt-2 w-full rounded-button border border-ember/30 bg-elevated px-4 py-3 text-ivory focus:border-orange focus:outline-none"
              >
                {timingOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="font-mono text-xs uppercase tracking-widest text-bone">Dose Reference</span>
              <select
                value={doseId}
                onChange={(event) => setDoseId(event.target.value)}
                className="mt-2 w-full rounded-button border border-ember/30 bg-elevated px-4 py-3 text-ivory focus:border-orange focus:outline-none"
              >
                <option value="">No linked dose</option>
                {doses.map((dose) => (
                  <option key={dose.id} value={dose.id}>
                    {new Date(dose.dosed_at).toLocaleDateString()} - {dose.amount}
                    {dose.unit}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="font-mono text-xs uppercase tracking-widest text-bone">What is still with you?</span>
              <textarea
                value={stillWithMe}
                onChange={(event) => setStillWithMe(event.target.value)}
                rows={3}
                className="mt-2 w-full rounded-button border border-ember/30 bg-elevated px-4 py-3 text-ivory focus:border-orange focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="font-mono text-xs uppercase tracking-widest text-bone">What would you change?</span>
              <textarea
                value={wouldChange}
                onChange={(event) => setWouldChange(event.target.value)}
                rows={3}
                className="mt-2 w-full rounded-button border border-ember/30 bg-elevated px-4 py-3 text-ivory focus:border-orange focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="font-mono text-xs uppercase tracking-widest text-bone">Gratitude</span>
              <textarea
                value={gratitude}
                onChange={(event) => setGratitude(event.target.value)}
                rows={3}
                className="mt-2 w-full rounded-button border border-ember/30 bg-elevated px-4 py-3 text-ivory focus:border-orange focus:outline-none"
              />
            </label>

            {error && <p className="text-sm text-status-elevated">{error}</p>}
            {saved && <p className="text-sm text-status-clear">Reflection saved.</p>}

            <Button type="submit" className="w-full" loading={saving}>
              {saving ? 'Saving...' : 'Save Reflection'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
