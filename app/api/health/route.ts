import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const checks = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('batches').select('id', { count: 'exact', head: true }),
    supabase.from('dose_logs').select('id', { count: 'exact', head: true }),
  ])

  const hasError = checks.some((check) => Boolean(check.error))

  if (hasError) {
    return NextResponse.json(
      {
        ok: false,
        status: 'degraded',
        errors: checks
          .map((check) => check.error?.message)
          .filter((message): message is string => typeof message === 'string'),
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }

  return NextResponse.json({
    ok: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
  })
}
