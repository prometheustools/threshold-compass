'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isSchemaCacheTableMissingError } from '@/lib/supabase/errors'
import { persistAnonymousSession } from '@/lib/auth/anonymous'

function isAnonymousDisabledMessage(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('anonymous') &&
    (normalized.includes('disabled') || normalized.includes('not enabled'))
  )
}

export default function AutoLoginPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'creating' | 'redirecting' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const autoLogin = async () => {
      try {
        setStatus('loading')
        const supabase = createClient()

        const {
          data: { session },
        } = await supabase.auth.getSession()

        let authUser = session?.user ?? null

        if (!authUser) {
          setStatus('creating')
          const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously()

          if (signInError) {
            if (isAnonymousDisabledMessage(signInError.message)) {
              setError(
                'Supabase anonymous sign-in is disabled. Enable it in Supabase Auth settings (Providers -> Anonymous).'
              )
              setStatus('error')
              return
            }
            throw signInError
          }

          authUser = signInData.user
        }

        if (!authUser) {
          setError('Could not create an anonymous auth session.')
          setStatus('error')
          return
        }

        persistAnonymousSession(authUser.id, authUser.email)

        // Ensure user profile row exists for this auth user.
        const { data: existingUser, error: userError } = await supabase
          .from('users')
          .select('id,onboarding_complete')
          .eq('id', authUser.id)
          .maybeSingle()

        if (userError && isSchemaCacheTableMissingError(userError, 'users')) {
          setError('Database schema not set up. Run supabase/schema.sql in your Supabase project first.')
          setStatus('error')
          return
        }

        if (userError) {
          throw userError
        }

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

          if (insertError) {
            if (isSchemaCacheTableMissingError(insertError, 'users')) {
              setError('Database schema not set up. Run supabase/schema.sql in your Supabase project first.')
              setStatus('error')
              return
            }
            throw insertError
          }

          onboardingComplete = false
        }

        setStatus('redirecting')

        if (onboardingComplete) {
          router.push('/compass')
        } else {
          router.push('/onboarding')
        }
      } catch (err) {
        console.error('Auto-login error:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize app')
        setStatus('error')
      }
    }

    autoLogin()
  }, [router])

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-mono text-2xl text-ivory tracking-wider uppercase mb-4">
          Threshold Compass
        </h1>
        
        {status === 'loading' && (
          <p className="text-bone text-sm animate-pulse">
            Initializing instrument...
          </p>
        )}
        
        {status === 'creating' && (
          <p className="text-bone text-sm animate-pulse">
            Calibrating your compass...
          </p>
        )}
        
        {status === 'redirecting' && (
          <p className="text-orange text-sm">
            Ready. Entering compass...
          </p>
        )}
        
        {status === 'error' && error && (
          <div className="bg-surface rounded-card p-6 border border-status-elevated/40">
            <p className="text-status-elevated text-sm mb-4">{error}</p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-orange text-base font-sans font-medium rounded-button py-3 min-h-[44px] hover:brightness-110 transition-settle"
              >
                Retry
              </button>
              <button
                onClick={() => router.push('/compass?preview=1')}
                className="w-full border border-ember/40 text-bone text-sm rounded-button py-3 min-h-[44px] hover:border-ember/80 hover:text-ivory transition-settle"
              >
                Check Out The App (Preview)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
