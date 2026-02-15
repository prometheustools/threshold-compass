import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get('limit') ?? '50', 10)
  const offset = parseInt(searchParams.get('offset') ?? '0', 10)

  const { data, error } = await supabase
    .from('dose_logs')
    .select('*, batches(name)')
    .eq('user_id', user.id)
    .order('dosed_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const {
    amount,
    unit,
    batch_id,
    notes,
    preparation,
    sleep_quality,
    energy_level,
    stress_level,
    discovery_dose_number,
    phase,
    dose_number,
    pre_dose_mood,
    intention,
    post_dose_completed,
    post_dose_mood,
    signal_score,
    texture_score,
    interference_score,
    threshold_feel,
    day_classification,
    context_tags,
    timing_tag,
    carryover_score,
    effective_dose,
  } = body

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 })
  }

  if (!batch_id) {
    return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('dose_logs')
    .insert({
      user_id: user.id,
      amount,
      unit: unit ?? 'mg',
      batch_id,
      notes: notes ?? null,
      preparation: preparation ?? null,
      sleep_quality: sleep_quality ?? null,
      energy_level: energy_level ?? null,
      stress_level: stress_level ?? null,
      discovery_dose_number: discovery_dose_number ?? null,
      phase: phase ?? null,
      dose_number: dose_number ?? null,
      pre_dose_mood: pre_dose_mood ?? null,
      intention: intention ?? null,
      post_dose_completed: post_dose_completed ?? false,
      post_dose_mood: post_dose_mood ?? null,
      signal_score: signal_score ?? null,
      texture_score: texture_score ?? null,
      interference_score: interference_score ?? null,
      threshold_feel: threshold_feel ?? null,
      day_classification: day_classification ?? null,
      context_tags: context_tags ?? null,
      timing_tag: timing_tag ?? null,
      carryover_score: carryover_score ?? null,
      effective_dose: effective_dose ?? null,
      dosed_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
