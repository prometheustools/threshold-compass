'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Batch, CarryoverResult, ThresholdRange, User, DoseLog } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { resolveCurrentUserId } from '@/lib/auth/anonymous'
import { calculateCarryover } from '@/lib/algorithms/carryover'
import { detectDrift } from '@/lib/algorithms/drift'
import { getSchemaSetupMessage, isSchemaCacheTableMissingError } from '@/lib/supabase/errors'
import { useAppStore } from '@/store'
import CompassView from '@/components/compass/CompassView'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

const DEFAULT_CARRYOVER: CarryoverResult = {
  percentage: 0,
  tier: 'clear',
  effective_multiplier: 1,
  hours_to_clear: null,
  message: 'Full sensitivity expected.',
}

const PREVIEW_STORAGE_KEY = 'compass_preview_mode'

const PREVIEW_USER: User = {
  id: 'preview-user',
  email: 'preview@local',
  substance_type: 'psilocybin',
  sensitivity: 3,
  north_star: 'clarity',
  guidance_level: 'guided',
  menstrual_tracking: false,
  emergency_contact: null,
  onboarding_complete: false,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

const PREVIEW_BATCH: Batch = {
  id: 'preview-batch',
  user_id: 'preview-user',
  name: 'Demo Batch',
  substance_type: 'psilocybin',
  form: 'ground',
  estimated_potency: 'medium',
  dose_unit: 'mg',
  supplements: null,
  source_notes: 'Preview mode sample data',
  date_acquired: null,
  is_active: true,
  calibration_status: 'calibrated',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

const PREVIEW_RANGE: ThresholdRange = {
  id: 'preview-range',
  user_id: 'preview-user',
  batch_id: 'preview-batch',
  floor_dose: 80,
  sweet_spot: 140,
  ceiling_dose: 200,
  confidence: 72,
  qualifier: 'Preview estimate only',
  doses_used: 8,
  calculated_at: '2026-01-01T00:00:00.000Z',
}

const PREVIEW_CARRYOVER: CarryoverResult = {
  percentage: 9,
  tier: 'mild',
  effective_multiplier: 0.91,
  hours_to_clear: 18,
  message: 'Mild carryover expected from recent dosing.',
}

const PREVIEW_DOSE_HISTORY: DoseLog[] = [
  {
    id: 'preview-1',
    user_id: 'preview-user',
    batch_id: 'preview-batch',
    amount: 140,
    unit: 'mg',
    dosed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    preparation: 'empty_stomach',
    sleep_quality: 'good',
    energy_level: 'medium',
    stress_level: 'low',
    cycle_day: null,
    notes: null,
    discovery_dose_number: 8,
    phase: 'context',
    dose_number: 8,
    pre_dose_mood: 4,
    intention: 'Focus work session',
    post_dose_completed: true,
    post_dose_mood: 5,
    signal_score: 8,
    texture_score: 6,
    interference_score: 2,
    threshold_feel: 'sweetspot',
    day_classification: 'green',
    context_tags: ['work'],
    timing_tag: 'morning',
    carryover_score: null,
    effective_dose: null,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'preview-2',
    user_id: 'preview-user',
    batch_id: 'preview-batch',
    amount: 120,
    unit: 'mg',
    dosed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    preparation: 'light_meal',
    sleep_quality: 'fair',
    energy_level: 'low',
    stress_level: 'medium',
    cycle_day: null,
    notes: null,
    discovery_dose_number: 7,
    phase: 'context',
    dose_number: 7,
    pre_dose_mood: 3,
    intention: 'Creative exploration',
    post_dose_completed: true,
    post_dose_mood: 4,
    signal_score: 6,
    texture_score: 7,
    interference_score: 3,
    threshold_feel: 'under',
    day_classification: 'yellow',
    context_tags: ['creative'],
    timing_tag: 'afternoon',
    carryover_score: null,
    effective_dose: null,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

function getErrorMessage(error: unknown): string {
  if (isSchemaCacheTableMissingError(error)) {
    return getSchemaSetupMessage()
  }

  if (typeof error === 'object' && error && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') {
      return message
    }
  }

  return 'Unable to load Compass data right now.'
}

function formatUnitLabel(unit: string): string {
  return unit === 'ug' ? 'µg' : unit
}

export default function CompassPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUserState] = useState<User | null>(null)
  const [activeBatch, setActiveBatchState] = useState<Batch | null>(null)
  const [carryover, setCarryoverState] = useState<CarryoverResult>(DEFAULT_CARRYOVER)
  const [thresholdRange, setThresholdRangeState] = useState<ThresholdRange | null>(null)
  const [discoveryDoseNumber, setDiscoveryDoseNumber] = useState<number | null>(null)
  const [previewMode, setPreviewMode] = useState(false)
  const [doseHistory, setDoseHistory] = useState<DoseLog[]>([])

  // Quick Log states
  const [lastDose, setLastDose] = useState<DoseLog | null>(null)
  const [quickLogLoading, setQuickLogLoading] = useState(false)
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null)
  const [confirmationTone, setConfirmationTone] = useState<'success' | 'error'>('success')
  const [lastLoggedDoseId, setLastLoggedDoseId] = useState<string | null>(null)

  // Drift detection and tooltip states
  const [driftResult, setDriftResult] = useState<{ isDrifting: boolean; direction: 'above' | 'below' | null; message: string; severity: 'info' | 'warning' } | null>(null)
  const [showTooltip, setShowTooltip] = useState(false)

  const setUser = useAppStore((state) => state.setUser)
  const setActiveBatch = useAppStore((state) => state.setActiveBatch)
  const setCarryover = useAppStore((state) => state.setCarryover)
  const setThresholdRange = useAppStore((state) => state.setThresholdRange)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const queryPreviewMode = params.get('preview') === '1'
    if (queryPreviewMode) {
      try {
        window.localStorage.setItem(PREVIEW_STORAGE_KEY, '1')
      } catch {
        // no-op
      }
      setPreviewMode(true)
      return
    }

    try {
      setPreviewMode(window.localStorage.getItem(PREVIEW_STORAGE_KEY) === '1')
    } catch {
      setPreviewMode(false)
    }
  }, [])

  // Fetch last dose when active batch changes
  useEffect(() => {
    if (previewMode || !activeBatch) {
      setLastDose(null)
      return
    }

    const fetchLastDose = async () => {
      try {
        const supabase = createClient()
        const anonUserId = await resolveCurrentUserId(supabase)
        
        if (!anonUserId) return

        const { data, error } = await supabase
          .from('dose_logs')
          .select('*')
          .eq('user_id', anonUserId)
          .eq('batch_id', activeBatch.id)
          .order('dosed_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) throw error
        setLastDose(data as DoseLog | null)
      } catch {
        setLastDose(null)
      }
    }

    fetchLastDose()
  }, [activeBatch, previewMode])

  // Auto-dismiss confirmation after 3 seconds
  useEffect(() => {
    if (!confirmationMessage) return

    const timer = setTimeout(() => {
      setConfirmationMessage(null)
      if (confirmationTone === 'success') {
        // Refresh the page data after successful confirmation dismisses
        window.location.reload()
      }
    }, 3000)

    return () => clearTimeout(timer)
  }, [confirmationMessage, confirmationTone])

  useEffect(() => {
    let active = true

    const loadCompassData = async () => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams(window.location.search)
        const queryPreviewMode = params.get('preview') === '1'
        const storedPreviewMode =
          typeof window !== 'undefined' && window.localStorage.getItem(PREVIEW_STORAGE_KEY) === '1'
        if (queryPreviewMode || storedPreviewMode) {
          if (!active) {
            return
          }

          setPreviewMode(true)
          setUserState(PREVIEW_USER)
          setActiveBatchState(PREVIEW_BATCH)
          setCarryoverState(PREVIEW_CARRYOVER)
          setThresholdRangeState(PREVIEW_RANGE)
          setDiscoveryDoseNumber(null)
          setDoseHistory(PREVIEW_DOSE_HISTORY)

          setUser(PREVIEW_USER)
          setActiveBatch(PREVIEW_BATCH)
          setCarryover(PREVIEW_CARRYOVER)
          setThresholdRange(PREVIEW_RANGE)
          return
        }

        const supabase = createClient()
        const anonUserId = await resolveCurrentUserId(supabase)
        
        if (!anonUserId) {
          router.push('/autologin')
          return
        }

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', anonUserId)
          .maybeSingle()

        if (userError && isSchemaCacheTableMissingError(userError, 'users')) {
          throw userError
        }

        if (userError) {
          throw userError
        }

        let typedUser: User | null = (userData as User | null) ?? null
        if (!typedUser) {
          const { data: insertedUser, error: insertUserError } = await supabase
            .from('users')
            .insert({
              id: anonUserId,
              email: `anon_${anonUserId.slice(0, 8)}@local.invalid`,
              onboarding_complete: false,
            })
            .select('*')
            .single()

          if (insertUserError) {
            throw insertUserError
          }

          typedUser = insertedUser as User
        }

        if (!typedUser?.onboarding_complete) {
          router.push('/onboarding')
          return
        }

        const { data: batchRows, error: batchError } = await supabase
          .from('batches')
          .select('*')
          .eq('user_id', anonUserId)
          .eq('is_active', true)
          .order('updated_at', { ascending: false })
          .limit(1)

        if (batchError) {
          throw batchError
        }

        const typedBatch = (batchRows?.[0] as Batch | undefined) ?? null
        const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

        // Fetch full dose history for the compass visualization
        const { data: fullDoseRows, error: fullDoseError } = await supabase
          .from('dose_logs')
          .select('*')
          .eq('user_id', anonUserId)
          .order('dosed_at', { ascending: false })

        if (fullDoseError) {
          throw fullDoseError
        }

        const typedFullDoses = (fullDoseRows ?? []) as DoseLog[]
        setDoseHistory(typedFullDoses)

        // Fetch 14-day dose history for carryover calculation
        const { data: doseRows, error: doseError } = await supabase
          .from('dose_logs')
          .select('amount,dosed_at')
          .eq('user_id', anonUserId)
          .gte('dosed_at', fourteenDaysAgo)
          .order('dosed_at', { ascending: false })

        if (doseError) {
          throw doseError
        }

        const typedDoseRows = (doseRows ?? []) as Array<{ amount: number; dosed_at: string }>
        const nextCarryover = calculateCarryover(typedDoseRows, typedUser.substance_type)

        let nextThresholdRange: ThresholdRange | null = null
        let nextDiscoveryDoseNumber: number | null = null

        if (typedBatch) {
          const { data: rangeData, error: rangeError } = await supabase
            .from('threshold_ranges')
            .select('*')
            .eq('user_id', anonUserId)
            .eq('batch_id', typedBatch.id)
            .maybeSingle()

          if (rangeError) {
            throw rangeError
          }

          nextThresholdRange = (rangeData as ThresholdRange | null) ?? null

          if (typedBatch.calibration_status === 'calibrating') {
            const { data: discoveryRows, error: discoveryError } = await supabase
              .from('dose_logs')
              .select('discovery_dose_number')
              .eq('user_id', anonUserId)
              .eq('batch_id', typedBatch.id)
              .not('discovery_dose_number', 'is', null)
              .order('discovery_dose_number', { ascending: false })
              .limit(1)

            if (discoveryError) {
              throw discoveryError
            }

            const maxLoggedDiscoveryDose = discoveryRows?.[0]?.discovery_dose_number ?? 0
            nextDiscoveryDoseNumber = Math.min(10, maxLoggedDiscoveryDose + 1)
          }
        }

        // Calculate drift if we have threshold range and enough doses
        if (nextThresholdRange) {
          const drift = detectDrift(typedDoseRows, nextThresholdRange)
          setDriftResult(drift)
        } else {
          setDriftResult(null)
        }

        if (!active) {
          return
        }

        setUserState(typedUser)
        setActiveBatchState(typedBatch)

        // Check if we should show the first-run tooltip
        const tooltipKey = 'compass_tooltip_seen'
        if (!window.localStorage.getItem(tooltipKey) && typedBatch?.calibration_status === 'calibrating') {
          setShowTooltip(true)
        }
        setCarryoverState(nextCarryover)
        setThresholdRangeState(nextThresholdRange)
        setDiscoveryDoseNumber(nextDiscoveryDoseNumber)

        setUser(typedUser)
        setActiveBatch(typedBatch)
        setCarryover(nextCarryover)
        setThresholdRange(nextThresholdRange)
      } catch (loadError) {
        if (!active) {
          return
        }

        setError(getErrorMessage(loadError))
      } finally {
        if (!active) {
          return
        }

        setLoading(false)
      }
    }

    void loadCompassData()

    return () => {
      active = false
    }
  }, [router, setActiveBatch, setCarryover, setThresholdRange, setUser])

  const handleQuickLog = async () => {
    if (!lastDose || !activeBatch || previewMode) return

    setQuickLogLoading(true)
    setLastLoggedDoseId(null)
    try {
      const response = await fetch('/api/doses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: lastDose.amount,
          unit: lastDose.unit,
          batch_id: activeBatch.id,
          preparation: null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to log dose')
      }

      const data = await response.json()
      setLastLoggedDoseId(data.id)
      setConfirmationTone('success')
      setConfirmationMessage(`Dose logged at ${lastDose.amount}${formatUnitLabel(lastDose.unit)}. Your compass will refresh shortly.`)
    } catch {
      setConfirmationTone('error')
      setConfirmationMessage('Could not log that dose. Try again in a moment.')
    } finally {
      setQuickLogLoading(false)
    }
  }

  const handleUndo = async () => {
    if (!lastLoggedDoseId) return

    try {
      const response = await fetch(`/api/doses?id=${lastLoggedDoseId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setConfirmationMessage(null)
        setLastLoggedDoseId(null)
      }
    } catch {
      // Silently fail
    }
  }

  const handleDismissConfirmation = () => {
    const shouldRefresh = confirmationTone === 'success'
    setConfirmationMessage(null)
    if (shouldRefresh) {
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen bg-base px-4 py-6 text-ivory">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-xl flex-col gap-5">
        <CompassView
          loading={loading}
          error={error}
          previewMode={previewMode}
          user={user}
          activeBatch={activeBatch}
          carryover={carryover}
          thresholdRange={thresholdRange}
          discoveryDoseNumber={discoveryDoseNumber}
          doseHistory={doseHistory}
          referenceTime={Date.now()}
          onLogDose={() => router.push('/log')}
          onSettle={() => router.push('/settle')}
          onResumeSetup={() => {
            try {
              window.localStorage.removeItem(PREVIEW_STORAGE_KEY)
            } catch {
              // no-op
            }
            setPreviewMode(false)
            router.push('/onboarding')
          }}
        />

        {/* First-run Tooltip */}
        {showTooltip && (
          <div className="mx-auto w-full max-w-xl rounded-card border border-ember/30 bg-elevated px-4 py-3 transition-settle">
            <p className="text-sm text-ivory mb-2">
              Your compass tracks calibration progress. Log 10 doses to discover your threshold range — the dose window where you feel effects without excess.
            </p>
            <button
              type="button"
              onClick={() => {
                window.localStorage.setItem('compass_tooltip_seen', '1')
                setShowTooltip(false)
              }}
              aria-label="Dismiss compass calibration tip"
              className="inline-flex min-h-[44px] min-w-[44px] items-center rounded-button px-3 text-xs font-mono uppercase tracking-wider text-orange transition-settle hover:text-ivory"
            >
              Got it
            </button>
          </div>
        )}

        {/* Drift Detection Banner */}
        {driftResult?.isDrifting && (
          <div className={`mx-auto w-full max-w-xl rounded-card border px-4 py-3 ${
            driftResult.severity === 'warning'
              ? 'border-orange/40 bg-orange/10'
              : 'border-ember/30 bg-elevated'
          }`}>
            <p className="mb-1 font-mono text-xs uppercase tracking-widest text-bone">
              Pattern Note
            </p>
            <p className="text-sm text-ivory">{driftResult.message}</p>
            <p className="mt-2 text-xs text-bone">
              {driftResult.direction === 'above'
                ? 'You are trending above range. Consider a lighter next dose or an extra rest day.'
                : 'You are trending below range. Consider checking batch strength and recent context before adjusting.'}
            </p>
            <Link
              href="/drift"
              aria-label="Review drift guidance"
              className="mt-3 inline-flex min-h-[44px] items-center rounded-button border border-ember/40 px-3 py-2 text-xs font-mono uppercase tracking-wider text-bone transition-settle hover:border-ember/70 hover:text-ivory"
            >
              Review Drift
            </Link>
          </div>
        )}

        {/* Quick Log Section */}
        {!loading && !error && !previewMode && activeBatch && (
          <Card padding="md" className="mt-2">
            <p className="font-mono text-xs tracking-widest uppercase text-bone mb-3">Quick Log</p>
            
            {confirmationMessage ? (
              <div
                className={`rounded-button border px-3 py-3 transition-settle ${
                  confirmationTone === 'success'
                    ? 'border-status-clear/40 bg-status-clear/10'
                    : 'border-status-elevated/40 bg-status-elevated/10'
                }`}
                aria-live="polite"
              >
                <p className={`font-mono text-[11px] uppercase tracking-widest ${
                  confirmationTone === 'success' ? 'text-status-clear' : 'text-status-elevated'
                }`}>
                  {confirmationTone === 'success' ? 'Logged' : 'Not Logged'}
                </p>
                <p className="mt-1 text-sm text-ivory">{confirmationMessage}</p>
                <div className="mt-3 flex items-center gap-2">
                  {lastLoggedDoseId && (
                    <button
                      type="button"
                      onClick={handleUndo}
                      aria-label="Undo quick logged dose"
                      className="inline-flex min-h-[44px] min-w-[44px] items-center rounded-button border border-orange/40 px-3 py-2 text-xs font-mono uppercase tracking-wider text-orange transition-settle hover:border-orange hover:text-ivory"
                    >
                      Undo
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleDismissConfirmation}
                    aria-label="Dismiss quick log confirmation"
                    className="inline-flex min-h-[44px] min-w-[44px] items-center rounded-button border border-ember/30 px-3 py-2 text-xs font-mono uppercase tracking-wider text-bone transition-settle hover:border-ember/70 hover:text-ivory"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ) : lastDose ? (
              <Button
                type="button"
                variant="primary"
                className="w-full"
                onClick={handleQuickLog}
                loading={quickLogLoading}
                disabled={quickLogLoading}
                aria-label={`Quick log last dose of ${lastDose.amount}${formatUnitLabel(lastDose.unit)}`}
              >
                Log Same ({lastDose.amount}{formatUnitLabel(lastDose.unit)})
              </Button>
            ) : (
              <Link
                href="/log"
                aria-label="Log your first dose"
                className="flex min-h-[44px] items-center justify-center rounded-button border border-ember/30 bg-elevated px-4 py-3 text-sm font-medium text-bone transition-settle hover:border-ember/60 hover:text-ivory"
              >
                Log First Dose
              </Link>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
