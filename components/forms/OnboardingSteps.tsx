'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  FlaskConical,
  Loader2,
} from 'lucide-react'
import type { BatchForm, EstimatedPotency, GuidanceLevel, NorthStar, SubstanceType } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { resolveCurrentUserId } from '@/lib/auth/anonymous'
import { getSchemaSetupMessage, isSchemaCacheTableMissingError } from '@/lib/supabase/errors'
import Input from '@/components/ui/Input'

const TOTAL_STEPS = 2
const PREVIEW_STORAGE_KEY = 'compass_preview_mode'

const stepConfig = [
  {
    id: 1,
    icon: FlaskConical,
    title: 'Substance + First Batch',
    description: 'Set your tracking unit and name the batch you are about to use.',
  },
  {
    id: 2,
    icon: Check,
    title: 'Ready to Start',
    description: 'Everything else is optional and can be changed later in Settings.',
  },
] as const

const substanceOptions: Array<{ value: SubstanceType; label: string; description: string }> = [
  {
    value: 'psilocybin',
    label: 'Psilocybin mushrooms',
    description: 'Tracked in milligrams (mg).',
  },
  {
    value: 'lsd',
    label: 'LSD',
    description: 'Tracked in micrograms (µg).',
  },
  {
    value: 'other',
    label: 'Other substance',
    description: 'Uses the same Compass workflow with manual labels.',
  },
]

interface OnboardingState {
  substance_type: SubstanceType | null
  other_substance: string
  first_batch_name: string
}

const DEFAULT_SENSITIVITY = 3
const DEFAULT_NORTH_STAR: NorthStar = 'clarity'
const DEFAULT_GUIDANCE_LEVEL: GuidanceLevel = 'guided'
const DEFAULT_BATCH_POTENCY: EstimatedPotency = 'unknown'

function getBatchDefaults(substance: SubstanceType): { form: BatchForm; doseUnit: 'mg' | 'ug' } {
  switch (substance) {
    case 'lsd':
      return { form: 'paper', doseUnit: 'ug' }
    case 'other':
      return { form: 'whole', doseUnit: 'mg' }
    case 'psilocybin':
    default:
      return { form: 'ground', doseUnit: 'mg' }
  }
}

