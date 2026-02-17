'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Layers, Plus, Archive, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { Batch, SubstanceType, BatchForm as BatchFormType, EstimatedPotency } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { resolveCurrentUserId } from '@/lib/auth/anonymous'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import BatchForm from '@/components/forms/BatchForm'
import LoadingState from '@/components/ui/LoadingState'

interface BatchFormData {
  name: string
  substance_type: SubstanceType
  form: BatchFormType
  estimated_potency: EstimatedPotency
  dose_unit: string
  supplements: string
  source_notes: string
}

export default function BatchPage() {
  const [loading, setLoading] = useState(true)
  const [batches, setBatches] = useState<Batch[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [switchTarget, setSwitchTarget] = useState<Batch | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<Batch | null>(null)
  const [recalibrateTarget, setRecalibrateTarget] = useState<Batch | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  const fetchBatches = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const anonUserId = await resolveCurrentUserId(supabase)
      if (!anonUserId) {
        setError('Session missing. Return to login and try again.')
        setLoading(false)
        return
      }

      const { data, error: fetchError } = await supabase
        .from('batches')
        .select('*')
        .eq('user_id', anonUserId)
        .order('is_active', { ascending: false })
        .order('updated_at', { ascending: false })

      if (fetchError) {
        throw fetchError
      }

      setBatches((data ?? []) as Batch[])
    } catch (fetchErr) {
      const message = fetchErr instanceof Error ? fetchErr.message : 'Unable to load batches right now.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    void fetchBatches()
  }, [fetchBatches])

  const setTemporaryNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(null), 2600)
  }

  const handleCreate = async (formData: BatchFormData) => {
    setSubmitting(true)
    setError(null)

    try {
      const anonUserId = await resolveCurrentUserId(supabase)
      if (!anonUserId) {
        throw new Error('Session missing. Return to login and try again.')
      }

      const { error: deactivateError } = await supabase
        .from('batches')
        .update({ is_active: false })
        .eq('user_id', anonUserId)
        .eq('is_active', true)

      if (deactivateError) {
        throw deactivateError
      }

      const { error: createError } = await supabase.from('batches').insert({
        user_id: anonUserId,
        name: formData.name,
        substance_type: formData.substance_type,
        form: formData.form,
        estimated_potency: formData.estimated_potency,
        dose_unit: formData.dose_unit || (formData.substance_type === 'lsd' ? 'ug' : 'mg'),
        supplements: formData.supplements || null,
        source_notes: formData.source_notes || null,
        is_active: true,
      })

      if (createError) {
        throw createError
      }

      setShowCreate(false)
      setTemporaryNotice('New batch created and set active.')
      await fetchBatches()
    } catch (createErr) {
      const message = createErr instanceof Error ? createErr.message : 'Unable to create batch.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSwitch = async () => {
    if (!switchTarget) return

    setSubmitting(true)
    setError(null)

    try {
      const anonUserId = await resolveCurrentUserId(supabase)
      if (!anonUserId) {
        throw new Error('Session missing. Return to login and try again.')
      }

      const { error: deactivateError } = await supabase
        .from('batches')
        .update({ is_active: false })
        .eq('user_id', anonUserId)
        .eq('is_active', true)

      if (deactivateError) {
        throw deactivateError
      }

      const { error: activateError } = await supabase
        .from('batches')
        .update({ is_active: true })
        .eq('id', switchTarget.id)
        .eq('user_id', anonUserId)

      if (activateError) {
        throw activateError
      }

      setSwitchTarget(null)
      setTemporaryNotice(`Active batch switched to ${switchTarget.name}.`)
      await fetchBatches()
    } catch (switchErr) {
      const message = switchErr instanceof Error ? switchErr.message : 'Unable to switch batch.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleArchive = async () => {
    if (!archiveTarget) return

    setSubmitting(true)
    setError(null)

    try {
      const anonUserId = await resolveCurrentUserId(supabase)
      if (!anonUserId) {
        throw new Error('Session missing. Return to login and try again.')
      }

      const { error: archiveError } = await supabase
        .from('batches')
        .update({ is_active: false })
        .eq('id', archiveTarget.id)
        .eq('user_id', anonUserId)

      if (archiveError) {
        throw archiveError
      }

      if (archiveTarget.is_active) {
        const replacement = batches.find((batch) => batch.id !== archiveTarget.id)
        if (replacement) {
          const { error: activateError } = await supabase
            .from('batches')
            .update({ is_active: true })
            .eq('id', replacement.id)
            .eq('user_id', anonUserId)

          if (activateError) {
            throw activateError
          }
        }
      }

      setArchiveTarget(null)
      setTemporaryNotice(`Batch ${archiveTarget.name} archived.`)
      await fetchBatches()
    } catch (archiveErr) {
      const message = archiveErr instanceof Error ? archiveErr.message : 'Unable to archive batch.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRecalibrate = async () => {
    if (!recalibrateTarget) return

    setSubmitting(true)
    setError(null)

    try {
      const anonUserId = await resolveCurrentUserId(supabase)
      if (!anonUserId) {
        throw new Error('Session missing. Return to login and try again.')
      }

      const { error: recalibrateError } = await supabase
        .from('batches')
        .update({ calibration_status: 'calibrating' })
        .eq('id', recalibrateTarget.id)
        .eq('user_id', anonUserId)

      if (recalibrateError) {
        throw recalibrateError
      }

      setRecalibrateTarget(null)
      setTemporaryNotice(`Batch ${recalibrateTarget.name} set to recalibrate.`)
      await fetchBatches()
    } catch (recalibrateErr) {
      const message = recalibrateErr instanceof Error ? recalibrateErr.message : 'Unable to set batch for recalibration.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const activeBatches = batches.filter((batch) => batch.is_active)
  const inactiveBatches = batches.filter((batch) => !batch.is_active)
  const currentActiveBatch = activeBatches[0] ?? null

  const getPotencyMultiplier = (potency: string): number => {
    switch (potency) {
      case 'low':
        return 0.7
      case 'medium':
        return 1.0
      case 'high':
        return 1.4
      case 'unknown':
        return 1.0
      default:
        return 1.0
    }
  }

  const getPotencyComparison = (targetPotency: string): string => {
    if (!currentActiveBatch) return ''
    const currentMult = getPotencyMultiplier(currentActiveBatch.estimated_potency)
    const targetMult = getPotencyMultiplier(targetPotency)
    const ratio = targetMult / currentMult

    if (ratio > 1.1) return `This batch is ${(ratio - 1).toFixed(1)}x more potent`
    if (ratio < 0.9) return `This batch is ${(1 - ratio).toFixed(1)}x less potent`
    return 'Similar potency to your current batch'
  }

  return (
    <div className="min-h-screen bg-base text-ivory">
      <header className="sticky top-0 z-30 border-b border-ember/10 bg-base/95 backdrop-blur-md">
        <div className="mx-auto max-w-xl px-4 py-4 sm:px-6">
          <Link href="/compass" className="text-sm text-bone hover:text-ivory mb-2 inline-block">
            ← Compass
          </Link>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange/20 bg-orange/10">
                <Layers className="h-5 w-5 text-orange" />
              </div>
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-bone">Inventory</p>
                <h1 className="text-xl font-semibold">Your Batches</h1>
              </div>
            </div>
            <Button size="sm" onClick={() => setShowCreate(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Batch</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-xl space-y-6">
          {notice && (
            <div className="rounded-card border border-status-clear/30 bg-status-clear/10 px-4 py-3 text-sm text-status-clear">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>{notice}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-card border border-status-elevated/30 bg-status-elevated/10 px-4 py-3 text-sm text-status-elevated">
              {error}
            </div>
          )}

          {showCreate && (
            <Card padding="lg" className="border-orange/30">
              <div className="mb-4 flex items-center gap-2">
                <Plus className="h-4 w-4 text-orange" />
                <p className="font-mono text-xs uppercase tracking-wider text-bone">Create New Batch</p>
              </div>
              <BatchForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} isSubmitting={submitting} />
            </Card>
          )}

          {loading ? (
            <Card padding="lg">
              <LoadingState message="loading" size="md" />
            </Card>
          ) : (
            <>
              {activeBatches.length > 0 && (
                <section className="space-y-3">
                  <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-bone">
                    <span className="h-2 w-2 rounded-full bg-status-clear" />
                    Active ({activeBatches.length})
                  </p>
                  {activeBatches.map((batch) => (
                    <Card key={batch.id} padding="lg" className="border-orange/30 bg-gradient-to-br from-orange/5 to-transparent">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <p className="text-lg font-semibold text-ivory">{batch.name}</p>
                            <span className="rounded-full bg-orange/20 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-orange">
                              Active
                            </span>
                          </div>
                          <p className="text-sm text-bone">
                            {batch.substance_type} · <span className="capitalize">{batch.form}</span> · {batch.estimated_potency} potency · {batch.dose_unit || 'mg'}
                          </p>
                          {batch.supplements && <p className="mt-1 text-xs text-orange">+ {batch.supplements}</p>}
                          {batch.source_notes && <p className="mt-2 text-xs text-ash">{batch.source_notes}</p>}
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2 border-t border-ember/10 pt-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-ash hover:text-status-elevated"
                          onClick={() => setArchiveTarget(batch)}
                        >
                          <Archive className="mr-1 h-4 w-4" />
                          Archive
                        </Button>
                        {batch.calibration_status === 'calibrated' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="border-ember/30 text-bone hover:border-ember/80"
                            onClick={() => setRecalibrateTarget(batch)}
                          >
                            Recalibrate
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </section>
              )}

              {inactiveBatches.length > 0 && (
                <section className="space-y-3">
                  <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-bone">
                    <span className="h-2 w-2 rounded-full bg-ash" />
                    Inactive ({inactiveBatches.length})
                  </p>
                  {inactiveBatches.map((batch) => (
                    <Card key={batch.id} padding="lg" className="opacity-75 transition-opacity hover:opacity-100">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-lg font-semibold text-ivory">{batch.name}</p>
                          <p className="text-sm text-bone">
                            {batch.substance_type} · <span className="capitalize">{batch.form}</span> · {batch.estimated_potency} potency · {batch.dose_unit || 'mg'}
                          </p>
                          {batch.supplements && <p className="mt-1 text-xs text-orange">+ {batch.supplements}</p>}
                          {batch.source_notes && <p className="mt-2 text-xs text-ash">{batch.source_notes}</p>}
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2 border-t border-ember/10 pt-4">
                        <Button size="sm" onClick={() => setSwitchTarget(batch)}>
                          Activate
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-ash hover:text-status-elevated"
                          onClick={() => setArchiveTarget(batch)}
                        >
                          Archive
                        </Button>
                      </div>
                    </Card>
                  ))}
                </section>
              )}

              {batches.length === 0 && (
                <Card padding="lg" className="py-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-elevated">
                    <Layers className="h-8 w-8 text-ash" />
                  </div>
                  <p className="mb-1 text-lg font-medium text-ivory">No batches yet.</p>
                  <p className="mb-4 text-sm text-bone">Create one batch now so dose logging can stay consistent.</p>
                  <Button onClick={() => setShowCreate(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Batch
                  </Button>
                </Card>
              )}
            </>
          )}
        </div>
      </main>

      <Modal open={!!switchTarget} onClose={() => setSwitchTarget(null)} title="Switch Active Batch?">
        <div className="mb-4 flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-status-mild" />
          <div>
            <p className="mb-1 text-sm text-ivory">
              You&apos;re switching to <strong>{switchTarget?.name}</strong>
            </p>
            {switchTarget && <p className="font-mono text-xs text-orange">{getPotencyComparison(switchTarget.estimated_potency)}.</p>}
            <p className="mt-2 text-xs text-bone">Different batches may behave differently. Consider recalibrating threshold range.</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setSwitchTarget(null)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSwitch} loading={submitting}>
            Switch Batch
          </Button>
        </div>
      </Modal>

      <Modal open={!!archiveTarget} onClose={() => setArchiveTarget(null)} title="Archive Batch?">
        <p className="mb-4 text-sm text-ivory">
          Archive <strong>{archiveTarget?.name}</strong>? This deactivates the batch but keeps all dose history.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setArchiveTarget(null)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleArchive} loading={submitting}>
            Archive
          </Button>
        </div>
      </Modal>

      <Modal open={!!recalibrateTarget} onClose={() => setRecalibrateTarget(null)} title="Recalibrate Batch?">
        <div className="mb-4 flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-status-mild" />
          <div>
            <p className="mb-1 text-sm text-ivory">
              This will reset the calibration status for <strong>{recalibrateTarget?.name}</strong>.
            </p>
            <p className="mt-2 text-xs text-bone">You&apos;ll need to log 10 new doses to recalibrate your threshold range.</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRecalibrateTarget(null)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleRecalibrate} loading={submitting}>
            Continue to Recalibrate
          </Button>
        </div>
      </Modal>
    </div>
  )
}
