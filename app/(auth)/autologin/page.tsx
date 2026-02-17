'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isSchemaCacheTableMissingError } from '@/lib/supabase/errors'
import { persistAnonymousSession } from '@/lib/auth/anonymous'
import { Compass, Loader2, AlertCircle, RefreshCw, Eye } from 'lucide-react'

function isAnonymousDisabledMessage(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('anonymous') &&
    (normalized.includes('disabled') || normalized.includes('not enabled'))
  )
}

const STATUS_TIMEOUT = 15000 // 15 seconds timeout for user feedback

export default function AutoLoginPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'creating' | 'redirecting' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [isTakingLong, setIsTakingLong] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Progress animation
  useEffect(() => {
    if (status === 'error') return
    
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev
        // Slower progress as we get closer to completion
        const increment = prev < 30 ? 3 : prev < 60 ? 2 : 1
        return Math.min(prev + increment, 90)
      })
    }, 200)

    return () => clearInterval(interval)
  }, [status])

  // Timeout warning
  useEffect(() => {
    if (status === 'error') return
    
    const timeout = setTimeout(() => {
      if (status !== 'redirecting') {
        setIsTakingLong(true)
      }
    }, STATUS_TIMEOUT)

    return () => clearTimeout(timeout)
  }, [status])

  useEffect(() => {
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    const autoLogin = async () => {
      try {
        setStatus('loading')
        setProgress(10)
        const supabase = createClient()

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (signal.aborted) return

        let authUser = session?.user ?? null
        setProgress(25)

        if (!authUser) {
          setStatus('creating')
          setProgress(35)
          const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously()

          if (signal.aborted) return

          if (signInError) {
            if (isAnonymousDisabledMessage(signInError.message)) {
              setError(
                'Supabase anonymous sign-in is disabled. Enable it in Supabase Auth settings (Providers -> Anonymous).'
              )
              setStatus('error')
              setProgress(0)
              return
            }
            throw signInError
          }

          authUser = signInData.user
        }

        if (!authUser) {
          setError('Could not create an anonymous auth session.')
          setStatus('error')
          setProgress(0)
          return
        }

        setProgress(50)
        persistAnonymousSession(authUser.id, authUser.email)

        // Ensure user profile row exists for this auth user.
        const { data: existingUser, error: userError } = await supabase
          .from('users')
          .select('id,onboarding_complete')
          .eq('id', authUser.id)
          .maybeSingle()

        if (signal.aborted) return

        if (userError && isSchemaCacheTableMissingError(userError, 'users')) {
          setError('Database schema not set up. Run supabase/schema.sql in your Supabase project first.')
          setStatus('error')
          setProgress(0)
          return
        }

        if (userError) {
          throw userError
        }

        setProgress(75)
        let onboardingComplete = existingUser?.onboarding_complete ?? false
        if (!existingUser) {
          const anonEmail = authUser.email ?? `anon_${authUser.id.slice(0, 8)}@local.invalid`
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: authUser.id,
              email: anonEmail,
              substance_type: 'psilocybin',
              sensitivity: 3,
              north_star: 'clarity',
              guidance_level: 'guided',
              onboarding_complete: false,
            })

          if (signal.aborted) return

          if (insertError) {
            if (isSchemaCacheTableMissingError(insertError, 'users')) {
              setError('Database schema not set up. Run supabase/schema.sql in your Supabase project first.')
              setStatus('error')
              setProgress(0)
              return
            }
            throw insertError
          }

          onboardingComplete = false
        }

        setProgress(100)
        setStatus('redirecting')

        if (onboardingComplete) {
          router.push('/compass')
        } else {
          router.push('/onboarding')
        }
      } catch (err) {
        if (signal.aborted) return
        console.error('Auto-login error:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize app')
        setStatus('error')
        setProgress(0)
      }
    }

    autoLogin()

    return () => {
      abortControllerRef.current?.abort()
    }
  }, [router])

  const getStatusMessage = () => {
    switch (status) {
      case 'loading':
        return 'Initializing instrument...'
      case 'creating':
        return 'Calibrating your compass...'
      case 'redirecting':
        return 'Ready. Entering compass...'
      default:
        return ''
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
      case 'creating':
        return <Loader2 className="w-5 h-5 animate-spin text-orange" />
      case 'redirecting':
        return <Compass className="w-5 h-5 text-orange" />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange/10 border border-orange/20 mb-4">
            <Compass className="w-8 h-8 text-orange" />
          </div>
          <h1 className="font-mono text-2xl text-ivory tracking-wider uppercase">
            Threshold Compass
          </h1>
          <p className="text-bone text-sm mt-2">Precision calibration instrument</p>
        </div>
        
        {/* Loading State */}
        {(status === 'loading' || status === 'creating' || status === 'redirecting') && (
          <div className="bg-surface rounded-card p-6 border border-ember/20">
            {/* Progress Bar */}
            <div className="h-1 bg-elevated rounded-full overflow-hidden mb-6">
              <div 
                className="h-full bg-gradient-to-r from-orange to-ember transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            {/* Status */}
            <div className="flex items-center justify-center gap-2 mb-3">
              {getStatusIcon()}
              <p className="text-ivory text-sm font-medium">
                {getStatusMessage()}
              </p>
            </div>
            
            {/* Taking Long Warning */}
            {isTakingLong && (
              <div className="mt-4 p-3 rounded-button bg-status-mild/10 border border-status-mild/30">
                <p className="text-xs text-bone text-center">
                  This is taking longer than expected. You can continue waiting or try preview mode.
                </p>
                <button
                  onClick={() => router.push('/compass?preview=1')}
                  className="mt-3 w-full flex items-center justify-center gap-2 text-xs text-orange hover:text-ivory transition-colors min-h-[44px]"
                >
                  <Eye className="w-4 h-4" />
                  Open Preview Mode
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Error State */}
        {status === 'error' && error && (
          <div className="bg-surface rounded-card p-6 border border-status-elevated/40">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-status-elevated/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-status-elevated" />
              </div>
            </div>
            <p className="text-status-elevated text-sm text-center mb-6">{error}</p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-2 bg-orange text-base font-sans font-medium rounded-button py-3 min-h-[44px] hover:brightness-110 transition-settle"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
              <button
                onClick={() => router.push('/compass?preview=1')}
                className="w-full flex items-center justify-center gap-2 border border-ember/40 text-bone text-sm rounded-button py-3 min-h-[44px] hover:border-ember/80 hover:text-ivory transition-settle"
              >
                <Eye className="w-4 h-4" />
                Check Out The App (Preview)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
