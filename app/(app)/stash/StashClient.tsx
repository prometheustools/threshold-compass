'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { resolveCurrentUserId } from '@/lib/auth/anonymous'
import LoadingState from '@/components/ui/LoadingState'

type DayClassification = 'green' | 'yellow' | 'red' | 'unclassified' | null

interface DoseEntry {
  id: string
  batch_id: string
  dosed_at: string
  amount: number
  unit: string
  day_classification: DayClassification
}

interface BatchEntry {
  id: string
  name: string
  is_active: boolean
  doses_logged: number
  calibration_status: string
  estimated_potency: string
  dose_unit?: string
}

interface DayData {
  date: Date
  doses: DoseEntry[]
  isCurrentMonth: boolean
  isToday: boolean
}

interface BackfillFormState {
  date: string
  amount: string
  batch_id: string
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function localDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function StashClient() {
  const supabase = useMemo(() => createClient(), [])
  const [activeTab, setActiveTab] = useState<'calendar' | 'batches'>('calendar')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [doses, setDoses] = useState<DoseEntry[]>([])
  const [batches, setBatches] = useState<BatchEntry[]>([])
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [showAddDose, setShowAddDose] = useState(false)
  const [loading, setLoading] = useState(true)
  const [savingBackfill, setSavingBackfill] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [backfillForm, setBackfillForm] = useState<BackfillFormState>({
    date: '',
    amount: '',
    batch_id: '',
  })

  useEffect(() => {
    let active = true

    const fetchData = async () => {
      setLoading(true)
      setFormError(null)

      const anonUserId = await resolveCurrentUserId(supabase)
      if (!anonUserId) {
        if (active) {
          setLoading(false)
          setUserId(null)
        }
        return
      }

      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0, 23, 59, 59)

      const [{ data: doseRows, error: doseError }, { data: batchRows, error: batchError }] = await Promise.all([
        supabase
          .from('dose_logs')
          .select('id,batch_id,dosed_at,amount,unit,day_classification')
          .eq('user_id', anonUserId)
          .gte('dosed_at', startDate.toISOString())
          .lte('dosed_at', endDate.toISOString())
          .order('dosed_at', { ascending: false }),
        supabase
          .from('batches')
          .select('id,name,is_active,doses_logged,calibration_status,estimated_potency,dose_unit')
          .eq('user_id', anonUserId)
          .order('is_active', { ascending: false })
          .order('updated_at', { ascending: false }),
      ])

      if (!active) return

      if (doseError || batchError) {
        setFormError('Unable to load stash data right now.')
      }

      setDoses((doseRows ?? []) as DoseEntry[])
      setBatches((batchRows ?? []) as BatchEntry[])
      setUserId(anonUserId)
      setLoading(false)
    }

    void fetchData()

    return () => {
      active = false
    }
  }, [currentDate, supabase])

  const getDosesForDate = (date: Date): DoseEntry[] => {
    const key = localDateKey(date)

    return doses.filter((dose) => {
      const doseDate = new Date(dose.dosed_at)
      return localDateKey(doseDate) === key
    })
  }

  const getCalendarDays = (): DayData[] => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const days: DayData[] = []
    const firstDayOfWeek = firstDay.getDay()

    for (let i = firstDayOfWeek - 1; i >= 0; i -= 1) {
      const date = new Date(year, month, -i)
      days.push({
        date,
        doses: getDosesForDate(date),
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
      })
    }

