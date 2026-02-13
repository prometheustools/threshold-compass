'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-mono text-2xl text-ivory tracking-wider uppercase mb-2">
            Threshold Compass
          </h1>
          <p className="text-bone text-sm">
            Begin calibrating your practice.
          </p>
        </div>

        {sent ? (
          <div className="bg-surface rounded-card p-6 border border-ember/20">
            <p className="text-ivory text-center mb-2">Check your email.</p>
            <p className="text-bone text-sm text-center">
              We sent a magic link to <span className="text-orange">{email}</span>.
              Click it to get started.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-surface rounded-card p-6 border border-ember/20">
            <label className="block mb-4">
              <span className="font-mono text-xs tracking-widest uppercase text-bone">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="practitioner@example.com"
                required
                className="mt-2 w-full bg-elevated border border-ember/30 text-ivory rounded-button px-4 py-3 min-h-[44px] focus:border-orange focus:ring-1 focus:ring-orange/30 focus:outline-none placeholder:text-ash transition-quick"
                aria-label="Email address"
              />
            </label>

            {error && (
              <p className="text-status-elevated text-sm mb-4">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-orange text-base font-sans font-medium rounded-button py-3 min-h-[44px] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-settle"
              aria-label="Send magic link"
            >
              {loading ? 'Sending...' : 'Send magic link'}
            </button>

            <p className="text-center mt-4 text-bone text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-orange hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
