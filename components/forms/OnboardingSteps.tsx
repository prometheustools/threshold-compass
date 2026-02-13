'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Compass, 
  FlaskConical, 
  Gauge, 
  Target,
  ArrowRight,
  Sparkles,
  SkipForward
} from 'lucide-react'
import type { BatchForm, EstimatedPotency, GuidanceLevel, NorthStar, SubstanceType } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { resolveCurrentUserId } from '@/lib/auth/anonymous'
import { getSchemaSetupMessage, isSchemaCacheTableMissingError } from '@/lib/supabase/errors'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Slider from '@/components/ui/Slider'

const TOTAL_STEPS = 5
const PREVIEW_STORAGE_KEY = 'compass_preview_mode'

const stepConfig = [
  { 
    id: 1, 
    label: 'Substance', 
    icon: FlaskConical,
    title: 'Choose your substance',
    description: 'This determines your measurement units and calibration approach.'
  },
  { 
    id: 2, 
    label: 'Sensitivity', 
    icon: Gauge,
    title: 'How sensitive are you?',
    description: 'Help us set safe starting doses based on your baseline sensitivity.'
  },
  { 
    id: 3, 
    label: 'Intention', 
    icon: Target,
    title: 'Set your intention',
    description: 'What brings you to microdosing? This shapes your guidance.'
  },
  { 
    id: 4, 
    label: 'Batch', 
    icon: FlaskConical,
    title: 'Create your first batch',
    description: 'Track your substance source for accurate threshold calibration.'
  },
  { 
    id: 5, 
    label: 'Review', 
    icon: Check,
    title: 'Ready to begin',
    description: 'Review your settings and enter the Compass.'
  },
] as const

const substanceOptions: Array<{ value: SubstanceType; label: string; description: string; color: string }> = [
  {
    value: 'psilocybin',
    label: 'Psilocybin mushrooms',
    description: 'Measure in grams. Track by batch for potency variations.',
    color: 'from-emerald-500/20 to-teal-500/20',
  },
  { 
    value: 'lsd', 
    label: 'LSD', 
    description: 'Measure in micrograms. More consistent potency.',
    color: 'from-violet-500/20 to-purple-500/20',
  },
  { 
    value: 'other', 
    label: 'Other substance', 
    description: 'Custom tracking with the same scientific approach.',
    color: 'from-orange-500/20 to-amber-500/20',
  },
]

const sensitivityOptions: Array<{ value: number; title: string; description: string }> = [
  { value: 1, title: 'Very Low', description: 'I need higher doses than most people' },
  { value: 2, title: 'Low', description: 'Slightly below average sensitivity' },
  { value: 3, title: 'Average', description: 'Standard doses work as expected' },
  { value: 4, title: 'High', description: 'More sensitive than average' },
  { value: 5, title: 'Very High', description: 'Small amounts affect me strongly' },
]

const northStarOptions: Array<{ value: NorthStar; label: string; description: string; emoji: string }> = [
  { value: 'clarity', label: 'Clarity', description: 'Sharpen attention and mental focus', emoji: '✨' },
  { value: 'connection', label: 'Connection', description: 'Deepen empathy and relationships', emoji: '💫' },
  { value: 'creativity', label: 'Creativity', description: 'Open associative thinking', emoji: '🎨' },
  { value: 'calm', label: 'Calm', description: 'Settle nervous system', emoji: '🌊' },
  { value: 'exploration', label: 'Exploration', description: 'Learn through structured discovery', emoji: '🔬' },
]

const guidanceOptions: Array<{ value: GuidanceLevel; label: string; description: string; level: 'full' | 'medium' | 'minimal' }> = [
  { value: 'guided', label: 'Full Guidance', description: 'Detailed prompts and explanations at every step', level: 'full' },
  { value: 'experienced', label: 'Streamlined', description: 'Fewer prompts, assumes familiarity', level: 'medium' },
  { value: 'minimal', label: 'Data Only', description: 'Just the numbers, no coaching copy', level: 'minimal' },
]

