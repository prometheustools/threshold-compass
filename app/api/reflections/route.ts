import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const timing = request.nextUrl.searchParams.get('timing')

  let query = supabase
    .from('reflections')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (timing) {
    query = query.eq('timing', timing)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { dose_log_id, timing, still_with_me, would_change, gratitude } = body

  if (!timing || !['eod', '24h', '72h'].includes(timing)) {
    return NextResponse.json({ error: 'Invalid reflection timing' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('reflections')
    .insert({
      user_id: user.id,
      dose_log_id: dose_log_id ?? null,
      timing,
      still_with_me: still_with_me ?? null,
      would_change: would_change ?? null,
      gratitude: gratitude ?? null,
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
