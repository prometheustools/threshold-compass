'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Pill } from 'lucide-react'
import type { Batch, Preparation, User } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { resolveCurrentUserId } from '@/lib/auth/anonymous'
import { isSchemaCacheTableMissingError, getSchemaSetupMessage } from '@/lib/supabase/errors'
import DoseDial from '@/components/forms/DoseDial'
import BatchSelector from '@/components/forms/BatchSelector'
import FoodStateSelector from '@/components/forms/FoodStateSelector'
import ContextSlider from '@/components/forms/ContextSlider'
import ExpandableSection from '@/components/forms/ExpandableSection'

interface LogPageRedesignedProps {
  user: User
  batches: Batch[]
  initialAmount?: number
}

export default function LogPageRedesigned({ batches, initialAmount }: LogPageRedesignedProps) {
  const router = useRouter()
  
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPressed, setIsPressed] = useState(false)
  
  // Form state
  const activeBatch = batches.find(b => b.is_active) ?? batches[0] ?? null
  const [batchId, setBatchId] = useState(activeBatch?.id ?? '')
  const [amount, setAmount] = useState(initialAmount ?? 100)
  const [preparation, setPreparation] = useState<Preparation | ''>('')
  const [sleepQuality, setSleepQuality] = useState<number | ''>('')
  const [energyLevel, setEnergyLevel] = useState<number | ''>('')
  const [stressLevel, setStressLevel] = useState<number | ''>('')
  const [notes, setNotes] = useState('')
  
  const doseUnit = activeBatch?.dose_unit === 'ug' ? 'ug' : 'mg'
  
  // Validate
  const isValid = useMemo(() => {
    return batchId && amount > 0
  }, [batchId, amount])
  
  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid || submitting) return
    
    setSubmitting(true)
    setError(null)
    
    try {
      const supabase = createClient()
      const anonUserId = await resolveCurrentUserId(supabase)
      if (!anonUserId) throw new Error('Session expired')
      
      const payload = {
        user_id: anonUserId,
        batch_id: batchId,
        amount: Number(amount.toFixed(4)),
        unit: doseUnit,
        dosed_at: new Date().toISOString(),
        preparation: preparation || null,
        sleep_quality: sleepQuality ? mapNumberToQuality(sleepQuality, 'sleep') : null,
        energy_level: energyLevel ? mapNumberToQuality(energyLevel, 'energy') : null,
        stress_level: stressLevel ? mapNumberToQuality(stressLevel, 'stress') : null,
        notes: notes.trim() || null,
      }
      
      const { error: insertError } = await supabase.from('dose_logs').insert(payload)
      if (insertError) throw insertError
      
      router.push('/compass')
      router.refresh()
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }
  
  // Helper to map 1-5 numbers to quality strings
  function mapNumberToQuality(num: number, type: 'sleep' | 'energy' | 'stress'): string {
    const maps = {
      sleep: ['poor', 'poor', 'fair', 'good', 'great', 'great'],
      energy: ['low', 'low', 'medium', 'high', 'high', 'high'],
      stress: ['high', 'high', 'medium', 'low', 'low', 'low']
    }
    return maps[type][num] || 'medium'
  }
  
  // Get error message
  function getErrorMessage(err: unknown): string {
    if (isSchemaCacheTableMissingError(err)) return getSchemaSetupMessage()
    if (err instanceof Error) return err.message
    return 'Unable to log dose'
  }
  
  return (
    <form onSubmit={handleSubmit} className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-ember/10">
        <div className="max-w-xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber/10 flex items-center justify-center">
              <Pill className="w-5 h-5 text-amber" />
            </div>
            <div>
              <p className="font-mono text-xs tracking-wider uppercase text-bone">Log Dose</p>
              <h1 className="text-xl font-semibold">New Entry</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-6 max-w-xl mx-auto space-y-6">
        {/* Dose Amount - Primary Control */}
        <section>
          <DoseDial
            value={amount}
            onChange={setAmount}
            unit={doseUnit}
          />
        </section>

        {/* Batch Selector */}
        <section>
          <p className="text-xs text-bone uppercase tracking-wider mb-3">Batch</p>
          <BatchSelector
            batches={batches}
            value={batchId}
            onChange={setBatchId}
            disabled={submitting}
          />
        </section>

        {/* Food State */}
        <section>
          <p className="text-xs text-bone uppercase tracking-wider mb-3">Food State</p>
          <FoodStateSelector
            value={preparation}
            onChange={setPreparation}
            disabled={submitting}
          />
        </section>

        {/* Context Sliders */}
        <section className="space-y-4">
          <p className="text-xs text-bone uppercase tracking-wider">Optional Context</p>
          <ContextSlider
            label="Sleep"
            value={sleepQuality}
            onChange={setSleepQuality}
            minEmoji="😴"
            maxEmoji="😊"
            disabled={submitting}
          />
          <ContextSlider
            label="Energy"
            value={energyLevel}
            onChange={setEnergyLevel}
            minEmoji="😫"
            maxEmoji="⚡"
            disabled={submitting}
          />
          <ContextSlider
            label="Stress"
            value={stressLevel}
            onChange={setStressLevel}
            minEmoji="😰"
            maxEmoji="😌"
            disabled={submitting}
          />
        </section>

        {/* Notes */}
        <section>
          <ExpandableSection title="Add Note" defaultExpanded={false}>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
              placeholder="Any observations..."
              rows={3}
              className="w-full bg-base rounded-xl border border-ember/30 px-4 py-3 text-ivory placeholder:text-ash focus:border-amber focus:outline-none resize-none"
            />
          </ExpandableSection>
        </section>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl bg-status-elevated/10 border border-status-elevated/30 text-status-elevated text-sm">
            {error}
          </div>
        )}
      </main>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-ember/10 px-4 py-4">
        <div className="max-w-xl mx-auto">
          <button
            type="submit"
            disabled={!isValid || submitting}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            onMouseLeave={() => setIsPressed(false)}
            onTouchStart={() => setIsPressed(true)}
            onTouchEnd={() => setIsPressed(false)}
            className={`w-full h-14 rounded-xl font-semibold text-lg text-surface transition-all duration-100 ${
              isValid && !submitting
                ? 'bg-amber hover:brightness-110 active:scale-[0.98]'
                : 'bg-elevated text-ash cursor-not-allowed'
            } ${isPressed ? 'scale-[0.98] brightness-90' : ''}`}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Logging...
              </span>
            ) : (
              'LOG DOSE'
            )}
          </button>
          
          {!isValid && !submitting && (
            <p className="mt-2 text-center text-xs text-ash">
              {!batchId ? 'Select a batch' : 'Enter dose amount'}
            </p>
          )}
        </div>
      </div>
    </form>
  )
}
