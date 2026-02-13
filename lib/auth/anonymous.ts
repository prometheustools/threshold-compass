'use client'

import { useEffect, useState } from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export const ANON_USER_KEY = 'threshold_compass_anon_user'
export const SESSION_KEY = 'threshold_compass_session'

interface AnonSession {
  user_id: string
  email: string
  authenticated: boolean
}

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function readStoredSession(): AnonSession | null {
  if (!isBrowser()) return null
  return safeParseJson<AnonSession>(window.localStorage.getItem(SESSION_KEY))
}

function readStoredUser(): { id: string; email?: string } | null {
  if (!isBrowser()) return null
  return safeParseJson<{ id: string; email?: string }>(window.localStorage.getItem(ANON_USER_KEY))
}

export function persistAnonymousSession(userId: string, email?: string | null): void {
  if (!isBrowser()) return

  const safeEmail = email ?? `anon_${userId.slice(0, 8)}@local.invalid`
  const session: AnonSession = {
    user_id: userId,
    email: safeEmail,
    authenticated: true,
  }

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  window.localStorage.setItem(
    ANON_USER_KEY,
    JSON.stringify({
      id: userId,
      email: safeEmail,
    })
  )
}

export function clearAnonymousSession(): void {
  if (!isBrowser()) return
  window.localStorage.removeItem(SESSION_KEY)
  window.localStorage.removeItem(ANON_USER_KEY)
}

export async function resolveCurrentUserId(supabase: SupabaseClient): Promise<string | null> {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (!sessionError && session?.user?.id) {
      persistAnonymousSession(session.user.id, session.user.email)
      return session.user.id
    }
  } catch {
    // Fall back to local session cache
  }

  const storedSession = readStoredSession()
  if (storedSession?.authenticated && storedSession.user_id) {
    return storedSession.user_id
  }

  const storedUser = readStoredUser()
  return storedUser?.id ?? null
}

export async function resolveCurrentUser(supabase: SupabaseClient): Promise<User | null> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (!error && user?.id) {
      persistAnonymousSession(user.id, user.email)
      return user
    }
  } catch {
    return null
  }

  return null
}

export function useAnonymousAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    const bootstrap = async () => {
      const supabase = createClient()
      const resolvedUserId = await resolveCurrentUserId(supabase)

      if (!active) return

      if (resolvedUserId) {
        setIsAuthenticated(true)
        setUserId(resolvedUserId)
      } else {
        setIsAuthenticated(false)
        setUserId(null)
      }

      setIsLoading(false)
    }

    void bootstrap()

    return () => {
      active = false
    }
  }, [])

  const getAnonHeaders = () => {
    const parsed = readStoredUser()
    if (parsed?.id) {
      return {
        'X-Anon-User-ID': parsed.id,
        'X-Anon-User-Email': parsed.email ?? '',
      }
    }
    return {}
  }

  return {
    isAuthenticated,
    userId,
    isLoading,
    getAnonHeaders,
  }
}

export function getAnonymousUserId(): string | null {
  const session = readStoredSession()
  if (session?.authenticated && session.user_id) {
    return session.user_id
  }

  const storedUser = readStoredUser()
  return storedUser?.id ?? null
}
