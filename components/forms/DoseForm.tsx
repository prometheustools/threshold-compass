'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Check, Minus, Plus, Loader2 } from 'lucide-react'
import type {
  Batch,
  ContextTag,
  DayClassification,
  EnergyLevel,
  Phase,
  Preparation,
  SleepQuality,
  StressLevel,
  ThresholdFeel,
  TimingTag,
  User,
} from '@/types'
import { createClient } from '@/lib/supabase/client'
import { resolveCurrentUserId } from '@/lib/auth/anonymous'
import {
  getSchemaSetupMessage,
  isSchemaCacheColumnMissingError,
  isSchemaCacheTableMissingError,
} from '@/lib/supabase/errors'
import { useAppStore } from '@/store'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import LoadingState from '@/components/ui/LoadingState'

const preparationOptions: Array<{ value: Preparation; label: string }> = [
  { value: 'empty_stomach', label: 'Empty stomach' },
  { value: 'light_meal', label: 'Light meal' },
  { value: 'full_meal', label: 'Full meal' },
]

const sleepOptions: Array<{ value: SleepQuality; label: string }> = [
  { value: 'poor', label: 'Poor' },
  { value: 'fair', label: 'Fair' },
  { value: 'good', label: 'Good' },
  { value: 'great', label: 'Great' },
]

