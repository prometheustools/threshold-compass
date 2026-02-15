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
  post_dose_completed: boolean
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
  isFuture: boolean
  dominantClassification: DayClassification
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

function isFutureDate(date: Date): boolean {
  const subject = new Date(date)
  subject.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return subject.getTime() > today.getTime()
}

function getDominantClassification(doses: DoseEntry[]): DayClassification {
  if (doses.length === 0) return null
  if (doses.some((dose) => dose.day_classification === 'red')) return 'red'
  if (doses.some((dose) => dose.day_classification === 'yellow')) return 'yellow'
  if (doses.some((dose) => dose.day_classification === 'green')) return 'green'
  return 'unclassified'
}

function getClassificationChip(classification: DayClassification): string {
  if (classification === 'green') return 'bg-status-clear/20 text-status-clear'
  if (classification === 'yellow') return 'bg-status-mild/20 text-status-mild'
  if (classification === 'red') return 'bg-status-elevated/20 text-status-elevated'
  if (classification === 'unclassified') return 'bg-orange/20 text-orange'
  return 'bg-elevated text-bone'
}

function formatAmount(value: number): string {
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1')
}

export default function StashClient() {
  const supabase = useMemo(() => createClient(), [])
  const [activeTab, setActiveTab] = useState<'calendar' | 'batches'>('calendar')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [doses, setDoses] = useState<DoseEntry[]>([])
  const [batches, setBatches] = useState<BatchEntry[]>([])
  const [selectedDay, setSelectedDay] = useState<Date | null>(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  })
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
          .select('id,batch_id,dosed_at,amount,unit,day_classification,post_dose_completed')
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

  const activeBatches = batches.filter((batch) => batch.is_active)
  const batchNameById = useMemo(() => new Map(batches.map((batch) => [batch.id, batch.name])), [batches])

  const getDosesForDate = (date: Date): DoseEntry[] => {
    const key = localDateKey(date)

    return doses
      .filter((dose) => {
        const doseDate = new Date(dose.dosed_at)
        return localDateKey(doseDate) === key
      })
      .sort((left, right) => new Date(right.dosed_at).getTime() - new Date(left.dosed_at).getTime())
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
      date.setHours(0, 0, 0, 0)
      const dayDoses = getDosesForDate(date)
      days.push({
        date,
        doses: dayDoses,
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
        isFuture: isFutureDate(date),
        dominantClassification: getDominantClassification(dayDoses),
      })
    }

    for (let i = 1; i <= lastDay.getDate(); i += 1) {
      const date = new Date(year, month, i)
      date.setHours(0, 0, 0, 0)
      const dayDoses = getDosesForDate(date)
      days.push({
        date,
        doses: dayDoses,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        isFuture: isFutureDate(date),
        dominantClassification: getDominantClassification(dayDoses),
      })
    }

    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i += 1) {
      const date = new Date(year, month + 1, i)
      date.setHours(0, 0, 0, 0)
      const dayDoses = getDosesForDate(date)
      days.push({
        date,
        doses: dayDoses,
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
        isFuture: isFutureDate(date),
        dominantClassification: getDominantClassification(dayDoses),
      })
    }

    return days
  }

  const monthStats = useMemo(() => {
    const month = currentDate.getMonth()
    const year = currentDate.getFullYear()

    const monthRows = doses.filter((dose) => {
      const date = new Date(dose.dosed_at)
      return date.getMonth() === month && date.getFullYear() === year
    })

    const uniqueDays = new Set(monthRows.map((dose) => localDateKey(new Date(dose.dosed_at))))

    return {
      doses: monthRows.length,
      daysLogged: uniqueDays.size,
      pending: monthRows.filter((dose) => !dose.post_dose_completed).length,
      green: monthRows.filter((dose) => dose.day_classification === 'green').length,
      yellow: monthRows.filter((dose) => dose.day_classification === 'yellow').length,
      red: monthRows.filter((dose) => dose.day_classification === 'red').length,
    }
  }, [currentDate, doses])

  const selectedDayDoses = selectedDay ? getDosesForDate(selectedDay) : []

  const navigateMonth = (delta: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1))
  }

  const jumpToToday = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelectedDay(today)
  }

  const handleDayClick = (day: DayData) => {
    setSelectedDay(day.date)
    if (!day.isFuture) {
      const defaultBatchId = activeBatches[0]?.id ?? batches[0]?.id ?? ''
      setBackfillForm((previous) => ({
        ...previous,
        date: localDateKey(day.date),
        batch_id: previous.batch_id || defaultBatchId,
      }))
    }
  }

  const refreshMonthData = async () => {
    if (!userId) return

    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0, 23, 59, 59)

    const [{ data: doseRows }, { data: batchRows }] = await Promise.all([
      supabase
        .from('dose_logs')
        .select('id,batch_id,dosed_at,amount,unit,day_classification,post_dose_completed')
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
      amount: Number(parsedAmount.toFixed(4)),
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
          <div className="space-y-4">
            <div className="rounded-card border border-ember/20 bg-surface p-4">
              <div className="mb-4 flex items-center justify-between">
                <button type="button" onClick={() => navigateMonth(-1)} className="rounded-button p-2 text-bone hover:bg-elevated" aria-label="Previous month">
                  ‹
                </button>
                <h2 className="text-lg font-medium">
                  {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <button type="button" onClick={() => navigateMonth(1)} className="rounded-button p-2 text-bone hover:bg-elevated" aria-label="Next month">
                  ›
                </button>
              </div>

              <button
                type="button"
                onClick={jumpToToday}
                className="mb-4 rounded-button border border-ember/30 px-3 py-1 text-xs font-mono uppercase tracking-widest text-bone transition-settle hover:border-ember/60 hover:text-ivory"
              >
                Jump to Today
              </button>

              <div className="grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
                <div className="rounded-button bg-elevated p-2">
                  <p className="text-[10px] uppercase tracking-widest text-ash">Doses</p>
                  <p className="mt-1 font-mono text-lg">{monthStats.doses}</p>
                </div>
                <div className="rounded-button bg-elevated p-2">
                  <p className="text-[10px] uppercase tracking-widest text-ash">Days Logged</p>
                  <p className="mt-1 font-mono text-lg">{monthStats.daysLogged}</p>
                </div>
                <div className="rounded-button bg-elevated p-2">
                  <p className="text-[10px] uppercase tracking-widest text-ash">Pending</p>
                  <p className="mt-1 font-mono text-lg text-status-mild">{monthStats.pending}</p>
                </div>
                <div className="rounded-button bg-status-clear/10 p-2">
                  <p className="text-[10px] uppercase tracking-widest text-ash">Green</p>
                  <p className="mt-1 font-mono text-lg text-status-clear">{monthStats.green}</p>
                </div>
                <div className="rounded-button bg-status-mild/10 p-2">
                  <p className="text-[10px] uppercase tracking-widest text-ash">Yellow</p>
                  <p className="mt-1 font-mono text-lg text-status-mild">{monthStats.yellow}</p>
                </div>
                <div className="rounded-button bg-status-elevated/10 p-2">
                  <p className="text-[10px] uppercase tracking-widest text-ash">Red</p>
                  <p className="mt-1 font-mono text-lg text-status-elevated">{monthStats.red}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-bone">
                <span className="rounded-button bg-status-clear/20 px-2 py-1 text-status-clear">Green</span>
                <span className="rounded-button bg-status-mild/20 px-2 py-1 text-status-mild">Yellow</span>
                <span className="rounded-button bg-status-elevated/20 px-2 py-1 text-status-elevated">Red</span>
                <span className="rounded-button bg-orange/20 px-2 py-1 text-orange">Pending / Unclassified</span>
              </div>
            </div>

            <div className="rounded-card border border-ember/20 bg-surface p-3">
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((day) => (
                  <div key={day} className="py-2 text-center text-xs text-bone">
                    {day}
                  </div>
                ))}

                {calendarDays.map((day) => {
                  const doseCount = day.doses.length
                  const isSelected = selectedDay?.toDateString() === day.date.toDateString()

                  const toneClass =
                    day.dominantClassification === 'green'
                      ? doseCount > 1
                        ? 'border-status-clear/50 bg-status-clear/20'
                        : 'border-status-clear/35 bg-status-clear/10'
                      : day.dominantClassification === 'yellow'
                        ? doseCount > 1
                          ? 'border-status-mild/50 bg-status-mild/20'
                          : 'border-status-mild/35 bg-status-mild/10'
                        : day.dominantClassification === 'red'
                          ? doseCount > 1
                            ? 'border-status-elevated/50 bg-status-elevated/20'
                            : 'border-status-elevated/35 bg-status-elevated/10'
                          : doseCount > 0
                            ? 'border-orange/35 bg-orange/10'
                            : 'border-ember/20 bg-transparent'

                  return (
                    <button
                      key={day.date.toISOString()}
                      type="button"
                      onClick={() => handleDayClick(day)}
                      className={`relative aspect-square rounded-button border text-sm transition-settle ${toneClass} ${
                        day.isCurrentMonth ? 'text-ivory' : 'text-ash'
                      } ${day.isToday ? 'ring-2 ring-orange' : ''} ${isSelected ? 'ring-2 ring-bone/50' : ''} ${
                        day.isFuture ? 'opacity-55' : 'hover:border-ember/70'
                      }`}
                      aria-label={`${day.date.toDateString()}${doseCount > 0 ? `, ${doseCount} dose${doseCount === 1 ? '' : 's'}` : ''}`}
                    >
                      <span>{day.date.getDate()}</span>
                      {doseCount > 0 && (
                        <span className="absolute right-1 top-1 rounded-full bg-base/80 px-1 py-0.5 text-[9px] font-mono leading-none text-bone">
                          {doseCount}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {selectedDay && (
              <div className="rounded-card border border-ember/20 bg-surface p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-medium">
                      {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </h3>
                    <p className="text-xs text-bone">
                      {selectedDayDoses.length} dose{selectedDayDoses.length === 1 ? '' : 's'} logged
                    </p>
                  </div>
                  {!isFutureDate(selectedDay) && (
                    <button type="button" onClick={() => setShowAddDose(true)} className="text-sm text-orange hover:underline">
                      + Add Dose
                    </button>
                  )}
                </div>

                {selectedDayDoses.length > 0 ? (
                  <div className="space-y-2">
                    {selectedDayDoses.map((dose) => (
                      <div key={dose.id} className="rounded-button border border-ember/20 bg-elevated p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-lg text-ivory">{formatAmount(dose.amount)}</span>
                              <span className="text-sm text-bone">{dose.unit}</span>
                            </div>
                            <p className="text-xs text-ash">{batchNameById.get(dose.batch_id) ?? 'Unknown batch'}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-ash">
                              {new Date(dose.dosed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </span>
                            {!dose.post_dose_completed && (
                              <p className="mt-1 text-[10px] uppercase tracking-widest text-status-mild">Pending completion</p>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className={`rounded-button px-2 py-1 text-xs uppercase ${getClassificationChip(dose.day_classification)}`}>
                            {dose.day_classification || 'pending'}
                          </span>
                          {!dose.post_dose_completed && (
                            <Link href={`/log/complete?dose=${dose.id}`} className="text-xs text-orange hover:underline">
                              Complete STI
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-bone">No doses logged for this day.</p>
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
                  <p className="mt-2 text-bone">No active batch.</p>
                  <Link href="/batch" className="mt-2 inline-block text-sm text-orange hover:underline">
                    Create or activate a batch
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
                    placeholder="e.g. 120"
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
                    {batches.map((batch) => (
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
