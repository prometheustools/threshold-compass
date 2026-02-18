'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Clock, ChevronDown, ChevronUp, Calendar as CalendarIcon, List } from 'lucide-react'
import type { DoseLog, Batch } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { resolveCurrentUserId } from '@/lib/auth/anonymous'
import Card from '@/components/ui/Card'
import LoadingState from '@/components/ui/LoadingState'
import CalendarView from '@/components/history/CalendarView'
import TimelineStrip from '@/components/history/TimelineStrip'

type ViewMode = 'list' | 'calendar'

interface DoseWithBatch extends DoseLog {
  batch_name: string
}

interface DoseGroup {
  date: string
  doses: DoseWithBatch[]
}

function formatDateHeader(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase()
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function getDayClassificationColor(classification: string | null): string {
  switch (classification) {
    case 'green':
      return '#34d399'
    case 'yellow':
      return '#d4a843'
    case 'red':
      return '#ef4444'
    default:
      return '#4a5568'
  }
}

function getThresholdFeelColor(feel: string | null): string {
  switch (feel) {
    case 'sweetspot':
      return '#34d399'
    case 'under':
      return '#d4a843'
    case 'over':
      return '#ef4444'
    case 'nothing':
      return '#4a5568'
    default:
      return '#4a5568'
  }
}

export default function HistoryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [doses, setDoses] = useState<DoseWithBatch[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [activeBatch, setActiveBatch] = useState<Batch | null>(null)
  const [selectedBatchId, setSelectedBatchId] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const supabase = createClient()
        const anonUserId = await resolveCurrentUserId(supabase)

        if (!anonUserId) {
          router.push('/autologin')
          return
        }

        // Fetch batches for filter
        const { data: batchRows, error: batchError } = await supabase
          .from('batches')
          .select('*')
          .eq('user_id', anonUserId)
          .order('created_at', { ascending: false })

        if (batchError) throw batchError

        const typedBatches = (batchRows ?? []) as Batch[]
        const activeBatchItem = typedBatches.find((b) => b.is_active)

        if (!active) return

        setBatches(typedBatches)
        setActiveBatch(activeBatchItem ?? null)

        // Build batch name map
        const batchNameMap: Record<string, string> = {}
        for (const batch of typedBatches) {
          batchNameMap[batch.id] = batch.name
        }

        // Fetch doses
        let query = supabase
          .from('dose_logs')
          .select('*')
          .eq('user_id', anonUserId)
          .order('dosed_at', { ascending: false })

        if (selectedBatchId !== 'all') {
          query = query.eq('batch_id', selectedBatchId)
        }

        const { data: doseRows, error: doseError } = await query

        if (doseError) throw doseError

        if (!active) return

        const mappedDoses: DoseWithBatch[] = (doseRows ?? []).map((row) => ({
          ...(row as DoseLog),
          batch_name: batchNameMap[row.batch_id] ?? 'Unknown batch',
        }))

        setDoses(mappedDoses)
      } catch {
        if (active) {
          setError('Unable to load dose history. Please try again.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadData()
    return () => {
      active = false
    }
  }, [selectedBatchId, router])

  const groupedDoses = useMemo((): DoseGroup[] => {
    const groups: Record<string, DoseWithBatch[]> = {}

    for (const dose of doses) {
      const dateKey = dose.dosed_at.split('T')[0]
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(dose)
    }

    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, doses]) => ({ date, doses }))
  }, [doses])

  // Get doses for selected calendar date
  const selectedDateDoses = useMemo(() => {
    if (!selectedCalendarDate) return []
    return doses.filter((d) => d.dosed_at.startsWith(selectedCalendarDate))
  }, [selectedCalendarDate, doses])

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const handleCalendarSelect = (date: string) => {
    setSelectedCalendarDate(date)
  }

  // Calculate stats
  const stats = useMemo(() => {
    if (doses.length === 0) return null
    const totalDoses = doses.length
    const sweetSpots = doses.filter((d) => d.threshold_feel === 'sweetspot').length
    const avgAmount = doses.reduce((sum, d) => sum + d.amount, 0) / totalDoses
    const last30Days = doses.filter((d) => {
      const doseDate = new Date(d.dosed_at)
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 30)
      return doseDate >= cutoff
    }).length

    return { totalDoses, sweetSpots, avgAmount: Math.round(avgAmount), last30Days }
  }, [doses])

  return (
    <div className="min-h-screen bg-base text-ivory pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-ember/10">
        <div className="max-w-xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber" />
            </div>
            <div className="flex-1">
              <p className="font-mono text-xs tracking-wider uppercase text-bone">History</p>
              <h1 className="text-xl font-semibold">Dose Log</h1>
            </div>
            {stats && (
              <div className="text-right">
                <p className="text-2xl font-bold text-ivory">{stats.totalDoses}</p>
                <p className="text-[10px] text-bone uppercase tracking-wider">Total</p>
              </div>
            )}
          </div>

          {/* Stats Row */}
          {stats && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-lg font-bold text-status-clear">{stats.sweetSpots}</p>
                <p className="text-[10px] text-bone uppercase tracking-wider">Sweet Spots</p>
              </div>
              <div className="text-center border-x border-ember/20">
                <p className="text-lg font-bold text-ivory">{stats.avgAmount}</p>
                <p className="text-[10px] text-bone uppercase tracking-wider">Avg {activeBatch?.dose_unit === 'ug' ? 'µg' : 'mg'}</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-amber">{stats.last30Days}</p>
                <p className="text-[10px] text-bone uppercase tracking-wider">Last 30d</p>
              </div>
            </div>
          )}

          {/* Batch Filter */}
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedBatchId('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedBatchId === 'all'
                    ? 'bg-amber text-surface'
                    : 'bg-surface border border-ember text-bone hover:border-amber'
                }`}
              >
                All Batches
              </button>
              {batches.map((batch) => (
                <button
                  key={batch.id}
                  type="button"
                  onClick={() => setSelectedBatchId(batch.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedBatchId === batch.id
                      ? 'bg-amber text-surface'
                      : 'bg-surface border border-ember text-bone hover:border-amber'
                  }`}
                >
                  {batch.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-6 max-w-xl mx-auto space-y-6">
        {loading ? (
          <Card padding="lg">
            <LoadingState message="loading history" size="md" />
          </Card>
        ) : error ? (
          <Card padding="lg" className="text-center">
            <p className="text-bone mb-4">{error}</p>
            <Link
              href="/compass"
              className="inline-flex items-center justify-center rounded-xl border border-ember/30 bg-surface px-4 py-2 text-sm text-ivory hover:border-amber"
            >
              Back to Compass
            </Link>
          </Card>
        ) : doses.length === 0 ? (
          <Card padding="lg" className="text-center">
            <p className="text-bone mb-2">No doses logged yet.</p>
            <p className="text-sm text-ash mb-4">Start your first log.</p>
            <Link
              href="/log"
              className="inline-flex items-center justify-center rounded-xl bg-amber px-4 py-2 text-sm font-medium text-surface hover:brightness-110"
            >
              Log First Dose
            </Link>
          </Card>
        ) : (
          <>
            {/* Timeline Strip */}
            <TimelineStrip doses={doses} days={30} />

            {/* View Toggle */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-bone uppercase tracking-wider">View</p>
              <div className="flex items-center gap-1 bg-surface rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === 'list'
                      ? 'bg-amber text-surface'
                      : 'text-bone hover:text-ivory'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  List
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('calendar')
                    setSelectedCalendarDate(null)
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === 'calendar'
                      ? 'bg-amber text-surface'
                      : 'text-bone hover:text-ivory'
                  }`}
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  Calendar
                </button>
              </div>
            </div>

            {/* Calendar View */}
            {viewMode === 'calendar' && (
              <>
                <CalendarView
                  doses={doses}
                  onSelectDate={handleCalendarSelect}
                  selectedDate={selectedCalendarDate}
                />

                {/* Selected Date Details */}
                {selectedCalendarDate && selectedDateDoses.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-ivory">
                      {new Date(selectedCalendarDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </h3>
                    <div className="space-y-2">
                      {selectedDateDoses.map((dose) => (
                        <Card key={dose.id} className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-lg font-bold text-ivory">
                                  {dose.amount}
                                  <span className="text-sm text-bone ml-0.5">{dose.unit}</span>
                                </span>
                                {dose.threshold_feel && (
                                  <span
                                    className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full"
                                    style={{
                                      backgroundColor: `${getThresholdFeelColor(dose.threshold_feel)}20`,
                                      color: getThresholdFeelColor(dose.threshold_feel),
                                    }}
                                  >
                                    {dose.threshold_feel}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-bone">{dose.batch_name}</p>
                            </div>
                            <span className="font-mono text-xs text-ash">
                              {formatTime(dose.dosed_at)}
                            </span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* List View */}
            {viewMode === 'list' &&
              groupedDoses.map((group) => (
                <div key={group.date} className="space-y-2">
                  {/* Date header */}
                  <h2 className="font-mono text-xs uppercase tracking-widest text-bone sticky top-[180px] glass py-2">
                    {formatDateHeader(group.date)}
                  </h2>

                  {/* Doses for this date */}
                  <div className="space-y-2">
                    {group.doses.map((dose) => {
                      const borderColor = getDayClassificationColor(dose.day_classification)
                      const isExpanded = expandedId === dose.id

                      return (
                        <Card
                          key={dose.id}
                          className="overflow-hidden transition-all duration-300 hover:border-ember/40 p-0"
                        >
                          <button
                            type="button"
                            onClick={() => toggleExpand(dose.id)}
                            className="w-full text-left"
                            aria-expanded={isExpanded}
                          >
                            {/* Main row with left border */}
                            <div
                              className="flex items-center gap-3 p-3"
                              style={{ borderLeft: `3px solid ${borderColor}` }}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm text-ivory">{formatTime(dose.dosed_at)}</span>
                                  <span className="font-mono text-lg text-ivory">
                                    {dose.amount}
                                    <span className="text-sm text-bone ml-0.5">{dose.unit}</span>
                                  </span>
                                </div>
                                <p className="text-xs text-bone truncate">{dose.batch_name}</p>
                              </div>

                              <div className="flex items-center gap-2">
                                {dose.threshold_feel && (
                                  <span
                                    className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full"
                                    style={{
                                      backgroundColor: `${getThresholdFeelColor(dose.threshold_feel)}20`,
                                      color: getThresholdFeelColor(dose.threshold_feel),
                                    }}
                                  >
                                    {dose.threshold_feel}
                                  </span>
                                )}
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-ash" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-ash" />
                                )}
                              </div>
                            </div>

                            {/* Expanded details */}
                            {isExpanded && (
                              <div className="border-t border-ember/20 px-4 py-3 space-y-3 bg-surface/50">
                                {/* Sleep, Energy, Stress */}
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  {dose.sleep_quality && (
                                    <div>
                                      <span className="text-ash">Sleep:</span>
                                      <span className="ml-1 text-ivory capitalize">{dose.sleep_quality}</span>
                                    </div>
                                  )}
                                  {dose.energy_level && (
                                    <div>
                                      <span className="text-ash">Energy:</span>
                                      <span className="ml-1 text-ivory capitalize">{dose.energy_level}</span>
                                    </div>
                                  )}
                                  {dose.stress_level && (
                                    <div>
                                      <span className="text-ash">Stress:</span>
                                      <span className="ml-1 text-ivory capitalize">{dose.stress_level}</span>
                                    </div>
                                  )}
                                </div>

                                {/* STI Scores */}
                                {(dose.signal_score !== null ||
                                  dose.texture_score !== null ||
                                  dose.interference_score !== null) && (
                                  <div className="flex items-center gap-4 text-xs">
                                    {dose.signal_score !== null && (
                                      <div>
                                        <span className="text-ash">Signal:</span>
                                        <span className="ml-1 font-mono text-ivory">{dose.signal_score}</span>
                                      </div>
                                    )}
                                    {dose.texture_score !== null && (
                                      <div>
                                        <span className="text-ash">Texture:</span>
                                        <span className="ml-1 font-mono text-ivory">{dose.texture_score}</span>
                                      </div>
                                    )}
                                    {dose.interference_score !== null && (
                                      <div>
                                        <span className="text-ash">Interference:</span>
                                        <span className="ml-1 font-mono text-ivory">{dose.interference_score}</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Notes */}
                                {dose.notes && (
                                  <div className="pt-2 border-t border-ember/10">
                                    <p className="text-xs text-ash mb-1">Notes</p>
                                    <p className="text-sm text-ivory">{dose.notes}</p>
                                  </div>
                                )}

                                {/* Additional metadata */}
                                <div className="pt-2 border-t border-ember/10 text-[10px] text-ash space-y-1">
                                  {dose.preparation && (
                                    <p>
                                      Preparation:{" "}
                                      <span className="text-bone capitalize">
                                        {dose.preparation.replace('_', ' ')}
                                      </span>
                                    </p>
                                  )}
                                  {dose.context_tags && dose.context_tags.length > 0 && (
                                    <p>
                                      Context: <span className="text-bone">{dose.context_tags.join(', ')}</span>
                                    </p>
                                  )}
                                  {dose.timing_tag && (
                                    <p>
                                      Timing:{" "}
                                      <span className="text-bone capitalize">{dose.timing_tag}</span>
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </button>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              ))}
          </>
        )}
      </main>
    </div>
  )
}
