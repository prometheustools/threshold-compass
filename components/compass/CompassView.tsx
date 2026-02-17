'use client'

import { useMemo, useEffect, useState } from 'react'
import Link from 'next/link'
import { Compass } from 'lucide-react'
import type { Batch, CarryoverResult, ThresholdRange as ThresholdRangeModel, User, DoseLog } from '@/types'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import LoadingState from '@/components/ui/LoadingState'
import CarryoverBadge from '@/components/compass/CarryoverBadge'
import ThresholdRange from '@/components/compass/ThresholdRange'
import DataDrivenCompass from '@/components/compass/DataDrivenCompass'
import EffectiveDose from '@/components/compass/EffectiveDose'

interface CompassViewProps {
  loading: boolean
  error: string | null
  previewMode?: boolean
  user: User | null
  activeBatch: Batch | null
  carryover: CarryoverResult
  thresholdRange: ThresholdRangeModel | null
  discoveryDoseNumber: number | null
  doseHistory: DoseLog[]
  referenceTime: number
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
  doseHistory,
  referenceTime,
  onLogDose,
  onSettle,
  onResumeSetup,
}: CompassViewProps) {
  const [showFirstVisit] = useState(() => {
    if (typeof window === 'undefined') return false
    if (previewMode) return false
    return !window.localStorage.getItem(FIRST_VISIT_KEY)
  })
  const unit: 'mg' | 'µg' = activeBatch?.dose_unit === 'ug' ? 'µg' : 'mg'
  const isCalibrating = activeBatch?.calibration_status === 'calibrating'
  const isCalibrated = activeBatch?.calibration_status === 'calibrated'
  const referenceDose = thresholdRange?.sweet_spot ?? (unit === 'µg' ? 10 : 100)

  useEffect(() => {
    if (showFirstVisit) {
      localStorage.setItem(FIRST_VISIT_KEY, 'true')
    }
  }, [showFirstVisit])

  // Check if user has any doses
  const hasDoses = doseHistory.length > 0

  const calibrationPrompt = useMemo(() => {
    if (!activeBatch) {
      return {
        title: 'No Active Batch',
        body: 'Choose a batch to activate your compass and start tracking.',
        ctaLabel: 'Create Batch',
        ctaHref: '/batch',
      }
    }

    if (!hasDoses) {
      return {
        title: 'Ready to Begin',
        body: 'Your compass is calibrated and ready. Log your first dose to activate the data view.',
        ctaLabel: 'Log First Dose',
        ctaHref: '/log',
      }
    }

    if (activeBatch.calibration_status === 'uncalibrated') {
      return {
        title: 'Building Your Profile',
        body: 'Log 10 doses to discover your personal threshold range. Each log improves accuracy.',
        ctaLabel: 'Continue Logging',
        ctaHref: '/log',
      }
    }

    return null
  }, [activeBatch, hasDoses])

  return (
    <div className="flex w-full flex-col gap-5 text-ivory animate-[fadeIn_800ms_ease-out]">
      {showFirstVisit && (
        <Card className="border-orange/40 bg-orange/10 p-5 animate-[fadeInUp_800ms_ease-out]">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-orange/20 flex items-center justify-center">
              <Compass className="w-5 h-5 text-orange" />
            </div>
            <div>
              <p className="font-mono text-xs tracking-widest uppercase text-orange">An instrument for people who take this seriously.</p>
              <p className="mt-1 text-sm text-bone">
                This is not onboarding. This is initiation. The compass learns your threshold through your data.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="pb-2">
        <p className="font-mono text-xs tracking-widest uppercase text-bone">Compass Instrument</p>
        <h1 className="mt-1 font-sans text-2xl text-ivory">Today&apos;s Readout</h1>
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
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-3 w-full"
                  onClick={onResumeSetup}
                  aria-label="Resume setup and leave preview mode"
                >
                  Resume Setup
                </Button>
              )}
            </Card>
          )}

          <Card padding="lg">
            <p className="font-mono text-xs tracking-widest uppercase text-bone">Active Batch</p>
            <p className="mt-2 font-sans text-xl text-ivory">{activeBatch?.name ?? 'No active batch selected'}</p>
            <p className="mt-1 text-sm text-ash">
              {activeBatch
                ? `Calibration: ${activeBatch.calibration_status.toUpperCase()}`
                : 'Select a batch to begin calibration.'}
            </p>
          </Card>

          <DataDrivenCompass
            doseHistory={doseHistory}
            thresholdRange={thresholdRange}
            carryover={carryover}
            unit={unit}
            isCalibrating={isCalibrating}
            discoveryDoseNumber={discoveryDoseNumber}
            referenceTime={referenceTime}
          />

          {calibrationPrompt && (
            <Card className="border-ember/40 bg-elevated/70 p-4">
              <p className="font-mono text-xs tracking-widest uppercase text-orange">{calibrationPrompt.title}</p>
              <p className="mt-2 text-sm text-bone">{calibrationPrompt.body}</p>
              <Link
                href={calibrationPrompt.ctaHref}
                aria-label={calibrationPrompt.ctaLabel}
                className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-button border border-ember/40 bg-elevated px-4 py-2 text-sm font-medium text-ivory transition-settle hover:border-ember/70 hover:bg-raised"
              >
                {calibrationPrompt.ctaLabel}
              </Link>
            </Card>
          )}

          {activeBatch && (
            <CarryoverBadge carryover={carryover} guidanceLevel={user?.guidance_level ?? 'guided'} />
          )}

          {/* Effective Dose Calculator - show when carryover > 15% and calibrated */}
          {isCalibrated && carryover.percentage > 15 && (
            <EffectiveDose
              amount={referenceDose}
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

          <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button
              type="button"
              size="lg"
              className="w-full"
              onClick={onLogDose}
              disabled={previewMode}
              aria-label="Open dose log form"
            >
              Log Dose
            </Button>
            <Button
              type="button"
              size="lg"
              variant="secondary"
              className="w-full"
              onClick={onSettle}
              disabled={previewMode}
              aria-label="Open settle tools"
            >
              Settle
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
