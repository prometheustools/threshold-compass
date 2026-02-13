'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Batch, ThresholdRange } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { resolveCurrentUserId } from '@/lib/auth/anonymous'
import { getSchemaSetupMessage, isSchemaCacheTableMissingError } from '@/lib/supabase/errors'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import LoadingState from '@/components/ui/LoadingState'
import DiscoveryProgress from '@/components/discovery/DiscoveryProgress'
import DoseGuidance from '@/components/discovery/DoseGuidance'

interface PhaseInfo {
  name: string
  description: string
}

function getPhaseInfo(doseNum: number): PhaseInfo {
  if (doseNum <= 4) {
    return {
      name: 'Baseline',
      description:
        'Establish a personal baseline. Record experiences without actively seeking thresholds. Pay attention to subtle effects.',
    }
  }
  if (doseNum <= 7) {
    return {
      name: 'Mapping',
      description:
        'Explore the edges of perception. Carefully adjust doses to map out initial threshold zones. Observe changes closely.',
    }
  }
  return {
    name: 'Refinement',
    description:
      'Fine-tune your understanding. Pinpoint precise thresholds and observe consistency across various conditions.',
  }
}

function formatDoseValue(value: number | null): string {
  if (value === null || value === undefined) return '--'
  if (Number.isInteger(value)) return `${value}`
  return value.toFixed(2).replace(/\.?0+$/, '')
}

