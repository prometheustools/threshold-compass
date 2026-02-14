'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { calculateThresholdRange } from '@/lib/algorithms/threshold-range'
import type { DoseLog, ThresholdZone } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { resolveCurrentUserId } from '@/lib/auth/anonymous'
import Card from '@/components/ui/Card'
import LoadingState from '@/components/ui/LoadingState'
import { ThresholdTerrainMap } from '@/components/insights'

function percent(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}

function confidenceMeta(score: number | null) {
  if ((score ?? 0) >= 80) {
    return { label: 'high', className: 'bg-status-clear/20 text-status-clear' }
  }
  if ((score ?? 0) >= 60) {
    return { label: 'medium', className: 'bg-status-mild/20 text-status-mild' }
  }
  return { label: 'low', className: 'bg-status-elevated/20 text-status-elevated' }
}

function toThresholdZone(row: DoseLog): ThresholdZone | null {
  if (row.threshold_feel === 'nothing') return 'sub'
  if (row.threshold_feel === 'under') return 'low'
  if (row.threshold_feel === 'sweetspot') return 'sweet_spot'
  if (row.threshold_feel === 'over') return 'over'

  if (row.day_classification === 'green') return 'sweet_spot'
  if (row.day_classification === 'yellow') return 'high'
  if (row.day_classification === 'red') return 'over'
  return null
}

