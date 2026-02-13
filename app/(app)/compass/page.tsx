'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Batch, CarryoverResult, ThresholdRange, User } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { resolveCurrentUserId } from '@/lib/auth/anonymous'
import { calculateCarryover } from '@/lib/algorithms/carryover'
import { getSchemaSetupMessage, isSchemaCacheTableMissingError } from '@/lib/supabase/errors'
import { useAppStore } from '@/store'
import CompassView from '@/components/compass/CompassView'

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
  floor_dose: 0.08,
  sweet_spot: 0.14,
  ceiling_dose: 0.2,
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

        if (!active) {
          return
        }

        setUserState(typedUser)
        setActiveBatchState(typedBatch)
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

  return (
    <CompassView
      loading={loading}
      error={error}
      previewMode={previewMode}
      user={user}
      activeBatch={activeBatch}
      carryover={carryover}
      thresholdRange={thresholdRange}
      discoveryDoseNumber={discoveryDoseNumber}
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
  )
}