export default function DiscoveryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [currentDose, setCurrentDose] = useState(1)
  const [dosesCompleted, setDosesCompleted] = useState(0)
  const [thresholdRange, setThresholdRange] = useState<ThresholdRange | null>(null)
  const [calibrated, setCalibrated] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const supabase = createClient()
        const anonUserId = await resolveCurrentUserId(supabase)
        
        if (!anonUserId) {
          router.push('/autologin')
          return
        }

        const { data: batchRows } = await supabase
          .from('batches')
          .select('*')
          .eq('user_id', anonUserId)
          .eq('is_active', true)
          .limit(1)

        const batch = (batchRows?.[0] as Batch | undefined) ?? null

        if (!batch) {
          if (active) {
            setError('No active batch found. Create a batch to start discovery.')
            setLoading(false)
          }
          return
        }

        if (batch.calibration_status === 'calibrated') {
          const { data: rangeData } = await supabase
            .from('threshold_ranges')
            .select('*')
            .eq('user_id', anonUserId)
            .eq('batch_id', batch.id)
            .maybeSingle()

          if (active) {
            setCalibrated(true)
            setCurrentDose(10)
            setDosesCompleted(10)
            setThresholdRange((rangeData as ThresholdRange | null) ?? null)
          }
        } else {
          const { data: doseRows } = await supabase
            .from('dose_logs')
            .select('discovery_dose_number')
            .eq('user_id', anonUserId)
            .eq('batch_id', batch.id)
            .not('discovery_dose_number', 'is', null)
            .order('discovery_dose_number', { ascending: false })
            .limit(1)

          const lastDose = doseRows?.[0]?.discovery_dose_number ?? 0
          const completed = Math.min(10, lastDose)
          const nextDose = Math.min(10, lastDose + 1)

          if (completed >= 5) {
            const { data: rangeData } = await supabase
              .from('threshold_ranges')
              .select('*')
              .eq('user_id', anonUserId)
              .eq('batch_id', batch.id)
              .maybeSingle()

            if (active) setThresholdRange((rangeData as ThresholdRange | null) ?? null)
          }

          if (active) {
            setDosesCompleted(completed)
            setCurrentDose(nextDose)
          }
        }
      } catch (err) {
        console.error('Discovery load error:', err)
        if (active) {
          if (isSchemaCacheTableMissingError(err)) {
            setError(getSchemaSetupMessage())
          } else {
            setError('Unable to load discovery progress')
          }
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [router])

  useEffect(() => {
    if (!calibrated || !thresholdRange) {
      setRevealed(false)
      return
    }

    const revealTimer = setTimeout(() => setRevealed(true), 500)
    return () => clearTimeout(revealTimer)
  }, [calibrated, thresholdRange])

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

  if (error) {
    return (
      <div className="min-h-screen bg-base px-4 py-8 text-ivory">
        <div className="mx-auto w-full max-w-xl space-y-6">
          <div>
            <p className="font-mono text-xs tracking-widest uppercase text-bone">
              Discovery Protocol
            </p>
            <h1 className="mt-2 font-sans text-2xl">10-Dose Calibration</h1>
          </div>

          <Card padding="lg" className="border-status-elevated/40">
            <p className="font-mono text-xs tracking-widest uppercase text-status-elevated">
              Error
            </p>
            <p className="mt-3 text-ivory">{error}</p>
          </Card>

          <Link href="/batch">
            <Button size="lg" className="w-full">
              Manage Batches
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (calibrated) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] px-4 py-8 text-[#F5F2E9] animate-[fadeIn_800ms_ease-out]">
        <div className="mx-auto w-full max-w-xl space-y-6">
          <div>
            <p className="font-mono text-xs tracking-widest uppercase text-[#C4C0B6]">
              Discovery Protocol
            </p>
            <h1 className="mt-2 font-sans text-2xl">Calibration Complete</h1>
          </div>

          {thresholdRange ? (
            <Card padding="lg" className="border-[#1E1E1E] bg-[#121212]">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div
                  className={`rounded-lg bg-[#1E1E1E] p-4 transition-all duration-[800ms] ease-out ${
                    revealed ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                  }`}
                  style={{ transitionDelay: '0ms' }}
                >
                  <p className="font-mono text-xs tracking-[0.2em] uppercase text-[#8A8A8A]">LOW</p>
                  <p className="mt-2 font-mono text-4xl leading-none text-[#8A8A8A]">
                    {formatDoseValue(thresholdRange.floor_dose)}
                  </p>
                </div>

                <div
                  className={`rounded-lg bg-[#1E1E1E] p-4 transition-all duration-[800ms] ease-out ${
                    revealed ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                  }`}
                  style={{ transitionDelay: '300ms' }}
                >
                  <p className="font-mono text-xs tracking-[0.2em] uppercase text-[#E07A3E]">SWEET SPOT</p>
                  <p
                    className="mt-2 font-mono text-4xl leading-none text-[#E07A3E]"
                    style={{ animation: revealed ? 'sweetGlow 800ms ease-out infinite' : 'none' }}
                  >
                    {formatDoseValue(thresholdRange.sweet_spot)}
                  </p>
                </div>

                <div
                  className={`rounded-lg bg-[#1E1E1E] p-4 transition-all duration-[800ms] ease-out ${
                    revealed ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                  }`}
                  style={{ transitionDelay: '600ms' }}
                >
                  <p className="font-mono text-xs tracking-[0.2em] uppercase text-[#B54A4A]">HIGH</p>
                  <p className="mt-2 font-mono text-4xl leading-none text-[#B54A4A]">
                    {formatDoseValue(thresholdRange.ceiling_dose)}
                  </p>
                </div>
              </div>

              <p className="mt-5 text-sm text-[#C4C0B6]">Your threshold range. This is YOUR data.</p>
            </Card>
          ) : (
            <Card padding="lg" className="border-[#1E1E1E] bg-[#121212]">
              <p className="font-mono text-xs tracking-widest uppercase text-[#C4C0B6]">Range Pending</p>
              <p className="mt-3 text-[#C4C0B6]">Calibration complete. Waiting for range data to sync.</p>
            </Card>
          )}

          <Card padding="lg" className="border-status-clear/40">
            <p className="font-mono text-xs tracking-widest uppercase text-status-clear">
              Success
            </p>
            <p className="mt-3 text-ivory">
              Your calibrated threshold range is established. Continue logging doses
              to refine your understanding over time.
            </p>
          </Card>

          <Link href="/compass">
            <Button size="lg" className="w-full">
              Return to Compass
            </Button>
          </Link>

          <style jsx>{`
            @keyframes sweetGlow {
              0%,
              100% {
                text-shadow: 0 0 10px #e07a3e40;
              }
              50% {
                text-shadow: 0 0 20px #e07a3e80;
              }
            }
          `}</style>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base px-4 py-8 text-ivory animate-[fadeIn_800ms_ease-out]">
      <div className="mx-auto w-full max-w-xl space-y-6">
        <div>
          <p className="font-mono text-xs tracking-widest uppercase text-bone">
            Discovery Protocol
          </p>
          <h1 className="mt-2 font-sans text-2xl">10-Dose Calibration</h1>
          <p className="mt-2 text-sm text-bone">
            Systematically explore your personal threshold range through structured
            self-observation.
          </p>
        </div>

        {/* Progress Component */}
        <DiscoveryProgress
          currentDose={currentDose}
          dosesCompleted={dosesCompleted}
          preliminaryRange={thresholdRange}
        />

        {/* Dose Guidance */}
        {currentDose <= 10 && <DoseGuidance doseNumber={currentDose} />}

        {/* Action Button */}
        {currentDose <= 10 ? (
          <Link href="/log">
            <Button size="lg" className="w-full">
              Log Dose {currentDose}
            </Button>
          </Link>
        ) : (
          <Card padding="lg" className="border-status-clear/40">
            <p className="font-mono text-xs tracking-widest uppercase text-status-clear">
              Protocol Complete
            </p>
            <p className="mt-2 text-ivory">
              All 10 doses logged. Your threshold calibration is complete.
            </p>
          </Card>
        )}

        {/* Info Card */}
        <Card padding="md" className="bg-elevated/30">
          <p className="font-mono text-xs tracking-widest uppercase text-ash">
            About This Protocol
          </p>
          <p className="mt-2 text-xs text-bone leading-relaxed">
            The 10-Dose Discovery Protocol is our proprietary methodology for precise self-mapping. The initial four
            doses establish your baseline — the fundamental shifts and signatures of this compound within YOUR system.
            The next six doses expand that map across different contexts, environments, and states of mind. This is
            not the Fadiman protocol. This is a rigorous process designed to yield a deeply personalized understanding
            of your optimal range.
          </p>
        </Card>
      </div>
    </div>
  )
}