const batchFormOptions: Array<{ value: BatchForm; label: string }> = [
  { value: 'whole', label: 'Whole mushrooms' },
  { value: 'ground', label: 'Ground powder' },
  { value: 'capsule', label: 'Capsules' },
  { value: 'chocolate', label: 'Chocolate' },
  { value: 'liquid', label: 'Liquid extract' },
  { value: 'other', label: 'Other form' },
]

const potencyOptions: Array<{ value: EstimatedPotency; label: string; description: string }> = [
  { value: 'low', label: 'Low', description: 'Milder than average' },
  { value: 'medium', label: 'Medium', description: 'Average strength' },
  { value: 'high', label: 'High', description: 'Stronger than average' },
  { value: 'unknown', label: 'Unknown', description: 'Not sure yet' },
]

interface OnboardingState {
  substance_type: SubstanceType | null
  other_substance: string
  sensitivity: number
  north_star: NorthStar | null
  guidance_level: GuidanceLevel
  first_batch: {
    name: string
    form: BatchForm
    estimated_potency: EstimatedPotency
    source_notes: string
  }
  skip_batch: boolean
}

export default function OnboardingSteps() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [welcomeVisible, setWelcomeVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [stepError, setStepError] = useState<string | null>(null)
  const [state, setState] = useState<OnboardingState>({
    substance_type: null,
    other_substance: '',
    sensitivity: 3,
    north_star: null,
    guidance_level: 'guided',
    first_batch: {
      name: '',
      form: 'whole',
      estimated_potency: 'unknown',
      source_notes: '',
    },
    skip_batch: false,
  })

  useEffect(() => {
    setWelcomeVisible(true)
  }, [])

  const currentStepConfig = step > 0 ? stepConfig[step - 1] : stepConfig[0]
  const StepIcon = currentStepConfig.icon

  const progressPercent = step > 0 ? ((step - 1) / (TOTAL_STEPS - 1)) * 100 : 0

  const substanceDisplay = useMemo(() => {
    if (state.substance_type === 'other') {
      const value = state.other_substance.trim()
      return value.length > 0 ? value : 'Other'
    }
    const selected = substanceOptions.find((option) => option.value === state.substance_type)
    return selected?.label ?? 'Not selected'
  }, [state.other_substance, state.substance_type])

  const northStarDisplay = useMemo(() => {
    const selected = northStarOptions.find((option) => option.value === state.north_star)
    return selected?.label ?? 'Not selected'
  }, [state.north_star])

  const canSkipBatch = step === 4

  const handleCheckOutApp = () => {
    try {
      window.localStorage.setItem(PREVIEW_STORAGE_KEY, '1')
    } catch {
      // no-op
    }
    router.push('/compass?preview=1')
  }

  const goToStep = (targetStep: number) => {
    if (submitting) return
    setStepError(null)
    
    // Validate current step before moving forward
    if (targetStep > step) {
      if (step === 1 && !state.substance_type) {
        setStepError('Please select a substance to continue')
        return
      }
      if (step === 1 && state.substance_type === 'other' && !state.other_substance.trim()) {
        setStepError('Please specify your substance')
        return
      }
      if (step === 3 && !state.north_star) {
        setStepError('Please select your intention')
        return
      }
      if (step === 4 && !state.skip_batch && !state.first_batch.name.trim()) {
        setStepError('Please enter a batch name or skip this step')
        return
      }
    }
    
    setStep(Math.max(1, Math.min(TOTAL_STEPS, targetStep)))
  }

  const handleSkipBatch = () => {
    setState(prev => ({ ...prev, skip_batch: true }))
    goToStep(5)
  }

  const handleComplete = async () => {
    if (submitting) return
    if (!state.substance_type || !state.north_star) {
      setStepError('Please complete all required steps')
      return
    }

    setSubmitting(true)
    setStepError(null)

    try {
      const supabase = createClient()
      const anonUserId = await resolveCurrentUserId(supabase)

      if (!anonUserId) {
        router.push('/autologin')
        return
      }

      // Create user profile
      const { error: profileError } = await supabase.from('users').upsert(
        {
          id: anonUserId,
          email: `anon_${anonUserId.slice(0, 8)}@localhost`,
          substance_type: state.substance_type,
          sensitivity: state.sensitivity,
          north_star: state.north_star,
          guidance_level: state.guidance_level,
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

      // Create batch if not skipped
      if (!state.skip_batch && state.first_batch.name.trim()) {
        const sourceNotes = state.first_batch.source_notes.trim()
        const { error: batchError } = await supabase.from('batches').insert({
          user_id: anonUserId,
          name: state.first_batch.name.trim(),
          substance_type: state.substance_type,
          form: state.first_batch.form,
          estimated_potency: state.first_batch.estimated_potency,
          source_notes: sourceNotes.length > 0 ? sourceNotes : null,
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
      }

      // Mark onboarding complete
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

      router.push('/compass')
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

  if (step === 0) {
    return (
      <div
        className={`fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-base px-6 text-center transition-opacity duration-[800ms] ease-out ${
          welcomeVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div>
          <h1 className="font-mono text-2xl text-ivory">Welcome, trailblazer.</h1>
          <p className="mx-auto mt-4 max-w-md text-sm text-bone">
            You are not signing up. You are initiating a journey of self-calibration. This instrument is your bearing
            to true north — designed not for following generic protocols, but for mapping your unique inner landscape.
          </p>
          <Button className="mt-8" onClick={() => setStep(1)}>
            Begin Calibration
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base text-ivory">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="h-1 bg-elevated">
          <div 
            className="h-full bg-gradient-to-r from-orange to-ember transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Header */}
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
              className="text-xs text-ash hover:text-ivory transition-colors flex items-center gap-1"
            >
              Check out app <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Step Title */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-orange/20 to-ember/20 border border-orange/30 mb-4">
              <StepIcon className="w-6 h-6 sm:w-8 sm:h-8 text-orange" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold mb-2">
              {currentStepConfig.title}
            </h1>
            <p className="text-bone text-sm sm:text-base max-w-md mx-auto">
              {currentStepConfig.description}
            </p>
          </div>

          {/* Error Message */}
          {stepError && (
            <div className="mb-6 p-4 rounded-xl bg-status-elevated/10 border border-status-elevated/30 text-status-elevated text-sm">
              <p>{stepError}</p>
              <button
                type="button"
                onClick={handleCheckOutApp}
                className="mt-3 text-xs uppercase tracking-wide text-bone hover:text-ivory"
              >
                Open preview instead
              </button>
            </div>
          )}

          {/* Step Content */}
          <div className="space-y-6">
            {/* Step 1: Substance */}
            {step === 1 && (
              <div className="grid gap-4 sm:gap-6">
                {substanceOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setState(prev => ({ 
                      ...prev, 
                      substance_type: option.value,
                      other_substance: option.value === 'other' ? prev.other_substance : ''
                    }))}
                    className={`group relative p-5 sm:p-6 rounded-2xl border-2 text-left transition-all duration-300 ${
                      state.substance_type === option.value
                        ? 'border-orange bg-gradient-to-br ' + option.color
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
                      label="What substance are you working with?"
                      value={state.other_substance}
                      onChange={(e) => setState(prev => ({ ...prev, other_substance: e.target.value }))}
                      placeholder="e.g., Mescaline, DMT, etc."
                      className="bg-elevated"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Sensitivity */}
            {step === 2 && (
              <div className="space-y-6 sm:space-y-8">
                <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-ember/20">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-bone">Sensitivity Level</span>
                    <span className="text-2xl sm:text-3xl font-bold text-orange">{state.sensitivity}</span>
                  </div>
                  <Slider
                    min={1}
                    max={5}
                    step={1}
                    value={state.sensitivity}
                    onChange={(value) => setState(prev => ({ ...prev, sensitivity: value }))}
                  />
                  <div className="flex justify-between mt-2 text-xs text-ash">
                    <span>Very Low</span>
                    <span>Average</span>
                    <span>Very High</span>
                  </div>
                </div>

                <div className="grid gap-3 sm:gap-4">
                  {sensitivityOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setState(prev => ({ ...prev, sensitivity: option.value }))}
                      className={`p-4 sm:p-5 rounded-xl border text-left transition-all duration-300 ${
                        state.sensitivity === option.value
                          ? 'border-orange bg-orange/10'
                          : 'border-ember/20 bg-surface hover:border-ember/40'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className={`text-lg font-bold ${
                          state.sensitivity === option.value ? 'text-orange' : 'text-ash'
                        }`}>
                          {option.value}
                        </span>
                        <div>
                          <h4 className="font-medium">{option.title}</h4>
                          <p className="text-sm text-bone">{option.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Intention & Guidance */}
            {step === 3 && (
              <div className="space-y-8">
                {/* North Star */}
                <div>
                  <h3 className="text-sm font-mono uppercase tracking-wider text-bone mb-4">Your North Star</h3>
                  <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {northStarOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setState(prev => ({ ...prev, north_star: option.value }))}
                        className={`p-4 sm:p-5 rounded-xl border text-left transition-all duration-300 ${
                          state.north_star === option.value
                            ? 'border-orange bg-orange/10'
                            : 'border-ember/20 bg-surface hover:border-ember/40'
                        }`}
                      >
                        <div className="text-2xl mb-2">{option.emoji}</div>
                        <h4 className="font-semibold mb-1">{option.label}</h4>
                        <p className="text-xs text-bone">{option.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Guidance Level */}
                <div>
                  <h3 className="text-sm font-mono uppercase tracking-wider text-bone mb-4">Guidance Level</h3>
                  <div className="space-y-3">
                    {guidanceOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setState(prev => ({ ...prev, guidance_level: option.value }))}
                        className={`w-full p-4 sm:p-5 rounded-xl border text-left transition-all duration-300 flex items-center gap-4 ${
                          state.guidance_level === option.value
                            ? 'border-orange bg-orange/10'
                            : 'border-ember/20 bg-surface hover:border-ember/40'
                        }`}
                      >
                        <div className={`w-3 h-3 rounded-full ${
                          option.level === 'full' ? 'bg-orange' :
                          option.level === 'medium' ? 'bg-status-mild' : 'bg-ash'
                        }`} />
                        <div className="flex-1">
                          <h4 className="font-semibold">{option.label}</h4>
                          <p className="text-xs text-bone">{option.description}</p>
                        </div>
                        {state.guidance_level === option.value && (
                          <Check className="w-5 h-5 text-orange" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Batch */}
            {step === 4 && (
              <div className="space-y-6">
                {!state.skip_batch ? (
                  <>
                    <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-ember/20">
                      <div className="flex items-center gap-2 mb-4">
                        <FlaskConical className="w-5 h-5 text-orange" />
                        <span className="text-sm font-medium">Creating batch for: {substanceDisplay}</span>
                      </div>
                      
                      <div className="space-y-4">
                        <Input
                          label="Batch name *"
                          value={state.first_batch.name}
                          onChange={(e) => setState(prev => ({
                            ...prev,
                            first_batch: { ...prev.first_batch, name: e.target.value }
                          }))}
                          placeholder="e.g., Golden Teacher Batch A"
                        />

                        <Select
                          label="Form"
                          value={state.first_batch.form}
                          onChange={(e) => setState(prev => ({
                            ...prev,
                            first_batch: { ...prev.first_batch, form: e.target.value as BatchForm }
                          }))}
                          options={batchFormOptions}
                        />

                        <div>
                          <label className="block text-sm font-medium text-bone mb-2">Estimated Potency</label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {potencyOptions.map((option) => (
                              <button
                                key={option.value}
                                onClick={() => setState(prev => ({
                                  ...prev,
                                  first_batch: { ...prev.first_batch, estimated_potency: option.value }
                                }))}
                                className={`p-3 rounded-lg border text-sm transition-all ${
                                  state.first_batch.estimated_potency === option.value
                                    ? 'border-orange bg-orange/10 text-orange'
                                    : 'border-ember/20 bg-elevated hover:border-ember/40'
                                }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-bone mb-2">Source Notes (optional)</label>
                          <textarea
                            value={state.first_batch.source_notes}
                            onChange={(e) => setState(prev => ({
                              ...prev,
                              first_batch: { ...prev.first_batch, source_notes: e.target.value }
                            }))}
                            placeholder="Where did you get this? Any handling notes?"
                            rows={3}
                            className="w-full px-4 py-3 rounded-lg bg-elevated border border-ember/30 text-ivory placeholder:text-ash focus:border-orange focus:outline-none resize-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Skip Option */}
                    <button
                      onClick={handleSkipBatch}
                      className="w-full p-4 rounded-xl border border-dashed border-ember/30 text-ash hover:text-ivory hover:border-ember/50 transition-all flex items-center justify-center gap-2"
                    >
                      <SkipForward className="w-4 h-4" />
                      Skip batch creation for now
                    </button>
                  </>
                ) : (
                  <div className="p-8 rounded-2xl bg-surface border border-ember/20 text-center">
                    <div className="w-16 h-16 rounded-full bg-status-mild/20 flex items-center justify-center mx-auto mb-4">
                      <SkipForward className="w-8 h-8 text-status-mild" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Batch creation skipped</h3>
                    <p className="text-sm text-bone mb-4">
                      You can create a batch later from the Batch Management page.
                    </p>
                    <button
                      onClick={() => setState(prev => ({ ...prev, skip_batch: false }))}
                      className="text-orange hover:underline text-sm"
                    >
                      Go back and create a batch
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Review */}
            {step === 5 && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-orange/10 to-ember/10 border border-orange/30">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-orange/20 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-orange" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Almost there!</h3>
                      <p className="text-sm text-bone">Review your settings before entering the Compass</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-3 border-b border-ember/20">
                      <span className="text-bone text-sm">Substance</span>
                      <span className="font-medium">{substanceDisplay}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-ember/20">
                      <span className="text-bone text-sm">Sensitivity</span>
                      <span className="font-medium">Level {state.sensitivity}/5</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-ember/20">
                      <span className="text-bone text-sm">North Star</span>
                      <span className="font-medium">{northStarDisplay}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-ember/20">
                      <span className="text-bone text-sm">Guidance</span>
                      <span className="font-medium capitalize">{state.guidance_level}</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-bone text-sm">First Batch</span>
                      <span className="font-medium">
                        {state.skip_batch ? 'Skipped' : (state.first_batch.name || 'Not set')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-status-clear/10 border border-status-clear/30 text-sm">
                  <p className="text-bone">
                    <strong className="text-ivory">Tip:</strong> You can change any of these settings later from the Settings page.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-base/90 backdrop-blur-md border-t border-ember/10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Back Button */}
            <button
              onClick={() => goToStep(step - 1)}
              disabled={step === 1 || submitting}
              className="flex items-center gap-1 text-sm text-bone hover:text-ivory disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-4 py-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>

            {/* Step Indicators */}
            <div className="flex items-center gap-2">
              {stepConfig.map((s, idx) => {
                const isActive = step === s.id
                const isComplete = step > s.id
                const Icon = s.icon
                
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
                    {isComplete ? (
                      <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <span className="text-xs sm:text-sm font-medium">{s.id}</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Next/Complete Button */}
            {step < TOTAL_STEPS ? (
              <button
                onClick={() => goToStep(step + 1)}
                disabled={submitting}
                className="flex items-center gap-1 bg-orange hover:bg-orange/90 text-base px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all disabled:opacity-50"
              >
                <span className="hidden sm:inline">Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={submitting}
                className="flex items-center gap-2 bg-orange hover:bg-orange/90 text-base px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-base/30 border-t-base rounded-full animate-spin" />
                    <span className="hidden sm:inline">Setting up...</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Enter Compass</span>
                    <Compass className="w-4 h-4" />
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