const energyOptions: Array<{ value: EnergyLevel; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

const stressOptions: Array<{ value: StressLevel; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

const thresholdFeelOptions: Array<{ value: ThresholdFeel; label: string }> = [
  { value: 'nothing', label: 'Nothing' },
  { value: 'under', label: 'Under' },
  { value: 'sweetspot', label: 'Sweet Spot' },
  { value: 'over', label: 'Over' },
]

const timingTagOptions: Array<{ value: TimingTag; label: string }> = [
  { value: 'morning', label: 'Morning' },
  { value: 'midday', label: 'Midday' },
  { value: 'afternoon', label: 'Afternoon' },
]

const contextTagOptions: Array<{ value: ContextTag; label: string }> = [
  { value: 'work', label: 'Work' },
  { value: 'creative', label: 'Creative' },
  { value: 'social', label: 'Social' },
  { value: 'physical', label: 'Physical' },
  { value: 'rest', label: 'Rest' },
  { value: 'therapy', label: 'Therapy' },
  { value: 'mixed', label: 'Mixed' },
]

const medicationStorageKey = 'threshold_compass_medications'

const MAX_DOSE_MG = 5000
const MAX_DOSE_UG = 1000

type MedicationRiskLevel = 'high' | 'moderate'

interface MedicationRisk {
  medication: string
  level: MedicationRiskLevel
  reason: string
}

interface ValidationError {
  amount?: string
}

interface SuccessState {
  amount: number
  unit: string
  batchName: string
  doseNumber: number | null
  batchTally: number
}

const medicationRiskMatchers: Array<{ pattern: RegExp; level: MedicationRiskLevel; reason: string }> = [
  {
    pattern: /\b(lithium)\b/i,
    level: 'high',
    reason: 'Lithium can significantly increase adverse reaction risk with psychedelics.',
  },
  {
    pattern: /\b(maoi|phenelzine|tranylcypromine|isocarboxazid)\b/i,
    level: 'high',
    reason: 'MAOIs can amplify and destabilize effects.',
  },
  {
    pattern: /\b(ssri|sertraline|fluoxetine|escitalopram|citalopram|paroxetine|fluvoxamine)\b/i,
    level: 'moderate',
    reason: 'SSRIs may blunt or alter effects; avoid unsupervised dose escalation.',
  },
  {
    pattern: /\b(snri|venlafaxine|duloxetine|desvenlafaxine)\b/i,
    level: 'moderate',
    reason: 'SNRIs can alter response and side-effect profile.',
  },
  {
    pattern: /\b(amphetamine|adderall|methylphenidate|vyvanse)\b/i,
    level: 'moderate',
    reason: 'Stimulants can increase anxiety, heart rate, and interference.',
  },
  {
    pattern: /\b(benzodiazepine|alprazolam|lorazepam|clonazepam|diazepam)\b/i,
    level: 'moderate',
    reason: 'Benzodiazepines can mask signal quality and confound calibration.',
  },
]

function loadMedicationsFromStorage(): string[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(medicationStorageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
  } catch {
    return []
  }
}

function analyzeMedicationRisks(medications: string[]): MedicationRisk[] {
  const risks: MedicationRisk[] = []

  for (const medication of medications) {
    const match = medicationRiskMatchers.find((matcher) => matcher.pattern.test(medication))
    if (!match) continue

    risks.push({
      medication,
      level: match.level,
      reason: match.reason,
    })
  }

  return risks
}

function classifyDay(signal: number, texture: number, interference: number): DayClassification {
  if (signal >= 6 && interference <= 2) return 'green'
  if (interference >= 5) return 'red'
  if (interference >= 3 || texture >= 6) return 'yellow'
  return 'unclassified'
}

function getPhaseFromDoseNumber(doseNumber: number | null): Phase | null {
  if (!doseNumber || doseNumber < 1 || doseNumber > 10) return null
  return doseNumber <= 4 ? 'baseline' : 'context'
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

  return 'Unable to log this dose right now.'
}

function asAmountString(value: number): string {
  return value.toFixed(2)
}

function validateAmount(value: string, unit: 'mg' | 'ug'): ValidationError {
  const parsed = Number.parseFloat(value)
  
  if (!value || value.trim() === '') {
    return { amount: 'Enter a dose amount' }
  }
  
  if (!Number.isFinite(parsed)) {
    return { amount: 'Enter a valid number' }
  }
  
  if (parsed <= 0) {
    return { amount: 'Amount must be greater than zero' }
  }
  
  if (parsed < 0.01) {
    return { amount: 'Amount too small' }
  }
  
  const maxAmount = unit === 'ug' ? MAX_DOSE_UG : MAX_DOSE_MG
  if (parsed > maxAmount) {
    return { amount: `Amount exceeds maximum (${maxAmount} ${unit})` }
  }
  
  return {}
}

export default function DoseForm() {
  const router = useRouter()
  const setUser = useAppStore((state) => state.setUser)
  const setActiveBatch = useAppStore((state) => state.setActiveBatch)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<ValidationError>({})
  const [success, setSuccess] = useState<SuccessState | null>(null)
  const [batchTally, setBatchTally] = useState(0)

  const [user, setUserState] = useState<User | null>(null)
  const [batches, setBatches] = useState<Batch[]>([])
  const [batchId, setBatchId] = useState('')
  const [amount, setAmount] = useState('0.00')
  const [discoveryDoseNumber, setDiscoveryDoseNumber] = useState<number | null>(null)
  const [showContext, setShowContext] = useState(false)
  const [showProtocol, setShowProtocol] = useState(false)

  const [preparation, setPreparation] = useState<Preparation | ''>('')
  const [sleepQuality, setSleepQuality] = useState<SleepQuality | ''>('')
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel | ''>('')
  const [stressLevel, setStressLevel] = useState<StressLevel | ''>('')
  const [preDoseMood, setPreDoseMood] = useState<number | ''>('')
  const [intention, setIntention] = useState('')
  const [postDoseCompleted, setPostDoseCompleted] = useState(false)
  const [postDoseMood, setPostDoseMood] = useState<number | ''>('')
  const [signalScore, setSignalScore] = useState(0)
  const [textureScore, setTextureScore] = useState(0)
  const [interferenceScore, setInterferenceScore] = useState(0)
  const [thresholdFeel, setThresholdFeel] = useState<ThresholdFeel | ''>('')
  const [timingTag, setTimingTag] = useState<TimingTag | ''>('')
  const [contextTags, setContextTags] = useState<ContextTag[]>([])
  const [notes, setNotes] = useState('')
  const [medications, setMedications] = useState<string[]>([])
  const [medicationAcknowledged, setMedicationAcknowledged] = useState(false)

  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.id === batchId) ?? null,
    [batchId, batches]
  )

  const medicationRisks = useMemo(() => analyzeMedicationRisks(medications), [medications])
  const hasMedicationRisks = medicationRisks.length > 0

  const doseUnit: 'mg' | 'ug' = selectedBatch?.dose_unit === 'ug' ? 'ug' : 'mg'
  const unitLabel = doseUnit === 'ug' ? 'µg' : 'mg'

  // Real-time validation
  useEffect(() => {
    const errors = validateAmount(amount, doseUnit)
    setValidationErrors(errors)
  }, [amount, doseUnit])

  useEffect(() => {
    let active = true

    const loadFormData = async () => {
      setLoading(true)
      setError(null)

      try {
        const supabase = createClient()
        
        const anonUserId = await resolveCurrentUserId(supabase)
        
        if (!anonUserId) {
          router.push('/autologin')
          return
        }

        const [{ data: userData, error: userError }, { data: batchRows, error: batchError }, { data: lastDoseRows, error: lastDoseError }] =
          await Promise.all([
            supabase.from('users').select('*').eq('id', anonUserId).single(),
            supabase.from('batches').select('*').eq('user_id', anonUserId).order('is_active', { ascending: false }).order('updated_at', { ascending: false }),
            supabase.from('dose_logs').select('amount').eq('user_id', anonUserId).order('dosed_at', { ascending: false }).limit(1),
          ])

        if (userError && isSchemaCacheTableMissingError(userError, 'users')) {
          throw userError
        }

        if (userError || !userData) {
          router.push('/onboarding')
          return
        }

        if (batchError) {
          throw batchError
        }

        if (lastDoseError) {
          throw lastDoseError
        }

        const typedUser = userData as User
        const typedBatches = (batchRows ?? []) as Batch[]
        const activeBatch = typedBatches.find((batch) => batch.is_active) ?? typedBatches[0] ?? null
        const lastAmount = lastDoseRows?.[0]?.amount

        if (!active) {
          return
        }

        setUserState(typedUser)
        setBatches(typedBatches)
        setBatchId(activeBatch?.id ?? '')

        if (typeof lastAmount === 'number' && lastAmount > 0) {
          setAmount(asAmountString(lastAmount))
        } else {
          setAmount('0.00')
        }

        setUser(typedUser)
        setActiveBatch(activeBatch ?? null)
      } catch (loadError) {
        if (!active) {
          return
        }
        setError(getErrorMessage(loadError))
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadFormData()

    return () => {
      active = false
    }
  }, [router, setActiveBatch, setUser])

  useEffect(() => {
    let active = true

    const loadDiscoveryNumber = async () => {
      if (!user || !selectedBatch || selectedBatch.calibration_status !== 'calibrating') {
        setDiscoveryDoseNumber(null)
        return
      }

      try {
        const supabase = createClient()
        const anonUserId = await resolveCurrentUserId(supabase)
        if (!anonUserId) return
        
        const { data, error: discoveryError } = await supabase
          .from('dose_logs')
          .select('discovery_dose_number')
          .eq('user_id', anonUserId)
          .eq('batch_id', selectedBatch.id)
          .not('discovery_dose_number', 'is', null)
          .order('discovery_dose_number', { ascending: false })
          .limit(1)

        if (discoveryError) {
          throw discoveryError
        }

        if (!active) {
          return
        }

        const lastLoggedDose = data?.[0]?.discovery_dose_number ?? 0
        setDiscoveryDoseNumber(Math.min(10, lastLoggedDose + 1))
      } catch {
        if (active) {
          setDiscoveryDoseNumber(null)
        }
      }
    }

    void loadDiscoveryNumber()

    return () => {
      active = false
    }
  }, [selectedBatch, user])

  // Load batch tally when batch changes
  useEffect(() => {
    let active = true

    const loadBatchTally = async () => {
      if (!selectedBatch || !user) {
        setBatchTally(0)
        return
      }

      try {
        const supabase = createClient()
        const anonUserId = await resolveCurrentUserId(supabase)
        if (!anonUserId) return

        const { count, error } = await supabase
          .from('dose_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', anonUserId)
          .eq('batch_id', selectedBatch.id)

        if (!active) return

        if (!error && typeof count === 'number') {
          setBatchTally(count)
        }
      } catch {
        // Silently fail - tally is not critical
      }
    }

    void loadBatchTally()

    return () => {
      active = false
    }
  }, [selectedBatch, user])

  useEffect(() => {
    setMedications(loadMedicationsFromStorage())
  }, [])

  useEffect(() => {
    setMedicationAcknowledged(false)
  }, [medications])

  const adjustAmount = (delta: number) => {
    const currentAmount = Number.parseFloat(amount)
    const normalized = Number.isFinite(currentAmount) ? currentAmount : 0
    const next = Math.max(0, Math.round((normalized + delta) * 100) / 100)
    setAmount(asAmountString(next))
  }

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    // Allow empty, numbers, and single decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value)
    }
  }

  const handleAmountBlur = () => {
    const parsed = Number.parseFloat(amount)
    if (Number.isFinite(parsed) && parsed >= 0) {
      setAmount(asAmountString(parsed))
    } else {
      setAmount('0.00')
    }
  }

  const isFormValid = useMemo(() => {
    const amountError = validateAmount(amount, doseUnit)
    if (amountError.amount) return false
    if (!batchId) return false
    if (hasMedicationRisks && !medicationAcknowledged) return false
    return true
  }, [amount, doseUnit, batchId, hasMedicationRisks, medicationAcknowledged])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!user) {
      setError('User profile not loaded yet.')
      return
    }

    if (!batchId) {
      setError('Select a batch before logging.')
      return
    }

    if (!selectedBatch) {
      setError('Selected batch could not be found. Please choose a batch again.')
      return
    }

    const parsedAmount = Number.parseFloat(amount)
    const amountValidation = validateAmount(amount, doseUnit)
    
    if (amountValidation.amount) {
      setValidationErrors(amountValidation)
      return
    }

    if (hasMedicationRisks && !medicationAcknowledged) {
      setError('Please acknowledge the medication safety check before logging.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()
      const anonUserId = await resolveCurrentUserId(supabase)
      if (!anonUserId) {
        setError('Session expired. Please refresh.')
        setSubmitting(false)
        return
      }
      
      const trimmedNotes = notes.trim()
      const trimmedIntention = intention.trim()
      const medicationNote =
        hasMedicationRisks
          ? `[med-check] ${medicationRisks.map((risk) => `${risk.medication} (${risk.level})`).join(', ')}`
          : ''
      const combinedNotes = [trimmedNotes, medicationNote].filter((entry) => entry.length > 0).join('\n')
      const derivedPhase = getPhaseFromDoseNumber(discoveryDoseNumber)
      const dayClassification = classifyDay(signalScore, textureScore, interferenceScore)
      const parsedPreDoseMood = typeof preDoseMood === 'number' ? preDoseMood : null
      const parsedPostDoseMood = typeof postDoseMood === 'number' ? postDoseMood : null

      const fullPayload = {
        user_id: anonUserId,
        batch_id: batchId,
        amount: Number(parsedAmount.toFixed(4)),
        unit: doseUnit,
        dosed_at: new Date().toISOString(),
        preparation: preparation || null,
        sleep_quality: sleepQuality || null,
        energy_level: energyLevel || null,
        stress_level: stressLevel || null,
        notes: combinedNotes.length > 0 ? combinedNotes : null,
        discovery_dose_number: selectedBatch?.calibration_status === 'calibrating' ? discoveryDoseNumber : null,
        phase: selectedBatch?.calibration_status === 'calibrating' ? derivedPhase : null,
        dose_number: selectedBatch?.calibration_status === 'calibrating' ? discoveryDoseNumber : null,
        pre_dose_mood: parsedPreDoseMood,
        intention: trimmedIntention.length > 0 ? trimmedIntention : null,
        post_dose_completed: postDoseCompleted,
        post_dose_mood: postDoseCompleted ? parsedPostDoseMood : null,
        signal_score: postDoseCompleted ? signalScore : null,
        texture_score: postDoseCompleted ? textureScore : null,
        interference_score: postDoseCompleted ? interferenceScore : null,
        threshold_feel: postDoseCompleted ? thresholdFeel || null : null,
        day_classification: postDoseCompleted ? dayClassification : null,
        context_tags: contextTags.length > 0 ? contextTags : null,
        timing_tag: timingTag || null,
      }

      const legacyPayload = {
        user_id: anonUserId,
        batch_id: batchId,
        amount: Number(parsedAmount.toFixed(4)),
        unit: doseUnit,
        dosed_at: new Date().toISOString(),
        preparation: preparation || null,
        sleep_quality: sleepQuality || null,
        energy_level: energyLevel || null,
        stress_level: stressLevel || null,
        notes: combinedNotes.length > 0 ? combinedNotes : null,
        discovery_dose_number: selectedBatch?.calibration_status === 'calibrating' ? discoveryDoseNumber : null,
      }

      let insertedDoseId: string | null = null

      const fullInsert = await supabase.from('dose_logs').insert(fullPayload).select('id').single()
      let insertError = fullInsert.error
      if (!insertError) {
        insertedDoseId = fullInsert.data?.id ?? null
      }

      if (insertError && isSchemaCacheColumnMissingError(insertError)) {
        const fallback = await supabase.from('dose_logs').insert(legacyPayload).select('id').single()
        insertError = fallback.error
        if (!insertError) {
          insertedDoseId = fallback.data?.id ?? null
        }
      }

      if (insertError) {
        throw insertError
      }

      // Show success confirmation
      const newTally = batchTally + 1
      setSuccess({
        amount: parsedAmount,
        unit: unitLabel,
        batchName: selectedBatch.name,
        doseNumber: discoveryDoseNumber,
        batchTally: newTally,
      })

      // Delay navigation to show success
      setTimeout(() => {
        const wasLastDiscoveryDose = selectedBatch?.calibration_status === 'calibrating' && discoveryDoseNumber === 10

        if (wasLastDiscoveryDose) {
          void (async () => {
            try {
              const thresholdRangeResponse = await fetch('/api/threshold-range', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ batch_id: batchId }),
              })

              if (thresholdRangeResponse.ok) {
                const range = (await thresholdRangeResponse.json()) as {
                  floor_dose: number
                  sweet_spot: number
                  ceiling_dose: number
                  confidence: number
                  qualifier: string
                }
                router.push(
                  `/discovery/complete?floor=${range.floor_dose}&sweet_spot=${range.sweet_spot}&ceiling=${
                    range.ceiling_dose
                  }&confidence=${range.confidence}&qualifier=${encodeURIComponent(range.qualifier)}`
                )
              } else {
                console.error('Failed to fetch threshold range:', thresholdRangeResponse.statusText)
                router.push('/compass')
              }
            } catch (fetchError) {
              console.error('Error fetching threshold range:', fetchError)
              router.push('/compass')
            }
          })()
        } else if (!postDoseCompleted && insertedDoseId) {
          router.push(`/log/complete?dose=${insertedDoseId}`)
        } else {
          router.push('/compass')
        }
        router.refresh()
      }, 1500)

    } catch (submitError) {
      setError(getErrorMessage(submitError))
      setSubmitting(false)
    }
  }

  // Quick preset amounts
  const presets = doseUnit === 'ug' ? [5, 10, 15, 20, 25, 30] : [50, 80, 100, 120, 150, 200]

  if (loading) {
    return (
      <Card padding="lg">
        <LoadingState message="Loading form" size="md" />
      </Card>
    )
  }

  if (batches.length === 0) {
    return (
      <Card padding="lg">
        <p className="font-mono text-xs tracking-widest uppercase text-status-elevated">No batch available</p>
        <p className="mt-2 text-sm text-bone">Create or activate a batch before logging a dose.</p>
        <Button type="button" className="mt-4 w-full min-h-[44px]" onClick={() => router.push('/batch')}>
          Open Batch Manager
        </Button>
      </Card>
    )
  }

  // Success confirmation overlay
  if (success) {
    return (
      <Card padding="lg" className="border-status-clear/40 bg-status-clear/10">
        <div className="text-center py-8">
          <div className="mx-auto w-16 h-16 rounded-full bg-status-clear/20 flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-status-clear" />
          </div>
          <p className="font-mono text-xs tracking-widest uppercase text-status-clear mb-2">Dose Logged</p>
          <p className="text-3xl font-bold text-ivory mb-1">
            {success.amount} <span className="text-lg text-bone">{success.unit}</span>
          </p>
          <p className="text-sm text-bone mb-4">{success.batchName}</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-elevated border border-ember/30">
            <span className="font-mono text-xs uppercase tracking-wider text-bone">Batch tally:</span>
            <span className="font-mono text-sm font-bold text-orange">{success.batchTally}</span>
          </div>
          {success.doseNumber && (
            <p className="mt-4 font-mono text-xs text-ash">
              Discovery dose {success.doseNumber} of 10
            </p>
          )}
          <div className="mt-6 flex items-center justify-center gap-2 text-ash">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Redirecting...</span>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-24">
      {selectedBatch?.calibration_status === 'calibrating' && (
        <Card className="border-status-mild/40 bg-status-mild/10">
          <p className="font-mono text-xs tracking-widest uppercase text-status-mild">Discovery Protocol</p>
          <p className="mt-2 font-mono text-base tracking-wide uppercase text-ivory">
            Dose {discoveryDoseNumber ?? 1} of 10
          </p>
        </Card>
      )}

      <Card padding="lg">
        <div className="space-y-4">
          {/* Quick Presets */}
          <div>
            <p className="font-mono text-xs tracking-widest uppercase text-bone mb-2">Quick Select</p>
            <div className="grid grid-cols-6 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(asAmountString(preset))}
                  disabled={submitting}
                  className={`min-h-[44px] rounded-button border px-2 py-2 font-mono text-sm transition-settle hover:border-orange disabled:opacity-50 ${
                    Number(amount) === preset 
                      ? 'border-orange bg-orange/10 text-orange' 
                      : 'border-ember/30 text-ivory'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input with Inline Validation */}
          <div>
            <label className="block">
              <span className="font-mono text-xs tracking-widest uppercase text-bone">Amount</span>
              <div className="mt-2 flex items-stretch gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-button border border-ember/40 bg-elevated text-ivory transition-settle hover:border-ember/80 disabled:opacity-50"
                  onClick={() => adjustAmount(doseUnit === 'ug' ? -1 : -5)}
                  aria-label={`Decrease amount by ${doseUnit === 'ug' ? '1' : '5'}`}
                >
                  <Minus size={16} />
                </button>

                <Input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={handleAmountChange}
                  onBlur={handleAmountBlur}
                  error={validationErrors.amount}
                  className="font-mono text-center"
                  aria-label="Dose amount"
                  disabled={submitting}
                />

                <button
                  type="button"
                  disabled={submitting}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-button border border-ember/40 bg-elevated text-ivory transition-settle hover:border-ember/80 disabled:opacity-50"
                  onClick={() => adjustAmount(doseUnit === 'ug' ? 1 : 5)}
                  aria-label={`Increase amount by ${doseUnit === 'ug' ? '1' : '5'}`}
                >
                  <Plus size={16} />
                </button>
              </div>
            </label>
            <p className="mt-2 font-mono text-xs tracking-widest uppercase text-bone">Unit: {unitLabel}</p>
          </div>

          <Select
            label="Batch"
            value={batchId}
            onChange={(event) => setBatchId(event.target.value)}
            options={batches.map((batch) => ({
              value: batch.id,
              label: `${batch.name}${batch.is_active ? '' : ' (inactive)'}`,
            }))}
            disabled={submitting}
          />

          {selectedBatch && (
            <div className="flex items-center justify-between px-3 py-2 rounded-button bg-elevated/50 border border-ember/20">
              <span className="font-mono text-xs uppercase tracking-wider text-bone">Batch tally</span>
              <span className="font-mono text-sm font-bold text-orange">{batchTally}</span>
            </div>
          )}

          {selectedBatch && !selectedBatch.is_active && (
            <p className="text-xs text-status-mild">
              This batch is inactive. You can still log to it, but activating it helps keep compass guidance aligned.
            </p>
          )}

          <div>
            <span className="font-mono text-xs tracking-widest uppercase text-bone">Food State</span>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {preparationOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={submitting}
                  onClick={() => setPreparation(option.value)}
                  className={`min-h-[44px] rounded-button border px-2 py-2 font-mono text-[11px] uppercase tracking-wide transition-settle disabled:opacity-50 ${
                    preparation === option.value
                      ? 'border-orange bg-orange/10 text-orange'
                      : 'border-ember/30 bg-elevated text-bone hover:border-ember/80'
                  }`}
                  aria-pressed={preparation === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {hasMedicationRisks && (
        <Card className="border-status-elevated/40 bg-status-elevated/10">
          <p className="font-mono text-xs tracking-widest uppercase text-status-elevated">Medication Safety Check</p>
          <p className="mt-2 text-sm text-bone">
            We detected medications with known interaction risks. Consider clinician guidance before dosing.
          </p>
          <div className="mt-3 space-y-2">
            {medicationRisks.map((risk) => (
              <div key={risk.medication} className="rounded-button border border-status-elevated/30 bg-status-elevated/5 px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-widest text-ivory">{risk.medication}</span>
                  <span className={`text-[10px] uppercase ${risk.level === 'high' ? 'text-status-elevated' : 'text-status-mild'}`}>
                    {risk.level}
                  </span>
                </div>
                <p className="mt-1 text-xs text-bone">{risk.reason}</p>
              </div>
            ))}
          </div>
          <label className="mt-3 flex items-start gap-2 text-sm text-bone">
            <input
              type="checkbox"
              checked={medicationAcknowledged}
              onChange={(event) => setMedicationAcknowledged(event.target.checked)}
              disabled={submitting}
              className="mt-0.5 h-4 w-4 min-h-[16px] min-w-[16px] rounded border-ember/30 bg-elevated"
            />
            <span>I reviewed this warning and understand this app does not replace medical advice.</span>
          </label>
        </Card>
      )}

      {/* Optional Context Section - Collapsed by default */}
      <Card padding="lg">
        <button
          type="button"
          disabled={submitting}
          onClick={() => setShowContext((open) => !open)}
          className="flex min-h-[44px] w-full items-center justify-between rounded-button border border-ember/30 bg-elevated px-4 py-2 font-mono text-xs tracking-widest uppercase text-bone transition-settle hover:border-ember/80 disabled:opacity-50"
        >
          Optional Context
          {showContext ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showContext && (
          <div className="mt-4 space-y-3">
            <Select
              label="Sleep Quality"
              value={sleepQuality}
              onChange={(event) => setSleepQuality(event.target.value as SleepQuality | '')}
              options={[
                { value: '', label: 'Select one' },
                ...sleepOptions.map((option) => ({ value: option.value, label: option.label })),
              ]}
              disabled={submitting}
            />

            <Select
              label="Energy Level"
              value={energyLevel}
              onChange={(event) => setEnergyLevel(event.target.value as EnergyLevel | '')}
              options={[
                { value: '', label: 'Select one' },
                ...energyOptions.map((option) => ({ value: option.value, label: option.label })),
              ]}
              disabled={submitting}
            />

            <Select
              label="Stress Level"
              value={stressLevel}
              onChange={(event) => setStressLevel(event.target.value as StressLevel | '')}
              options={[
                { value: '', label: 'Select one' },
                ...stressOptions.map((option) => ({ value: option.value, label: option.label })),
              ]}
              disabled={submitting}
            />

            <label className="block">
              <span className="font-mono text-xs tracking-widest uppercase text-bone">Notes</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                disabled={submitting}
                rows={3}
                className="mt-2 w-full rounded-button border border-ember/30 bg-elevated px-4 py-3 text-ivory focus:border-orange focus:outline-none disabled:opacity-50"
              />
            </label>
          </div>
        )}
      </Card>

      {/* Protocol Section - Collapsed by default */}
      <Card padding="lg">
        <button
          type="button"
          disabled={submitting}
          onClick={() => setShowProtocol((open) => !open)}
          className="flex min-h-[44px] w-full items-center justify-between rounded-button border border-ember/30 bg-elevated px-4 py-2 font-mono text-xs tracking-widest uppercase text-bone transition-settle hover:border-ember/80 disabled:opacity-50"
        >
          Protocol + STI (Optional)
          {showProtocol ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showProtocol && (
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="font-mono text-xs tracking-widest uppercase text-bone">Pre-dose mood (1-5)</span>
              <input
                type="number"
                min={1}
                max={5}
                disabled={submitting}
                value={preDoseMood}
                onChange={(event) => {
                  const next = Number(event.target.value)
                  if (!Number.isFinite(next)) {
                    setPreDoseMood('')
                    return
                  }
                  setPreDoseMood(Math.min(5, Math.max(1, next)))
                }}
                className="mt-2 w-full rounded-button border border-ember/30 bg-elevated px-4 py-3 text-ivory focus:border-orange focus:outline-none disabled:opacity-50"
              />
            </label>

            <label className="block">
              <span className="font-mono text-xs tracking-widest uppercase text-bone">Intention</span>
              <textarea
                value={intention}
                onChange={(event) => setIntention(event.target.value)}
                disabled={submitting}
                rows={2}
                className="mt-2 w-full rounded-button border border-ember/30 bg-elevated px-4 py-3 text-ivory focus:border-orange focus:outline-none disabled:opacity-50"
              />
            </label>

            <Select
              label="Timing Tag"
              value={timingTag}
              onChange={(event) => setTimingTag(event.target.value as TimingTag | '')}
              options={[
                { value: '', label: 'Select one' },
                ...timingTagOptions.map((option) => ({ value: option.value, label: option.label })),
              ]}
              disabled={submitting}
            />

            <div>
              <span className="font-mono text-xs tracking-widest uppercase text-bone">Context Tags</span>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {contextTagOptions.map((option) => {
                  const active = contextTags.includes(option.value)
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        setContextTags((prev) =>
                          prev.includes(option.value)
                            ? prev.filter((value) => value !== option.value)
                            : [...prev, option.value]
                        )
                      }}
                      className={`min-h-[44px] rounded-button border px-2 py-2 font-mono text-[11px] uppercase tracking-wide transition-settle disabled:opacity-50 ${
                        active
                          ? 'border-orange bg-orange/10 text-orange'
                          : 'border-ember/30 bg-elevated text-bone hover:border-ember/80'
                      }`}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-bone min-h-[44px]">
              <input
                type="checkbox"
                disabled={submitting}
                checked={postDoseCompleted}
                onChange={(event) => setPostDoseCompleted(event.target.checked)}
                className="h-4 w-4 min-h-[16px] min-w-[16px] rounded border-ember/30 bg-elevated"
              />
              Include post-dose STI scores now
            </label>

            {postDoseCompleted && (
              <div className="space-y-3 rounded-button border border-ember/20 bg-elevated/40 p-3">
                <label className="block">
                  <span className="font-mono text-xs tracking-widest uppercase text-bone">Post-dose mood (1-5)</span>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    disabled={submitting}
                    value={postDoseMood}
                    onChange={(event) => {
                      const next = Number(event.target.value)
                      if (!Number.isFinite(next)) {
                        setPostDoseMood('')
                        return
                      }
                      setPostDoseMood(Math.min(5, Math.max(1, next)))
                    }}
                    className="mt-2 w-full rounded-button border border-ember/30 bg-elevated px-4 py-3 text-ivory focus:border-orange focus:outline-none disabled:opacity-50"
                  />
                </label>

                <label className="block">
                  <span className="font-mono text-xs tracking-widest uppercase text-bone">
                    Signal {signalScore}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    disabled={submitting}
                    value={signalScore}
                    onChange={(event) => setSignalScore(Number(event.target.value))}
                    className="mt-2 w-full"
                  />
                </label>

                <label className="block">
                  <span className="font-mono text-xs tracking-widest uppercase text-bone">
                    Texture {textureScore}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    disabled={submitting}
                    value={textureScore}
                    onChange={(event) => setTextureScore(Number(event.target.value))}
                    className="mt-2 w-full"
                  />
                </label>

                <label className="block">
                  <span className="font-mono text-xs tracking-widest uppercase text-bone">
                    Interference {interferenceScore}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    disabled={submitting}
                    value={interferenceScore}
                    onChange={(event) => setInterferenceScore(Number(event.target.value))}
                    className="mt-2 w-full"
                  />
                </label>

                <Select
                  label="Threshold Feel"
                  value={thresholdFeel}
                  onChange={(event) => setThresholdFeel(event.target.value as ThresholdFeel | '')}
                  options={[
                    { value: '', label: 'Select one' },
                    ...thresholdFeelOptions.map((option) => ({ value: option.value, label: option.label })),
                  ]}
                  disabled={submitting}
                />
              </div>
            )}
          </div>
        )}
      </Card>

      {error && (
        <div className="rounded-button border border-status-elevated/40 bg-status-elevated/10 px-4 py-3">
          <p className="text-sm text-status-elevated">{error}</p>
        </div>
      )}

      {/* Sticky Submit Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-base/95 backdrop-blur-md border-t border-ember/10 px-4 py-4">
        <div className="max-w-xl mx-auto">
          <Button 
            type="submit" 
            size="lg" 
            className="w-full min-h-[56px]" 
            loading={submitting}
            disabled={!isFormValid}
          >
            {submitting ? 'Logging dose...' : 'Log Dose'}
          </Button>
          {!isFormValid && !submitting && (
            <p className="mt-2 text-center text-xs text-ash">
              {!batchId ? 'Select a batch to continue' : validationErrors.amount ? validationErrors.amount : hasMedicationRisks ? 'Acknowledge medication warning' : ''}
            </p>
          )}
        </div>
      </div>
    </form>
  )
}
