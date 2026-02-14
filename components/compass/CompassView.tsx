'use client'

import { useMemo, useEffect, useState } from 'react'
import Link from 'next/link'
import type { Batch, CarryoverResult, ThresholdRange as ThresholdRangeModel, User } from '@/types'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import LoadingState from '@/components/ui/LoadingState'
import CarryoverBadge from '@/components/compass/CarryoverBadge'
import ThresholdRange from '@/components/compass/ThresholdRange'
import CompassVisualization from '@/components/compass/CompassVisualization'
import EffectiveDose from '@/components/compass/EffectiveDose'

type CompassState = 'dormant' | 'calibrating' | 'calibrated_rest' | 'calibrated_active' | 'elevated_carryover'

interface CompassViewProps {
  loading: boolean
  error: string | null
  previewMode?: boolean
  user: User | null
  activeBatch: Batch | null
  carryover: CarryoverResult
  thresholdRange: ThresholdRangeModel | null
  discoveryDoseNumber: number | null
  onLogDose: () => void
  onSettle: () => void
  onResumeSetup?: () => void
}

const FIRST_VISIT_KEY = 'compass_first_visit_shown'

export default function CompassView({
  loading,
  error,
  previewMode = false,
  user,
  activeBatch,
  carryover,
  thresholdRange,
  discoveryDoseNumber,
  onLogDose,
  onSettle,
  onResumeSetup,
}: CompassViewProps) {
  const [showFirstVisit] = useState(() => {
    if (typeof window === 'undefined') return false
    if (previewMode) return false
    return !window.localStorage.getItem(FIRST_VISIT_KEY)
  })
  const unit: 'g' | 'µg' = user?.substance_type === 'lsd' ? 'µg' : 'g'
  const isCalibrating = activeBatch?.calibration_status === 'calibrating'
  const isCalibrated = activeBatch?.calibration_status === 'calibrated'

  useEffect(() => {
    if (showFirstVisit) {
      localStorage.setItem(FIRST_VISIT_KEY, 'true')
    }
  }, [showFirstVisit])

  // Determine active dose hours (if user has dosed today)
  const activeDoseHours = useMemo(() => {
    // This would come from the most recent dose - placeholder for now
    return null
  }, [])

  // Determine compass state per PRD Section 6.6
  const compassState = useMemo((): CompassState => {
    if (isCalibrating) return 'calibrating'
    if (!isCalibrated && !isCalibrating) return 'dormant'
    if (carryover.tier === 'elevated') return 'elevated_carryover'
    if (activeDoseHours !== null && activeDoseHours < 8) return 'calibrated_active'
    return 'calibrated_rest'
  }, [isCalibrating, isCalibrated, carryover.tier, activeDoseHours])

  return (
    <div className="min-h-screen bg-base px-4 py-8 text-ivory animate-[fadeIn_800ms_ease-out]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-xl flex-col gap-4">
        {showFirstVisit && (
          <Card className="border-orange/40 bg-orange/10 p-4 animate-[fadeInUp_800ms_ease-out]">
            <p className="font-mono text-xs tracking-widest uppercase text-orange">An instrument for people who take this seriously.</p>
            <p className="mt-2 text-sm text-bone">
              This is not onboarding. This is initiation. The compass will learn your threshold through your data.
            </p>
          </Card>
        )}

        <div>
          <p className="font-mono text-xs tracking-widest uppercase text-bone">Compass</p>
          <h1 className="mt-2 font-sans text-2xl">Today&apos;s Read</h1>
        </div>

        {loading && (
          <Card padding="lg">
            <LoadingState message="calibrating" size="md" />
          </Card>
        )}

        {!loading && error && (
          <Card padding="lg" className="border-status-elevated/40">
            <p className="font-mono text-sm tracking-widest uppercase text-status-elevated">Load error</p>
            <p className="mt-2 text-sm text-bone">{error}</p>
          </Card>
        )}

        {!loading && !error && (
          <>
            {previewMode && (
              <Card className="border-status-mild/40 bg-status-mild/10 p-4">
                <p className="font-mono text-xs tracking-widest uppercase text-status-mild">Preview Mode</p>
                <p className="mt-2 text-sm text-bone">
                  You are viewing demo data. Complete onboarding to enable logging and personalized guidance.
                </p>
                {onResumeSetup && (
                  <Button type="button" variant="secondary" className="mt-3 w-full" onClick={onResumeSetup}>
                    Resume Setup
                  </Button>
                )}
              </Card>
            )}

            <Card padding="lg">
              <p className="font-mono text-xs tracking-widest uppercase text-bone">Active Batch</p>
              <p className="mt-2 font-sans text-xl">{activeBatch?.name ?? 'No active batch selected'}</p>
            </Card>

            {/* Compass Visualization */}
            <Card padding="lg" className="flex justify-center">
              <CompassVisualization
                state={compassState}
                northStar={user?.north_star ?? 'clarity'}
                progress={discoveryDoseNumber ?? undefined}
                thresholdRange={thresholdRange}
                activeDoseHours={activeDoseHours}
                carryoverTier={carryover.tier}
                carryoverPercentage={carryover.percentage}
                unit={unit}
                calibrationStatus={activeBatch?.calibration_status}
              />
            </Card>

            <CarryoverBadge carryover={carryover} guidanceLevel={user?.guidance_level ?? 'guided'} />

            {/* Effective Dose Calculator - show when carryover > 15% and calibrated */}
            {isCalibrated && carryover.percentage > 15 && (
              <EffectiveDose
                amount={0.1}
                effectiveMultiplier={carryover.effective_multiplier}
                guidanceLevel={user?.guidance_level ?? 'guided'}
                unit={unit}
              />
            )}

            {isCalibrated && thresholdRange && (
              <ThresholdRange range={thresholdRange} unit={unit} />
            )}

            {isCalibrated && !thresholdRange && (
              <Card>
                <p className="font-mono text-xs tracking-widest uppercase text-bone">Threshold Range</p>
                <p className="mt-2 text-sm text-bone">Range will appear after calibration data is synced.</p>
              </Card>
            )}

            {isCalibrating && (
              <Card className="border-status-mild/40 bg-status-mild/10">
                <p className="font-mono text-xs tracking-widest uppercase text-status-mild">Discovery Progress</p>
                <p className="mt-2 font-mono text-base tracking-wide uppercase text-ivory">
                  Dose {discoveryDoseNumber ?? 1} of 10
                </p>
              </Card>
            )}

            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button type="button" size="lg" className="w-full" onClick={onLogDose} disabled={previewMode}>
                Log Dose
              </Button>
              <Link
                href="/workshop"
                className="flex min-h-[44px] items-center justify-center rounded-button border border-violet/40 bg-violet/10 px-4 py-3 text-sm font-medium text-ivory transition-settle hover:border-violet/70 hover:bg-violet/20"
              >
                Open Workshop
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
