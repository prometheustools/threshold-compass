import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import {
  getSchemaSetupMessage,
  isSchemaCacheColumnMissingError,
  isSchemaCacheTableMissingError,
} from '@/lib/supabase/errors'

type PatternRow = {
  id: string
  user_id: string
  type: string
  title: string
  description: string | null
  confidence: number | null
  evidence_dose_ids: string[] | null
  recommendation: string | null
  dismissed: boolean
  acted_upon: boolean
  first_shown_at: string
  created_at: string
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('patterns')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    if (isSchemaCacheTableMissingError(error, 'patterns')) {
      return NextResponse.json([])
    }

    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json((data ?? []) as PatternRow[])
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const regenerate = body?.regenerate === true

  if (regenerate) {
    const { error: clearError } = await supabase.from('patterns').delete().eq('user_id', user.id)
    if (clearError) {
      if (isSchemaCacheTableMissingError(clearError, 'patterns')) {
        return NextResponse.json({ patterns: [], generated: 0, degraded: true, message: getSchemaSetupMessage('patterns') })
      }

      return NextResponse.json({ error: clearError.message }, { status: 500 })
    }
  }

  const { data: doseRows, error: doseError } = await supabase
    .from('dose_logs')
    .select('id,day_classification,signal_score,interference_score,threshold_feel,timing_tag')
    .eq('user_id', user.id)
    .order('dosed_at', { ascending: false })
    .limit(120)

  if (doseError) {
    if (
      isSchemaCacheTableMissingError(doseError, 'dose_logs') ||
      isSchemaCacheColumnMissingError(doseError)
    ) {
      return NextResponse.json({ patterns: [], generated: 0, degraded: true, message: getSchemaSetupMessage('dose_logs') })
    }

    return NextResponse.json({ error: doseError.message }, { status: 500 })
  }

  const rows = (doseRows ?? []) as Array<{
    id: string
    day_classification: string | null
    signal_score: number | null
    interference_score: number | null
    threshold_feel: string | null
    timing_tag: string | null
  }>

  if (rows.length < 5) {
    return NextResponse.json({ patterns: [], generated: 0 })
  }

  const greenRows = rows.filter((row) => row.day_classification === 'green')
  const redRows = rows.filter((row) => row.day_classification === 'red')
  const morningRows = rows.filter((row) => row.timing_tag === 'morning')
  const sweetSpotRows = rows.filter((row) => row.threshold_feel === 'sweetspot')

  const suggestions: Array<Omit<PatternRow, 'id' | 'first_shown_at' | 'created_at'>> = []

  if (greenRows.length >= Math.max(3, Math.round(rows.length * 0.35))) {
    suggestions.push({
      user_id: user.id,
      type: 'day_classification_trend',
      title: 'Strong Green-Day Response',
      description: 'A high proportion of your recent doses are classified green.',
      confidence: Math.min(95, Math.round((greenRows.length / rows.length) * 100)),
      evidence_dose_ids: greenRows.slice(0, 12).map((row) => row.id),
      recommendation: 'Hold dose steady and keep context consistent for 2-3 sessions.',
      dismissed: false,
      acted_upon: false,
    })
  }

  if (redRows.length >= Math.max(2, Math.round(rows.length * 0.2))) {
    suggestions.push({
      user_id: user.id,
      type: 'interference_risk',
      title: 'Interference Drift',
      description: 'Red-day interference is showing up frequently in recent logs.',
      confidence: Math.min(95, Math.round((redRows.length / rows.length) * 100)),
      evidence_dose_ids: redRows.slice(0, 12).map((row) => row.id),
      recommendation: 'Reduce dose slightly or increase spacing between sessions.',
      dismissed: false,
      acted_upon: false,
    })
  }

  if (morningRows.length >= 4 && sweetSpotRows.length >= 4) {
    const overlap = rows.filter((row) => row.timing_tag === 'morning' && row.threshold_feel === 'sweetspot').length
    if (overlap >= 3) {
      suggestions.push({
        user_id: user.id,
        type: 'timing_correlation',
        title: 'Morning Timing Correlation',
        description: 'Morning doses appear to align with sweet-spot reports.',
        confidence: Math.min(90, overlap * 18),
        evidence_dose_ids: rows
          .filter((row) => row.timing_tag === 'morning' && row.threshold_feel === 'sweetspot')
          .slice(0, 12)
          .map((row) => row.id),
        recommendation: 'Prefer morning protocol windows when practical.',
        dismissed: false,
        acted_upon: false,
      })
    }
  }

  if (suggestions.length === 0) {
    return NextResponse.json({ patterns: [], generated: 0 })
  }

  const { data: inserted, error: insertError } = await supabase
    .from('patterns')
    .insert(
      suggestions.map((pattern) => ({
        ...pattern,
        first_shown_at: new Date().toISOString(),
      }))
    )
    .select('*')

  if (insertError) {
    if (isSchemaCacheTableMissingError(insertError, 'patterns') || isSchemaCacheColumnMissingError(insertError)) {
      return NextResponse.json({
        patterns: [],
        generated: 0,
        degraded: true,
        message: getSchemaSetupMessage('patterns'),
      })
    }

    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ patterns: inserted ?? [], generated: suggestions.length })
}
