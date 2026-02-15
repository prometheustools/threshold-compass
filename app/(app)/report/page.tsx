'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Batch, ThresholdRange, User, DoseLog } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { resolveCurrentUserId } from '@/lib/auth/anonymous'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import LoadingState from '@/components/ui/LoadingState'

interface ReportData {
  user: User
  batch: Batch
  thresholdRange: ThresholdRange
  doseCount: number
  recentDoses: Array<{ amount: number; unit: string; dosed_at: string }>
}

function formatReport(data: ReportData): string {
  const lines = [
    'THRESHOLD COMPASS — PERSONAL THRESHOLD REPORT',
    '═'.repeat(48),
    '',
    `Substance: ${data.user.substance_type}`,
    `Batch: ${data.batch.name} (${data.batch.form}, ${data.batch.estimated_potency} potency)`,
    `Doses analyzed: ${data.doseCount}`,
    `Confidence: ${data.thresholdRange.confidence}%`,
    '',
    '── THRESHOLD RANGE ──',
    `Floor:      ${data.thresholdRange.floor_dose} ${data.batch.dose_unit}`,
    `Sweet Spot: ${data.thresholdRange.sweet_spot} ${data.batch.dose_unit}`,
    `Ceiling:    ${data.thresholdRange.ceiling_dose} ${data.batch.dose_unit}`,
    '',
    data.thresholdRange.qualifier ? `Note: ${data.thresholdRange.qualifier}` : '',
    '',
    `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    '',
    'All data stays on your device. Nothing is shared.',
  ].filter(Boolean)

  return lines.join('\n')
}

export default function ReportPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const supabase = createClient()
        const userId = await resolveCurrentUserId(supabase)
        if (!userId) { router.push('/autologin'); return }

        const { data: userData } = await supabase.from('users').select('*').eq('id', userId).single()
        if (!userData || !active) return

        const { data: batchRows } = await supabase
          .from('batches').select('*').eq('user_id', userId).eq('is_active', true).limit(1)

        const batch = batchRows?.[0] as Batch | undefined
        if (!batch || !active) { setError('No active batch found.'); setLoading(false); return }

        const { data: rangeData } = await supabase
          .from('threshold_ranges').select('*').eq('user_id', userId).eq('batch_id', batch.id).maybeSingle()

        if (!rangeData || !active) { setError('No threshold range calculated yet. Complete 10 calibration doses first.'); setLoading(false); return }

        const { data: doseRows } = await supabase
          .from('dose_logs').select('amount,unit,dosed_at')
          .eq('user_id', userId).eq('batch_id', batch.id)
          .order('dosed_at', { ascending: false })

        if (!active) return

        setReportData({
          user: userData as User,
          batch,
          thresholdRange: rangeData as ThresholdRange,
          doseCount: doseRows?.length ?? 0,
          recentDoses: (doseRows ?? []).slice(0, 10) as Array<{ amount: number; unit: string; dosed_at: string }>,
        })
      } catch {
        if (active) setError('Unable to generate report.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => { active = false }
  }, [router])

  const handleExportJSON = () => {
    if (!reportData) return
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `threshold-report-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const handleCopy = async () => {
    if (!reportData) return
    await navigator.clipboard.writeText(formatReport(reportData))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-base px-4 py-8 text-ivory">
        <div className="mx-auto w-full max-w-xl">
          <Card padding="lg"><LoadingState message="generating report" size="md" /></Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base px-4 py-8 text-ivory">
      <div className="mx-auto w-full max-w-xl space-y-4">
        <Link href="/compass" className="text-sm text-bone hover:text-ivory">← Compass</Link>

        <div>
          <p className="font-mono text-xs tracking-widest uppercase text-bone">Report</p>
          <h1 className="mt-2 text-2xl font-sans">Threshold Report</h1>
        </div>

        {error ? (
          <Card padding="lg">
            <p className="text-sm text-bone">{error}</p>
            <Link href="/compass" className="mt-3 inline-block text-sm text-orange hover:underline">
              Return to Compass
            </Link>
          </Card>
        ) : reportData ? (
          <>
            <Card padding="lg">
              <p className="font-mono text-xs tracking-widest uppercase text-bone">Substance</p>
              <p className="mt-1 text-lg text-ivory">{reportData.user.substance_type}</p>
              <p className="mt-0.5 text-sm text-bone">
                {reportData.batch.name} — {reportData.batch.form}, {reportData.batch.estimated_potency} potency
              </p>
            </Card>

            <Card padding="lg" className="border-orange/20">
              <p className="font-mono text-xs tracking-widest uppercase text-orange">Threshold Range</p>
              <div className="mt-3 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="font-mono text-2xl text-status-clear">{reportData.thresholdRange.floor_dose}</p>
                  <p className="text-xs text-bone mt-1">Floor</p>
                </div>
                <div>
                  <p className="font-mono text-2xl text-orange">{reportData.thresholdRange.sweet_spot}</p>
                  <p className="text-xs text-bone mt-1">Sweet Spot</p>
                </div>
                <div>
                  <p className="font-mono text-2xl text-status-elevated">{reportData.thresholdRange.ceiling_dose}</p>
                  <p className="text-xs text-bone mt-1">Ceiling</p>
                </div>
              </div>
              <p className="mt-2 text-center text-xs text-ash">{reportData.batch.dose_unit}</p>
            </Card>

            <Card padding="md">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-bone">Confidence</p>
                  <p className="font-mono text-lg text-ivory">{reportData.thresholdRange.confidence}%</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-bone">Doses Analyzed</p>
                  <p className="font-mono text-lg text-ivory">{reportData.doseCount}</p>
                </div>
              </div>
            </Card>

            {reportData.thresholdRange.qualifier && (
              <Card padding="md" className="bg-elevated/50">
                <p className="text-xs text-bone">{reportData.thresholdRange.qualifier}</p>
              </Card>
            )}

            <div className="flex gap-3">
              <Button variant="primary" className="flex-1" onClick={handleExportJSON}>
                Export JSON
              </Button>
              <Button variant="secondary" className="flex-1" onClick={handleCopy}>
                {copied ? 'Copied' : 'Copy to Clipboard'}
              </Button>
            </div>

            <Card padding="md" className="bg-elevated/30">
              <p className="font-mono text-xs tracking-widest uppercase text-ash">Privacy</p>
              <p className="mt-1 text-xs text-bone">
                All data stays on your device. Nothing is shared.
              </p>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  )
}
