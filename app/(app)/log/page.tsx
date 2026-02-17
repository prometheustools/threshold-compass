'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pill } from 'lucide-react'
import Link from 'next/link'
import type { Batch, User } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { resolveCurrentUserId } from '@/lib/auth/anonymous'
import LoadingState from '@/components/ui/LoadingState'
import LogPageRedesigned from '@/components/forms/LogPageRedesigned'

export default function LogPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [batches, setBatches] = useState<Batch[]>([])
  const [initialAmount, setInitialAmount] = useState<number | undefined>()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const loadData = async () => {
      try {
        const supabase = createClient()
        const anonUserId = await resolveCurrentUserId(supabase)
        
        if (!anonUserId) {
          router.push('/autologin')
          return
        }

        const [{ data: userData }, { data: batchRows }, { data: lastDose }] = await Promise.all([
          supabase.from('users').select('*').eq('id', anonUserId).single(),
          supabase.from('batches').select('*').eq('user_id', anonUserId).order('is_active', { ascending: false }),
          supabase.from('dose_logs').select('amount').eq('user_id', anonUserId).order('dosed_at', { ascending: false }).limit(1),
        ])

        if (!active) return

        if (!userData) {
          router.push('/onboarding')
          return
        }

        setUser(userData as User)
        setBatches((batchRows || []) as Batch[])
        
        if (lastDose?.[0]?.amount) {
          setInitialAmount(lastDose[0].amount)
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadData()
    return () => { active = false }
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <LoadingState message="Loading" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-status-elevated mb-2">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="text-sm text-bone hover:text-ivory"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!user || batches.length === 0) {
    return (
      <div className="min-h-screen bg-base text-ivory">
        <header className="sticky top-0 z-30 glass border-b border-ember/10">
          <div className="max-w-xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber/10 flex items-center justify-center">
                <Pill className="w-5 h-5 text-amber" />
              </div>
              <div>
                <p className="font-mono text-xs tracking-wider uppercase text-bone">Log Dose</p>
                <h1 className="text-xl font-semibold">New Entry</h1>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-12 max-w-xl mx-auto text-center">
          <p className="text-bone mb-4">
            {batches.length === 0 
              ? 'Create a batch first to start logging doses.'
              : 'Loading...'}
          </p>
          {batches.length === 0 && (
            <Link
              href="/batch"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-amber text-surface font-medium"
            >
              Create Batch
            </Link>
          )}
        </main>
      </div>
    )
  }

  return (
    <LogPageRedesigned 
      user={user} 
      batches={batches} 
      initialAmount={initialAmount}
    />
  )
}