export default function InsightsPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<DoseLog[]>([])
  const [patterns, setPatterns] = useState<
    Array<{
      id: string
      type: string
      title: string
      description: string | null
      confidence: number | null
      recommendation: string | null
    }>
  >([])
  const [patternBusy, setPatternBusy] = useState(false)

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      try {
        const supabase = createClient()
        const userId = await resolveCurrentUserId(supabase)
        if (!userId) {
          setRows([])
          return
        }

        const { data } = await supabase
          .from('dose_logs')
          .select('*')
          .eq('user_id', userId)
          .order('dosed_at', { ascending: false })
          .limit(250)

        if (!active) return
        setRows((data ?? []) as DoseLog[])

        const patternResponse = await fetch('/api/patterns')
        if (patternResponse.ok) {
          const payload = (await patternResponse.json()) as Array<{
            id: string
            type: string
            title: string
            description: string | null
            confidence: number | null
            recommendation: string | null
          }>
          if (!active) return
          setPatterns(payload)
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  const handleGeneratePatterns = async () => {
    setPatternBusy(true)
    try {
      const response = await fetch('/api/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate: true }),
      })
      if (!response.ok) return

      const listResponse = await fetch('/api/patterns')
      if (!listResponse.ok) return

      const nextPatterns = (await listResponse.json()) as Array<{
        id: string
        type: string
        title: string
        description: string | null
        confidence: number | null
        recommendation: string | null
      }>
      setPatterns(nextPatterns)
    } finally {
      setPatternBusy(false)
    }
  }

  const stats = useMemo(() => {
    const total = rows.length
    const dayCounts = { green: 0, yellow: 0, red: 0, unclassified: 0 }
    const feelCounts = { nothing: 0, under: 0, sweetspot: 0, over: 0 }
    let signalSum = 0
    let textureSum = 0
    let interferenceSum = 0
    let stiCount = 0

    for (const row of rows) {
      if (row.day_classification && row.day_classification in dayCounts) {
        dayCounts[row.day_classification] += 1
      }
      if (row.threshold_feel && row.threshold_feel in feelCounts) {
        feelCounts[row.threshold_feel] += 1
      }
      if (
        typeof row.signal_score === 'number' &&
        typeof row.texture_score === 'number' &&
        typeof row.interference_score === 'number'
      ) {
        signalSum += row.signal_score
        textureSum += row.texture_score
        interferenceSum += row.interference_score
        stiCount += 1
      }
    }

    return {
      total,
      dayCounts,
      feelCounts,
      avgSignal: stiCount > 0 ? (signalSum / stiCount).toFixed(1) : '0.0',
      avgTexture: stiCount > 0 ? (textureSum / stiCount).toFixed(1) : '0.0',
      avgInterference: stiCount > 0 ? (interferenceSum / stiCount).toFixed(1) : '0.0',
      stiCount,
    }
  }, [rows])

  const thresholdRange = useMemo(() => {
    const zoned = rows
      .map((row) => {
        const thresholdZone = toThresholdZone(row)
        if (!thresholdZone) return null
        return {
          amount: row.amount,
          threshold_zone: thresholdZone,
        }
      })
      .filter((entry): entry is { amount: number; threshold_zone: ThresholdZone } => entry !== null)

    if (zoned.length < 5) return null

    const batchId = rows.find((row) => row.batch_id)?.batch_id ?? 'active'
    return calculateThresholdRange(zoned, batchId)
  }, [rows])

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
        <div>
          <p className="font-mono text-xs tracking-widest uppercase text-bone">Insights</p>
          <h1 className="mt-2 text-2xl font-sans">Pattern Overview</h1>
          <Link
            href="/reflect"
            className="mt-3 inline-flex rounded-button border border-ember/30 px-3 py-2 text-xs uppercase tracking-wide text-bone transition-settle hover:border-ember/80 hover:text-ivory"
          >
            Open Reflection Log
          </Link>
        </div>

        <Card padding="lg">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-orange" />
            <p className="font-mono text-xs uppercase tracking-widest text-bone">Dataset</p>
          </div>
          <p className="mt-3 text-sm text-bone">
            {stats.total} total doses, {stats.stiCount} with STI scores.
          </p>
        </Card>

        <Card padding="lg">
          <p className="font-mono text-xs uppercase tracking-widest text-bone">Threshold Terrain Map</p>
          <div className="mt-3">
            <ThresholdTerrainMap range={thresholdRange} doses={rows} />
          </div>
        </Card>

        <Card padding="lg">
          <p className="font-mono text-xs uppercase tracking-widest text-bone">Day Classification</p>
          <div className="mt-3 space-y-2">
            {[
              ['green', stats.dayCounts.green, 'bg-status-clear'],
              ['yellow', stats.dayCounts.yellow, 'bg-status-mild'],
              ['red', stats.dayCounts.red, 'bg-status-elevated'],
              ['unclassified', stats.dayCounts.unclassified, 'bg-ash'],
            ].map(([label, count, barColor]) => (
              <div key={label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="uppercase tracking-wide text-bone">{label}</span>
                  <span className="font-mono text-ivory">{count}</span>
                </div>
                <div className="h-2 rounded bg-elevated">
                  <div
                    className={`h-2 rounded ${barColor}`}
                    style={{ width: `${percent(Number(count), stats.total)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg">
          <p className="font-mono text-xs uppercase tracking-widest text-bone">STI Averages</p>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-button border border-ember/20 bg-elevated p-3">
              <p className="text-xs text-bone uppercase">Signal</p>
              <p className="mt-1 font-mono text-lg text-ivory">{stats.avgSignal}</p>
            </div>
            <div className="rounded-button border border-ember/20 bg-elevated p-3">
              <p className="text-xs text-bone uppercase">Texture</p>
              <p className="mt-1 font-mono text-lg text-ivory">{stats.avgTexture}</p>
            </div>
            <div className="rounded-button border border-ember/20 bg-elevated p-3">
              <p className="text-xs text-bone uppercase">Interference</p>
              <p className="mt-1 font-mono text-lg text-ivory">{stats.avgInterference}</p>
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <p className="font-mono text-xs uppercase tracking-widest text-bone">Threshold Feel</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {Object.entries(stats.feelCounts).map(([label, count]) => (
              <div key={label} className="rounded-button border border-ember/20 bg-elevated px-3 py-2 text-sm">
                <span className="text-bone capitalize">{label}</span>
                <span className="float-right font-mono text-ivory">{count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-xs uppercase tracking-widest text-bone">Detected Patterns</p>
            <button
              type="button"
              onClick={handleGeneratePatterns}
              disabled={patternBusy}
              className="rounded-button border border-ember/30 px-3 py-2 text-xs uppercase tracking-wide text-bone transition-settle hover:border-ember/80 hover:text-ivory disabled:opacity-50"
            >
              {patternBusy ? 'Generating...' : 'Generate'}
            </button>
          </div>

          {patterns.length === 0 ? (
            <p className="mt-3 text-sm text-bone">No patterns yet. Generate after logging a few doses.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {patterns.slice(0, 6).map((pattern) => (
                <div key={pattern.id} className="rounded-button border border-ember/20 bg-elevated p-3">
                  {(() => {
                    const confidence = confidenceMeta(pattern.confidence)
                    return (
                      <div className="mb-2 flex items-center justify-between">
                        <span className={`rounded-button px-2 py-1 font-mono text-[10px] uppercase ${confidence.className}`}>
                          {confidence.label}
                        </span>
                        <span className="font-mono text-xs text-orange">{pattern.confidence ?? 0}%</span>
                      </div>
                    )
                  })()}
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-ivory">{pattern.title}</p>
                  </div>
                  {pattern.description && <p className="mt-1 text-xs text-bone">{pattern.description}</p>}
                  {pattern.recommendation && (
                    <p className="mt-2 text-xs text-bone">
                      Recommendation: <span className="text-ivory">{pattern.recommendation}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