export default function OnboardingSteps() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [stepError, setStepError] = useState<string | null>(null)
  const [state, setState] = useState<OnboardingState>({
    substance_type: null,
    other_substance: '',
    first_batch_name: '',
  })

  const currentStepConfig = stepConfig[step - 1]
  const StepIcon = currentStepConfig.icon
  const progressPercent = ((step - 1) / (TOTAL_STEPS - 1)) * 100

  const substanceDisplay = useMemo(() => {
    if (state.substance_type === 'other') {
      const value = state.other_substance.trim()
      return value.length > 0 ? value : 'Other'
    }
    const selected = substanceOptions.find((option) => option.value === state.substance_type)
    return selected?.label ?? 'Not selected'
  }, [state.other_substance, state.substance_type])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const isRedo = params.get('redo') === '1' || params.get('dev') === '1'
      if (!isRedo) return
      setStep(1)
    }
  }, [])

  const validateStepOne = () => {
    if (!state.substance_type) {
      setStepError('Please select a substance to continue.')
      return false
    }
    if (state.substance_type === 'other' && !state.other_substance.trim()) {
      setStepError('Please name the substance you want to track.')
      return false
    }
    if (!state.first_batch_name.trim()) {
      setStepError('Please enter your first batch name.')
      return false
    }
    return true
  }

  const goToStep = (targetStep: number) => {
    if (submitting) return
    setStepError(null)

    if (targetStep > step && step === 1 && !validateStepOne()) {
      return
    }

    setStep(Math.max(1, Math.min(TOTAL_STEPS, targetStep)))
  }

  const handleCheckOutApp = () => {
    try {
      window.localStorage.setItem(PREVIEW_STORAGE_KEY, '1')
    } catch {
      // no-op
    }
    router.push('/compass?preview=1')
  }

  const handleComplete = async () => {
    if (submitting) return
    if (!validateStepOne()) return

    setSubmitting(true)
    setStepError(null)

    try {
      const supabase = createClient()
      const anonUserId = await resolveCurrentUserId(supabase)

      if (!anonUserId) {
        router.push('/autologin')
        return
      }

      const substanceType = state.substance_type as SubstanceType
      const batchDefaults = getBatchDefaults(substanceType)
      const batchSourceNote =
        substanceType === 'other' && state.other_substance.trim().length > 0
          ? `Substance label: ${state.other_substance.trim()}`
          : null

      const { error: profileError } = await supabase.from('users').upsert(
        {
          id: anonUserId,
          email: `anon_${anonUserId.slice(0, 8)}@localhost`,
          substance_type: substanceType,
          sensitivity: DEFAULT_SENSITIVITY,
          north_star: DEFAULT_NORTH_STAR,
          guidance_level: DEFAULT_GUIDANCE_LEVEL,
          onboarding_complete: false,
        },
        { onConflict: 'id' }
      )

      if (profileError) {
        if (isSchemaCacheTableMissingError(profileError, 'users')) {
          setStepError(getSchemaSetupMessage('users'))
          setSubmitting(false)
          return
        }
        throw profileError
      }

      const { error: batchError } = await supabase.from('batches').insert({
        user_id: anonUserId,
        name: state.first_batch_name.trim(),
        substance_type: substanceType,
        form: batchDefaults.form,
        estimated_potency: DEFAULT_BATCH_POTENCY,
        source_notes: batchSourceNote,
        dose_unit: batchDefaults.doseUnit,
        is_active: true,
        calibration_status: 'uncalibrated',
      })

      if (batchError) {
        if (isSchemaCacheTableMissingError(batchError, 'batches')) {
          setStepError(getSchemaSetupMessage('batches'))
          setSubmitting(false)
          return
        }
        throw batchError
      }

      const { error: completionError } = await supabase
        .from('users')
        .update({ onboarding_complete: true })
        .eq('id', anonUserId)

      if (completionError) {
        if (isSchemaCacheTableMissingError(completionError, 'users')) {
          setStepError(getSchemaSetupMessage('users'))
          setSubmitting(false)
          return
        }
        throw completionError
      }

      router.push('/log')
    } catch (error) {
      console.error('Onboarding error:', error)
      if (isSchemaCacheTableMissingError(error)) {
        setStepError(`${getSchemaSetupMessage()} You can still check out the app in preview mode.`)
      } else {
        setStepError('Unable to complete setup. Please try again.')
      }
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-base text-ivory">
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="h-1 bg-elevated">
          <div
            className="h-full bg-gradient-to-r from-orange to-ember transition-all duration-[500ms] ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <header className="fixed top-0 left-0 right-0 z-40 bg-base/80 backdrop-blur-md border-b border-ember/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-orange" />
            <span className="font-mono text-sm tracking-wider text-bone hidden sm:inline">Threshold Compass</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-ash">Step {step} of {TOTAL_STEPS}</span>
            <button
              onClick={handleCheckOutApp}
              disabled={submitting}
              className="text-xs text-ash hover:text-ivory transition-colors flex items-center gap-1 disabled:opacity-50 min-h-[44px] px-2"
            >
              Check out app <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-orange/10 border border-orange/20 mb-4">
              <StepIcon className="w-6 h-6 sm:w-8 sm:h-8 text-orange" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold mb-2">{currentStepConfig.title}</h1>
            <p className="text-bone text-sm sm:text-base max-w-md mx-auto">{currentStepConfig.description}</p>
          </div>

          {stepError && (
            <div className="mb-6 p-4 rounded-xl bg-status-elevated/10 border border-status-elevated/30 text-status-elevated text-sm">
              <p>{stepError}</p>
              <button
                type="button"
                onClick={handleCheckOutApp}
                className="mt-3 text-xs uppercase tracking-wide text-bone hover:text-ivory min-h-[44px]"
              >
                Open preview instead
              </button>
            </div>
          )}

          <div className="space-y-6">
            {step === 1 && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:gap-6">
                  {substanceOptions.map((option) => (
                    <button
                      key={option.value}
                      disabled={submitting}
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                          substance_type: option.value,
                          other_substance: option.value === 'other' ? prev.other_substance : '',
                        }))
                      }
                      className={`group relative p-5 sm:p-6 rounded-2xl border-2 text-left transition-all duration-300 min-h-[44px] disabled:opacity-50 ${
                        state.substance_type === option.value
                          ? 'border-orange bg-orange/5'
                          : 'border-ember/20 bg-surface hover:border-ember/40'
                      }`}
                    >
                      <div className="relative z-10">
                        <h3 className="text-lg sm:text-xl font-semibold mb-1">{option.label}</h3>
                        <p className="text-sm text-bone">{option.description}</p>
                      </div>
                      {state.substance_type === option.value && (
                        <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-orange flex items-center justify-center">
                          <Check className="w-4 h-4 text-base" />
                        </div>
                      )}
                    </button>
                  ))}

                  {state.substance_type === 'other' && (
                    <div className="p-5 sm:p-6 rounded-2xl border-2 border-orange/30 bg-surface">
                      <Input
                        label="Substance name"
                        value={state.other_substance}
                        onChange={(e) => setState((prev) => ({ ...prev, other_substance: e.target.value }))}
                        placeholder="e.g., Mescaline"
                        className="bg-elevated"
                        disabled={submitting}
                      />
                    </div>
                  )}
                </div>

                <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-ember/20">
                  <Input
                    label="First batch name"
                    value={state.first_batch_name}
                    onChange={(e) => setState((prev) => ({ ...prev, first_batch_name: e.target.value }))}
                    placeholder="e.g., Golden Teacher Batch A"
                    disabled={submitting}
                  />
                  <p className="mt-3 text-xs text-ash">You can edit potency and details later from Batch Manager.</p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-orange/5 border border-orange/20">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-orange/20 flex items-center justify-center">
                      <Check className="w-5 h-5 text-orange" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Start fast</h3>
                      <p className="text-sm text-bone">Your first dose can be logged in one screen.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-3 border-b border-ember/20">
                      <span className="text-bone text-sm">Substance</span>
                      <span className="font-medium">{substanceDisplay}</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-bone text-sm">Batch</span>
                      <span className="font-medium">{state.first_batch_name.trim()}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-status-clear/10 border border-status-clear/30 text-sm">
                  <p className="text-bone">
                    <strong className="text-ivory">Defaults set:</strong> Sensitivity {DEFAULT_SENSITIVITY}/5, North Star {DEFAULT_NORTH_STAR}, Guidance {DEFAULT_GUIDANCE_LEVEL}.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-base/90 backdrop-blur-md border-t border-ember/10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => goToStep(step - 1)}
              disabled={step === 1 || submitting}
              className="flex items-center gap-1 text-sm text-bone hover:text-ivory disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-4 py-2 min-h-[44px]"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>

            <div className="flex items-center gap-2">
              {stepConfig.map((s) => {
                const isActive = step === s.id
                const isComplete = step > s.id

                return (
                  <button
                    key={s.id}
                    onClick={() => goToStep(s.id)}
                    disabled={submitting}
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isActive
                        ? 'bg-orange text-base'
                        : isComplete
                          ? 'bg-status-clear/20 text-status-clear'
                          : 'bg-elevated text-ash'
                    }`}
                  >
                    {isComplete ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : <span className="text-xs sm:text-sm font-medium">{s.id}</span>}
                  </button>
                )
              })}
            </div>

            {step < TOTAL_STEPS ? (
              <button
                onClick={() => goToStep(step + 1)}
                disabled={submitting}
                className="flex items-center gap-1 bg-orange hover:bg-orange/90 text-base px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all disabled:opacity-50 min-h-[44px]"
              >
                <span className="hidden sm:inline">Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={submitting}
                className="flex items-center gap-2 bg-orange hover:bg-orange/90 text-base px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all disabled:opacity-50 min-h-[44px]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Starting...</span>
                  </>
                ) : (
                  <>
                    <span>Start Logging</span>
                    <Check className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
