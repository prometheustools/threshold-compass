'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Batch, ThresholdRange } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { resolveCurrentUserId } from '@/lib/auth/anonymous'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import LoadingState from '@/components/ui/LoadingState'

interface BatchComparison {
  batch: Batch
  range: ThresholdRange
  span: number
}

const NO_THRESHOLD_RANGES_ERROR = 'No batches with calculated threshold ranges'

export default function ComparePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [comparisons, setComparisons] = useState<BatchComparison[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const supabase = createClient()
        const userId = await resolveCurrentUserId(supabase)
        if (!userId) { router.push('/autologin'); return }

        const { data: batchRows } = await supabase
          .from('batches').select('*').eq('user_id', userId).order('created_at', { ascending: false })

        const batches = (batchRows ?? []) as Batch[]
        if (!active) return

        const results: BatchComparison[] = []

        for (const batch of batches) {
          const { data: rangeData } = await supabase
            .from('threshold_ranges').select('*').eq('batch_id', batch.id).maybeSingle()

          if (rangeData) {
            const range = rangeData as ThresholdRange
            const span = (range.ceiling_dose ?? 0) - (range.floor_dose ?? 0)
            results.push({ batch, range, span })
          }
        }

        if (!active) return

        if (results.length === 0) {
          setError(NO_THRESHOLD_RANGES_ERROR)
        } else {
          setComparisons(results)
        }
      } catch {
        if (active) setError('Unable to load batch comparison data.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => { active = false }
  }, [router])

  const bestConfidence = comparisons.length > 0
    ? comparisons.reduce((best, c) => c.range.confidence > best.range.confidence ? c : best)
    : null

  const tightestRange = comparisons.length > 0
    ? comparisons.reduce((best, c) => c.span < best.span && c.span > 0 ? c : best)
    : null

  if (loading) {
    return (
      <div className="min-h-screen bg-base px-4 py-8 text-ivory">
        <div className="mx-auto w-full max-w-xl">
          <Card padding="lg"><LoadingState message="comparing batches" size="md" /></Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base px-4 py-8 text-ivory">
      <div className="mx-auto w-full max-w-xl space-y-4">
        <Link href="/compass" className="text-sm text-bone hover:text-ivory">← Compass</Link>

        <div>
          <p className="font-mono text-xs tracking-widest uppercase text-bone">Compare</p>
          <h1 className="mt-2 text-2xl font-sans">Batch Comparison</h1>
          {comparisons.length > 0 && (
            <p className="mt-1 text-sm text-bone">{comparisons.length} batch{comparisons.length !== 1 ? 'es' : ''} with threshold data</p>
          )}
        </div>

        {error ? (
          <Card padding="lg">
            <p className="text-sm text-bone">{error}</p>
            {error === NO_THRESHOLD_RANGES_ERROR && (
              <p className="mt-2 text-xs text-ash">
                Complete 10 calibration doses on a batch to unlock comparison.
              </p>
            )}
            {error === NO_THRESHOLD_RANGES_ERROR ? (
              <Button
                type="button"
                variant="primary"
                className="mt-4 w-full sm:w-auto"
                onClick={() => router.push('/batch')}
              >
                Manage Batches
              </Button>
            ) : (
              <Link href="/batch" className="mt-3 inline-block text-sm text-orange hover:underline">
                Manage Batches
              </Link>
            )}
          </Card>
        ) : (
          <>
            {comparisons.map((c) => {
              const isBestConfidence = bestConfidence?.batch.id === c.batch.id
              const isTightest = tightestRange?.batch.id === c.batch.id

              return (
                <Card
                  key={c.batch.id}
                  padding="lg"
                  className={c.batch.is_active ? 'border-orange/30' : ''}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-lg text-ivory font-medium">{c.batch.name}</p>
                      <p className="text-xs text-bone mt-0.5">
                        {c.batch.substance_type} — {c.batch.form}, {c.batch.estimated_potency}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {c.batch.is_active && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-orange/15 text-orange border border-orange/30">
                          Active
                        </span>
                      )}
                      {isBestConfidence && comparisons.length > 1 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-status-clear/15 text-status-clear border border-status-clear/30">
                          Best Confidence
                        </span>
                      )}
                      {isTightest && comparisons.length > 1 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-violet/15 text-violet border border-violet/30">
                          Tightest
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="font-mono text-xl text-status-clear">{c.range.floor_dose}</p>
                      <p className="text-[10px] text-bone mt-1 uppercase tracking-wider">Floor</p>
                    </div>
                    <div>
                      <p className="font-mono text-xl text-orange">{c.range.sweet_spot}</p>
                      <p className="text-[10px] text-bone mt-1 uppercase tracking-wider">Sweet Spot</p>
                    </div>
                    <div>
                      <p className="font-mono text-xl text-status-elevated">{c.range.ceiling_dose}</p>
                      <p className="text-[10px] text-bone mt-1 uppercase tracking-wider">Ceiling</p>
                    </div>
                  </div>

                  <div className="mt-3 flex justify-between items-center border-t border-ember/15 pt-3">
                    <div className="flex gap-4">
                      <div>
                        <p className="text-[10px] text-ash uppercase tracking-wider">Confidence</p>
                        <p className="font-mono text-sm text-ivory">{c.range.confidence}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-ash uppercase tracking-wider">Range Span</p>
                        <p className="font-mono text-sm text-ivory">{c.span.toFixed(2)} {c.batch.dose_unit}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-ash uppercase tracking-wider">Doses Used</p>
                        <p className="font-mono text-sm text-ivory">{c.range.doses_used}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}

            {comparisons.length === 1 && (
              <Card padding="md" className="bg-elevated/30">
                <p className="text-xs text-bone">
                  Complete calibration on a second batch to see side-by-side comparison and find which source works best for you.
                </p>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
