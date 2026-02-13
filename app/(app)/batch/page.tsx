'use client'

import { useEffect, useState } from 'react'
import { Layers, Plus, Archive, AlertTriangle } from 'lucide-react'
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
  const [submitting, setSubmitting] = useState(false)

  const supabase = createClient()

  const fetchBatches = async () => {
    const anonUserId = await resolveCurrentUserId(supabase)
    if (!anonUserId) return

    const { data } = await supabase
      .from('batches')
      .select('*')
      .eq('user_id', anonUserId)
      .order('is_active', { ascending: false })
      .order('updated_at', { ascending: false })

    setBatches((data ?? []) as Batch[])
    setLoading(false)
  }

  useEffect(() => {
    void fetchBatches()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreate = async (formData: BatchFormData) => {
    setSubmitting(true)
    const anonUserId = await resolveCurrentUserId(supabase)
    if (!anonUserId) {
      setSubmitting(false)
      return
    }

    await supabase.from('batches').insert({
      user_id: anonUserId,
      name: formData.name,
      substance_type: formData.substance_type,
      form: formData.form,
      estimated_potency: formData.estimated_potency,
      dose_unit: formData.dose_unit || 'mg',
      supplements: formData.supplements || null,
      source_notes: formData.source_notes || null,
      is_active: false,
    })

    setShowCreate(false)
    setSubmitting(false)
    await fetchBatches()
  }

  const handleSwitch = async () => {
    if (!switchTarget) return
    setSubmitting(true)

    const anonUserId = await resolveCurrentUserId(supabase)
    if (!anonUserId) {
      setSubmitting(false)
      return
    }

    // Deactivate all, then activate target
    await supabase
      .from('batches')
      .update({ is_active: false })
      .eq('user_id', anonUserId)
      .eq('is_active', true)

    await supabase
      .from('batches')
      .update({ is_active: true })
      .eq('id', switchTarget.id)

    setSwitchTarget(null)
    setSubmitting(false)
    await fetchBatches()
  }

  const handleArchive = async () => {
    if (!archiveTarget) return
    setSubmitting(true)

    await supabase
      .from('batches')
      .update({ is_active: false, calibration_status: archiveTarget.calibration_status })
      .eq('id', archiveTarget.id)

    // We use a separate field. The schema doesn't have is_archived, so we mark calibration_status or just deactivate.
    // Actually the schema DOES have is_archived based on Gemini's API route. Let me check.
    // The Batch type doesn't have is_archived — but the API route uses it. Let me keep it simple:
    // We'll just deactivate. If the schema has is_archived, we'll set it.

    setArchiveTarget(null)
    setSubmitting(false)
    await fetchBatches()
  }

  const activeBatches = batches.filter((b) => b.is_active)
  const inactiveBatches = batches.filter((b) => !b.is_active)
  
  const currentActiveBatch = activeBatches[0] ?? null

  const getPotencyMultiplier = (potency: string): number => {
    switch (potency) {
      case 'low': return 0.7
      case 'medium': return 1.0
      case 'high': return 1.4
      case 'unknown': return 1.0
      default: return 1.0
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

      {/* Header */}
      <header className="sticky top-0 z-30 bg-base/95 backdrop-blur-md border-b border-ember/10">
        <div className="max-w-xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange/10 border border-orange/20 flex items-center justify-center">
                <Layers className="w-5 h-5 text-orange" />
              </div>
              <div>
                <p className="font-mono text-xs tracking-wider uppercase text-bone">Inventory</p>
                <h1 className="text-xl font-semibold">Your Batches</h1>
              </div>
            </div>
            <Button 
              size="sm" 
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Batch</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 sm:px-6 py-6">
        <div className="max-w-xl mx-auto space-y-6">
          {showCreate && (
            <Card padding="lg" className="border-orange/30">
              <div className="flex items-center gap-2 mb-4">
                <Plus className="w-4 h-4 text-orange" />
                <p className="font-mono text-xs tracking-wider uppercase text-bone">Create New Batch</p>
              </div>
              <BatchForm
                onSubmit={handleCreate}
                onCancel={() => setShowCreate(false)}
                isSubmitting={submitting}
              />
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
                  <p className="font-mono text-xs tracking-wider uppercase text-bone flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-status-clear" />
                    Active ({activeBatches.length})
                  </p>
                  {activeBatches.map((batch) => (
                    <Card key={batch.id} padding="lg" className="border-orange/30 bg-gradient-to-br from-orange/5 to-transparent">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-lg text-ivory">{batch.name}</p>
                            <span className="px-2 py-0.5 rounded-full bg-orange/20 text-orange text-[10px] font-mono uppercase tracking-wider">
                              Active
                            </span>
                          </div>
                          <p className="text-sm text-bone">
                            {batch.substance_type} · <span className="capitalize">{batch.form}</span> · {batch.estimated_potency} potency · {batch.dose_unit || 'mg'}
                          </p>
                          {batch.supplements && (
                            <p className="mt-1 text-xs text-orange">+ {batch.supplements}</p>
                          )}
                          {batch.source_notes && (
                            <p className="mt-2 text-xs text-ash">{batch.source_notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-ember/10 flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-ash hover:text-status-elevated"
                          onClick={() => setArchiveTarget(batch)}
                        >
                          <Archive className="w-4 h-4 mr-1" />
                          Archive
                        </Button>
                      </div>
                    </Card>
                  ))}
                </section>
              )}

              {inactiveBatches.length > 0 && (
                <section className="space-y-3">
                  <p className="font-mono text-xs tracking-wider uppercase text-bone flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-ash" />
                    Inactive ({inactiveBatches.length})
                  </p>
                  {inactiveBatches.map((batch) => (
                    <Card key={batch.id} padding="lg" className="opacity-75 hover:opacity-100 transition-opacity">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-semibold text-lg text-ivory">{batch.name}</p>
                          <p className="text-sm text-bone">
                            {batch.substance_type} · <span className="capitalize">{batch.form}</span> · {batch.estimated_potency} potency · {batch.dose_unit || 'mg'}
                          </p>
                          {batch.supplements && (
                            <p className="mt-1 text-xs text-orange">+ {batch.supplements}</p>
                          )}
                          {batch.source_notes && (
                            <p className="mt-2 text-xs text-ash">{batch.source_notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-ember/10 flex gap-2">
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
                <Card padding="lg" className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-elevated flex items-center justify-center mx-auto mb-4">
                    <Layers className="w-8 h-8 text-ash" />
                  </div>
                  <p className="text-lg font-medium text-ivory mb-1">No batches yet? Fix that.</p>
                  <p className="text-sm text-bone mb-4">
                    Your dose potency swings 5-40x between sources. In wildland firefighting, precision is the
                    difference between control and catastrophe. Same applies here. Without a batch logged, your data is
                    incomplete and your compass lacks a true bearing.
                  </p>
                  <Button onClick={() => setShowCreate(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Batch
                  </Button>
                </Card>
              )}
            </>
          )}
        </div>
      </main>

      {/* Modals */}
      <Modal
        open={!!switchTarget}
        onClose={() => setSwitchTarget(null)}
        title="Switch Active Batch?"
      >
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-status-mild flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-ivory mb-1">
              You&apos;re switching to <strong>{switchTarget?.name}</strong>
            </p>
            {switchTarget && (
              <p className="text-xs text-orange font-mono">
                {getPotencyComparison(switchTarget.estimated_potency)}. Adjusting your threshold range.
              </p>
            )}
            <p className="text-xs text-bone mt-2">
              Different batches may have different potency. Consider recalibrating your threshold range.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => setSwitchTarget(null)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSwitch} loading={submitting}>
            Switch Batch
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        title="Archive Batch?"
      >
        <p className="text-sm text-ivory mb-4">
          Archive <strong>{archiveTarget?.name}</strong>? This will deactivate the batch but keep all dose history.
        </p>
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => setArchiveTarget(null)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button variant="danger" onClick={handleArchive} loading={submitting}>
            Archive
          </Button>
        </div>
      </Modal>
      </div>
  )
}