    for (let i = 1; i <= lastDay.getDate(); i += 1) {
      const date = new Date(year, month, i)
      days.push({
        date,
        doses: getDosesForDate(date),
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
      })
    }

    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i += 1) {
      const date = new Date(year, month + 1, i)
      days.push({
        date,
        doses: getDosesForDate(date),
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
      })
    }

    return days
  }

  const navigateMonth = (delta: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1))
  }

  const handleDayClick = (day: DayData) => {
    setSelectedDay(day.date)
    if (day.date <= new Date()) {
      setBackfillForm((previous) => ({
        ...previous,
        date: localDateKey(day.date),
      }))
    }
  }

  const refreshMonthData = async () => {
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0, 23, 59, 59)

    if (!userId) return

    const [{ data: doseRows }, { data: batchRows }] = await Promise.all([
      supabase
        .from('dose_logs')
        .select('id,batch_id,dosed_at,amount,unit,day_classification')
        .eq('user_id', userId)
        .gte('dosed_at', startDate.toISOString())
        .lte('dosed_at', endDate.toISOString())
        .order('dosed_at', { ascending: false }),
      supabase
        .from('batches')
        .select('id,name,is_active,doses_logged,calibration_status,estimated_potency,dose_unit')
        .eq('user_id', userId)
        .order('is_active', { ascending: false })
        .order('updated_at', { ascending: false }),
    ])

    setDoses((doseRows ?? []) as DoseEntry[])
    setBatches((batchRows ?? []) as BatchEntry[])
  }

  const handleBackfillSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)

    if (!userId) {
      setFormError('Session missing. Return to login and try again.')
      return
    }

    if (!backfillForm.date || !backfillForm.amount || !backfillForm.batch_id) {
      setFormError('Pick date, amount, and batch.')
      return
    }

    const parsedAmount = Number.parseFloat(backfillForm.amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError('Amount must be greater than zero.')
      return
    }

    const selectedBatch = batches.find((batch) => batch.id === backfillForm.batch_id)
    const unit = selectedBatch?.dose_unit === 'ug' ? 'ug' : 'mg'

    setSavingBackfill(true)

    const { error } = await supabase.from('dose_logs').insert({
      user_id: userId,
      batch_id: backfillForm.batch_id,
      amount: parsedAmount,
      unit,
      dosed_at: new Date(`${backfillForm.date}T09:00:00`).toISOString(),
      notes: 'Backfilled from stash calendar',
      post_dose_completed: false,
    })

    if (error) {
      setFormError(error.message || 'Unable to add dose.')
      setSavingBackfill(false)
      return
    }

    setShowAddDose(false)
    setBackfillForm({
      date: '',
      amount: '',
      batch_id: '',
    })
    await refreshMonthData()
    setSavingBackfill(false)
  }

  const activeBatches = batches
  const calendarDays = getCalendarDays()

  if (loading) {
    return (
      <div className="min-h-screen bg-base px-4 py-6">
        <div className="mx-auto w-full max-w-xl rounded-card border border-ember/20 bg-surface p-8">
          <LoadingState message="loading" size="md" />
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-base pb-24 text-ivory">
      <header className="sticky top-0 z-30 border-b border-ember/20 bg-base/95 px-4 py-4 backdrop-blur-md">
        <div className="mx-auto w-full max-w-xl">
          <div className="mb-4 flex items-center justify-between">
            <Link href="/compass" className="rounded-button px-2 py-1 text-bone transition-settle hover:text-ivory">
              ←
            </Link>
            <h1 className="text-xl font-semibold">Stash</h1>
            <div className="w-8" />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              className={`flex-1 rounded-button py-2 text-sm font-medium transition-settle ${
                activeTab === 'calendar' ? 'bg-orange text-base' : 'bg-elevated text-bone'
              }`}
            >
              Calendar
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('batches')}
              className={`flex-1 rounded-button py-2 text-sm font-medium transition-settle ${
                activeTab === 'batches' ? 'bg-orange text-base' : 'bg-elevated text-bone'
              }`}
            >
              Batches
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-xl px-4 py-4">
        {activeTab === 'calendar' ? (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <button type="button" onClick={() => navigateMonth(-1)} className="rounded-button p-2 text-bone hover:bg-elevated">
                ‹
              </button>
              <h2 className="text-lg font-medium">
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <button type="button" onClick={() => navigateMonth(1)} className="rounded-button p-2 text-bone hover:bg-elevated">
                ›
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((day) => (
                <div key={day} className="py-2 text-center text-xs text-bone">
                  {day}
                </div>
              ))}

              {calendarDays.map((day, index) => {
                const hasDose = day.doses.length > 0
                const isSelected = selectedDay?.toDateString() === day.date.toDateString()
                const isPast = day.date <= new Date()

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleDayClick(day)}
                    className={`
                      relative aspect-square rounded-button text-sm transition-settle
                      ${day.isCurrentMonth ? 'text-ivory' : 'text-ash'}
                      ${day.isToday ? 'ring-2 ring-orange' : ''}
                      ${isSelected ? 'bg-orange/20' : 'hover:bg-elevated'}
                      ${!isPast ? 'opacity-40' : ''}
                    `}
                  >
                    <span>{day.date.getDate()}</span>
                    {hasDose && (
                      <span className="mt-1 flex justify-center gap-0.5">
                        {day.doses.slice(0, 3).map((dose, dotIndex) => (
                          <span
                            key={dotIndex}
                            className={`h-1.5 w-1.5 rounded-full ${
                              dose.day_classification === 'green'
                                ? 'bg-status-clear'
                                : dose.day_classification === 'yellow'
                                  ? 'bg-status-mild'
                                  : dose.day_classification === 'red'
                                    ? 'bg-status-elevated'
                                    : 'bg-orange'
                            }`}
                          />
                        ))}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {selectedDay && (
              <div className="mt-4 rounded-card border border-ember/20 bg-surface p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-medium">
                    {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </h3>
                  {selectedDay <= new Date() && (
                    <button type="button" onClick={() => setShowAddDose(true)} className="text-sm text-orange hover:underline">
                      + Add Dose
                    </button>
                  )}
                </div>

                {getDosesForDate(selectedDay).length > 0 ? (
                  <div className="space-y-2">
                    {getDosesForDate(selectedDay).map((dose) => (
                      <div key={dose.id} className="rounded-button border border-ember/20 bg-elevated p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-mono text-lg text-ivory">{dose.amount}</span>
                            <span className="ml-1 text-sm text-bone">{dose.unit}</span>
                          </div>
                          <span className="text-xs text-ash">
                            {new Date(dose.dosed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="mt-2">
                          <span
                            className={`rounded-button px-2 py-1 text-xs uppercase ${
                              dose.day_classification === 'green'
                                ? 'bg-status-clear/20 text-status-clear'
                                : dose.day_classification === 'yellow'
                                  ? 'bg-status-mild/20 text-status-mild'
                                  : dose.day_classification === 'red'
                                    ? 'bg-status-elevated/20 text-status-elevated'
                                    : 'bg-elevated text-bone'
                            }`}
                          >
                            {dose.day_classification || 'pending'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-bone">No doses logged.</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div>
            <Link href="/batch" className="block rounded-card border border-ember/20 bg-surface p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Manage Batches</h3>
                  <p className="text-sm text-bone">
                    {activeBatches.length} active batch{activeBatches.length === 1 ? '' : 'es'}
                  </p>
                </div>
                <span className="text-bone">›</span>
              </div>
            </Link>

            <h3 className="mt-4 font-mono text-xs uppercase tracking-widest text-bone">Active Batches</h3>
            <div className="mt-2 space-y-2">
              {activeBatches.map((batch) => (
                <div
                  key={batch.id}
                  className={`rounded-button border p-3 ${
                    batch.is_active ? 'border-orange bg-orange/10' : 'border-ember/20 bg-surface'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{batch.name}</p>
                      <p className="text-sm text-bone">{batch.doses_logged} doses</p>
                    </div>
                    <span
                      className={`rounded-button px-2 py-1 text-xs uppercase ${
                        batch.calibration_status === 'calibrated'
                          ? 'bg-status-clear/20 text-status-clear'
                          : batch.calibration_status === 'calibrating'
                            ? 'bg-status-mild/20 text-status-mild'
                            : 'bg-elevated text-bone'
                      }`}
                    >
                      {batch.estimated_potency}
                    </span>
                  </div>
                </div>
              ))}

              {activeBatches.length === 0 && (
                <div className="rounded-card border border-ember/20 bg-surface p-6 text-center">
                  <p className="text-3xl">📦</p>
                  <p className="mt-2 text-bone">No batches yet.</p>
                  <Link href="/batch" className="mt-2 inline-block text-sm text-orange hover:underline">
                    Create your first batch
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showAddDose && (
        <div className="fixed inset-0 z-50 flex items-end bg-base/80">
          <div className="w-full rounded-t-card border-t border-ember/20 bg-surface p-6">
            <div className="mx-auto w-full max-w-xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-medium">Add Past Dose</h3>
                <button type="button" onClick={() => setShowAddDose(false)} className="text-bone hover:text-ivory">
                  Cancel
                </button>
              </div>

              <form onSubmit={handleBackfillSubmit} className="space-y-4">
                <label className="block">
                  <span className="text-sm text-bone">Date</span>
                  <input
                    type="date"
                    value={backfillForm.date}
                    onChange={(event) => setBackfillForm((previous) => ({ ...previous, date: event.target.value }))}
                    max={localDateKey(new Date())}
                    className="mt-1 w-full rounded-button border border-ember/30 bg-elevated px-3 py-2 text-ivory"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm text-bone">Amount</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={backfillForm.amount}
                    onChange={(event) => setBackfillForm((previous) => ({ ...previous, amount: event.target.value }))}
                    className="mt-1 w-full rounded-button border border-ember/30 bg-elevated px-3 py-2 text-ivory"
                    placeholder="e.g. 0.15"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm text-bone">Batch</span>
                  <select
                    value={backfillForm.batch_id}
                    onChange={(event) => setBackfillForm((previous) => ({ ...previous, batch_id: event.target.value }))}
                    className="mt-1 w-full rounded-button border border-ember/30 bg-elevated px-3 py-2 text-ivory"
                    required
                  >
                    <option value="">Select batch...</option>
                    {activeBatches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name}
                      </option>
                    ))}
                  </select>
                </label>

                {formError && <p className="text-sm text-status-elevated">{formError}</p>}

                <button
                  type="submit"
                  disabled={savingBackfill}
                  className="w-full rounded-button bg-orange px-4 py-3 font-mono text-sm uppercase tracking-widest text-base transition-settle hover:brightness-105 disabled:opacity-60"
                >
                  {savingBackfill ? 'Adding...' : 'Add Dose'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
