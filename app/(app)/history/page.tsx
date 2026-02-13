'use client'

import { useEffect, useState } from 'react'
import { Clock, ChevronDown, ChevronUp } from 'lucide-react'
import type { DoseLog, CheckIn } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { resolveCurrentUserId } from '@/lib/auth/anonymous'
import Card from '@/components/ui/Card'
import LoadingState from '@/components/ui/LoadingState'
import { EmptyStateNoDoses } from '@/components/ui/EmptyState'

interface DoseWithBatchAndCheckIn extends DoseLog {
  batch_name: string
  check_in: CheckIn | null
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(dateString))
}

function formatTime(dateString: string): string {
  return new Intl.DateTimeFormat('en-US', { timeStyle: 'short' }).format(new Date(dateString))
}

const zoneColors: Record<string, string> = {
  sub: 'text-ash',
  low: 'text-status-clear',
  sweet_spot: 'text-orange',
  high: 'text-status-mild',
  over: 'text-status-elevated',
}

const zoneLabels: Record<string, string> = {
  sub: 'Sub',
  low: 'Low',
  sweet_spot: 'Sweet Spot',
  high: 'High',
  over: 'Over',
}

const dayClassColors: Record<string, string> = {
  green: 'text-status-clear',
  yellow: 'text-status-mild',
  red: 'text-status-elevated',
  unclassified: 'text-ash',
}

export default function HistoryPage() {
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<DoseWithBatchAndCheckIn[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      try {
        const supabase = createClient()
        const anonUserId = await resolveCurrentUserId(supabase)
        
        if (!anonUserId) return

        const { data: doseRows, error: doseError } = await supabase
          .from('dose_logs')
          .select('*, batches(name)')
          .eq('user_id', anonUserId)
          .order('dosed_at', { ascending: false })

        if (doseError) throw doseError

        const doseIds = (doseRows ?? []).map((d: Record<string, unknown>) => d.id as string)

        let checkInMap: Record<string, CheckIn> = {}

        if (doseIds.length > 0) {
          const { data: checkInRows } = await supabase
            .from('check_ins')
            .select('*')
            .in('dose_log_id', doseIds)

          if (checkInRows) {
            for (const ci of checkInRows) {
              const typed = ci as CheckIn
              if (typed.dose_log_id) {
                checkInMap[typed.dose_log_id] = typed
              }
            }
          }
        }

        if (!active) return

        const mapped: DoseWithBatchAndCheckIn[] = (doseRows ?? []).map(
          (row: Record<string, unknown>) => {
            const batchRel = row.batches as { name: string } | null
            return {
              ...(row as unknown as DoseLog),
              batch_name: batchRel?.name ?? 'Unknown batch',
              check_in: checkInMap[row.id as string] ?? null,
            }
          }
        )

        setLogs(mapped)
      } catch {
        // fail silently
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  const toggle = (id: string) => setExpandedId(expandedId === id ? null : id)

  return (
    <div className="min-h-screen bg-base text-ivory">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-base/95 backdrop-blur-md border-b border-ember/10">
        <div className="max-w-xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange/10 border border-orange/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange" />
            </div>
            <div>
              <p className="font-mono text-xs tracking-wider uppercase text-bone">History</p>
              <h1 className="text-xl font-semibold">Dose Log</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 sm:px-6 py-6">
        <div className="max-w-xl mx-auto space-y-4">
          {loading ? (
            <Card padding="lg">
              <LoadingState message="loading" size="md" />
            </Card>
          ) : logs.length === 0 ? (
            <EmptyStateNoDoses />
          ) : (
            logs.map((log) => (
              <Card key={log.id} className="overflow-hidden transition-all duration-300 hover:border-ember/40">
                <button
                  type="button"
                  onClick={() => toggle(log.id)}
                  className="w-full p-4 text-left"
                  aria-expanded={expandedId === log.id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-bone">{formatDate(log.dosed_at)}</span>
                        <span className="text-xs text-ash">at {formatTime(log.dosed_at)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-2xl text-ivory">{log.amount}</span>
                        <span className="text-sm text-bone">{log.unit}</span>
                      </div>
                      <p className="mt-1 text-xs text-ash">
                        {log.batch_name}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {log.day_classification && (
                        <span className={`text-xs font-medium uppercase ${dayClassColors[log.day_classification] ?? 'text-ash'}`}>
                          {log.day_classification}
                        </span>
                      )}
                      {log.threshold_feel && (
                        <span className="text-xs text-bone capitalize">{log.threshold_feel}</span>
                      )}
                      {!log.threshold_feel && log.check_in?.threshold_zone && (
                        <span className={`text-xs font-medium ${zoneColors[log.check_in.threshold_zone]}`}>
                          {zoneLabels[log.check_in.threshold_zone]}
                        </span>
                      )}
                      {expandedId === log.id ? (
                        <ChevronUp className="w-4 h-4 text-ash" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-ash" />
                      )}
                    </div>
                  </div>
                </button>

                {expandedId === log.id && (
                  <div className="border-t border-ember/20 px-4 pb-4 pt-3 space-y-4 bg-elevated/30">
                    {log.notes && (
                      <div>
                        <p className="font-mono text-[10px] tracking-wider uppercase text-bone mb-1">Notes</p>
                        <p className="text-sm text-ivory">{log.notes}</p>
                      </div>
                    )}
                    
                    {log.check_in && (
                      <div className="space-y-3">
                        <p className="font-mono text-[10px] tracking-wider uppercase text-bone">Check-in</p>
                        
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {log.check_in.energy && (
                            <div className="flex justify-between">
                              <span className="text-ash">Energy</span>
                              <span className="text-ivory">{log.check_in.energy}</span>
                            </div>
                          )}
                          {log.check_in.mood && (
                            <div className="flex justify-between">
                              <span className="text-ash">Mood</span>
                              <span className="text-ivory">{log.check_in.mood}</span>
                            </div>
                          )}
                          {log.check_in.focus && (
                            <div className="flex justify-between">
                              <span className="text-ash">Focus</span>
                              <span className="text-ivory">{log.check_in.focus}</span>
                            </div>
                          )}
                          {log.check_in.body_state && (
                            <div className="flex justify-between">
                              <span className="text-ash">Body</span>
                              <span className="text-ivory">{log.check_in.body_state}</span>
                            </div>
                          )}
                        </div>

                        {log.check_in.notes && (
                          <div className="pt-2 border-t border-ember/10">
                            <p className="text-sm text-ivory">{log.check_in.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {!log.notes && !log.check_in && (
                      <p className="text-sm text-ash italic">No additional details recorded</p>
                    )}
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
