'use client'

import { useState } from 'react'
import type { CheckInType, ThresholdZone } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { resolveCurrentUserId } from '@/lib/auth/anonymous'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Select from '@/components/ui/Select'

interface CheckInFormProps {
  doseLogId: string
  checkInType?: CheckInType
  onSaved?: () => void
}

const conditionOptions = {
  energy: ['Wired', 'Alert', 'Normal', 'Low', 'Exhausted'],
  mood: ['Elevated', 'Stable', 'Flat', 'Anxious', 'Low'],
  focus: ['Sharp', 'Normal', 'Scattered', 'Foggy'],
  body_state: ['Relaxed', 'Normal', 'Tense', 'Pain'],
  social_context: ['Alone', 'Small group', 'Large group', 'Work'],
} as const

const signalOptions = {
  visual: ['Colors brighter', 'Patterns noticed', 'Normal', 'Dimmer'],
  emotional: ['More open', 'Normal', 'More guarded'],
  physical: ['Body awareness up', 'Normal', 'Numb'],
  cognitive: ['Ideas flowing', 'Normal', 'Stuck'],
  connection: ['More connected', 'Normal', 'More isolated'],
} as const

const zoneOptions: Array<{ label: string; value: ThresholdZone }> = [
  { label: 'Sub', value: 'sub' },
  { label: 'Low', value: 'low' },
  { label: 'Sweet Spot', value: 'sweet_spot' },
  { label: 'High', value: 'high' },
  { label: 'Over', value: 'over' },
]

function toSelectOptions(values: readonly string[]) {
  return [{ value: '', label: 'Select one' }, ...values.map((value) => ({ value, label: value }))]
}

function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') {
      return message
    }
  }

  return 'Unable to save check-in right now.'
}

export default function CheckInForm({ doseLogId, checkInType = 'signal', onSaved }: CheckInFormProps) {
  const [energy, setEnergy] = useState('')
  const [mood, setMood] = useState('')
  const [focus, setFocus] = useState('')
  const [bodyState, setBodyState] = useState('')
  const [socialContext, setSocialContext] = useState('')
  const [visual, setVisual] = useState('')
  const [emotional, setEmotional] = useState('')
  const [physical, setPhysical] = useState('')
  const [cognitive, setCognitive] = useState('')
  const [connection, setConnection] = useState('')
  const [thresholdZone, setThresholdZone] = useState<ThresholdZone | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (
      !energy ||
      !mood ||
      !focus ||
      !bodyState ||
      !socialContext ||
      !visual ||
      !emotional ||
      !physical ||
      !cognitive ||
      !connection ||
      !thresholdZone
    ) {
      setError('Select one option for each category and choose a threshold zone.')
      return
    }

    setSubmitting(true)
    setSaved(false)
    setError(null)

    try {
      const supabase = createClient()
      const anonUserId = await resolveCurrentUserId(supabase)
      
      if (!anonUserId) {
        setError('Session expired. Please refresh.')
        setSubmitting(false)
        return
      }

      const trimmedNotes = notes.trim()

      const { error: insertError } = await supabase.from('check_ins').insert({
        user_id: anonUserId,
        dose_log_id: doseLogId,
        check_in_type: checkInType,
        energy,
        mood,
        focus,
        body_state: bodyState,
        social_context: socialContext,
        visual,
        emotional,
        physical,
        cognitive,
        connection,
        threshold_zone: thresholdZone,
        notes: trimmedNotes.length > 0 ? trimmedNotes : null,
      })

      if (insertError) {
        throw insertError
      }

      setSaved(true)
      onSaved?.()
    } catch (submitError) {
      setError(getErrorMessage(submitError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card padding="lg">
        <p className="font-mono text-xs tracking-widest uppercase text-bone">Conditions</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Select label="Energy" value={energy} onChange={(event) => setEnergy(event.target.value)} options={toSelectOptions(conditionOptions.energy)} />
          <Select label="Mood" value={mood} onChange={(event) => setMood(event.target.value)} options={toSelectOptions(conditionOptions.mood)} />
          <Select label="Focus" value={focus} onChange={(event) => setFocus(event.target.value)} options={toSelectOptions(conditionOptions.focus)} />
          <Select label="Body" value={bodyState} onChange={(event) => setBodyState(event.target.value)} options={toSelectOptions(conditionOptions.body_state)} />
          <Select label="Social" value={socialContext} onChange={(event) => setSocialContext(event.target.value)} options={toSelectOptions(conditionOptions.social_context)} />
        </div>
      </Card>

      <Card padding="lg">
        <p className="font-mono text-xs tracking-widest uppercase text-bone">Signals</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Select label="Visual" value={visual} onChange={(event) => setVisual(event.target.value)} options={toSelectOptions(signalOptions.visual)} />
          <Select label="Emotional" value={emotional} onChange={(event) => setEmotional(event.target.value)} options={toSelectOptions(signalOptions.emotional)} />
          <Select label="Physical" value={physical} onChange={(event) => setPhysical(event.target.value)} options={toSelectOptions(signalOptions.physical)} />
          <Select label="Cognitive" value={cognitive} onChange={(event) => setCognitive(event.target.value)} options={toSelectOptions(signalOptions.cognitive)} />
          <Select label="Connection" value={connection} onChange={(event) => setConnection(event.target.value)} options={toSelectOptions(signalOptions.connection)} />
        </div>
      </Card>

      <Card padding="lg">
        <p className="font-mono text-xs tracking-widest uppercase text-bone">Threshold Zone</p>
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
          {zoneOptions.map((zone) => (
            <button
              key={zone.value}
              type="button"
              onClick={() => setThresholdZone(zone.value)}
              className={`
                min-h-[44px] rounded-button border px-3 py-2 font-mono text-xs tracking-widest uppercase transition-settle
                ${thresholdZone === zone.value ? 'border-orange bg-orange/20 text-ivory' : 'border-ember/30 bg-elevated text-bone hover:border-ember/80'}
              `}
            >
              {zone.label}
            </button>
          ))}
        </div>

        <label className="mt-4 block">
          <span className="font-mono text-xs tracking-widest uppercase text-bone">Notes (Optional)</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="mt-2 w-full rounded-button border border-ember/30 bg-elevated px-4 py-3 text-ivory focus:border-orange focus:outline-none"
          />
        </label>
      </Card>

      {error && <p className="text-sm text-status-elevated">{error}</p>}
      {saved && <p className="font-mono text-xs tracking-widest uppercase text-status-clear">Check-in saved.</p>}

      <Button type="submit" size="lg" className="w-full" loading={submitting}>
        {submitting ? 'Saving...' : 'Save Check-In'}
      </Button>
    </form>
  )
}
